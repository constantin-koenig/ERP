// backend/middleware/logger.js
const SystemLog = require('../models/SystemLog');

/**
 * Middleware zum Loggen von API-Anfragen
 */
exports.requestLogger = (req, res, next) => {
  // Nur bestimmte Anfragen loggen (keine GET-Anfragen, um die Logs nicht zu überfluten)
  const shouldLog = req.method !== 'GET' && 
                   !req.path.startsWith('/api/logs') &&  // Verhindert Rekursion bei Log-Anfragen
                   !req.path.includes('/public');        // Keine öffentlichen Ressourcen loggen

  if (shouldLog) {
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
        body: sanitizeRequestBody(req.body), // Sensitive Daten entfernen
        userAgent: req.headers['user-agent'],
      },
      source: 'api_request',
      ipAddress: req.ip
    };

    // Asynchron loggen, ohne auf Ergebnis zu warten
    SystemLog.create(logData).catch(err => {
      console.error('Fehler beim Loggen der Anfrage:', err);
    });
  }
  
  // Original response.end speichern
  const originalEnd = res.end;

  // Response.end überschreiben, um HTTP-Status zu erfassen
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Nur loggen, wenn die Anfrage geloggt wurde und der Status >= 400 (Fehler) ist
    if (shouldLog && res.statusCode >= 400) {
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
          userAgent: req.headers['user-agent'],
        },
        source: 'api_response',
        ipAddress: req.ip
      };

      // Asynchron loggen
      SystemLog.create(logData).catch(err => {
        console.error('Fehler beim Loggen der Antwort:', err);
      });
    }
  };

  next();
};

/**
 * Entfernt sensible Daten aus dem Request-Body
 */
function sanitizeRequestBody(body) {
  if (!body) return {};
  
  const sanitized = {...body};
  
  // Sensible Felder entfernen oder maskieren
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.token) sanitized.token = '***';
  if (sanitized.resetPasswordToken) sanitized.resetPasswordToken = '***';
  
  return sanitized;
}

/**
 * Funktion zum einfachen Erstellen von Logs im System
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
    console.error('Fehler beim Erstellen eines Logs:', error);
  }
};