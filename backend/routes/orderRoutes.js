// backend/routes/orderRoutes.js (aktualisiert)
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

router.route('/:id')
  .get(protect, getOrder)
  .put(protect, updateOrder)
  .delete(protect, deleteOrder);

// Neuer Endpunkt für die Zuweisung von Benutzern zu Aufträgen
router.route('/:id/assign')
  .put(protect, assignOrder);

module.exports = router;