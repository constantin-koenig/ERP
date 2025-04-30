// backend/routes/systemStatsRoutes.js
const express = require('express');
const {
  getSystemStats,
  getMonthlyRevenue,
  getCustomerDistribution,
  getOrderStatistics
} = require('../controllers/systemStatsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Alle Statistik-Routen erfordern Admin-Rechte
router.use(protect);
router.use(authorize('admin'));

// Allgemeine Systemstatistiken abrufen
router.get('/', getSystemStats);

// Monatliche Umsätze abrufen
router.get('/monthly-revenue', getMonthlyRevenue);

// Kundenverteilung abrufen
router.get('/customer-distribution', getCustomerDistribution);

// Auftragsstatistiken abrufen
router.get('/order-statistics', getOrderStatistics);

module.exports = router;