// backend/app.js (mit Logging-Middleware)
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger'); // Neue Logging-Middleware importieren
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const systemSettingsRoutes = require('./routes/systemSettingsRoutes');
const systemLogsRoutes = require('./routes/systemLogsRoutes');
const systemStatsRoutes = require('./routes/systemStatsRoutes');
const SystemLog = require('./models/SystemLog'); // Für Systemstart-Logging

const app = express();

// Middleware für Basis-Funktionalitäten
app.use(express.json());
app.use(cors());

// Morgan-Logger für Entwicklungsumgebung
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Unsere eigene Logging-Middleware hinzufügen (nach express.json, da Body-Zugriff benötigt wird)
app.use(requestLogger);

// Datei-Upload-Middleware
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  abortOnLimit: true,
  responseOnLimit: 'Die Dateigröße überschreitet das Limit von 5MB',
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  debug: process.env.NODE_ENV === 'development' // Debug-Modus nur in Entwicklungsumgebung
}));

// Uploads-Verzeichnis als statisches Verzeichnis veröffentlichen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Spezifisches Verzeichnis für Profilbilder
app.use('/uploads/profileImages', express.static(path.join(__dirname, 'uploads', 'profileImages')));

// Wartungsmodus-Middleware
app.use(async (req, res, next) => {
  // Prüfe auf Wartungsmodus, außer für Admin-Routen und öffentliche Systemeinstellungen
  const SystemSettings = require('./models/SystemSettings');
  
  // Pfade, die immer erlaubt sind
  const allowedPaths = [
    '/api/settings',
    '/api/users/login',
    '/api/users',
    '/api/users/me'
  ];
  
  // Wenn der Pfad immer erlaubt ist, fortfahren
  if (allowedPaths.includes(req.path)) {
    return next();
  }
  
  try {
    const settings = await SystemSettings.getSettings();
    
    if (settings.maintenanceMode) {
      // Maintenance-Mode-Zugriff loggen (außer für Resourcen wie CSS/JS/Bilder)
      if (!req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg)$/)) {
        SystemLog.logWarning(
          `Zugriff im Wartungsmodus verweigert: ${req.method} ${req.path}`,
          'System',
          'System',
          { 
            ip: req.ip,
            userAgent: req.headers['user-agent']
          },
          'maintenance_mode'
        ).catch(err => console.error('Logging Error:', err));
      }
      
      return res.status(503).json({
        success: false,
        message: settings.maintenanceMessage || 'Das System wird aktuell gewartet. Bitte versuchen Sie es später noch einmal.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Fehler beim Prüfen des Wartungsmodus:', error);
    // Fehler loggen
    SystemLog.logError(
      `Fehler bei Wartungsmodus-Prüfung: ${error.message}`,
      'System',
      'System',
      { error: error.stack },
      'system_error'
    ).catch(err => console.error('Logging Error:', err));
    
    next();
  }
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/settings', systemSettingsRoutes);
app.use('/api/logs', systemLogsRoutes);
app.use('/api/stats', systemStatsRoutes);

// Fallback-Route
app.use('/', (req, res) => {
  res.send('ERP-System API');
});

// Fehlerbehandlung
app.use(errorHandler);

// System-Start protokollieren (beim Import dieser Datei)
SystemLog.logInfo(
  'System gestartet',
  'System',
  'System',
  {
    nodeEnv: process.env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown'
  },
  'system_startup'
).catch(err => console.error('Fehler beim Protokollieren des Systemstarts:', err));

module.exports = app;