const TimeTracking = require('../models/TimeTracking');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Alle Arbeitszeiteinträge abrufen
// @route   GET /api/time-tracking
// @access  Private
exports.getTimeTrackings = async (req, res) => {
  try {
    const timeTrackings = await TimeTracking.find({ user: req.user.id })
      .populate('order', 'orderNumber description')
      .populate('assignedTo', 'name email'); // Benutzer mit einbeziehen

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
    }).populate('assignedTo', 'name email'); // Benutzer mit einbeziehen

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
      .populate('order', 'orderNumber description')
      .populate('assignedTo', 'name email'); // Benutzer mit einbeziehen

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
    
    // Wichtig: Konvertiere leere Strings in assignedTo zu null
    if (req.body.assignedTo === '') {
      req.body.assignedTo = null;
    }
    
    // Prüfe, ob der zugewiesene Benutzer existiert - nur wenn einer angegeben wurde
    if (req.body.assignedTo) {
      const user = await User.findById(req.body.assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    const timeTracking = await TimeTracking.create(req.body);

    // Benutzerdaten für die Antwort laden
    const populatedTimeTracking = await TimeTracking.findById(timeTracking._id)
      .populate('order', 'orderNumber description')
      .populate('assignedTo', 'name email');

    res.status(201).json({
      success: true,
      data: populatedTimeTracking
    });
  } catch (error) {
    console.log(error);
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
    
    // Wichtig: Konvertiere leere Strings in assignedTo zu null
    if (req.body.assignedTo === '') {
      req.body.assignedTo = null;
    }
    
    // Prüfe, ob der zugewiesene Benutzer existiert - nur wenn einer angegeben wurde
    if (req.body.assignedTo) {
      const user = await User.findById(req.body.assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    timeTracking = await TimeTracking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('order', 'orderNumber description')
      .populate('assignedTo', 'name email');

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

// @desc    Zugewiesenen Benutzer ändern
// @route   PUT /api/time-tracking/:id/assign
// @access  Private
exports.assignTimeTracking = async (req, res) => {
  try {
    let { userId } = req.body;
    
    // Behandle verschiedene Fälle für userId
    if (userId === '') {
      userId = null;
    }
    
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

    // Prüfe, ob der zugewiesene Benutzer existiert
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    // Hier explizit null setzen, wenn userId null oder leerer String ist
    const updateData = { assignedTo: userId };

    timeTracking = await TimeTracking.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('order', 'orderNumber description')
    .populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      data: timeTracking
    });
  } catch (error) {
    console.log('Error in assignTimeTracking:', error);
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