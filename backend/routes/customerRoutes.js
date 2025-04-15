const express = require('express');
const { check } = require('express-validator');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(
    [
      check('name', 'Kundenname ist erforderlich').not().isEmpty()
    ],
    protect,
    createCustomer
  );

router.route('/:id')
  .get(protect, getCustomer)
  .put(protect, updateCustomer)
  .delete(protect, deleteCustomer);

module.exports = router;