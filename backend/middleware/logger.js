// backend/middleware/logger.js (Erweitert mit Datei-Logging)
const SystemLog = require('../models/SystemLog');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { format } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Stelle sicher, dass das Logs-Verzeichnis existiert
const logDirectory = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Winston Logger konfigurieren
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'erp-api' },
  transports: [
    // Debug und höher werden in die Konsole geloggt
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? '\n' + info.stack : ''}`
        )
      ),
      level: 'debug'
    }),
    // Info und höher werden in die tägliche Log-Datei geschrieben
    new DailyRotateFile({
      dirname: logDirectory,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    // Fehler werden zusätzlich in eine separate Datei geschrieben
    new DailyRotateFile({
      dirname: logDirectory,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});

// Extrahiere sensible Daten aus dem Request-Body
function sanitizeRequestBody(body) {
  if (!body) return {};
  
  const sanitized = {...body};
  
  // Sensible Felder entfernen oder maskieren
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.token) sanitized.token = '***';
  if (sanitized.resetPasswordToken) sanitized.resetPasswordToken = '***';
  if (sanitized.activationToken) sanitized.activationToken = '***';
  if (sanitized.currentPassword) sanitized.currentPassword = '***';
  if (sanitized.newPassword) sanitized.newPassword = '***';
  
  return sanitized;
}

// Funktion zum Extrahieren relevanter Request-Daten für das Logging
function extractRequestData(req) {
  return {
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user ? req.user.id : 'anonymous',
    userName: req.user ? req.user.name : 'Anonymer Benutzer'
  };
}

// Middleware zum Loggen von API-Anfragen
exports.requestLogger = (req, res, next) => {
  // Pfade, die immer vom Logging ausgeschlossen sind
  const excludedPaths = [
    '/api/logs/health', // Health-Check-Anfragen
    '/uploads/',        // Statische Datei-Anfragen
    '/favicon.ico'      // Browser-Icon-Anfragen
  ];
  
  const shouldExclude = excludedPaths.some(path => req.path.startsWith(path));
  
  if (!shouldExclude) {
    const requestData = extractRequestData(req);
    
    // Log-Level basierend auf HTTP-Methode
    if (req.method === 'GET' || req.method === 'OPTIONS') {
      logger.debug(`${req.method} ${req.path}`, { 
        request: requestData,
        type: 'request'
      });
    } else {
      // POST, PUT, DELETE sind potentiell wichtiger und sollten immer geloggt werden
      logger.info(`${req.method} ${req.path}`, { 
        request: requestData,
        type: 'request'
      });
    }
    
    // Systemlog-Eintrag nur für Mutationsoperationen (nicht für GET)
    const shouldCreateSystemLog = 
      req.method !== 'GET' && 
      !req.path.startsWith('/api/logs') &&  
      !req.path.includes('/public');
      
    if (shouldCreateSystemLog) {
      const user = req.user || { id: 'anonymous', name: 'Anonymer Benutzer' };
      const logData = {
        level: 'info',
        message: `${req.method} ${req.path}`,
        userId: user.id,
        userName: user.name,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: sanitizeRequestBody(req.body),
          userAgent: req.headers['user-agent'],
        },
        source: 'api_request',
        ipAddress: req.ip
      };

      // Asynchron in Datenbank loggen, ohne auf Ergebnis zu warten
      SystemLog.create(logData).catch(err => {
        logger.error('Fehler beim Loggen der Anfrage in DB:', err);
      });
    }
  }

  // Response-Logging hinzufügen
  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    if (!shouldExclude) {
      const requestData = extractRequestData(req);
      const logData = {
        request: requestData,
        response: {
          statusCode: res.statusCode,
          responseTime: responseTime + 'ms'
        },
        type: 'response'
      };

      // Log-Level basierend auf Status-Code
      if (res.statusCode >= 500) {
        logger.error(`${req.method} ${req.path} - Status: ${res.statusCode} (${responseTime}ms)`, logData);
      } else if (res.statusCode >= 400) {
        logger.warn(`${req.method} ${req.path} - Status: ${res.statusCode} (${responseTime}ms)`, logData);
      } else if (req.method !== 'GET') {
        logger.info(`${req.method} ${req.path} - Status: ${res.statusCode} (${responseTime}ms)`, logData);
      } else {
        logger.debug(`${req.method} ${req.path} - Status: ${res.statusCode} (${responseTime}ms)`, logData);
      }
      
      // Fehler in der Datenbank loggen
      if (res.statusCode >= 400) {
        const shouldCreateSystemLogForError = 
          !req.path.startsWith('/api/logs') &&  
          !req.path.includes('/public');
          
        if (shouldCreateSystemLogForError) {
          const user = req.user || { id: 'anonymous', name: 'Anonymer Benutzer' };
          
          // Log-Level basierend auf Status-Code
          let level = 'warning';
          if (res.statusCode >= 500) {
            level = 'error';
          }
          
          const logData = {
            level,
            message: `${req.method} ${req.path} - Status: ${res.statusCode}`,
            userId: user.id,
            userName: user.name,
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              responseTime: responseTime,
              userAgent: req.headers['user-agent'],
            },
            source: 'api_response',
            ipAddress: req.ip
          };

          // Asynchron in Datenbank loggen
          SystemLog.create(logData).catch(err => {
            logger.error('Fehler beim Loggen der Antwort in DB:', err);
          });
        }
      }
    }
  };

  next();
};

/**
 * Funktion zum Erstellen von Logs im System
 * @param {string} level - Log-Level ('info', 'warning', 'error')
 * @param {string} message - Log-Nachricht
 * @param {Object} req - Express Request-Objekt (optional)
 * @param {Object} details - Zusätzliche Details (optional)
 * @param {string} source - Log-Quelle (optional)
 */
exports.createLog = async (level, message, req = null, details = {}, source = 'system') => {
  try {
    let userId = 'system';
    let userName = 'System';
    let ipAddress = '';
    
    if (req && req.user) {
      userId = req.user.id;
      userName = req.user.name;
      ipAddress = req.ip;
    }
    
    // In Winston loggen
    const logMethod = logger[level] || logger.info;
    logMethod(`${message} [${source}]`, { 
      userId,
      userName,
      details,
      source,
      ipAddress
    });
    
    // In Datenbank loggen
    await SystemLog.create({
      level,
      message,
      userId,
      userName,
      details,
      source,
      ipAddress
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen eines Logs:', error);
  }
};

// Winston-Logger für direkte Verwendung in anderen Modulen exportieren
exports.logger = logger;