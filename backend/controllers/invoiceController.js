// backend/controllers/invoiceController.js (mit erweitertem Logging)
const Invoice = require('../models/Invoice');
const TimeTracking = require('../models/TimeTracking');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');
const { logger } = require('../middleware/logger');
const SystemLog = require('../models/SystemLog');

// @desc    Alle Rechnungen abrufen (mit optionaler Filterung)
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    // Basisfilter für den aktuellen Benutzer
    const filter = { createdBy: req.user.id };
    
    // Erweiterte Filteroptionen
    if (req.query.customer) {
      filter.customer = req.query.customer;
    }
    
    if (req.query.order) {
      filter.order = req.query.order;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Datumsfilter
    if (req.query.startDate && req.query.endDate) {
      filter.issueDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.issueDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.issueDate = { $lte: new Date(req.query.endDate) };
    }
    
    // Betragsfilter
    if (req.query.minAmount && req.query.maxAmount) {
      filter.totalAmount = {
        $gte: parseFloat(req.query.minAmount),
        $lte: parseFloat(req.query.maxAmount)
      };
    } else if (req.query.minAmount) {
      filter.totalAmount = { $gte: parseFloat(req.query.minAmount) };
    } else if (req.query.maxAmount) {
      filter.totalAmount = { $lte: parseFloat(req.query.maxAmount) };
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
    
    // Paginierung (optional)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    // Anzahl der gesamten Ergebnisse für Paginierungsinfo
    const total = await Invoice.countDocuments(filter);

    const invoices = await Invoice.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name')
      .populate('order', 'orderNumber');
    

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: invoices
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Rechnungen: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      filter: req.query
    });
    
    // Fehler beim Abrufen loggen
    await SystemLog.logError(
      `Fehler beim Abrufen der Rechnungen: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        filters: req.query
      },
      'data_access_error',
      req.ip,
      {
        module: 'invoices',
        action: 'list',
        entity: 'invoice'
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Rechnungen'
    });
  }
};

// @desc    Rechnung nach ID abrufen
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name address taxId contactPerson email phone')
      .populate('order', 'orderNumber description')
      .populate({
        path: 'timeTracking',
        populate: {
          path: 'assignedTo',
          select: 'name email'
        }
      });

    if (!invoice) {
      // Nicht gefundene Rechnung loggen
      logger.warn(`Versuch, auf nicht existierende Rechnung zuzugreifen: ID ${req.params.id}`, {
        userId: req.user.id,
        invoiceId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Zugriff auf nicht existierende Rechnung versucht: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_access_warning',
        req.ip,
        {
          module: 'invoices',
          action: 'view',
          entity: 'invoice'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Zugriff loggen
      logger.warn(`Nicht autorisierter Zugriff auf Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name}`, {
        userId: req.user.id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Zugriff auf Rechnung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          ownerUserId: invoice.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'invoices',
          action: 'view',
          entity: 'invoice',
          entityId: invoice._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, auf diese Rechnung zuzugreifen'
      });
    }

    // Erfolgreichen Zugriff loggen
    logger.info(`Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name} abgerufen`, {
      userId: req.user.id,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customer ? invoice.customer._id : null,
      customerName: invoice.customer ? invoice.customer.name : null,
      total: invoice.totalAmount,
      status: invoice.status
    });
    
    // SystemLog für Rechnungsdetailansicht
    await SystemLog.logInfo(
      `Rechnung abgerufen: ${invoice.invoiceNumber}`,
      req.user.id,
      req.user.name,
      { 
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer ? invoice.customer.name : null,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'invoices',
        action: 'view',
        entity: 'invoice',
        entityId: invoice._id
      }
    );

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Rechnung ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      invoiceId: req.params.id
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Abrufen der Rechnung mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        invoiceId: req.params.id
      },
      'data_access_error',
      req.ip,
      {
        module: 'invoices',
        action: 'view',
        entity: 'invoice',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Rechnung'
    });
  }
};

// @desc    Rechnung erstellen
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Validierungsfehler loggen
    logger.warn(`Validierungsfehler beim Erstellen einer Rechnung durch Benutzer ${req.user.name}`, {
      userId: req.user.id,
      validationErrors: errors.array(),
      requestBody: req.body
    });
    
    await SystemLog.logWarning(
      'Versuch, Rechnung mit ungültigen Daten zu erstellen',
      req.user.id,
      req.user.name,
      { validationErrors: errors.array() },
      'validation_error',
      req.ip,
      {
        module: 'invoices',
        action: 'create',
        entity: 'invoice'
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

    // Generiere Rechnungsnummer, falls nicht angegeben
    if (!req.body.invoiceNumber) {
      const date = new Date();
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      req.body.invoiceNumber = `R${year}${month}-${randomNum}`;
    }

    // Prüfe, ob der Kunde existiert
    let customerName = "Unbekannter Kunde";
    if (req.body.customer) {
      const customer = await Customer.findById(req.body.customer);
      if (!customer) {
        // Versuch mit nicht existierendem Kunden loggen
        logger.warn(`Versuch, Rechnung mit nicht existierendem Kunden zu erstellen: ID ${req.body.customer}`, {
          userId: req.user.id,
          customerId: req.body.customer
        });
        
        await SystemLog.logWarning(
          `Versuch, Rechnung mit nicht existierendem Kunden zu erstellen: ID ${req.body.customer}`,
          req.user.id,
          req.user.name,
          { customerId: req.body.customer },
          'validation_error',
          req.ip,
          {
            module: 'invoices',
            action: 'create',
            entity: 'invoice'
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Der angegebene Kunde wurde nicht gefunden'
        });
      }
      customerName = customer.name;
    }

    // Setze arbeitszeitbezogene Einträge als abgerechnet
    if (req.body.timeTracking && req.body.timeTracking.length > 0) {
      // Prüfe, ob alle Zeiterfassungseinträge existieren
      const timeTrackingCount = await TimeTracking.countDocuments({
        _id: { $in: req.body.timeTracking }
      });
      
      if (timeTrackingCount !== req.body.timeTracking.length) {
        // Versuch mit nicht existierenden Zeiterfassungen loggen
        logger.warn(`Versuch, Rechnung mit nicht existierenden Zeiterfassungseinträgen zu erstellen`, {
          userId: req.user.id,
          timeTrackingIds: req.body.timeTracking,
          foundCount: timeTrackingCount,
          expectedCount: req.body.timeTracking.length
        });
        
        await SystemLog.logWarning(
          `Versuch, Rechnung mit nicht existierenden Zeiterfassungseinträgen zu erstellen`,
          req.user.id,
          req.user.name,
          { 
            timeTrackingIds: req.body.timeTracking,
            foundCount: timeTrackingCount,
            expectedCount: req.body.timeTracking.length
          },
          'validation_error',
          req.ip,
          {
            module: 'invoices',
            action: 'create',
            entity: 'invoice'
          }
        );
        
        return res.status(400).json({
          success: false,
          message: 'Einige der angegebenen Zeiterfassungseinträge wurden nicht gefunden'
        });
      }
      
      // Als abgerechnet markieren
      await TimeTracking.updateMany(
        { _id: { $in: req.body.timeTracking } },
        { billed: true }
      );
      
      // Abrechnung der Zeiterfassung loggen
      logger.info(`${req.body.timeTracking.length} Zeiterfassungseinträge als abgerechnet markiert`, {
        userId: req.user.id,
        timeTrackingIds: req.body.timeTracking
      });
      
      await SystemLog.logInfo(
        `${req.body.timeTracking.length} Zeiterfassungseinträge als abgerechnet markiert`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingIds: req.body.timeTracking,
          count: req.body.timeTracking.length,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'invoices',
          action: 'create',
          entity: 'invoice',
          changes: {
            timeTracking: {
              billingStatus: 'billed'
            }
          }
        }
      );
    }

    // Rechnung erstellen
    const invoice = await Invoice.create(req.body);
    
    // Auftragsinformationen für Logging abrufen
    let orderInfo = "Kein Auftrag";
    if (invoice.order) {
      const order = await Order.findById(invoice.order).select('orderNumber');
      if (order) {
        orderInfo = order.orderNumber;
      }
    }

    // Rechnungsdetails für Log sammeln
    const invoiceDetails = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      customerName,
      order: invoice.order,
      orderNumber: orderInfo,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      itemsCount: invoice.items.length,
      timeTrackingCount: invoice.timeTracking ? invoice.timeTracking.length : 0,
      status: invoice.status
    };

    // In Winston loggen
    logger.info(`Neue Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name} erstellt, Betrag: ${invoice.totalAmount}`, {
      userId: req.user.id,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer.toString(),
      totalAmount: invoice.totalAmount,
      status: invoice.status
    });

    // Erfolgreiche Rechnungserstellung im SystemLog protokollieren
    await SystemLog.logInfo(
      `Neue Rechnung erstellt: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
      req.user.id,
      req.user.name,
      invoiceDetails,
      'business_event',
      req.ip,
      {
        module: 'invoices',
        action: 'create',
        entity: 'invoice',
        entityId: invoice._id
      }
    );

    // Benutzerdaten für die Antwort laden
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name')
      .populate('order', 'orderNumber');

    res.status(201).json({
      success: true,
      data: populatedInvoice
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen der Rechnung: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      requestBody: req.body
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Erstellen der Rechnung: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        invoiceData: {
          customer: req.body.customer,
          order: req.body.order,
          itemsCount: req.body.items ? req.body.items.length : 0,
          subtotal: req.body.subtotal
        }
      },
      'data_operation_error',
      req.ip,
      {
        module: 'invoices',
        action: 'create',
        entity: 'invoice'
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Erstellen der Rechnung'
    });
  }
};

