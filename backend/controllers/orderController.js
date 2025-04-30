// backend/controllers/orderController.js (mit Logging)
const Order = require('../models/Order');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');

// @desc    Alle Aufträge abrufen
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ createdBy: req.user.id })
      .populate('customer', 'name')
      .populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Aufträge:', error);
    
    // Fehler beim Abrufen loggen
    await createLog(
      'error',
      `Fehler beim Abrufen der Aufträge: ${error.message}`,
      req,
      { error: error.stack },
      'data_access_error'
    );
    
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
      .populate('assignedTo', 'name email');

    if (!order) {
      await createLog(
        'warning',
        `Zugriff auf nicht existierenden Auftrag versucht: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_access_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Zugriff auf Auftrag: ID ${req.params.id}`,
        req,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning'
      );
      
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
    console.error('Fehler beim Abrufen des Auftrags:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Abrufen des Auftrags mit ID ${req.params.id}: ${error.message}`,
      req,
      { error: error.stack, orderId: req.params.id },
      'data_access_error'
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

exports.createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    await createLog(
      'warning',
      'Versuch, Auftrag mit ungültigen Daten zu erstellen',
      req,
      { validationErrors: errors.array() },
      'validation_error'
    );
    
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
        await createLog(
          'warning',
          `Versuch, Auftrag mit nicht existierendem Benutzer zu erstellen: ID ${req.body.assignedTo}`,
          req,
          { assignedToUserId: req.body.assignedTo },
          'validation_error'
        );
        
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }
    
    const order = await Order.create(req.body);
    
    // Auftragsdetails für Log definieren
    const orderDetails = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      totalAmount: order.totalAmount,
      assignedTo: order.assignedTo
    };
    
    // Erfolgreiche Auftragserstellung loggen
    await createLog(
      'info',
      `Neuer Auftrag erstellt: ${order.orderNumber}`,
      req,
      orderDetails,
      'order_created'
    );
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.log(error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Erstellen des Auftrags: ${error.message}`,
      req,
      { 
        error: error.stack,
        orderData: {
          customer: req.body.customer,
          description: req.body.description,
          items: req.body.items ? req.body.items.length : 0
        }
      },
      'data_operation_error'
    );
    
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
      await createLog(
        'warning',
        `Versuch, nicht existierenden Auftrag zu aktualisieren: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Aktualisierungsversuch für Auftrag: ID ${req.params.id}`,
        req,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning'
      );
      
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
        await createLog(
          'warning',
          `Versuch, Auftrag mit nicht existierendem Benutzer zu aktualisieren: ID ${req.body.assignedTo}`,
          req,
          { 
            orderId: order._id,
            orderNumber: order.orderNumber,
            assignedToUserId: req.body.assignedTo
          },
          'validation_error'
        );
        
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    // Alte Auftragsdaten für das Log speichern
    const oldOrderData = {
      status: order.status,
      description: order.description,
      totalAmount: order.totalAmount,
      dueDate: order.dueDate,
      assignedTo: order.assignedTo
    };

    order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('customer', 'name')
    .populate('assignedTo', 'name email');

    // Änderungen für das Log ermitteln
    const changes = {};
    for (const [key, value] of Object.entries(oldOrderData)) {
      if (JSON.stringify(value) !== JSON.stringify(order[key])) {
        changes[key] = {
          old: value,
          new: order[key]
        };
      }
    }

    // Erfolgreiche Auftragsaktualisierung loggen
    await createLog(
      'info',
      `Auftrag aktualisiert: ${order.orderNumber}`,
      req,
      { 
        orderId: order._id,
        orderNumber: order.orderNumber,
        changes
      },
      'order_updated'
    );

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.log(error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Aktualisieren des Auftrags mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        orderId: req.params.id,
        updateData: req.body
      },
      'data_operation_error'
    );
    
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
      await createLog(
        'warning',
        `Fehlerhafte Zuweisung für Auftrag: ID ${req.params.id} - userId fehlt`,
        req,
        { orderId: req.params.id },
        'validation_error'
      );
      
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
      await createLog(
        'warning',
        `Versuch, nicht existierenden Auftrag zuzuweisen: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Zuweisungsversuch für Auftrag: ID ${req.params.id}`,
        req,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning'
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Prüfe nur, wenn eine Benutzer-ID angegeben wurde (nicht null oder leerer String)
    let assignedUserName = 'Niemand';
    if (userId) {
      // Prüfe, ob der zugewiesene Benutzer existiert
      const user = await User.findById(userId);
      if (!user) {
        await createLog(
          'warning',
          `Versuch, Auftrag einem nicht existierenden Benutzer zuzuweisen: ID ${userId}`,
          req,
          { 
            orderId: order._id,
            orderNumber: order.orderNumber
          },
          'validation_error'
        );
        
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
      assignedUserName = user.name;
    }

    // Alte Zuweisung für das Log speichern
    const oldAssignedTo = order.assignedTo;

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

    // Erfolgreiche Auftragszuweisung loggen
    await createLog(
      'info',
      `Auftragszuweisung geändert: ${order.orderNumber} zugewiesen an ${assignedUserName}`,
      req,
      { 
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldAssignedTo,
        newAssignedTo: userId
      },
      'order_assigned'
    );

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.log('Error in assignOrder:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler bei Auftragszuweisung für ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        orderId: req.params.id,
        userId: req.body.userId
      },
      'data_operation_error'
    );
    
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
      await createLog(
        'warning',
        `Versuch, nicht existierenden Auftrag zu löschen: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Löschversuch für Auftrag: ID ${req.params.id}`,
        req,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning'
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Auftragsdaten für das Log speichern
    const orderDetails = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      totalAmount: order.totalAmount,
      status: order.status
    };

    await order.deleteOne();

    // Erfolgreiche Auftragslöschung loggen
    await createLog(
      'info',
      `Auftrag gelöscht: ${order.orderNumber}`,
      req,
      orderDetails,
      'order_deleted'
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Löschen des Auftrags mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        orderId: req.params.id
      },
      'data_operation_error'
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};