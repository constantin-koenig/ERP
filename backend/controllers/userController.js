// backend/controllers/userController.js (vollständig)
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');

// @desc    Registriere einen neuen Benutzer
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Systemeinstellungen prüfen
    const settings = await SystemSettings.getSettings();
    
    // Prüfen, ob es bereits Benutzer gibt
    const isFirstUser = await User.isFirstUser();
    
    // Wenn es kein erster Benutzer ist und Registrierung deaktiviert ist
    if (!isFirstUser && !settings.allowRegistration) {
      return res.status(405).json({
        success: false,
        message: 'Die Registrierung ist deaktiviert. Bitte kontaktieren Sie den Administrator.'
      });
    }

    // Prüfen, ob der Benutzer bereits existiert
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer existiert bereits'
      });
    }

    // Benutzer erstellen
    user = await User.create({
      name,
      email,
      password,
      // Erster Benutzer wird automatisch Admin
      role: isFirstUser ? 'admin' : 'user'
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Registrierungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Benutzer anmelden
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Prüfen, ob der Benutzer existiert
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldeinformationen'
      });
    }

    // Prüfen, ob der Benutzer aktiv ist
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Ihr Konto wurde deaktiviert. Bitte kontaktieren Sie den Administrator.'
      });
    }

    // Prüfen, ob das Konto gesperrt ist
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(401).json({
        success: false,
        message: 'Ihr Konto ist vorübergehend gesperrt. Versuchen Sie es später erneut.'
      });
    }

    // Passwort überprüfen
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Fehlgeschlagene Anmeldeversuche erhöhen
      user.loginAttempts += 1;
      
      // Konto sperren, wenn zu viele fehlgeschlagene Versuche
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 Minuten Sperre
      }
      
      await user.save();
      
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldeinformationen'
      });
    }

    // Login-Informationen zurücksetzen
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = Date.now();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Aktuellen Benutzer abrufen
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Aktualisiere Benutzerdetails
// @route   PUT /api/users/me
// @access  Private
exports.updateDetails = async (req, res) => {
  // Erlaubte Felder filtern
  const allowedFields = ['name', 'email', 'phone', 'position', 'profileImage', 'settings'];
  const updateData = {};
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      // Für verschachtelte Objekte wie 'settings'
      if (field === 'settings' && typeof req.body[field] === 'object') {
        updateData[field] = {};
        
        // Einstellungsfelder
        const settingsFields = ['theme', 'language', 'notifications', 'dashboardLayout'];
        
        for (const settingField of settingsFields) {
          if (req.body[field][settingField] !== undefined) {
            updateData[field][settingField] = req.body[field][settingField];
          }
        }
      } else {
        updateData[field] = req.body[field];
      }
    }
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Passwort ändern
// @route   PUT /api/users/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');

    // Aktuelles Passwort überprüfen
    const isMatch = await user.matchPassword(req.body.currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Aktuelles Passwort ist falsch'
      });
    }

    // Nur das Passwort aktualisieren, keine anderen Felder validieren
    user.password = req.body.newPassword;
    
    // Validierung für andere Felder bei der Passwortänderung deaktivieren
    // Dies verhindert den Fehler "Validation failed: email, name..."
    const updatedUser = await user.save({ 
      validateModifiedOnly: true  // Nur geänderte Felder validieren
    });

    // Neuen Token generieren
    const token = user.getSignedJwtToken();

    // Antwort senden
    res.status(200).json({
      success: true,
      token,
      // Optional: Aktualisierte Benutzerdaten zurückgeben (ohne Passwort)
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        settings: updatedUser.settings,
        profileImage: updatedUser.profileImage,
        phone: updatedUser.phone,
        position: updatedUser.position
      }
    });
  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Profilbild hochladen
