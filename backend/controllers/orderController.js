// backend/controllers/orderController.js (mit erweitertem Logging)
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');
const { logger } = require('../middleware/logger');
const SystemLog = require('../models/SystemLog');

// @desc    Alle Aufträge abrufen
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    // Standardfilter: nur eigene Aufträge
    const filter = { createdBy: req.user.id };
    
    // Erweiterte Filteroptionen
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.customer) {
      filter.customer = req.query.customer;
    }
    
    if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo === 'null' ? null : req.query.assignedTo;
    }
    
    // Sortierung
    const sort = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sort[sortField] = sortOrder;
    } else {
      // Standardsortierung: Erstellungsdatum absteigend (neueste zuerst)
      sort.createdAt = -1;
    }

    const orders = await Order.find(filter)
      .sort(sort)
      .populate('customer', 'name')
      .populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Aufträge: ${error.message}`, {
      error: error.stack,
      userId: req.user.id
    });
    
    // Fehler beim Abrufen loggen
    await SystemLog.logError(
      `Fehler beim Abrufen der Aufträge: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_access_error',
      req.ip,
      {
        module: 'orders',
        action: 'list',
        entity: 'order'
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Aufträge'
    });
  }
};

// @desc    Auftrag nach ID abrufen
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name address contactPerson email phone')
      .populate('assignedTo', 'name email phone');

    if (!order) {
      // Nicht existierenden Auftrag loggen
      logger.warn(`Zugriff auf nicht existierenden Auftrag versucht: ID ${req.params.id}`, {
        userId: req.user.id,
        orderId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Zugriff auf nicht existierenden Auftrag versucht: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_access_warning',
        req.ip,
        {
          module: 'orders',
          action: 'view',
          entity: 'order'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen - Auftragsersteller, zugewiesene Person oder Admin dürfen zugreifen
    if (order.createdBy.toString() !== req.user.id && 
        order.assignedTo?.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      
      // Nicht autorisierten Zugriff loggen
      logger.warn(`Nicht autorisierter Zugriff auf Auftrag: ID ${req.params.id}`, {
        userId: req.user.id,
        orderId: order._id,
        orderNumber: order.orderNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Zugriff auf Auftrag: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy,
          assignedUserId: order.assignedTo
        },
        'authorization_warning',
        req.ip,
        {
          module: 'orders',
          action: 'view',
          entity: 'order',
          entityId: order._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, auf diesen Auftrag zuzugreifen'
      });
    }

    // Erfolgreichen Zugriff loggen (Info-Level für wichtigere Details-Ansichten)
    logger.info(`Auftrag ${order.orderNumber} von Benutzer ${req.user.name} abgerufen`, {
      userId: req.user.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status
    });
    
    // SystemLog für Auftragsdetails
    await SystemLog.logInfo(
      `Auftragsdetails abgerufen: ${order.orderNumber}`,
      req.user.id,
      req.user.name,
      { 
        orderId: order._id,
        orderNumber: order.orderNumber,
        description: order.description ? order.description.substring(0, 50) + (order.description.length > 50 ? '...' : '') : '',
        customer: order.customer ? order.customer._id : null,
        customerName: order.customer ? order.customer.name : null,
        status: order.status,
        assignedTo: order.assignedTo ? order.assignedTo._id : null,
        assignedToName: order.assignedTo ? order.assignedTo.name : null,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'orders',
        action: 'view',
        entity: 'order',
        entityId: order._id
      }
    );

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Auftrags ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      orderId: req.params.id
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Abrufen des Auftrags mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack, orderId: req.params.id },
      'data_access_error',
      req.ip,
      {
        module: 'orders',
        action: 'view',
        entity: 'order',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen des Auftrags'
    });
  }
};

