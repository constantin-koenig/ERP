const TimeTracking = require('../models/TimeTracking');
const { validationResult } = require('express-validator');

// @desc    Alle Arbeitszeiteinträge abrufen
// @route   GET /api/time-tracking
// @access  Private
exports.getTimeTrackings = async (req, res) => {
  try {
    const timeTrackings = await TimeTracking.find({ user: req.user.id })
      .populate('order', 'orderNumber description');

    res.status(200).json({
      success: true,
      count: timeTrackings.length,
      data: timeTrackings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Arbeitszeiteinträge für einen bestimmten Auftrag abrufen
// @route   GET /api/time-tracking/order/:orderId
// @access  Private
exports.getTimeTrackingsByOrder = async (req, res) => {
  try {
    const timeTrackings = await TimeTracking.find({
      order: req.params.orderId,
      user: req.user.id
    });

    res.status(200).json({
      success: true,
      count: timeTrackings.length,
      data: timeTrackings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Einen Arbeitszeiteinträge nach ID abrufen
// @route   GET /api/time-tracking/:id
// @access  Private
exports.getTimeTracking = async (req, res) => {
  try {
    const timeTracking = await TimeTracking.findById(req.params.id)
      .populate('order', 'orderNumber description');

    if (!timeTracking) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    res.status(200).json({
      success: true,
      data: timeTracking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Einen Arbeitszeiteintrag erstellen
// @route   POST /api/time-tracking
// @access  Private
exports.createTimeTracking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Füge den aktuellen Benutzer hinzu
    req.body.user = req.user.id;

    const timeTracking = await TimeTracking.create(req.body);

    res.status(201).json({
      success: true,
      data: timeTracking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Einen Arbeitszeiteintrag aktualisieren
// @route   PUT /api/time-tracking/:id
// @access  Private
exports.updateTimeTracking = async (req, res) => {
  try {
    let timeTracking = await TimeTracking.findById(req.params.id);

    if (!timeTracking) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    timeTracking = await TimeTracking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: timeTracking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Einen Arbeitszeiteintrag löschen
// @route   DELETE /api/time-tracking/:id
// @access  Private
exports.deleteTimeTracking = async (req, res) => {
  try {
    const timeTracking = await TimeTracking.findById(req.params.id);

    if (!timeTracking) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Hinweis: In neueren Mongoose-Versionen ist remove() veraltet,
    // verwende stattdessen deleteOne()
    await timeTracking.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};