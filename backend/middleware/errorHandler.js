// backend/middleware/errorHandler.js
const SystemLog = require('../models/SystemLog');

const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Standardwerte setzen
  let logLevel = 'error';
  let actionType = 'system_error';
  let errorType = 'Server Error';
  let statusCode = 500;
  let success = false;
  
  // Verschiedene Fehlertypen erkennen und kategorisieren
  
  // Mongoose Fehler: ungültige ObjectID
  if (err.name === 'CastError') {
    statusCode = 404;
    errorType = 'Not Found Error';
    error.message = `Ressource nicht gefunden mit der ID: ${err.value}`;
    logLevel = 'warning';
    actionType = 'data_access_error';
  }

  // Mongoose Validierungsfehler
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'Validation Error';
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    logLevel = 'warning';
    actionType = 'validation_error';
  }

  // Mongoose Duplizierungsfehler
  else if (err.code === 11000) {
    statusCode = 400;
    errorType = 'Duplicate Key Error';
    
    // Versuche, den Feldnamen zu extrahieren
    const field = Object.keys(err.keyValue || {})[0] || 'Feld';
    const value = Object.values(err.keyValue || {})[0] || '';
    
    error.message = `${field} '${value}' existiert bereits`;
    logLevel = 'warning';
    actionType = 'validation_error';
  }
  
  // JWT-Fehler
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorType = 'JWT Error';
    error.message = 'Ungültiger Token. Bitte melden Sie sich erneut an.';
    logLevel = 'warning';
    actionType = 'authentication_error';
  }
  
  // JWT-Ablauf-Fehler
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorType = 'Token Expired Error';
    error.message = 'Token abgelaufen. Bitte melden Sie sich erneut an.';
    logLevel = 'info';
    actionType = 'authentication_expired';
  }
  
  // Multer Fehler für Datei-Uploads
  else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    errorType = 'File Size Error';
    error.message = 'Datei zu groß. Maximale Größe: 5MB.';
    logLevel = 'warning';
    actionType = 'upload_error';
  }
  
  // Express-validator Fehler
  else if (err.array && typeof err.array === 'function') {
    statusCode = 400;
    errorType = 'Validation Error';
    error.message = err.array().map(e => e.msg).join(', ');
    logLevel = 'warning';
    actionType = 'validation_error';
  }
  
  // Mongoose Fehler beim Aktualisieren eines nicht existierenden Dokuments
  else if (err.name === 'DocumentNotFoundError') {
    statusCode = 404;
    errorType = 'Not Found Error';
    error.message = 'Die angeforderte Ressource wurde nicht gefunden.';
    logLevel = 'warning';
    actionType = 'data_access_error';
  }
  
  // Statuscode setzen
  error.statusCode = statusCode;
  
  // Fehlerinformationen für das Log vorbereiten
  const logDetails = {
    errorType,
    errorMessage: error.message,
    errorStack: err.stack,
    originalUrl: req.originalUrl,
    method: req.method,
    requestBody: req.body ? JSON.stringify(req.body).substring(0, 1000) : undefined,
    requestParams: req.params,
    requestQuery: req.query
  };
  
  // Benutzerinformationen sammeln
  const userId = req.user ? req.user.id : 'anonymous';
  const userName = req.user ? req.user.name : 'Anonymer Benutzer';
  
  // Fehler in SystemLog protokollieren
  try {
    await SystemLog.createLogEntry(
      logLevel,
      `${errorType}: ${error.message}`,
      userId,
      userName,
      logDetails,
      {
        source: 'error_handler',
        actionType,
        method: req.method,
        path: req.path,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success,
        statusCode
      }
    );
  } catch (logError) {
    // Fehler beim Loggen nicht nach außen weitergeben
    console.error('Fehler beim Protokollieren eines Fehlers:', logError);
  }

  // Antwort an den Client senden
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Serverfehler'
  });
};

module.exports = errorHandler;