// @route   POST /api/users/upload-profile-image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    // Überprüfen, ob eine Datei hochgeladen wurde
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    // Stelle sicher, dass das richtige Feld verwendet wird
    const file = req.files.profileImage;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Bitte laden Sie ein Bild unter dem Feld "profileImage" hoch'
      });
    }

    // Überprüfe den Dateityp
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Bitte laden Sie ein gültiges Bild hoch (PNG, JPEG, GIF)'
      });
    }

    // Überprüfe die Dateigröße
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Das Bild darf maximal 5MB groß sein'
      });
    }

    // Dateiname erstellen
    const fileName = `profile_${req.user.id}_${Date.now()}${path.extname(file.name)}`;
    
    // Pfad erstellen
    const uploadPath = path.join(__dirname, '..', 'uploads', 'profileImages');
    
    // Sicherstellen, dass der Ordner existiert
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Protokollausgabe zur Fehlersuche
    console.log('Hochladepfad:', uploadPath);
    console.log('Dateiname:', fileName);
    console.log('Dateiinformationen:', {
      name: file.name,
      mimetype: file.mimetype,
      size: file.size,
      md5: file.md5
    });
    
    // Datei speichern
    file.mv(`${uploadPath}/${fileName}`, async (err) => {
      if (err) {
        console.error('Fehler beim Speichern des Bildes:', err);
        return res.status(500).json({
          success: false,
          message: 'Problem beim Hochladen des Bildes',
          error: err.message
        });
      }

      try {
        // Altes Profilbild löschen, falls vorhanden
        const user = await User.findById(req.user.id);
        if (user.profileImage) {
          try {
            const oldImagePath = path.join(__dirname, '..', 'uploads', 'profileImages', path.basename(user.profileImage));
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          } catch (unlinkError) {
            console.error('Fehler beim Löschen des alten Profilbilds:', unlinkError);
            // Wir fahren trotzdem fort - das ist kein kritischer Fehler
          }
        }

        // Profilbild-URL aktualisieren
        const imageUrl = `/uploads/profileImages/${fileName}`;
        await User.findByIdAndUpdate(req.user.id, { profileImage: imageUrl });

        res.status(200).json({
          success: true,
          data: imageUrl
        });
      } catch (updateError) {
        console.error('Fehler beim Aktualisieren des Benutzerkontos:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Bild wurde hochgeladen, aber das Konto konnte nicht aktualisiert werden',
          error: updateError.message
        });
      }
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Profilbildes:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler',
      error: error.message
    });
  }
};

