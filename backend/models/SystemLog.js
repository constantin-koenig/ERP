// backend/models/SystemLog.js (Erweitert)
const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'debug'],
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
  module: {
    type: String,
    default: 'general' // z.B. 'auth', 'customer', 'invoice', etc.
  },
  action: {
    type: String,
    default: 'general' // z.B. 'create', 'update', 'delete', etc.
  },
  entity: {
    type: String,
    default: null // z.B. 'user', 'customer', 'invoice', etc.
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Speichert veränderte Felder mit alten und neuen Werten
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

// Indices für schnellere Abfragen
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ userId: 1 });
SystemLogSchema.index({ entity: 1, entityId: 1 });
SystemLogSchema.index({ module: 1, action: 1 });
SystemLogSchema.index({ source: 1 });

// Statische Logger-Methoden
SystemLogSchema.statics.logInfo = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '', options = {}) {
  const { module, action, entity, entityId, changes } = options;
  
  return this.create({
    level: 'info',
    message,
    userId,
    userName,
    module: module || 'general',
    action: action || 'general',
    entity: entity || null,
    entityId: entityId || null,
    changes: changes || {},
    details,
    source,
    ipAddress
  });
};

SystemLogSchema.statics.logWarning = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '', options = {}) {
  const { module, action, entity, entityId, changes } = options;
  
  return this.create({
    level: 'warning',
    message,
    userId,
    userName,
    module: module || 'general',
    action: action || 'general',
    entity: entity || null,
    entityId: entityId || null,
    changes: changes || {},
    details,
    source,
    ipAddress
  });
};

SystemLogSchema.statics.logError = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '', options = {}) {
  const { module, action, entity, entityId, changes } = options;
  
  return this.create({
    level: 'error',
    message,
    userId,
    userName,
    module: module || 'general',
    action: action || 'general',
    entity: entity || null,
    entityId: entityId || null,
    changes: changes || {},
    details,
    source,
    ipAddress
  });
};

SystemLogSchema.statics.logDebug = async function(message, userId = 'System', userName = 'System', details = {}, source = 'api', ipAddress = '', options = {}) {
  // Debug-Logs nur in Nicht-Produktionsumgebungen in die Datenbank schreiben
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  const { module, action, entity, entityId, changes } = options;
  
  return this.create({
    level: 'debug',
    message,
    userId,
    userName,
    module: module || 'general',
    action: action || 'general',
    entity: entity || null,
    entityId: entityId || null,
    changes: changes || {},
    details,
    source,
    ipAddress
  });
};

// Daten-Änderungen protokollieren
SystemLogSchema.statics.logChanges = async function(entity, entityId, entityName, oldData, newData, userId, userName, message = null, source = 'data_change') {
  // Unterschiede zwischen alten und neuen Daten ermitteln
  const changes = {};
  let hasChanges = false;
  
  // Alle Felder aus newData durchgehen
  for (const key in newData) {
    // Ignoriere spezielle MongoDB-Felder
    if (key.startsWith('_') || key === 'createdAt' || key === 'updatedAt') {
      continue;
    }
    
    // Nur protokollieren, wenn es einen Unterschied gibt
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
      hasChanges = true;
    }
  }
  
  // Wenn keine Änderungen gefunden wurden, nicht loggen
  if (!hasChanges) {
    return null;
  }
  
  const module = entity + 's'; // Plural-Form, z.B. 'customers'
  const action = 'update';
  const defaultMessage = `${entityName} wurde aktualisiert`;
  
  return this.create({
    level: 'info',
    message: message || defaultMessage,
    userId,
    userName,
    module,
    action,
    entity,
    entityId,
    changes,
    source,
    details: {
      objectName: entityName
    }
  });
};

// Helfer-Methode für Benutzeraktionen mit besserer Kategorisierung
SystemLogSchema.statics.logUserAction = async function(action, entity, entityId, entityName, req, details = {}) {
  try {
    const user = req.user;
    const userId = user ? user.id : 'System';
    const userName = user ? user.name : 'System';
    const module = entity + 's'; // Plural-Form, z.B. 'customers'
    
    // Menschenlesbare Aktionsbeschreibungen
    const actionDescriptions = {
      create: `${entityName} wurde erstellt`,
      update: `${entityName} wurde aktualisiert`,
      delete: `${entityName} wurde gelöscht`,
      view: `${entityName} wurde angezeigt`,
      assign: `${entityName} wurde zugewiesen`,
      status_change: `Status von ${entityName} wurde geändert`,
      login: 'Benutzer hat sich angemeldet',
      logout: 'Benutzer hat sich abgemeldet',
      password_reset: 'Passwort wurde zurückgesetzt',
      password_change: 'Passwort wurde geändert'
    };
    
    const message = actionDescriptions[action] || `${action} - ${entityName}`;
    
    return this.create({
      level: 'info',
      message,
      userId,
      userName,
      module,
      action,
      entity,
      entityId,
      details,
      source: 'user_action',
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Fehler beim Loggen der Benutzeraktion:', error);
    // Bei Fehlern beim Loggen keine Exception werfen, um die Hauptfunktion nicht zu unterbrechen
  }
};

// Methode für Frontend-Logging mit menschenlesbaren Nachrichten
SystemLogSchema.statics.generateReadableLog = function(log) {
  // Basisformat für die lesbare Nachricht
  let readableMessage = log.message;
  
  // Je nach Log-Quelle und Typ unterschiedliche Formatierungen
  if (log.changes && Object.keys(log.changes).length > 0) {
    let changesSummary = [];
    
    // Bestimmte Felder besonders behandeln
    for (const [field, change] of Object.entries(log.changes)) {
      // Status-Änderungen
      if (field === 'status') {
        changesSummary.push(`Status von "${change.old}" zu "${change.new}" geändert`);
      }
      // Zuweisungen
      else if (field === 'assignedTo') {
        if (!change.new) {
          changesSummary.push(`Zuständigkeit entfernt`);
        } else if (!change.old) {
          changesSummary.push(`Zuständigkeit hinzugefügt`);
        } else {
          changesSummary.push(`Zuständigkeit geändert`);
        }
      }
      // Beträge
      else if (field === 'totalAmount' || field === 'subtotal' || field === 'taxAmount') {
        const fieldNames = {
          totalAmount: 'Gesamtbetrag',
          subtotal: 'Zwischensumme',
          taxAmount: 'Steuerbetrag'
        };
        const fieldName = fieldNames[field] || field;
        
        changesSummary.push(`${fieldName} von ${change.old} € auf ${change.new} € geändert`);
      }
      // Arrays (z.B. für Items)
      else if (Array.isArray(change.new)) {
        const oldLength = Array.isArray(change.old) ? change.old.length : 0;
        const newLength = change.new.length;
        
        if (oldLength !== newLength) {
          changesSummary.push(`Anzahl der ${field} von ${oldLength} auf ${newLength} geändert`);
        }
      }
      // Alle anderen Felder
      else {
        changesSummary.push(`${field} geändert`);
      }
    }
    
    if (changesSummary.length > 0) {
      readableMessage += ': ' + changesSummary.join(', ');
    }
  }
  
  return {
    id: log._id,
    timestamp: log.timestamp,
    level: log.level,
    message: readableMessage,
    userName: log.userName,
    source: log.source,
    module: log.module,
    action: log.action,
    entity: log.entity
  };
};

module.exports = mongoose.model('SystemLog', SystemLogSchema);