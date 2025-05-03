// backend/routes/systemSettingsRoutes.js (mit neuen Validierungen)
const express = require('express');
const { check } = require('express-validator');
const {
  getSystemSettings,
  getPublicSettings,
  updateSystemSettings,
  getTermsAndConditions,
  getPrivacyPolicy,
  getBillingSettings
} = require('../controllers/systemSettingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Öffentliche Routen
router.get('/public', getPublicSettings);
router.get('/terms', getTermsAndConditions);
router.get('/privacy', getPrivacyPolicy);

// Geschützte Routen - nur für angemeldete Benutzer
router.get('/', protect, getSystemSettings);

// Neue Route für Abrechnungseinstellungen
router.get('/billing', protect, getBillingSettings);

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
    check('paymentTerms', 'Zahlungsfrist muss eine Zahl sein').optional().isNumeric(),
    // Neue Validierungen für Abrechnungseinstellungen
    check('hourlyRate', 'Stundensatz muss eine positive Zahl sein').optional().isFloat({ min: 0 }),
    check('billingInterval', 'Abrechnungsintervall muss 1, 15, 30 oder 60 sein').optional().isIn([1, 15, 30, 60]),
    check('defaultPaymentSchedule', 'Ungültiger Zahlungsplan').optional().isIn(['full', 'installments']),
    check('paymentInstallments.firstRate', 'Erste Rate muss zwischen 0 und 100 liegen').optional().isFloat({ min: 0, max: 100 }),
    check('paymentInstallments.secondRate', 'Zweite Rate muss zwischen 0 und 100 liegen').optional().isFloat({ min: 0, max: 100 }),
    check('paymentInstallments.finalRate', 'Letzte Rate muss zwischen 0 und 100 liegen').optional().isFloat({ min: 0, max: 100 })
  ],
  updateSystemSettings
);

module.exports = router;