// @desc    Rechnung aktualisieren
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    let invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      // Nicht existierende Rechnung loggen
      logger.warn(`Versuch, nicht existierende Rechnung zu aktualisieren: ID ${req.params.id}`, {
        userId: req.user.id,
        invoiceId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierende Rechnung zu aktualisieren: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'invoices',
          action: 'update',
          entity: 'invoice'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Aktualisierungsversuch loggen
      logger.warn(`Nicht autorisierter Aktualisierungsversuch für Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name}`, {
        userId: req.user.id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Aktualisierungsversuch für Rechnung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          ownerUserId: invoice.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'invoices',
          action: 'update',
          entity: 'invoice',
          entityId: invoice._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, diese Rechnung zu aktualisieren'
      });
    }

    // Alte Zeiterfassungsdaten für den Vergleich
    const oldTimeTrackingIds = invoice.timeTracking ? 
      invoice.timeTracking.map(id => id.toString()) : [];
    
    // Prüfen, ob neue Zeiterfassungsdaten hinzugefügt wurden
    if (req.body.timeTracking && req.body.timeTracking.length > 0) {
      // Finde die Einträge, die neu hinzugefügt wurden
      const newTimeTrackingIds = req.body.timeTracking.filter(id => 
        !oldTimeTrackingIds.includes(id.toString())
      );
      
      if (newTimeTrackingIds.length > 0) {
        // Prüfe, ob alle neuen Zeiterfassungseinträge existieren
        const timeTrackingCount = await TimeTracking.countDocuments({
          _id: { $in: newTimeTrackingIds }
        });
        
        if (timeTrackingCount !== newTimeTrackingIds.length) {
          // Versuch mit nicht existierenden Zeiterfassungen loggen
          logger.warn(`Versuch, Rechnung mit nicht existierenden Zeiterfassungseinträgen zu aktualisieren`, {
            userId: req.user.id,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            newTimeTrackingIds,
            foundCount: timeTrackingCount,
            expectedCount: newTimeTrackingIds.length
          });
          
          await SystemLog.logWarning(
            `Versuch, Rechnung mit nicht existierenden Zeiterfassungseinträgen zu aktualisieren`,
            req.user.id,
            req.user.name,
            { 
              invoiceId: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              newTimeTrackingIds,
              foundCount: timeTrackingCount,
              expectedCount: newTimeTrackingIds.length
            },
            'validation_error',
            req.ip,
            {
              module: 'invoices',
              action: 'update',
              entity: 'invoice',
              entityId: invoice._id
            }
          );
          
          return res.status(400).json({
            success: false,
            message: 'Einige der angegebenen Zeiterfassungseinträge wurden nicht gefunden'
          });
        }
        
        // Als abgerechnet markieren
        await TimeTracking.updateMany(
          { _id: { $in: newTimeTrackingIds } },
          { billed: true }
        );
        
        // Abrechnung der Zeiterfassung loggen
        logger.info(`${newTimeTrackingIds.length} neue Zeiterfassungseinträge zur Rechnung ${invoice.invoiceNumber} hinzugefügt und als abgerechnet markiert`, {
          userId: req.user.id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          newTimeTrackingIds
        });
        
        await SystemLog.logInfo(
          `Neue Zeiterfassungseinträge zur Rechnung ${invoice.invoiceNumber} hinzugefügt und als abgerechnet markiert`,
          req.user.id,
          req.user.name,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            newTimeTrackingIds,
            count: newTimeTrackingIds.length,
            timestamp: new Date().toISOString()
          },
          'business_event',
          req.ip,
          {
            module: 'invoices',
            action: 'update',
            entity: 'invoice',
            entityId: invoice._id,
            changes: {
              timeTracking: {
                added: newTimeTrackingIds,
                count: newTimeTrackingIds.length
              }
            }
          }
        );
      }
    }
    
    // Prüfen, ob Zeiterfassungsdaten entfernt wurden
    let removedTimeTrackingIds = [];
    
    if (oldTimeTrackingIds.length > 0) {
      if (!req.body.timeTracking || req.body.timeTracking.length === 0) {
        // Alle Zeiterfassungen entfernt
        removedTimeTrackingIds = oldTimeTrackingIds;
      } else {
        // Nur einige entfernt - finde die, die nicht mehr dabei sind
        const newTimeTrackingIds = req.body.timeTracking.map(id => id.toString());
        removedTimeTrackingIds = oldTimeTrackingIds.filter(id => !newTimeTrackingIds.includes(id));
      }
      
      if (removedTimeTrackingIds.length > 0) {
        // Als nicht abgerechnet markieren
        await TimeTracking.updateMany(
          { _id: { $in: removedTimeTrackingIds } },
          { billed: false }
        );
        
        // Entfernung der Zeiterfassung loggen
        logger.info(`${removedTimeTrackingIds.length} Zeiterfassungseinträge von Rechnung ${invoice.invoiceNumber} entfernt und als nicht abgerechnet markiert`, {
          userId: req.user.id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          removedTimeTrackingIds
        });
        
        await SystemLog.logInfo(
          `Zeiterfassungseinträge von Rechnung ${invoice.invoiceNumber} entfernt und als nicht abgerechnet markiert`,
          req.user.id,
          req.user.name,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            removedTimeTrackingIds,
            count: removedTimeTrackingIds.length,
            timestamp: new Date().toISOString()
          },
          'business_event',
          req.ip,
          {
            module: 'invoices',
            action: 'update',
            entity: 'invoice',
            entityId: invoice._id,
            changes: {
              timeTracking: {
                removed: removedTimeTrackingIds,
                count: removedTimeTrackingIds.length
              }
            }
          }
        );
      }
    }

    // Alter Status für Statusänderungserkennung
    const oldStatus = invoice.status;
    
    // Alte Daten für Änderungsverfolgung
    const oldData = {
      status: invoice.status,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      items: [...invoice.items],
      timeTracking: [...(invoice.timeTracking || [])],
      notes: invoice.notes,
      dueDate: invoice.dueDate
    };

    // Auftragsinformationen für Logging abrufen
    let orderInfo = "Kein Auftrag";
    if (invoice.order) {
      const order = await Order.findById(invoice.order).select('orderNumber');
      if (order) {
        orderInfo = order.orderNumber;
      }
    }

    // Rechnung aktualisieren
    invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('customer', 'name')
    .populate('order', 'orderNumber');

    // Änderungen identifizieren
    const changes = {};
    
    // Status geändert?
    if (oldStatus !== invoice.status) {
      changes.status = {
        old: oldStatus,
        new: invoice.status
      };
      
      // Statusänderung separat loggen
      logger.info(`Rechnungsstatus geändert: ${invoice.invoiceNumber} von "${oldStatus}" zu "${invoice.status}"`, {
        userId: req.user.id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        oldStatus,
        newStatus: invoice.status
      });
      
      await SystemLog.logInfo(
        `Rechnungsstatus geändert: ${invoice.invoiceNumber} von "${oldStatus}" zu "${invoice.status}"`,
        req.user.id,
        req.user.name,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          oldStatus,
          newStatus: invoice.status,
          timestamp: new Date().toISOString()
        },
        'status_change',
        req.ip,
        {
          module: 'invoices',
          action: 'status_change',
          entity: 'invoice',
          entityId: invoice._id,
          changes: {
            status: {
              old: oldStatus,
              new: invoice.status
            }
          }
        }
      );
      
      // Bei Bezahlung spezielle Meldung loggen
      if (invoice.status === 'bezahlt') {
        logger.info(`Rechnung als bezahlt markiert: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`, {
          userId: req.user.id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          customer: invoice.customer.toString()
        });
        
        await SystemLog.logInfo(
          `Rechnung als bezahlt markiert: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
          req.user.id,
          req.user.name,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            customer: invoice.customer,
            orderNumber: orderInfo,
            timestamp: new Date().toISOString()
          },
          'payment',
          req.ip,
          {
            module: 'invoices',
            action: 'pay',
            entity: 'invoice',
            entityId: invoice._id
          }
        );
      }
      
      // Bei Stornierung spezielle Meldung loggen
      if (invoice.status === 'storniert') {
        logger.info(`Rechnung storniert: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`, {
          userId: req.user.id,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          customer: invoice.customer.toString()
        });
        
        await SystemLog.logInfo(
          `Rechnung storniert: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
          req.user.id,
          req.user.name,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            customer: invoice.customer,
            orderNumber: orderInfo,
            timestamp: new Date().toISOString()
          },
          'invoice_cancelled',
          req.ip,
          {
            module: 'invoices',
            action: 'cancel',
            entity: 'invoice',
            entityId: invoice._id
          }
        );
      }
    }
    
    // Weitere Änderungen protokollieren
    if (oldData.subtotal !== invoice.subtotal) {
      changes.subtotal = {
        old: oldData.subtotal,
        new: invoice.subtotal
      };
    }
    
    if (oldData.taxRate !== invoice.taxRate) {
      changes.taxRate = {
        old: oldData.taxRate,
        new: invoice.taxRate
      };
    }
    
    if (oldData.taxAmount !== invoice.taxAmount) {
      changes.taxAmount = {
        old: oldData.taxAmount,
        new: invoice.taxAmount
      };
    }
    
    if (oldData.totalAmount !== invoice.totalAmount) {
      changes.totalAmount = {
        old: oldData.totalAmount,
        new: invoice.totalAmount
      };
    }
    
    // Artikeländerungen - nur die Anzahl protokollieren
    if (JSON.stringify(oldData.items) !== JSON.stringify(invoice.items)) {
      changes.items = {
        oldCount: oldData.items.length,
        newCount: invoice.items.length
      };
    }
    
    // Fälligkeitsdatum geändert?
    if (oldData.dueDate?.toISOString() !== invoice.dueDate?.toISOString()) {
      changes.dueDate = {
        old: oldData.dueDate,
        new: invoice.dueDate
      };
    }
    
    // Notizen geändert?
    if (oldData.notes !== invoice.notes) {
      changes.notes = {
        changed: true
      };
    }

    // Zeiterfassungen geändert?
    if (req.body.timeTracking) {
      changes.timeTracking = {
        added: req.body.timeTracking.length - oldTimeTrackingIds.length,
        removed: removedTimeTrackingIds.length
      };
    }

    // Hauptlog für die Aktualisierung mit Zusammenfassung der Änderungen
    const changesList = Object.keys(changes);
    let changeDescription = '';
    
    if (changesList.length > 0) {
      changeDescription = 'Geänderte Felder: ' + changesList.join(', ');
    }
    
    logger.info(`Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name} aktualisiert. ${changeDescription}`, {
      userId: req.user.id,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      changes
    });

    // Erfolgreiche Rechnungsaktualisierung loggen
    await SystemLog.logInfo(
      `Rechnung ${invoice.invoiceNumber} aktualisiert`,
      req.user.id,
      req.user.name,
      { 
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer ? invoice.customer.toString() : null,
        customerName: invoice.customer ? invoice.customer.name : null,
        orderNumber: orderInfo,
        totalAmount: invoice.totalAmount,
        changes,
        changeDescription,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'invoices',
        action: 'update',
        entity: 'invoice',
        entityId: invoice._id,
        changes
      }
    );

    res.status(200).json({
      success: true,
      data: invoice,
      changes: Object.keys(changes).length > 0 ? changes : null
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Rechnung ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      invoiceId: req.params.id,
      updateData: req.body
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Aktualisieren der Rechnung mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        invoiceId: req.params.id,
        updateData: {
          status: req.body.status,
          subtotal: req.body.subtotal,
          itemsCount: req.body.items ? req.body.items.length : 'nicht angegeben'
        }
      },
      'data_operation_error',
      req.ip,
      {
        module: 'invoices',
        action: 'update',
        entity: 'invoice',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Aktualisieren der Rechnung'
    });
  }
};

