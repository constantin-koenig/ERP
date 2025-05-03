// backend/controllers/userController.js (mit erweitertem Logging)
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');
const { logger } = require('../middleware/logger');
const SystemLog = require('../models/SystemLog');

// @desc    Registriere einen neuen Benutzer
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Validierungsfehler loggen
    logger.warn('Registrierungsversuch mit ungültigen Daten', {
      validationErrors: errors.array(),
      email: req.body.email,
      ipAddress: req.ip
    });
    
    // Systemlog für Validierungsfehler
    await SystemLog.logWarning(
      'Registrierungsversuch mit ungültigen Daten',
      'system',
      'System',
      { 
        validationErrors: errors.array(),
        email: req.body.email 
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'register',
        entity: 'user'
      }
    );
    
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
      // Abgelehnte Registrierung loggen
      logger.warn('Registrierungsversuch bei deaktivierter Registrierung', {
        email: req.body.email,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Registrierungsversuch bei deaktivierter Registrierung',
        'system',
        'System',
        { 
          email: req.body.email,
          ipAddress: req.ip
        },
        'business_event',
        req.ip,
        {
          module: 'users',
          action: 'register',
          entity: 'user'
        }
      );
      
      return res.status(405).json({
        success: false,
        message: 'Die Registrierung ist deaktiviert. Bitte kontaktieren Sie den Administrator.'
      });
    }

    // Prüfen, ob der Benutzer bereits existiert
    let user = await User.findOne({ email });

    if (user) {
      // Doppelte Registrierung loggen
      logger.warn('Registrierungsversuch mit bereits vorhandener E-Mail-Adresse', {
        email: req.body.email,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Registrierungsversuch mit bereits vorhandener E-Mail-Adresse',
        'system',
        'System',
        { 
          email: req.body.email,
          ipAddress: req.ip
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'register',
          entity: 'user'
        }
      );
      
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

    // Erfolgreiche Registrierung loggen
    logger.info('Neuer Benutzer registriert', {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isFirstUser,
      ipAddress: req.ip
    });
    
    await SystemLog.logInfo(
      `Neuer Benutzer registriert: ${user.name}`,
      user._id.toString(),
      user.name,
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        isFirstUser,
        method: 'self-registration',
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'register',
        entity: 'user',
        entityId: user._id
      }
    );

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Registrierungsfehler:', error);
    
    // Fehler loggen
    logger.error(`Fehler bei der Benutzerregistrierung: ${error.message}`, {
      error: error.stack,
      email: req.body.email
    });
    
    await SystemLog.logError(
      `Fehler bei der Benutzerregistrierung: ${error.message}`,
      'system',
      'System',
      { 
        error: error.stack,
        email: req.body.email 
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'register',
        entity: 'user'
      }
    );
    
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
      // Fehlgeschlagene Anmeldung loggen
      logger.warn('Anmeldeversuch mit nicht existierender E-Mail-Adresse', {
        email,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Anmeldeversuch mit nicht existierender E-Mail-Adresse',
        'anonymous',
        'Anonymous',
        { 
          email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'login_failed',
          entity: 'user'
        }
      );
      
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldeinformationen'
      });
    }

    // Prüfen, ob der Benutzer aktiv ist
    if (!user.active) {
      // Anmeldeversuch mit deaktiviertem Konto loggen
      logger.warn('Anmeldeversuch mit deaktiviertem Konto', {
        userId: user._id,
        email: user.email,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Anmeldeversuch mit deaktiviertem Konto',
        user._id.toString(),
        user.name,
        { 
          email: user.email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'login_failed',
          entity: 'user',
          entityId: user._id
        }
      );
      
      return res.status(401).json({
        success: false,
        message: 'Ihr Konto wurde deaktiviert. Bitte kontaktieren Sie den Administrator.'
      });
    }

    // Prüfen, ob das Konto gesperrt ist
    if (user.lockUntil && user.lockUntil > Date.now()) {
      // Anmeldeversuch mit gesperrtem Konto loggen
      logger.warn('Anmeldeversuch mit gesperrtem Konto', {
        userId: user._id,
        email: user.email,
        lockUntil: user.lockUntil,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Anmeldeversuch mit gesperrtem Konto',
        user._id.toString(),
        user.name,
        { 
          email: user.email,
          lockUntil: user.lockUntil,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'login_failed',
          entity: 'user',
          entityId: user._id
        }
      );
      
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
      let accountLocked = false;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 Minuten Sperre
        accountLocked = true;
      }
      
      await user.save();
      
      // Fehlgeschlagene Anmeldung mit falschem Passwort loggen
      const logMessage = accountLocked 
        ? 'Konto gesperrt nach 5 fehlgeschlagenen Anmeldeversuchen' 
        : 'Anmeldeversuch mit falschem Passwort';
      
      logger.warn(logMessage, {
        userId: user._id,
        email: user.email,
        loginAttempts: user.loginAttempts,
        accountLocked,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        logMessage,
        user._id.toString(),
        user.name,
        { 
          email: user.email,
          loginAttempts: user.loginAttempts,
          accountLocked,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] 
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'login_failed',
          entity: 'user',
          entityId: user._id
        }
      );
      
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

    // Erfolgreiche Anmeldung loggen
    logger.info('Benutzer angemeldet', {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      ipAddress: req.ip
    });
    
    await SystemLog.logInfo(
      `Benutzer angemeldet: ${user.name}`,
      user._id.toString(),
      user.name,
      { 
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'login',
        entity: 'user',
        entityId: user._id
      }
    );

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login-Fehler:', error);
    
    // Fehler loggen
    logger.error(`Fehler bei der Benutzeranmeldung: ${error.message}`, {
      error: error.stack,
      email: req.body.email
    });
    
    await SystemLog.logError(
      `Fehler bei der Benutzeranmeldung: ${error.message}`,
      'system',
      'System',
      { 
        error: error.stack,
        email: req.body.email
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'login',
        entity: 'user'
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Benutzer abmelden (Log erstellen, Token wird client-seitig ungültig gemacht)
// @route   GET /api/users/logout
// @access  Private
exports.logoutUser = async (req, res) => {
  try {
    // Benutzer aus dem Request-Objekt holen (durch auth middleware gesetzt)
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht angemeldet'
      });
    }
    
    // Abmeldung loggen
    logger.info('Benutzer abgemeldet', {
      userId: user.id,
      name: user.name,
      email: user.email,
      ipAddress: req.ip
    });
    
    await SystemLog.logInfo(
      `Benutzer abgemeldet: ${user.name}`,
      user.id,
      user.name,
      { 
        email: user.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'logout',
        entity: 'user',
        entityId: user.id
      }
    );
    
    // Da JWT stateless ist, können wir nichts serverseitig invalidieren
    // Der Client muss den Token löschen
    res.status(200).json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });
  } catch (error) {
    console.error('Logout-Fehler:', error);
    
    // Fehler loggen
    logger.error(`Fehler bei der Benutzerabmeldung: ${error.message}`, {
      error: error.stack,
      userId: req.user ? req.user.id : 'unknown'
    });
    
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

    // Profilaufruf loggen (nur im Logger, nicht in DB um überflüssige Einträge zu vermeiden)
    logger.debug('Benutzer ruft eigenes Profil ab', {
      userId: req.user.id,
      name: req.user.name,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Abrufen des Benutzerprofils: ${error.message}`, {
      error: error.stack,
      userId: req.user.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen des Benutzerprofils: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_access_error',
      req.ip,
      {
        module: 'users',
        action: 'get_profile',
        entity: 'user',
        entityId: req.user.id
      }
    );
    
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
    // Alte Benutzerdaten für Vergleich holen
    const oldUser = await User.findById(req.user.id);
    if (!oldUser) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    // Alte Daten für den Vergleich speichern
    const oldData = {
      name: oldUser.name,
      email: oldUser.email,
      phone: oldUser.phone,
      position: oldUser.position,
      settings: oldUser.settings
    };
    
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    });

    // Änderungen identifizieren
    const changes = {};
    let changesMade = false;
    
    for (const key in updateData) {
      if (key === 'settings') {
        // Für verschachtelte Objekte wie settings
        if (JSON.stringify(oldData.settings) !== JSON.stringify(user.settings)) {
          changes.settings = {
            old: oldData.settings,
            new: user.settings
          };
          changesMade = true;
        }
      } else if (oldData[key] !== user[key]) {
        changes[key] = {
          old: oldData[key],
          new: user[key]
        };
        changesMade = true;
      }
    }
    
    // Nur loggen, wenn tatsächlich Änderungen vorgenommen wurden
    if (changesMade) {
      // Änderungen am Benutzerprofil loggen
      logger.info('Benutzer hat Profil aktualisiert', {
        userId: user._id,
        changes,
        ipAddress: req.ip
      });
      
      await SystemLog.logInfo(
        `Benutzer hat Profil aktualisiert: ${user.name}`,
        user._id.toString(),
        user.name,
        { 
          changes,
          ipAddress: req.ip,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'users',
          action: 'update_profile',
          entity: 'user',
          entityId: user._id,
          changes
        }
      );
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Aktualisieren des Benutzerprofils: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      updateData
    });
    
    await SystemLog.logError(
      `Fehler beim Aktualisieren des Benutzerprofils: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        updateData 
      },
      'data_operation_error',
      req.ip,
      {
        module: 'users',
        action: 'update_profile',
        entity: 'user',
        entityId: req.user.id
      }
    );
    
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
      // Fehlgeschlagenen Passwortänderungsversuch loggen
      logger.warn('Passwortänderungsversuch mit falschem aktuellen Passwort', {
        userId: user._id,
        name: user.name,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Passwortänderungsversuch mit falschem aktuellen Passwort',
        user._id.toString(),
        user.name,
        { 
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'change_password_failed',
          entity: 'user',
          entityId: user._id
        }
      );
      
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

    // Erfolgreiche Passwortänderung loggen
    logger.info('Benutzer hat Passwort geändert', {
      userId: user._id,
      name: user.name,
      ipAddress: req.ip
    });
    
    await SystemLog.logInfo(
      'Benutzer hat Passwort geändert',
      user._id.toString(),
      user.name,
      { 
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      'security_event',
      req.ip,
      {
        module: 'users',
        action: 'change_password',
        entity: 'user',
        entityId: user._id
      }
    );

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
    
    // Fehler loggen
    logger.error(`Fehler beim Ändern des Passworts: ${error.message}`, {
      error: error.stack,
      userId: req.user.id
    });
    
    await SystemLog.logError(
      `Fehler beim Ändern des Passworts: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'change_password',
        entity: 'user',
        entityId: req.user.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
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
      // Anfrage für nicht existierenden Benutzer loggen
      logger.info('Passwort-Reset-Anfrage für nicht existierenden Benutzer', {
        email: req.body.email,
        ipAddress: req.ip
      });
      
      await SystemLog.logInfo(
        'Passwort-Reset-Anfrage für nicht existierenden Benutzer',
        'anonymous',
        'Anonymous',
        { 
          email: req.body.email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'forgot_password',
          entity: 'user'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Es existiert kein Benutzer mit dieser E-Mail-Adresse'
      });
    }

    // Prüfen, ob Passwort-Zurücksetzen erlaubt ist
    const settings = await SystemSettings.getSettings();
    if (!settings.allowPasswordReset) {
      // Anfrage bei deaktivierter Funktion loggen
      logger.warn('Passwort-Reset-Anfrage bei deaktivierter Reset-Funktion', {
        userId: user._id,
        email: user.email,
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Passwort-Reset-Anfrage bei deaktivierter Reset-Funktion',
        user._id.toString(),
        user.name,
        { 
          email: user.email,
          ipAddress: req.ip
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'forgot_password',
          entity: 'user',
          entityId: user._id
        }
      );
      
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

      // Erfolgreiche Anfrage loggen
      logger.info('Passwort-Reset-E-Mail gesendet', {
        userId: user._id,
        email: user.email,
        resetToken: resetToken.substring(0, 6) + '...',
        ipAddress: req.ip
      });
      
      await SystemLog.logInfo(
        'Passwort-Reset-E-Mail gesendet',
        user._id.toString(),
        user.name,
        { 
          email: user.email,
          resetTokenExpiry: user.resetPasswordExpire,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'forgot_password',
          entity: 'user',
          entityId: user._id
        }
      );

      res.status(200).json({
        success: true,
        message: 'E-Mail gesendet'
      });
    } catch (error) {
      console.error('E-Mail konnte nicht gesendet werden:', error);
      
      // Fehler beim E-Mail-Versand loggen
      logger.error(`Fehler beim Senden der Passwort-Reset-E-Mail: ${error.message}`, {
        error: error.stack,
        userId: user._id,
        email: user.email
      });
      
      await SystemLog.logError(
        `Fehler beim Senden der Passwort-Reset-E-Mail: ${error.message}`,
        user._id.toString(),
        user.name,
        { 
          error: error.stack,
          email: user.email 
        },
        'system_error',
        req.ip,
        {
          module: 'users',
          action: 'forgot_password',
          entity: 'user',
          entityId: user._id
        }
      );
      
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
    
    // Fehler loggen
    logger.error(`Fehler beim Anfordern des Passwort-Zurücksetzens: ${error.message}`, {
      error: error.stack,
      email: req.body.email
    });
    
    await SystemLog.logError(
      `Fehler beim Anfordern des Passwort-Zurücksetzens: ${error.message}`,
      'system',
      'System',
      { 
        error: error.stack,
        email: req.body.email 
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'forgot_password',
        entity: 'user'
      }
    );
    
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
      // Versuch mit ungültigem Token loggen
      logger.warn('Passwort-Reset-Versuch mit ungültigem/abgelaufenem Token', {
        resetToken: req.params.resettoken.substring(0, 6) + '...',
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Passwort-Reset-Versuch mit ungültigem/abgelaufenem Token',
        'anonymous',
        'Anonymous',
        { 
          resetToken: req.params.resettoken.substring(0, 6) + '...',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'reset_password_failed',
          entity: 'user'
        }
      );
      
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

    // Erfolgreichen Passwort-Reset loggen
    logger.info('Passwort erfolgreich zurückgesetzt', {
      userId: user._id,
      email: user.email,
      name: user.name,
      ipAddress: req.ip
    });
    
    await SystemLog.logInfo(
      'Passwort erfolgreich zurückgesetzt',
      user._id.toString(),
      user.name,
      { 
        email: user.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      'security_event',
      req.ip,
      {
        module: 'users',
        action: 'reset_password',
        entity: 'user',
        entityId: user._id
      }
    );

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Fehler beim Zurücksetzen des Passworts:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Zurücksetzen des Passworts: ${error.message}`, {
      error: error.stack,
      resetToken: req.params.resettoken.substring(0, 6) + '...'
    });
    
    await SystemLog.logError(
      `Fehler beim Zurücksetzen des Passworts: ${error.message}`,
      'system',
      'System',
      { 
        error: error.stack,
        resetToken: req.params.resettoken.substring(0, 6) + '...'
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'reset_password',
        entity: 'user'
      }
    );
    
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
      // Einladungsversuch für existierenden Benutzer loggen
      logger.warn('Einladungsversuch für bereits existierenden Benutzer', {
        invitedByUserId: req.user.id,
        invitedByUserName: req.user.name,
        existingUserId: user._id,
        email: user.email
      });
      
      await SystemLog.logWarning(
        'Einladungsversuch für bereits existierenden Benutzer',
        req.user.id,
        req.user.name,
        { 
          existingUserId: user._id,
          existingUserName: user.name,
          email: user.email
        },
        'business_event',
        req.ip,
        {
          module: 'users',
          action: 'invite_failed',
          entity: 'user',
          entityId: user._id
        }
      );
      
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

      // Erfolgreiche Einladung loggen
      logger.info('Neuer Benutzer eingeladen', {
        invitedByUserId: req.user.id,
        invitedByUserName: req.user.name,
        newUserId: user._id,
        newUserName: user.name,
        newUserEmail: user.email,
        newUserRole: user.role
      });
      
      await SystemLog.logInfo(
        `Neuer Benutzer eingeladen: ${user.name} (${user.email})`,
        req.user.id,
        req.user.name,
        { 
          invitedUserId: user._id,
          invitedUserName: user.name,
          invitedUserEmail: user.email,
          invitedUserRole: user.role,
          invitationTokenExpiry: user.activationExpire,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'users',
          action: 'invite',
          entity: 'user',
          entityId: user._id
        }
      );

      res.status(200).json({
        success: true,
        message: 'Einladung gesendet'
      });
    } catch (error) {
      console.error('E-Mail konnte nicht gesendet werden:', error);
      
      // Fehler beim E-Mail-Versand loggen
      logger.error(`Fehler beim Senden der Einladungs-E-Mail: ${error.message}`, {
        error: error.stack,
        invitedByUserId: req.user.id,
        newUserId: user._id,
        newUserEmail: user.email
      });
      
      await SystemLog.logError(
        `Fehler beim Senden der Einladungs-E-Mail: ${error.message}`,
        req.user.id,
        req.user.name,
        { 
          error: error.stack,
          invitedUserId: user._id,
          invitedUserEmail: user.email
        },
        'system_error',
        req.ip,
        {
          module: 'users',
          action: 'invite',
          entity: 'user',
          entityId: user._id
        }
      );
      
      // Benutzer löschen, wenn E-Mail nicht gesendet werden konnte
      await User.findByIdAndDelete(user._id);

      return res.status(500).json({
        success: false,
        message: 'E-Mail konnte nicht gesendet werden'
      });
    }
  } catch (error) {
    console.error('Fehler beim Einladen des Benutzers:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Einladen des Benutzers: ${error.message}`, {
      error: error.stack,
      invitedByUserId: req.user.id,
      invitedUserEmail: req.body.email
    });
    
    await SystemLog.logError(
      `Fehler beim Einladen des Benutzers: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        invitedUserEmail: req.body.email,
        invitedUserName: req.body.name,
        invitedUserRole: req.body.role || 'user'
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'invite',
        entity: 'user'
      }
    );
    
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
      // Aktivierungsversuch mit ungültigem Token loggen
      logger.warn('Kontoaktivierungsversuch mit ungültigem/abgelaufenem Token', {
        activationToken: req.params.activationtoken.substring(0, 6) + '...',
        ipAddress: req.ip
      });
      
      await SystemLog.logWarning(
        'Kontoaktivierungsversuch mit ungültigem/abgelaufenem Token',
        'anonymous',
        'Anonymous',
        { 
          activationToken: req.params.activationtoken.substring(0, 6) + '...',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'activate_account_failed',
          entity: 'user'
        }
      );
      
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

    // Erfolgreiche Kontoaktivierung loggen
    logger.info('Benutzerkonto erfolgreich aktiviert', {
      userId: user._id,
      email: user.email,
      name: user.name,
      ipAddress: req.ip
    });
    
    await SystemLog.logInfo(
      `Benutzerkonto aktiviert: ${user.name}`,
      user._id.toString(),
      user.name,
      { 
        email: user.email,
        role: user.role,
        invitedBy: user.invitedBy,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'activate_account',
        entity: 'user',
        entityId: user._id
      }
    );

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Fehler bei der Kontoaktivierung:', error);
    
    // Fehler loggen
    logger.error(`Fehler bei der Kontoaktivierung: ${error.message}`, {
      error: error.stack,
      activationToken: req.params.activationtoken.substring(0, 6) + '...'
    });
    
    await SystemLog.logError(
      `Fehler bei der Kontoaktivierung: ${error.message}`,
      'system',
      'System',
      { 
        error: error.stack,
        activationToken: req.params.activationtoken.substring(0, 6) + '...'
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'activate_account',
        entity: 'user'
      }
    );
    
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

    // Benutzerabruf loggen (nur im Logger, nicht in DB um überflüssige Einträge zu vermeiden)
    logger.debug('Admin ruft Benutzerliste ab', {
      adminId: req.user.id,
      adminName: req.user.name,
      userCount: users.length
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Abrufen der Benutzerliste: ${error.message}`, {
      error: error.stack,
      adminId: req.user.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen der Benutzerliste: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_access_error',
      req.ip,
      {
        module: 'users',
        action: 'list',
        entity: 'user'
      }
    );
    
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
      // Zugriff auf nicht existierenden Benutzer loggen
      logger.warn('Admin versucht auf nicht existierenden Benutzer zuzugreifen', {
        adminId: req.user.id,
        adminName: req.user.name,
        requestedUserId: req.params.id
      });
      
      await SystemLog.logWarning(
        'Zugriff auf nicht existierenden Benutzer',
        req.user.id,
        req.user.name,
        { requestedUserId: req.params.id },
        'data_access_warning',
        req.ip,
        {
          module: 'users',
          action: 'view',
          entity: 'user'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Benutzerabruf loggen (optional - für bessere Kontrolle)
    logger.info('Admin ruft Benutzerdetails ab', {
      adminId: req.user.id,
      adminName: req.user.name,
      userId: user._id,
      userName: user.name
    });
    
    // Systemlog für Benutzerabruf (optional - je nach Sicherheitsanforderungen)
    await SystemLog.logInfo(
      `Benutzerdetails abgerufen: ${user.name} (${user.email})`,
      req.user.id,
      req.user.name,
      { 
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'view',
        entity: 'user',
        entityId: user._id
      }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Abrufen des Benutzers: ${error.message}`, {
      error: error.stack,
      adminId: req.user.id,
      requestedUserId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen des Benutzers: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        requestedUserId: req.params.id 
      },
      'data_access_error',
      req.ip,
      {
        module: 'users',
        action: 'view',
        entity: 'user',
        entityId: req.params.id
      }
    );
    
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

    // Alten Benutzer für Vergleich abrufen
    const oldUser = await User.findById(req.params.id);
    if (!oldUser) {
      // Aktualisierungsversuch für nicht existierenden Benutzer loggen
      logger.warn('Admin versucht nicht existierenden Benutzer zu aktualisieren', {
        adminId: req.user.id,
        adminName: req.user.name,
        userId: req.params.id
      });
      
      await SystemLog.logWarning(
        'Aktualisierungsversuch für nicht existierenden Benutzer',
        req.user.id,
        req.user.name,
        { userId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'users',
          action: 'update',
          entity: 'user'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    // Alte Daten für Vergleich speichern
    const oldData = {
      name: oldUser.name,
      email: oldUser.email,
      role: oldUser.role,
      active: oldUser.active,
      phone: oldUser.phone,
      position: oldUser.position
    };

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

    // Änderungen für Log identifizieren
    const changes = {};
    let changesMade = false;
    
    for (const key in oldData) {
      if (oldData[key] !== user[key]) {
        changes[key] = {
          old: oldData[key],
          new: user[key]
        };
        changesMade = true;
      }
    }
    
    // Nur loggen, wenn tatsächlich Änderungen vorgenommen wurden
    if (changesMade) {
      // Rollenänderungen besonders wichtig zu loggen
      if (changes.role) {
        logger.info(`Benutzerrolle geändert: ${oldData.role} → ${user.role}`, {
          adminId: req.user.id,
          adminName: req.user.name,
          userId: user._id,
          userName: user.name,
          oldRole: oldData.role,
          newRole: user.role
        });
        
        await SystemLog.logInfo(
          `Benutzerrolle geändert: ${user.name} von ${oldData.role} zu ${user.role}`,
          req.user.id,
          req.user.name,
          { 
            userId: user._id,
            userName: user.name,
            oldRole: oldData.role,
            newRole: user.role,
            timestamp: new Date().toISOString()
          },
          'security_event',
          req.ip,
          {
            module: 'users',
            action: 'change_role',
            entity: 'user',
            entityId: user._id,
            changes: {
              role: {
                old: oldData.role,
                new: user.role
              }
            }
          }
        );
      }
      
      // Aktivierungsstatus-Änderungen (Deaktivierung/Aktivierung) loggen
      if (changes.active !== undefined) {
        const actionType = user.active ? 'aktiviert' : 'deaktiviert';
        
        logger.info(`Benutzerkonto ${actionType}`, {
          adminId: req.user.id,
          adminName: req.user.name,
          userId: user._id,
          userName: user.name
        });
        
        await SystemLog.logInfo(
          `Benutzerkonto ${actionType}: ${user.name}`,
          req.user.id,
          req.user.name,
          { 
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            timestamp: new Date().toISOString()
          },
          'security_event',
          req.ip,
          {
            module: 'users',
            action: user.active ? 'activate_user' : 'deactivate_user',
            entity: 'user',
            entityId: user._id,
            changes: {
              active: {
                old: oldData.active,
                new: user.active
              }
            }
          }
        );
      }
      
      // Allgemeine Benutzeraktualisierung loggen
      logger.info('Benutzer aktualisiert', {
        adminId: req.user.id,
        adminName: req.user.name,
        userId: user._id,
        userName: user.name,
        changes
      });
      
      await SystemLog.logInfo(
        `Benutzer aktualisiert: ${user.name}`,
        req.user.id,
        req.user.name,
        { 
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          changes,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'users',
          action: 'update',
          entity: 'user',
          entityId: user._id,
          changes
        }
      );
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Aktualisieren des Benutzers: ${error.message}`, {
      error: error.stack,
      adminId: req.user.id,
      userId: req.params.id,
      updateData: req.body
    });
    
    await SystemLog.logError(
      `Fehler beim Aktualisieren des Benutzers: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        userId: req.params.id,
        updateData: req.body
      },
      'data_operation_error',
      req.ip,
      {
        module: 'users',
        action: 'update',
        entity: 'user',
        entityId: req.params.id
      }
    );
    
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
      // Löschversuch für nicht existierenden Benutzer loggen
      logger.warn('Admin versucht nicht existierenden Benutzer zu löschen', {
        adminId: req.user.id,
        adminName: req.user.name,
        userId: req.params.id
      });
      
      await SystemLog.logWarning(
        'Löschversuch für nicht existierenden Benutzer',
        req.user.id,
        req.user.name,
        { userId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'users',
          action: 'delete',
          entity: 'user'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Verhindern, dass ein Admin sich selbst löscht
    if (user._id.toString() === req.user.id) {
      // Versuch, eigenen Account zu löschen
      logger.warn('Admin versucht eigenen Account zu löschen', {
        adminId: req.user.id,
        adminName: req.user.name
      });
      
      await SystemLog.logWarning(
        'Admin versucht eigenen Account zu löschen',
        req.user.id,
        req.user.name,
        { },
        'security_event',
        req.ip,
        {
          module: 'users',
          action: 'delete_self',
          entity: 'user',
          entityId: req.user.id
        }
      );
      
      return res.status(400).json({
        success: false,
        message: 'Sie können Ihren eigenen Account nicht löschen'
      });
    }

    // Benutzer kann nicht gelöscht werden, wenn er ein Admin ist und es der letzte Admin im System ist
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        // Versuch, den letzten Admin zu löschen loggen
        logger.warn('Versuch, den letzten Admin-Benutzer zu löschen', {
          adminId: req.user.id,
          adminName: req.user.name,
          lastAdminId: user._id,
          lastAdminName: user.name
        });
        
        await SystemLog.logWarning(
          'Versuch, den letzten Admin-Benutzer zu löschen',
          req.user.id,
          req.user.name,
          { 
            lastAdminId: user._id,
            lastAdminName: user.name
          },
          'security_event',
          req.ip,
          {
            module: 'users',
            action: 'delete_last_admin',
            entity: 'user',
            entityId: user._id
          }
        );
        
        return res.status(400).json({
          success: false,
          message: 'Der letzte Administrator kann nicht gelöscht werden'
        });
      }
    }

    // Benutzerinformationen für Logging speichern
    const deletedUserInfo = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    await user.deleteOne();

    // Benutzer löschen loggen
    logger.info('Benutzer gelöscht', {
      adminId: req.user.id,
      adminName: req.user.name,
      deletedUserId: deletedUserInfo.id,
      deletedUserName: deletedUserInfo.name,
      deletedUserEmail: deletedUserInfo.email,
      deletedUserRole: deletedUserInfo.role
    });
    
    await SystemLog.logInfo(
      `Benutzer gelöscht: ${deletedUserInfo.name} (${deletedUserInfo.email})`,
      req.user.id,
      req.user.name,
      { 
        deletedUserId: deletedUserInfo.id,
        deletedUserName: deletedUserInfo.name,
        deletedUserEmail: deletedUserInfo.email,
        deletedUserRole: deletedUserInfo.role,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'users',
        action: 'delete',
        entity: 'user',
        entityId: deletedUserInfo.id
      }
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Löschen des Benutzers: ${error.message}`, {
      error: error.stack,
      adminId: req.user.id,
      userId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim Löschen des Benutzers: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        userId: req.params.id 
      },
      'data_operation_error',
      req.ip,
      {
        module: 'users',
        action: 'delete',
        entity: 'user',
        entityId: req.params.id
      }
    );
    
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
      // Versuch, nicht existierenden Benutzer erneut einzuladen loggen
      logger.warn('Versuch, nicht existierenden Benutzer erneut einzuladen', {
        adminId: req.user.id,
        adminName: req.user.name,
        userId: req.params.id
      });
      
      await SystemLog.logWarning(
        'Versuch, nicht existierenden Benutzer erneut einzuladen',
        req.user.id,
        req.user.name,
        { userId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'users',
          action: 'reinvite',
          entity: 'user'
        }
      );
      
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

      // Erfolgreiche erneute Einladung loggen
      logger.info('Benutzer erneut eingeladen', {
        adminId: req.user.id,
        adminName: req.user.name,
        userId: user._id,
        userName: user.name,
        userEmail: user.email
      });
      
      await SystemLog.logInfo(
        `Benutzer erneut eingeladen: ${user.name} (${user.email})`,
        req.user.id,
        req.user.name,
        { 
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          tokenExpiry: user.activationExpire,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'users',
          action: 'reinvite',
          entity: 'user',
          entityId: user._id
        }
      );

      res.status(200).json({
        success: true,
        message: 'Erneute Einladung gesendet'
      });
    } catch (error) {
      console.error('E-Mail konnte nicht gesendet werden:', error);
      
      // Fehler beim E-Mail-Versand loggen
      logger.error(`Fehler beim Senden der erneuten Einladungs-E-Mail: ${error.message}`, {
        error: error.stack,
        adminId: req.user.id,
        userId: user._id,
        userEmail: user.email
      });
      
      await SystemLog.logError(
        `Fehler beim Senden der erneuten Einladungs-E-Mail: ${error.message}`,
        req.user.id,
        req.user.name,
        { 
          error: error.stack,
          userId: user._id,
          userEmail: user.email
        },
        'system_error',
        req.ip,
        {
          module: 'users',
          action: 'reinvite',
          entity: 'user',
          entityId: user._id
        }
      );
      
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
    
    // Fehler loggen
    logger.error(`Fehler beim erneuten Einladen des Benutzers: ${error.message}`, {
      error: error.stack,
      adminId: req.user.id,
      userId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim erneuten Einladen des Benutzers: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        userId: req.params.id 
      },
      'system_error',
      req.ip,
      {
        module: 'users',
        action: 'reinvite',
        entity: 'user',
        entityId: req.params.id
      }
    );
    
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
      // Falsches Dateiformat beim Hochladen loggen
      logger.warn('Versuch, eine Nicht-Bild-Datei als Profilbild hochzuladen', {
        userId: req.user.id,
        userName: req.user.name,
        fileType: file.mimetype
      });
      
      return res.status(400).json({
        success: false,
        message: 'Bitte laden Sie ein gültiges Bild hoch (PNG, JPEG, GIF)'
      });
    }

    // Überprüfe die Dateigröße
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      // Zu große Datei beim Hochladen loggen
      logger.warn('Versuch, ein zu großes Profilbild hochzuladen', {
        userId: req.user.id,
        userName: req.user.name,
        fileSize: file.size,
        maxSize
      });
      
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
        
        // Fehler beim Hochladen loggen
        logger.error(`Fehler beim Speichern des Profilbildes: ${err.message}`, {
          error: err.stack,
          userId: req.user.id,
          fileName
        });
        
        await SystemLog.logError(
          `Fehler beim Speichern des Profilbildes: ${err.message}`,
          req.user.id,
          req.user.name,
          { 
            error: err.stack,
            fileName
          },
          'data_operation_error',
          req.ip,
          {
            module: 'users',
            action: 'upload_profile_image',
            entity: 'user',
            entityId: req.user.id
          }
        );
        
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

        // Erfolgreichen Upload loggen
        logger.info('Benutzer hat Profilbild hochgeladen', {
          userId: req.user.id,
          userName: req.user.name,
          imageUrl
        });
        
        await SystemLog.logInfo(
          'Benutzer hat Profilbild hochgeladen',
          req.user.id,
          req.user.name,
          { 
            imageUrl,
            fileSize: file.size,
            fileType: file.mimetype,
            timestamp: new Date().toISOString()
          },
          'business_event',
          req.ip,
          {
            module: 'users',
            action: 'upload_profile_image',
            entity: 'user',
            entityId: req.user.id
          }
        );

        res.status(200).json({
          success: true,
          data: imageUrl
        });
      } catch (updateError) {
        console.error('Fehler beim Aktualisieren des Benutzerkontos:', updateError);
        
        // Fehler beim Aktualisieren loggen
        logger.error(`Fehler beim Aktualisieren des Benutzerkontos mit Profilbild: ${updateError.message}`, {
          error: updateError.stack,
          userId: req.user.id,
          fileName
        });
        
        await SystemLog.logError(
          `Fehler beim Aktualisieren des Benutzerkontos mit Profilbild: ${updateError.message}`,
          req.user.id,
          req.user.name,
          { 
            error: updateError.stack,
            fileName 
          },
          'data_operation_error',
          req.ip,
          {
            module: 'users',
            action: 'upload_profile_image',
            entity: 'user',
            entityId: req.user.id
          }
        );
        
        return res.status(500).json({
          success: false,
          message: 'Bild wurde hochgeladen, aber das Konto konnte nicht aktualisiert werden',
          error: updateError.message
        });
      }
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Profilbildes:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Hochladen des Profilbildes: ${error.message}`, {
      error: error.stack,
      userId: req.user.id
    });
    
    await SystemLog.logError(
      `Fehler beim Hochladen des Profilbildes: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_operation_error',
      req.ip,
      {
        module: 'users',
        action: 'upload_profile_image',
        entity: 'user',
        entityId: req.user.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler',
      error: error.message
    });
  }
};

// @desc    Öffentliche Benutzerliste für Zuweisungen abrufen (nur ID, Name, Email)
// @route   GET /api/users/assignable
// @access  Private (für alle authentifizierten Benutzer)
exports.getAssignableUsers = async (req, res) => {
  try {
    // Nur aktive Benutzer abrufen
    const users = await User.find({ active: true }).select('_id name email');

    // Zuweisbare Benutzer abrufen loggen (nur im Debug-Level)
    logger.debug('Benutzer ruft zuweisbare Benutzer ab', {
      userId: req.user.id,
      userName: req.user.name,
      count: users.length
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der zuweisbaren Benutzer:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Abrufen der zuweisbaren Benutzer: ${error.message}`, {
      error: error.stack,
      userId: req.user.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen der zuweisbaren Benutzer: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_access_error',
      req.ip,
      {
        module: 'users',
        action: 'list_assignable',
        entity: 'user'
      }
    );
    
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