const express = require('express');
const { check } = require('express-validator');
const {
  getTimeTrackings,
  getTimeTracking,
  getTimeTrackingsByOrder,
  createTimeTracking,
  updateTimeTracking,
  deleteTimeTracking,
  assignTimeTracking
} = require('../controllers/timeTrackingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getTimeTrackings)
  .post(
    [
      check('description', 'Beschreibung ist erforderlich').not().isEmpty(),
      check('startTime', 'Startzeit ist erforderlich').not().isEmpty(),
      check('endTime', 'Endzeit ist erforderlich').not().isEmpty()
    ],
    protect,
    createTimeTracking
  );

router.route('/order/:orderId')
  .get(protect, getTimeTrackingsByOrder);

router.route('/:id')
  .get(protect, getTimeTracking)
  .put(protect, updateTimeTracking)
  .delete(protect, deleteTimeTracking);

// Neue Route für die Benutzerzuweisung
router.route('/:id/assign')
  .put(protect, assignTimeTracking);

module.exports = router;