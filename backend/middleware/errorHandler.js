// backend/middleware/errorHandler.js (mit Logging)
const SystemLog = require('../models/SystemLog');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Fehler in Systemlogs protokollieren
  let logLevel = 'error';
  let logSource = 'system_error';
  let errorType = 'Allgemeiner Fehler';
  
  // Mongoose Fehler: ungültige ObjectID
  if (err.name === 'CastError') {
    const message = `Ressource nicht gefunden mit der ID: ${err.value}`;
    error = { message, statusCode: 404 };
    errorType = 'CastError';
    
    // 404-Fehler als Warning statt Error loggen
    logLevel = 'warning';
    logSource = 'data_access_error';
  }

  // Mongoose Validierungsfehler
  else if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
    errorType = 'ValidationError';
    
    // Validierungsfehler als Warning loggen
    logLevel = 'warning';
    logSource = 'validation_error';
  }

  // Mongoose Duplizierungsfehler
  else if (err.code === 11000) {
    const message = `Duplizierter Feldwert eingegeben`;
    error = { message, statusCode: 400 };
    errorType = 'DuplicateKeyError';
    
    // Duplikatsfehler als Warning loggen
    logLevel = 'warning';
    logSource = 'validation_error';
  }
  
  // JWT-Fehler
  else if (err.name === 'JsonWebTokenError') {
    const message = 'Ungültiger Token. Bitte melden Sie sich erneut an.';
    error = { message, statusCode: 401 };
    errorType = 'JWTError';
    
    logLevel = 'warning';
    logSource = 'authentication_error';
  }
  
  // JWT-Ablauf-Fehler
  else if (err.name === 'TokenExpiredError') {
    const message = 'Token abgelaufen. Bitte melden Sie sich erneut an.';
    error = { message, statusCode: 401 };
    errorType = 'TokenExpiredError';
    
    logLevel = 'info'; // Normaler Ablauf, daher nur Info
    logSource = 'authentication_expired';
  }

  // Fehler protokollieren (asynchron, ohne auf Ergebnis zu warten)
  try {
    const userId = req.user ? req.user.id : 'anonymous';
    const userName = req.user ? req.user.name : 'Anonymer Benutzer';
    
    SystemLog.create({
      level: logLevel,
      message: `${errorType}: ${error.message}`,
      userId,
      userName,
      details: {
        errorType,
        path: req.path,
        method: req.method,
        statusCode: error.statusCode || 500,
        errorStack: err.stack
      },
      source: logSource,
      ipAddress: req.ip
    }).catch(logErr => {
      // Fehler beim Loggen nicht nach außen weitergeben
      console.error('Fehler beim Protokollieren eines Fehlers:', logErr);
    });
  } catch (logError) {
    console.error('Fehler beim Erstellen des Fehlerlogs:', logError);
  }

  // Antwort an den Client senden
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Serverfehler'
  });
};

module.exports = errorHandler;