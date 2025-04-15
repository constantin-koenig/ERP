const express = require('express');
const { check } = require('express-validator');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder
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

module.exports = router;
