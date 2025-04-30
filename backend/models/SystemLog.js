// backend/models/SystemLog.js
const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error'],
    default: 'info'
  },
  message: {
    type: String,
    required: [true, 'Log-Nachricht ist erforderlich']
  },
  userId: {
    type: String,
    default: 'System'
  },
  userName: {
    type: String,
    default: 'System'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  source: {
    type: String,
    default: 'api'
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Index für schnellere Abfragen
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ userId: 1 });

// Statische Logger-Methoden
SystemLogSchema.statics.logInfo = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '') {
  return this.create({
    level: 'info',
    message,
    userId,
    userName,
    details,
    source,
    ipAddress
  });
};

SystemLogSchema.statics.logWarning = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '') {
  return this.create({
    level: 'warning',
    message,
    userId,
    userName,
    details,
    source,
    ipAddress
  });
};

SystemLogSchema.statics.logError = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '') {
  return this.create({
    level: 'error',
    message,
    userId,
    userName,
    details,
    source,
    ipAddress
  });
};

// Helfer-Methode für Benutzeraktionen
SystemLogSchema.statics.logUserAction = async function(action, req) {
  try {
    const user = req.user;
    const userId = user ? user.id : 'System';
    const userName = user ? user.name : 'System';
    
    return this.create({
      level: 'info',
      message: action,
      userId,
      userName,
      source: 'user_action',
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Fehler beim Loggen der Benutzeraktion:', error);
    // Bei Fehlern beim Loggen keine Exception werfen, um die Hauptfunktion nicht zu unterbrechen
  }
};

module.exports = mongoose.model('SystemLog', SystemLogSchema);