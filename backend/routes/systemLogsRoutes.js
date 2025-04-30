// backend/routes/systemLogsRoutes.js
const express = require('express');
const { check } = require('express-validator');
const {
  getSystemLogs,
  createSystemLog,
  getSystemLogStats,
  exportSystemLogs
} = require('../controllers/systemLogsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Alle systemlog Routen erfordern Admin-Rechte
router.use(protect);
router.use(authorize('admin'));

// Hauptrouten für Logs
router.route('/')
  .get(getSystemLogs)
  .post(
    [
      check('message', 'Log-Nachricht ist erforderlich').not().isEmpty(),
      check('level', 'Ungültiger Log-Level').optional().isIn(['info', 'warning', 'error'])
    ],
    createSystemLog
  );

// Statistiken für Systemlogs
router.get('/stats', getSystemLogStats);

// Export-Route
router.get('/export', exportSystemLogs);

module.exports = router;