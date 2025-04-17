// backend/routes/systemSettingsRoutes.js
const express = require('express');
const { check } = require('express-validator');
const {
  getSystemSettings,
  getPublicSettings,
  updateSystemSettings,
  getTermsAndConditions,
  getPrivacyPolicy
} = require('../controllers/systemSettingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Öffentliche Routen
router.get('/public', getPublicSettings);
router.get('/terms', getTermsAndConditions);
router.get('/privacy', getPrivacyPolicy);

// Geschützte Routen - nur für angemeldete Benutzer
router.get('/', protect, getSystemSettings);

// Admin-Routen
router.put(
  '/',
  [
    protect, 
    authorize('admin'),
    // Validierungen für Updates
    check('companyName', 'Firmenname darf nicht leer sein').optional().not().isEmpty(),
    check('currency', 'Ungültige Währung').optional().isIn(['EUR', 'USD', 'GBP', 'CHF']),
    check('taxRate', 'Steuersatz muss eine Zahl sein').optional().isNumeric(),
    check('paymentTerms', 'Zahlungsfrist muss eine Zahl sein').optional().isNumeric()
  ],
  updateSystemSettings
);

module.exports = router;