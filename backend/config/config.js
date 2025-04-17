// backend/config/config.js (aktualisiert)
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/erp_system',
  JWT_SECRET: process.env.JWT_SECRET || 'mysecretkey',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || 30,
  
  // SMTP-Konfiguration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_SECURE: process.env.SMTP_SECURE || 'false',
  
  // E-Mail-Absender
  FROM_NAME: process.env.FROM_NAME || 'ERP-System',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@example.com',
  
  // Frontend-URL (für Passwort-Zurücksetzen, Einladungen usw.)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Upload-Verzeichnis für Dateien
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // Max. Dateigröße für Uploads (in Bytes)
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
};