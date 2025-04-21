// backend/controllers/orderController.js (aktualisiert)
const Order = require('../models/Order');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Alle Aufträge abrufen
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ createdBy: req.user.id })
      .populate('customer', 'name')
      .populate('assignedTo', 'name email'); // Populate für den zugewiesenen Benutzer

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Auftrag nach ID abrufen
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name')
      .populate('assignedTo', 'name email'); // Populate für den zugewiesenen Benutzer

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

exports.createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // Füge den aktuellen Benutzer als Ersteller hinzu
    req.body.createdBy = req.user.id;
    
    // Generiere Auftragsnummer, falls nicht angegeben
    if (!req.body.orderNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      req.body.orderNumber = `A${year}${month}-${randomNum}`;
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
    
    const order = await Order.create(req.body);
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Auftrag aktualisieren
// @route   PUT /api/orders/:id
// @access  Private
exports.updateOrder = async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Wichtig: Konvertiere leere Strings in assignedTo zu null
    if (req.body.assignedTo === '') {
      req.body.assignedTo = null;
    }

    // Prüfe, ob der zugewiesene Benutzer existiert
    if (req.body.assignedTo) {
      const user = await User.findById(req.body.assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('customer', 'name')
    .populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Zugewiesenen Benutzer ändern
// @route   PUT /api/orders/:id/assign
// @access  Private
exports.assignOrder = async (req, res) => {
  try {
    let { userId } = req.body;
    
    // Behandle verschiedene Fälle für userId
    // Fall 1: userId ist undefined oder nicht vorhanden 
    if (userId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer-ID ist erforderlich oder null für keine Zuweisung'
      });
    }
    
    // Fall 2: userId ist ein leerer String -> konvertiere zu null
    if (userId === '') {
      userId = null;
    }
    
    // Fall 3: userId ist explizit null -> das ist okay

    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Prüfe nur, wenn eine Benutzer-ID angegeben wurde (nicht null oder leerer String)
    if (userId) {
      // Prüfe, ob der zugewiesene Benutzer existiert
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
    
    console.log('Updating order with data:', updateData); // Debug-Ausgabe

    order = await Order.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      {
        new: true,
        runValidators: true
      }
    )
    .populate('customer', 'name')
    .populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.log('Error in assignOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Auftrag löschen
// @route   DELETE /api/orders/:id
// @access  Private
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    await order.deleteOne();

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