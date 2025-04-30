// backend/routes/orderRoutes.js (korrigiert)
const express = require('express');
const { check } = require('express-validator');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  assignOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Route für alle Aufträge: GET und POST
router.route('/')
  .get(protect, getOrders)
  .post(
    [
      check('customer', 'Kunde ist erforderlich').not().isEmpty(),
      check('description', 'Beschreibung ist erforderlich').not().isEmpty(),
      check('items', 'Auftragspositionen sind erforderlich').isArray().not().isEmpty()
    ],
    protect,
    createOrder
  );

// Route für spezifischen Auftrag: GET, PUT und DELETE
router.route('/:id')
  .get(protect, getOrder)
  .put(protect, updateOrder)
  .delete(protect, deleteOrder);  // Hier wurde die Callback-Funktion definiert

// Neuer Endpunkt für die Zuweisung von Benutzern zu Aufträgen
router.route('/:id/assign')
  .put(protect, assignOrder);

module.exports = router;