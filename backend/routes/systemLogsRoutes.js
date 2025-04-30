// backend/routes/systemLogsRoutes.js (aktualisiert mit Bereinigungsfunktion)
const express = require('express');
const { check } = require('express-validator');
const {
  getSystemLogs,
  createSystemLog,
  getSystemLogStats,
  exportSystemLogs,
  getLogFiles,
  getLogFileContent,
  deleteSystemLogs,
  getLogDetails,   // Neue Funktion für Bereinigung
} = require('../controllers/systemLogsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Basiszugriff auf Logs erfordert Admin-Rechte
router.use(protect);
router.use(authorize('admin'));

// Hauptrouten für System-Logs
router.route('/')
  .get(getSystemLogs)
  .post(
    [
      check('message', 'Log-Nachricht ist erforderlich').not().isEmpty(),
      check('level', 'Ungültiger Log-Level').optional().isIn(['info', 'warning', 'error', 'debug'])
    ],
    createSystemLog
  )
  .delete(deleteSystemLogs); // Logs löschen mit Filterkriterien

// Spezifischen Log-Eintrag abrufen
router.get('/:id', getLogDetails);

// Statistiken für Systemlogs
router.get('/stats', getSystemLogStats);

// Export-Route für CSV oder JSON
router.get('/export', exportSystemLogs);

// Logdateien und deren Inhalte
router.get('/files', getLogFiles);
router.get('/files/:filename', getLogFileContent);


// Health-Check-Route (keine Authentifizierung erforderlich)
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logging-System ist funktionsfähig',
    timestamp: new Date()
  });
});

module.exports = router;