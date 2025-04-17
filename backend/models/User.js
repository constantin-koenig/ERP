// backend/models/User.js (erweitert)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bitte geben Sie einen Namen an'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Bitte geben Sie eine E-Mail-Adresse an'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Bitte geben Sie eine gültige E-Mail-Adresse an'
    ]
  },
  password: {
    type: String,
    required: [true, 'Bitte geben Sie ein Passwort an'],
    minlength: [6, 'Passwort muss mindestens 6 Zeichen lang sein'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  // Profilinformationen
  profileImage: {
    type: String, // URL zum Profilbild
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  position: {
    type: String, // Position im Unternehmen
    default: ''
  },
  // Persönliche Einstellungen
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      enum: ['de', 'en'],
      default: 'de'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      }
    },
    dashboardLayout: {
      type: String,
      enum: ['default', 'compact', 'detailed'],
      default: 'default'
    }
  },
  // Aktivierungs- und Einladungssystem
  active: {
    type: Boolean,
    default: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Passwort-Reset-Felder
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Aktivierungssystem
  activationToken: String,
  activationExpire: Date,
  // Zugriffsverwaltung
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Passwort verschlüsseln vor dem Speichern
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// JWT Token erstellen
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      name: this.name,
      email: this.email,
      role: this.role 
    }, 
    config.JWT_SECRET, 
    {
      expiresIn: config.JWT_EXPIRE
    }
  );
};

// Passwort vergleichen
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Password-Reset-Token generieren
UserSchema.methods.getResetPasswordToken = function() {
  // Token generieren
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Token hashen und speichern
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Ablaufzeit setzen (10 Minuten)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Einladungs-Token generieren
UserSchema.methods.getInvitationToken = function() {
  // Token generieren
  const invitationToken = crypto.randomBytes(20).toString('hex');

  // Token hashen und speichern
  this.activationToken = crypto
    .createHash('sha256')
    .update(invitationToken)
    .digest('hex');

  // Ablaufzeit setzen (7 Tage)
  this.activationExpire = Date.now() + 7 * 24 * 60 * 60 * 1000;

  return invitationToken;
};

// Prüfen, ob es der erste Benutzer im System ist
UserSchema.statics.isFirstUser = async function() {
  const count = await this.countDocuments({});
  return count === 0;
};

module.exports = mongoose.model('User', UserSchema);