// @desc    Rechnung löschen
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      // Nicht existierende Rechnung loggen
      logger.warn(`Versuch, nicht existierende Rechnung zu löschen: ID ${req.params.id}`, {
        userId: req.user.id,
        invoiceId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierende Rechnung zu löschen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'invoices',
          action: 'delete',
          entity: 'invoice'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Zugriffsberechtigungen prüfen
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Löschversuch loggen
      logger.warn(`Nicht autorisierter Löschversuch für Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name}`, {
        userId: req.user.id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Löschversuch für Rechnung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          ownerUserId: invoice.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'invoices',
          action: 'delete',
          entity: 'invoice',
          entityId: invoice._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Sie haben keine Berechtigung, diese Rechnung zu löschen'
      });
    }

    // Prüfen, ob die Rechnung bereits bezahlt ist - in diesem Fall keine Löschung erlauben
    if (invoice.status === 'bezahlt') {
      // Versuch, eine bereits bezahlte Rechnung zu löschen loggen
      logger.warn(`Versuch, eine bereits bezahlte Rechnung zu löschen: ${invoice.invoiceNumber}`, {
        userId: req.user.id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber
      });
      
      await SystemLog.logWarning(
        `Versuch, eine bereits bezahlte Rechnung zu löschen: ${invoice.invoiceNumber}`,
        req.user.id,
        req.user.name,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalAmount: invoice.totalAmount
        },
        'business_rule',
        req.ip,
        {
          module: 'invoices',
          action: 'delete',
          entity: 'invoice',
          entityId: invoice._id
        }
      );
      
      return res.status(400).json({
        success: false,
        message: 'Bezahlte Rechnungen können nicht gelöscht werden. Bitte stornieren Sie die Rechnung stattdessen.'
      });
    }

    // Auftragsinformationen für Logging abrufen
    let orderInfo = "Kein Auftrag";
    if (invoice.order) {
      const order = await Order.findById(invoice.order).select('orderNumber');
      if (order) {
        orderInfo = order.orderNumber;
      }
    }

    // Kundeninformationen für Logging abrufen
    let customerName = "Kein Kunde";
    if (invoice.customer) {
      const customer = await Customer.findById(invoice.customer).select('name');
      if (customer) {
        customerName = customer.name;
      }
    }

    // Rechnungsdetails für die Protokollierung speichern
    const invoiceDetails = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      customerName,
      order: invoice.order,
      orderNumber: orderInfo,
      issueDate: invoice.issueDate,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      itemsCount: invoice.items.length,
      timeTrackingCount: invoice.timeTracking ? invoice.timeTracking.length : 0
    };

    // Setze arbeitszeitbezogene Einträge als nicht abgerechnet
    if (invoice.timeTracking && invoice.timeTracking.length > 0) {
      await TimeTracking.updateMany(
        { _id: { $in: invoice.timeTracking } },
        { billed: false }
      );
      
      // Änderung des Abrechnungsstatus loggen
      logger.info(`${invoice.timeTracking.length} Zeiterfassungseinträge durch Rechnungslöschung als nicht abgerechnet markiert`, {
        userId: req.user.id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        timeTrackingCount: invoice.timeTracking.length
      });
      
      await SystemLog.logInfo(
        `Zeiterfassungseinträge durch Rechnungslöschung als nicht abgerechnet markiert`,
        req.user.id,
        req.user.name,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          timeTrackingIds: invoice.timeTracking,
          count: invoice.timeTracking.length,
          timestamp: new Date().toISOString()
        },
        'time_tracking',
        req.ip,
        {
          module: 'invoices',
          action: 'delete',
          entity: 'invoice',
          entityId: invoice._id,
          changes: {
            timeTracking: {
              billingStatus: 'unbilled',
              count: invoice.timeTracking.length
            }
          }
        }
      );
    }

    // Rechnung löschen
    await invoice.deleteOne();

    // Erfolgreiche Rechnungslöschung loggen
    logger.info(`Rechnung ${invoice.invoiceNumber} von Benutzer ${req.user.name} gelöscht, Betrag: ${invoice.totalAmount}`, {
      userId: req.user.id,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer ? invoice.customer.toString() : null,
      totalAmount: invoice.totalAmount
    });
    
    await SystemLog.logInfo(
      `Rechnung gelöscht: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
      req.user.id,
      req.user.name,
      invoiceDetails,
      'business_event',
      req.ip,
      {
        module: 'invoices',
        action: 'delete',
        entity: 'invoice',
        entityId: invoice._id
      }
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen der Rechnung ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      invoiceId: req.params.id
    });
    
    // Fehler loggen
    await SystemLog.logError(
      `Fehler beim Löschen der Rechnung mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        invoiceId: req.params.id
      },
      'data_operation_error',
      req.ip,
      {
        module: 'invoices',
        action: 'delete',
        entity: 'invoice',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Löschen der Rechnung'
    });
  }
};