// @desc    Passwort-Zurücksetzen anfordern
// @route   POST /api/users/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Es existiert kein Benutzer mit dieser E-Mail-Adresse'
      });
    }

    // Prüfen, ob Passwort-Zurücksetzen erlaubt ist
    const settings = await SystemSettings.getSettings();
    if (!settings.allowPasswordReset) {
      return res.status(403).json({
        success: false,
        message: 'Das Zurücksetzen des Passworts ist deaktiviert. Bitte kontaktieren Sie den Administrator.'
      });
    }

    // Reset-Token generieren
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Reset-URL erstellen
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

    const message = `Sie erhalten diese E-Mail, weil Sie (oder jemand anderes) das Zurücksetzen des Passworts für Ihr Konto beantragt haben. Bitte klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Passwort zurücksetzen',
        message
      });

      res.status(200).json({
        success: true,
        message: 'E-Mail gesendet'
      });
    } catch (error) {
      console.error('E-Mail konnte nicht gesendet werden:', error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'E-Mail konnte nicht gesendet werden'
      });
    }
  } catch (error) {
    console.error('Fehler beim Anfordern des Passwort-Zurücksetzens:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Passwort zurücksetzen
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Token hashen
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // Benutzer mit gültigem Token und nicht abgelaufenem Token finden
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Token'
      });
    }

    // Neues Passwort setzen
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Fehler beim Zurücksetzen des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Benutzer einladen
// @route   POST /api/users/invite
// @access  Private/Admin
exports.inviteUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name, role } = req.body;

  try {
    // Prüfen, ob der Benutzer bereits existiert
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer mit dieser E-Mail existiert bereits'
      });
    }

    // Temporäres zufälliges Passwort
    const tempPassword = crypto.randomBytes(10).toString('hex');

    // Benutzer erstellen
    user = await User.create({
      name,
      email,
      password: tempPassword,
      role: role || 'user',
      invitedBy: req.user.id,
      active: true // Benutzer ist sofort aktiv
    });

    // Einladungs-Token generieren
    const invitationToken = user.getInvitationToken();
    await user.save({ validateBeforeSave: false });

    // Einladungs-URL erstellen
    const invitationUrl = `${req.protocol}://${req.get('host')}/activate-account/${invitationToken}`;

    const message = `Sie wurden von ${req.user.name} eingeladen, dem ERP-System beizutreten. Bitte klicken Sie auf den folgenden Link, um Ihr Konto zu aktivieren und Ihr Passwort zu setzen: \n\n ${invitationUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Einladung zum ERP-System',
        message
      });

      res.status(200).json({
        success: true,
        message: 'Einladung gesendet'
      });
    } catch (error) {
      console.error('E-Mail konnte nicht gesendet werden:', error);
      // Benutzer löschen, wenn E-Mail nicht gesendet werden konnte
      await User.findByIdAndDelete(user._id);

      return res.status(500).json({
        success: false,
        message: 'E-Mail konnte nicht gesendet werden'
      });
    }
  } catch (error) {
    console.error('Fehler beim Einladen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Konto aktivieren
// @route   PUT /api/users/activate/:activationtoken
// @access  Public
exports.activateAccount = async (req, res) => {
  try {
    // Token hashen
    const activationToken = crypto
      .createHash('sha256')
      .update(req.params.activationtoken)
      .digest('hex');

    // Benutzer mit gültigem Token finden
    const user = await User.findOne({
      activationToken,
      activationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Token'
      });
    }

    // Neues Passwort setzen und Token zurücksetzen
    user.password = req.body.password;
    user.activationToken = undefined;
    user.activationExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Fehler bei der Kontoaktivierung:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Alle Benutzer abrufen (nur für Admins)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Bestimmten Benutzer abrufen (nur für Admins)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Benutzer aktualisieren (nur für Admins)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    // Wir erlauben nicht, dass das Passwort auf diesem Weg geändert wird
    if (req.body.password) {
      delete req.body.password;
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Benutzer löschen (nur für Admins)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Verhindern, dass ein Admin sich selbst löscht
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Sie können Ihren eigenen Account nicht löschen'
      });
    }

    // Benutzer kann nicht gelöscht werden, wenn er ein Admin ist und es der letzte Admin im System ist
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Der letzte Administrator kann nicht gelöscht werden'
        });
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Benutzer erneut einladen (nur für Admins)
// @route   POST /api/users/:id/reinvite
// @access  Private/Admin
exports.reinviteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Einladungs-Token generieren
    const invitationToken = user.getInvitationToken();
    await user.save({ validateBeforeSave: false });

    // Einladungs-URL erstellen
    const invitationUrl = `${req.protocol}://${req.get('host')}/activate-account/${invitationToken}`;

    const message = `Sie wurden von ${req.user.name} erneut zum ERP-System eingeladen. Bitte klicken Sie auf den folgenden Link, um Ihr Konto zu aktivieren und Ihr Passwort zu setzen: \n\n ${invitationUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Erneute Einladung zum ERP-System',
        message
      });

      res.status(200).json({
        success: true,
        message: 'Erneute Einladung gesendet'
      });
    } catch (error) {
      console.error('E-Mail konnte nicht gesendet werden:', error);
      // Token zurücksetzen
      user.activationToken = undefined;
      user.activationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'E-Mail konnte nicht gesendet werden'
      });
    }
  } catch (error) {
    console.error('Fehler beim erneuten Einladen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// Hilfsfunktion: Token erstellen und in Cookie speichern
const sendTokenResponse = (user, statusCode, res) => {
  // Token erstellen
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Cookie im Produktionsmodus sichern
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .json({
      success: true,
      token
    });
};