// @desc    Auftrag erstellen
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Validierungsfehler loggen
    logger.warn(`Validierungsfehler beim Erstellen eines Auftrags durch Benutzer ${req.user.name}`, {
      userId: req.user.id,
      validationErrors: errors.array(),
      requestBody: req.body
    });
    
    await SystemLog.logWarning(
      'Versuch, Auftrag mit ungültigen Daten zu erstellen',
      req.user.id,
      req.user.name,
      { validationErrors: errors.array() },
      'validation_error',
      req.ip,
      {
        module: 'orders',
        action: 'create',
        entity: 'order'
      }
    );
    
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
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
    
    // Prüfe, ob der Kunde existiert
    if (req.body.customer) {
      const customer = await Customer.findById(req.body.customer);
      if (!customer) {
        // Nicht existierenden Kunden loggen
        logger.warn(`Versuch, Auftrag mit nicht existierendem Kunden zu erstellen: ID ${req.body.customer}`, {
          userId: req.user.id,
          customerId: req.body.customer
        });
        
        await SystemLog.logWarning(
          `Versuch, Auftrag mit nicht existierendem Kunden zu erstellen: ID ${req.body.customer}`,
          req.user.id,
          req.user.name,
          { customerId: req.body.customer },
          'validation_error',
          req.ip,
          {
            module: 'orders',
            action: 'create',
            entity: 'order'
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Der angegebene Kunde wurde nicht gefunden'
        });
      }
    }
    
    // Prüfe, ob der zugewiesene Benutzer existiert - nur wenn einer angegeben wurde
    if (req.body.assignedTo) {
      const user = await User.findById(req.body.assignedTo);
      if (!user) {
        // Nicht existierenden Benutzer für Zuweisung loggen
        logger.warn(`Versuch, Auftrag mit nicht existierendem Benutzer zu erstellen: ID ${req.body.assignedTo}`, {
          userId: req.user.id,
          assignedToUserId: req.body.assignedTo
        });
        
        await SystemLog.logWarning(
          `Versuch, Auftrag mit nicht existierendem Benutzer zu erstellen: ID ${req.body.assignedTo}`,
          req.user.id,
          req.user.name,
          { assignedToUserId: req.body.assignedTo },
          'validation_error',
          req.ip,
          {
            module: 'orders',
            action: 'create',
            entity: 'order'
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Der zugewiesene Benutzer wurde nicht gefunden'
        });
      }
    }
    
    const order = await Order.create(req.body);
    
    // Kundeninformationen für Logging abrufen
    let customerName = "Kein Kunde";
    if (order.customer) {
      const customer = await Customer.findById(order.customer).select('name');
      if (customer) {
        customerName = customer.name;
      }
    }
    
    // Zugewiesenen Benutzer für Logging abrufen
    let assignedToName = "Niemand";
    if (order.assignedTo) {
      const assignedUser = await User.findById(order.assignedTo).select('name');
      if (assignedUser) {
        assignedToName = assignedUser.name;
      }
    }
    
    // Details für Logs
    const orderDetails = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      customerName,
      description: order.description,
      status: order.status,
      totalAmount: order.totalAmount,
      startDate: order.startDate,
      dueDate: order.dueDate,
      assignedTo: order.assignedTo,
      assignedToName,
      itemsCount: order.items ? order.items.length : 0
    };
    
    // In Winston loggen
    logger.info(`Neuer Auftrag ${order.orderNumber} von Benutzer ${req.user.name} erstellt`, {
      userId: req.user.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer.toString(),
      items: order.items.length,
      status: order.status,
      totalAmount: order.totalAmount
    });
    
    // Erfolgreiche Auftragserstellung im SystemLog protokollieren
    await SystemLog.logInfo(
      `Neuer Auftrag erstellt: ${order.orderNumber}`,
      req.user.id,
      req.user.name,
      orderDetails,
      'business_event',
      req.ip,
      {
        module: 'orders',
        action: 'create',
        entity: 'order',
        entityId: order._id
      }
    );
    
    // Lade die erstellte Entität mit Populationen für die Frontend-Antwort
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name')
      .populate('assignedTo', 'name email');
    
    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen eines Auftrags: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      requestBody: req.body
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Erstellen des Auftrags: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        orderData: {
          customer: req.body.customer,
          description: req.body.description,
          items: req.body.items ? req.body.items.length : 0
        }
      },
      'data_operation_error',
      req.ip,
      {
        module: 'orders',
        action: 'create',
        entity: 'order'
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Erstellen des Auftrags'
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
      // Nicht existierenden Auftrag loggen
      logger.warn(`Versuch, nicht existierenden Auftrag zu aktualisieren: ID ${req.params.id}`, {
        userId: req.user.id,
        orderId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierenden Auftrag zu aktualisieren: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'orders',
          action: 'update',
          entity: 'order'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen - Ersteller oder Admin dürfen aktualisieren
    // Zugewiesener Benutzer darf in der Regel nur bestimmte Felder aktualisieren (hier vereinfacht)
    if (order.createdBy.toString() !== req.user.id && 
        order.assignedTo?.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      
      // Nicht autorisierten Aktualisierungsversuch loggen
      logger.warn(`Nicht autorisierter Aktualisierungsversuch für Auftrag ${order.orderNumber} von Benutzer ${req.user.name}`, {
        userId: req.user.id,
        orderId: order._id,
        orderNumber: order.orderNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Aktualisierungsversuch für Auftrag: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'orders',
          action: 'update',
          entity: 'order',
          entityId: order._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, diesen Auftrag zu aktualisieren'
      });
    }

    // Wichtig: Konvertiere leere Strings in assignedTo zu null
    if (req.body.assignedTo === '') {
      req.body.assignedTo = null;
    }

    // Prüfe, ob der zugewiesene Benutzer existiert (falls angegeben)
    if (req.body.assignedTo) {
      const user = await User.findById(req.body.assignedTo);
      if (!user) {
        // Nicht existierenden Benutzer für Zuweisung loggen
        logger.warn(`Versuch, Auftrag mit nicht existierendem Benutzer zu aktualisieren: ID ${req.body.assignedTo}`, {
          userId: req.user.id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          assignedToUserId: req.body.assignedTo
        });
        
        await SystemLog.logWarning(
          `Versuch, Auftrag mit nicht existierendem Benutzer zu aktualisieren: ID ${req.body.assignedTo}`,
          req.user.id,
          req.user.name,
          { 
            orderId: order._id,
            orderNumber: order.orderNumber,
            assignedToUserId: req.body.assignedTo
          },
          'validation_error',
          req.ip,
          {
            module: 'orders',
            action: 'update',
            entity: 'order',
            entityId: order._id
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Der zugewiesene Benutzer wurde nicht gefunden'
        });
      }
    }

    // Alte Auftragsdaten für Änderungsprotokollierung speichern
    const oldOrderData = {
      status: order.status,
      description: order.description,
      customer: order.customer,
      items: [...order.items],
      totalAmount: order.totalAmount,
      startDate: order.startDate ? order.startDate.toISOString() : null,
      dueDate: order.dueDate ? order.dueDate.toISOString() : null,
      notes: order.notes,
      assignedTo: order.assignedTo
    };

    // Auftrag aktualisieren
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('customer', 'name')
    .populate('assignedTo', 'name email');

    // Änderungen für die Protokollierung ermitteln
    const changes = {};
    
    // Status-Änderung identifizieren (besonders wichtig)
    if (oldOrderData.status !== updatedOrder.status) {
      changes.status = {
        old: oldOrderData.status,
        new: updatedOrder.status
      };
      
      // Separate Logging für Statusänderung
      logger.info(`Status des Auftrags ${updatedOrder.orderNumber} von "${oldOrderData.status}" zu "${updatedOrder.status}" geändert`, {
        userId: req.user.id,
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        oldStatus: oldOrderData.status,
        newStatus: updatedOrder.status
      });
      
      // Separate Statusänderung im System protokollieren
      await SystemLog.logInfo(
        `Status des Auftrags ${updatedOrder.orderNumber} von "${oldOrderData.status}" zu "${updatedOrder.status}" geändert`,
        req.user.id,
        req.user.name,
        { 
          orderId: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          oldStatus: oldOrderData.status,
          newStatus: updatedOrder.status,
          timestamp: new Date().toISOString()
        },
        'status_change',
        req.ip,
        {
          module: 'orders',
          action: 'status_change',
          entity: 'order',
          entityId: updatedOrder._id,
          changes: {
            status: {
              old: oldOrderData.status,
              new: updatedOrder.status
            }
          }
        }
      );
      
      // Bei Auftragsabschluss spezielle Meldung loggen
      if (updatedOrder.status === 'abgeschlossen') {
        logger.info(`Auftrag als abgeschlossen markiert: ${updatedOrder.orderNumber}`, {
          userId: req.user.id,
          orderId: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          customer: updatedOrder.customer ? updatedOrder.customer.toString() : null
        });
        
        await SystemLog.logInfo(
          `Auftrag als abgeschlossen markiert: ${updatedOrder.orderNumber}`,
          req.user.id,
          req.user.name,
          { 
            orderId: updatedOrder._id,
            orderNumber: updatedOrder.orderNumber,
            totalAmount: updatedOrder.totalAmount,
            customer: updatedOrder.customer,
            timestamp: new Date().toISOString()
          },
          'order_completed',
          req.ip,
          {
            module: 'orders',
            action: 'complete',
            entity: 'order',
            entityId: updatedOrder._id
          }
        );
      }
      
      // Bei Stornierung spezielle Meldung loggen
      if (updatedOrder.status === 'storniert') {
        logger.info(`Auftrag storniert: ${updatedOrder.orderNumber}`, {
          userId: req.user.id,
          orderId: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          customer: updatedOrder.customer ? updatedOrder.customer.toString() : null
        });
        
        await SystemLog.logInfo(
          `Auftrag storniert: ${updatedOrder.orderNumber}`,
          req.user.id,
          req.user.name,
          { 
            orderId: updatedOrder._id,
            orderNumber: updatedOrder.orderNumber,
            totalAmount: updatedOrder.totalAmount,
            customer: updatedOrder.customer,
            timestamp: new Date().toISOString()
          },
          'order_cancelled',
          req.ip,
          {
            module: 'orders',
            action: 'cancel',
            entity: 'order',
            entityId: updatedOrder._id
          }
        );
      }
    }
    
    // Zuweisung geändert?
    if (String(oldOrderData.assignedTo || '') !== String(updatedOrder.assignedTo || '')) {
      // Zugewiesenen Benutzer-Namen für Logging abrufen
      let newAssignedToName = "Niemand";
      if (updatedOrder.assignedTo) {
        const assignedUser = updatedOrder.assignedTo.name || "Unbekannter Benutzer";
        newAssignedToName = assignedUser;
      }
      
      changes.assignedTo = {
        old: oldOrderData.assignedTo,
        new: updatedOrder.assignedTo
      };
      
      let assignmentMessage;
      if (!oldOrderData.assignedTo && updatedOrder.assignedTo) {
        assignmentMessage = `Auftrag ${updatedOrder.orderNumber} wurde ${newAssignedToName} zugewiesen`;
      } else if (oldOrderData.assignedTo && !updatedOrder.assignedTo) {
        assignmentMessage = `Zuständigkeit für Auftrag ${updatedOrder.orderNumber} wurde entfernt`;
      } else {
        assignmentMessage = `Zuständigkeit für Auftrag ${updatedOrder.orderNumber} wurde neu zugewiesen an ${newAssignedToName}`;
      }
      
      // Zuweisung separat loggen
      logger.info(assignmentMessage, {
        userId: req.user.id,
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        oldAssignee: oldOrderData.assignedTo,
        newAssignee: updatedOrder.assignedTo
      });
      
      // Zuweisung im System protokollieren
      await SystemLog.logInfo(
        assignmentMessage,
        req.user.id,
        req.user.name,
        { 
          orderId: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          oldAssignee: oldOrderData.assignedTo,
          newAssignee: updatedOrder.assignedTo,
          newAssigneeName: newAssignedToName,
          timestamp: new Date().toISOString()
        },
        'assignment_change',
        req.ip,
        {
          module: 'orders',
          action: 'assign',
          entity: 'order',
          entityId: updatedOrder._id,
          changes: {
            assignedTo: {
              old: oldOrderData.assignedTo,
              new: updatedOrder.assignedTo
            }
          }
        }
      );
    }
    
    // Termine geändert?
    if (oldOrderData.startDate !== (updatedOrder.startDate ? updatedOrder.startDate.toISOString() : null)) {
      changes.startDate = {
        old: oldOrderData.startDate,
        new: updatedOrder.startDate ? updatedOrder.startDate.toISOString() : null
      };
    }
    
    if (oldOrderData.dueDate !== (updatedOrder.dueDate ? updatedOrder.dueDate.toISOString() : null)) {
      changes.dueDate = {
        old: oldOrderData.dueDate,
        new: updatedOrder.dueDate ? updatedOrder.dueDate.toISOString() : null
      };
    }
    
    // Artikeländerungen?
    if (JSON.stringify(oldOrderData.items) !== JSON.stringify(updatedOrder.items)) {
      // Nur Änderungen an der Anzahl der Artikel protokollieren, nicht die Details
      changes.items = {
        old: oldOrderData.items.length,
        new: updatedOrder.items.length
      };
    }
    
    // Betrag geändert?
    if (oldOrderData.totalAmount !== updatedOrder.totalAmount) {
      changes.totalAmount = {
        old: oldOrderData.totalAmount,
        new: updatedOrder.totalAmount
      };
    }
    
    // Beschreibung geändert?
    if (oldOrderData.description !== updatedOrder.description) {
      changes.description = {
        changed: true
      };
    }
    
    // Notizen geändert?
    if (oldOrderData.notes !== updatedOrder.notes) {
      changes.notes = {
        changed: true
      };
    }

    // Hauptlog für die Aktualisierung mit Zusammenfassung der Änderungen
    const changesList = Object.keys(changes);
    let changeDescription = '';
    
    if (changesList.length > 0) {
      changeDescription = 'Geänderte Felder: ' + changesList.join(', ');
    }
    
    logger.info(`Auftrag ${updatedOrder.orderNumber} von Benutzer ${req.user.name} aktualisiert. ${changeDescription}`, {
      userId: req.user.id,
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      changes
    });

    // Erfolgreiche Auftragsaktualisierung loggen
    await SystemLog.logInfo(
      `Auftrag ${updatedOrder.orderNumber} aktualisiert`,
      req.user.id,
      req.user.name,
      { 
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        customer: updatedOrder.customer ? updatedOrder.customer.toString() : null,
        customerName: updatedOrder.customer && updatedOrder.customer.name ? updatedOrder.customer.name : null,
        changes,
        changeDescription,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'orders',
        action: 'update',
        entity: 'order',
        entityId: updatedOrder._id,
        changes
      }
    );

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Auftrags ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      orderId: req.params.id,
      updateData: req.body
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Aktualisieren des Auftrags mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        orderId: req.params.id,
        updateData: req.body
      },
      'data_operation_error',
      req.ip,
      {
        module: 'orders',
        action: 'update',
        entity: 'order',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Aktualisieren des Auftrags'
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
      // Fehlerhafte Zuweisung loggen
      logger.warn(`Fehlerhafte Zuweisung für Auftrag: fehlende userId`, {
        userId: req.user.id,
        orderId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Fehlerhafte Zuweisung für Auftrag: ID ${req.params.id} - userId fehlt`,
        req.user.id,
        req.user.name,
        { orderId: req.params.id },
        'validation_error',
        req.ip,
        {
          module: 'orders',
          action: 'assign',
          entity: 'order'
        }
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
      // Nicht existierenden Auftrag loggen
      logger.warn(`Versuch, nicht existierenden Auftrag zuzuweisen: ID ${req.params.id}`, {
        userId: req.user.id,
        orderId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierenden Auftrag zuzuweisen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'orders',
          action: 'assign',
          entity: 'order'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Zuweisungsversuch loggen
      logger.warn(`Nicht autorisierter Zuweisungsversuch für Auftrag ${order.orderNumber} von Benutzer ${req.user.name}`, {
        userId: req.user.id,
        orderId: order._id,
        orderNumber: order.orderNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Zuweisungsversuch für Auftrag: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'orders',
          action: 'assign',
          entity: 'order',
          entityId: order._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, diesen Auftrag zuzuweisen'
      });
    }

    // Prüfe nur, wenn eine Benutzer-ID angegeben wurde (nicht null oder leerer String)
    let assignedUserName = 'Niemand';
    if (userId) {
      // Prüfe, ob der zugewiesene Benutzer existiert
      const user = await User.findById(userId);
      if (!user) {
        // Nicht existierenden Benutzer loggen
        logger.warn(`Versuch, Auftrag einem nicht existierenden Benutzer zuzuweisen: ID ${userId}`, {
          userId: req.user.id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          assignToUserId: userId
        });
        
        await SystemLog.logWarning(
          `Versuch, Auftrag einem nicht existierenden Benutzer zuzuweisen: ID ${userId}`,
          req.user.id,
          req.user.name,
          { 
            orderId: order._id,
            orderNumber: order.orderNumber
          },
          'validation_error',
          req.ip,
          {
            module: 'orders',
            action: 'assign',
            entity: 'order',
            entityId: order._id
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Der zugewiesene Benutzer wurde nicht gefunden'
        });
      }
      assignedUserName = user.name;
    }

    // Alte Zuweisung für die Protokollierung speichern
    const oldAssignedTo = order.assignedTo;

    // Hier explizit null setzen, wenn userId null oder leerer String ist
    const updateData = { assignedTo: userId };
    
    logger.debug('Aktualisiere Auftragszuweisung', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldAssignedTo,
      newAssignedTo: userId,
      updateData
    });

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

    // Zuweisungsnachricht basierend auf Änderungstyp
    let assignmentMessage;
    if (!oldAssignedTo && userId) {
      assignmentMessage = `Auftrag ${order.orderNumber} wurde ${assignedUserName} zugewiesen`;
    } else if (oldAssignedTo && !userId) {
      assignmentMessage = `Zuständigkeit für Auftrag ${order.orderNumber} wurde entfernt`;
    } else if (oldAssignedTo && userId && String(oldAssignedTo) !== String(userId)) {
      assignmentMessage = `Zuständigkeit für Auftrag ${order.orderNumber} wurde neu zugewiesen an ${assignedUserName}`;
    } else {
      assignmentMessage = `Keine Änderung der Zuständigkeit für Auftrag ${order.orderNumber}`;
    }

    // Erfolgreiche Auftragszuweisung loggen
    logger.info(assignmentMessage, {
      userId: req.user.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldAssignedTo,
      newAssignedTo: userId
    });
    
    await SystemLog.logInfo(
      assignmentMessage,
      req.user.id,
      req.user.name,
      { 
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldAssignedTo,
        newAssignedTo: userId,
        newAssigneeName: assignedUserName,
        timestamp: new Date().toISOString()
      },
      'assignment',
      req.ip,
      {
        module: 'orders',
        action: 'assign',
        entity: 'order',
        entityId: order._id,
        changes: {
          assignedTo: {
            old: oldAssignedTo,
            new: userId
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      data: order,
      message: assignmentMessage
    });
  } catch (error) {
    logger.error(`Fehler bei Auftragszuweisung für ID ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      orderId: req.params.id,
      assignToUserId: req.body.userId
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler bei Auftragszuweisung für ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        orderId: req.params.id,
        userId: req.body.userId
      },
      'data_operation_error',
      req.ip,
      {
        module: 'orders',
        action: 'assign',
        entity: 'order',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler bei der Auftragszuweisung'
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
      // Nicht existierenden Auftrag loggen
      logger.warn(`Versuch, nicht existierenden Auftrag zu löschen: ID ${req.params.id}`, {
        userId: req.user.id,
        orderId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierenden Auftrag zu löschen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'orders',
          action: 'delete',
          entity: 'order'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Auftrag nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen
    if (order.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Löschversuch loggen
      logger.warn(`Nicht autorisierter Löschversuch für Auftrag ${order.orderNumber} von Benutzer ${req.user.name}`, {
        userId: req.user.id,
        orderId: order._id,
        orderNumber: order.orderNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Löschversuch für Auftrag: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          orderId: order._id,
          orderNumber: order.orderNumber,
          ownerUserId: order.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'orders',
          action: 'delete',
          entity: 'order',
          entityId: order._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, diesen Auftrag zu löschen'
      });
    }

    // Kundeninformationen für Logging abrufen
    let customerName = "Kein Kunde";
    if (order.customer) {
      const customer = await Customer.findById(order.customer).select('name');
      if (customer) {
        customerName = customer.name;
      }
    }
    
    // Zugewiesenen Benutzer für Logging abrufen
    let assignedToName = "Niemand";
    if (order.assignedTo) {
      const assignedUser = await User.findById(order.assignedTo).select('name');
      if (assignedUser) {
        assignedToName = assignedUser.name;
      }
    }

    // Auftragsdaten für die Protokollierung speichern
    const orderDetails = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      customerName,
      description: order.description,
      totalAmount: order.totalAmount,
      status: order.status,
      assignedTo: order.assignedTo,
      assignedToName,
      itemsCount: order.items ? order.items.length : 0
    };

    // Delete - In neueren Mongoose-Versionen ist remove() veraltet
    await order.deleteOne();

    // Erfolgreiche Auftragslöschung loggen
    logger.info(`Auftrag ${order.orderNumber} von Benutzer ${req.user.name} gelöscht`, {
      userId: req.user.id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer ? order.customer.toString() : null,
      status: order.status
    });
    
    await SystemLog.logInfo(
      `Auftrag ${order.orderNumber} gelöscht`,
      req.user.id,
      req.user.name,
      orderDetails,
      'business_event',
      req.ip,
      {
        module: 'orders',
        action: 'delete',
        entity: 'order',
        entityId: order._id
      }
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen des Auftrags ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      orderId: req.params.id
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Löschen des Auftrags mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        orderId: req.params.id
      },
      'data_operation_error',
      req.ip,
      {
        module: 'orders',
        action: 'delete',
        entity: 'order',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Löschen des Auftrags'
    });
  }
};