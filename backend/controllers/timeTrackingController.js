const TimeTracking = require('../models/TimeTracking');
const User = require('../models/User');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');
const { logger } = require('../middleware/logger');
const SystemLog = require('../models/SystemLog');

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
    logger.error(`Fehler beim Abrufen der Zeiterfassungen: ${error.message}`, {
      error: error.stack,
      userId: req.user.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen der Zeiterfassungen: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_access_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'list',
        entity: 'timeTracking'
      }
    );
    
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

    // Auftragsinformationen für besseres Logging abrufen
    const order = await Order.findById(req.params.orderId).select('orderNumber description');
    const orderInfo = order ? `${order.orderNumber} (${order.description?.substring(0, 30) || 'Kein Titel'})` : req.params.orderId;

    // Info-Level-Logging für Abruf von Auftragszeiterfassungen
    logger.info(`Benutzer hat Zeiterfassungen für Auftrag ${orderInfo} abgerufen`, {
      userId: req.user.id,
      userName: req.user.name,
      orderId: req.params.orderId,
      orderNumber: order?.orderNumber,
      timeTrackingsCount: timeTrackings.length
    });
    
    // SystemLog für Auftrags-Zeiterfassungen
    await SystemLog.logInfo(
      `Zeiterfassungen für Auftrag ${orderInfo} abgerufen`,
      req.user.id,
      req.user.name,
      { 
        orderId: req.params.orderId,
        orderNumber: order?.orderNumber,
        timeTrackingsCount: timeTrackings.length,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'timeTracking',
        action: 'list_by_order',
        entity: 'timeTracking',
        entityId: req.params.orderId
      }
    );

    res.status(200).json({
      success: true,
      count: timeTrackings.length,
      data: timeTrackings
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Zeiterfassungen für Auftrag ${req.params.orderId}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      orderId: req.params.orderId
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen der Zeiterfassungen für Auftrag: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        orderId: req.params.orderId
      },
      'data_access_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'list_by_order',
        entity: 'timeTracking'
      }
    );
    
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
      // Nicht gefundene Zeiterfassung loggen
      logger.warn(`Zeiterfassung mit ID ${req.params.id} nicht gefunden`, {
        userId: req.user.id,
        timeTrackingId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierende Zeiterfassung abzurufen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_access_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'view',
          entity: 'timeTracking'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Zugriff loggen
      logger.warn(`Nicht autorisierter Zugriff auf Zeiterfassung: ID ${req.params.id}`, {
        userId: req.user.id,
        userName: req.user.name,
        timeTrackingId: timeTracking._id,
        timeTrackingUser: timeTracking.user
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Zugriff auf Zeiterfassung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingId: timeTracking._id,
          timeTrackingUser: timeTracking.user
        },
        'authorization_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'view',
          entity: 'timeTracking',
          entityId: timeTracking._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Erfolgreiches Abrufen einer Zeiterfassung loggen (Debug-Level, da häufige Operation)
    logger.debug(`Zeiterfassung abgerufen: ID ${timeTracking._id}`, {
      userId: req.user.id,
      timeTrackingId: timeTracking._id,
      description: timeTracking.description,
      duration: timeTracking.duration
    });

    res.status(200).json({
      success: true,
      data: timeTracking
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Zeiterfassung: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      timeTrackingId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen der Zeiterfassung: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        timeTrackingId: req.params.id
      },
      'data_access_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'view',
        entity: 'timeTracking',
        entityId: req.params.id
      }
    );
    
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
    // Validierungsfehler loggen
    logger.warn(`Validierungsfehler beim Erstellen einer Zeiterfassung`, {
      userId: req.user.id,
      validationErrors: errors.array(),
      requestBody: req.body
    });
    
    await SystemLog.logWarning(
      'Validierungsfehler beim Erstellen einer Zeiterfassung',
      req.user.id,
      req.user.name,
      { validationErrors: errors.array() },
      'validation_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'create',
        entity: 'timeTracking'
      }
    );
    
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
      const assignedUser = await User.findById(req.body.assignedTo);
      if (!assignedUser) {
        // Nicht existierenden Benutzer in Zuweisung loggen
        logger.warn(`Versuch, Zeiterfassung mit nicht existierendem Benutzer zu erstellen: ID ${req.body.assignedTo}`, {
          userId: req.user.id,
          assignedToId: req.body.assignedTo
        });
        
        await SystemLog.logWarning(
          `Versuch, Zeiterfassung mit nicht existierendem Benutzer zu erstellen: ID ${req.body.assignedTo}`,
          req.user.id,
          req.user.name,
          { assignedToId: req.body.assignedTo },
          'validation_error',
          req.ip,
          {
            module: 'timeTracking',
            action: 'create',
            entity: 'timeTracking'
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    // Optional: Auftragsinformationen für Logging abrufen, falls vorhanden
    let orderInfo = "Kein Auftrag";
    if (req.body.order) {
      const order = await Order.findById(req.body.order).select('orderNumber');
      if (order) {
        orderInfo = order.orderNumber;
      }
    }

    // Zeiterfassung erstellen und Zeit berechnen
    const timeTracking = await TimeTracking.create(req.body);
    
    // Dauer formatieren (aus Minuten in Stunden:Minuten)
    const durationFormatted = timeTracking.duration ? 
      `${Math.floor(timeTracking.duration / 60)}h ${timeTracking.duration % 60}min` : 
      'nicht berechnet';

    // Erfolgreich erstellte Zeiterfassung loggen
    logger.info(`Neue Zeiterfassung erstellt: ${durationFormatted}`, {
      userId: req.user.id,
      userName: req.user.name,
      timeTrackingId: timeTracking._id,
      description: timeTracking.description,
      duration: timeTracking.duration,
      durationFormatted,
      startTime: timeTracking.startTime,
      endTime: timeTracking.endTime,
      order: timeTracking.order,
      orderNumber: orderInfo
    });
    
    // Erfolgreiche Zeiterfassung in SystemLog protokollieren
    await SystemLog.logInfo(
      `Neue Zeiterfassung erstellt: ${durationFormatted}`,
      req.user.id,
      req.user.name,
      { 
        timeTrackingId: timeTracking._id,
        description: timeTracking.description,
        duration: timeTracking.duration,
        durationFormatted,
        startTime: timeTracking.startTime,
        endTime: timeTracking.endTime,
        order: timeTracking.order,
        orderNumber: orderInfo,
        assignedTo: timeTracking.assignedTo,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'timeTracking',
        action: 'create',
        entity: 'timeTracking',
        entityId: timeTracking._id
      }
    );

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
    
    logger.error(`Fehler beim Erstellen der Zeiterfassung: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      requestBody: req.body
    });
    
    await SystemLog.logError(
      `Fehler beim Erstellen der Zeiterfassung: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        requestData: {
          description: req.body.description,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          order: req.body.order
        }
      },
      'data_operation_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'create',
        entity: 'timeTracking'
      }
    );
    
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
      // Nicht existierenden Arbeitszeiteintrag loggen
      logger.warn(`Versuch, nicht existierende Zeiterfassung zu aktualisieren: ID ${req.params.id}`, {
        userId: req.user.id,
        timeTrackingId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierende Zeiterfassung zu aktualisieren: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'update',
          entity: 'timeTracking'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Aktualisierungsversuch loggen
      logger.warn(`Nicht autorisierter Aktualisierungsversuch für Zeiterfassung: ID ${req.params.id}`, {
        userId: req.user.id,
        timeTrackingId: timeTracking._id,
        timeTrackingUserId: timeTracking.user
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Aktualisierungsversuch für Zeiterfassung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingId: timeTracking._id,
          timeTrackingUserId: timeTracking.user
        },
        'authorization_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'update',
          entity: 'timeTracking',
          entityId: timeTracking._id
        }
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
    
    // Prüfe, ob der zugewiesene Benutzer existiert - nur wenn einer angegeben wurde
    if (req.body.assignedTo) {
      const user = await User.findById(req.body.assignedTo);
      if (!user) {
        // Nicht existierenden zugewiesenen Benutzer loggen
        logger.warn(`Versuch, Zeiterfassung einem nicht existierenden Benutzer zuzuweisen: ID ${req.body.assignedTo}`, {
          userId: req.user.id,
          timeTrackingId: timeTracking._id,
          assignedToId: req.body.assignedTo
        });
        
        await SystemLog.logWarning(
          `Versuch, Zeiterfassung einem nicht existierenden Benutzer zuzuweisen: ID ${req.body.assignedTo}`,
          req.user.id,
          req.user.name,
          { 
            timeTrackingId: timeTracking._id,
            assignedToId: req.body.assignedTo
          },
          'validation_error',
          req.ip,
          {
            module: 'timeTracking',
            action: 'update',
            entity: 'timeTracking',
            entityId: timeTracking._id
          }
        );
        
        return res.status(404).json({
          success: false,
          message: 'Zugewiesener Benutzer nicht gefunden'
        });
      }
    }

    // Alte Daten für Änderungsverfolgung speichern
    const oldData = {
      description: timeTracking.description,
      startTime: timeTracking.startTime,
      endTime: timeTracking.endTime,
      duration: timeTracking.duration,
      order: timeTracking.order ? timeTracking.order.toString() : null,
      assignedTo: timeTracking.assignedTo ? timeTracking.assignedTo.toString() : null,
      billed: timeTracking.billed
    };

    // Zeiterfassung aktualisieren
    timeTracking = await TimeTracking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('order', 'orderNumber description')
      .populate('assignedTo', 'name email');

    // Änderungen identifizieren
    const changes = {};
    let changesMade = false;
    
    for (const key in oldData) {
      // Für ObjectId-Vergleiche
      const oldValue = oldData[key];
      const newValue = key === 'order' || key === 'assignedTo' 
                      ? (timeTracking[key] ? timeTracking[key].toString() : null)
                      : timeTracking[key];
      
      if (oldValue !== newValue) {
        if (key === 'startTime' || key === 'endTime') {
          changes[key] = {
            old: oldData[key] ? new Date(oldData[key]).toLocaleString() : null,
            new: newValue ? new Date(newValue).toLocaleString() : null
          };
        } else {
          changes[key] = {
            old: oldData[key],
            new: newValue
          };
        }
        changesMade = true;
      }
    }

    // Dauer formatieren (aus Minuten in Stunden:Minuten)
    const durationFormatted = timeTracking.duration ? 
      `${Math.floor(timeTracking.duration / 60)}h ${timeTracking.duration % 60}min` : 
      'nicht berechnet';

    // Auftragsinformationen für Logging abrufen, falls vorhanden
    let orderInfo = "Kein Auftrag";
    if (timeTracking.order) {
      const order = await Order.findById(timeTracking.order).select('orderNumber');
      if (order) {
        orderInfo = order.orderNumber;
      }
    }

    // Nur loggen, wenn tatsächlich Änderungen vorgenommen wurden
    if (changesMade) {
      // Abrechnungsstatus-Änderungen besonders wichtig
      if (changes.billed !== undefined) {
        const billingAction = timeTracking.billed ? 'als abgerechnet markiert' : 'als nicht abgerechnet markiert';
        
        logger.info(`Zeiterfassung ${billingAction}: ${timeTracking.description}`, {
          userId: req.user.id,
          userName: req.user.name,
          timeTrackingId: timeTracking._id,
          billed: timeTracking.billed
        });
        
        await SystemLog.logInfo(
          `Zeiterfassung ${billingAction}: ${timeTracking.description}`,
          req.user.id,
          req.user.name,
          { 
            timeTrackingId: timeTracking._id,
            description: timeTracking.description,
            duration: timeTracking.duration,
            durationFormatted,
            billed: timeTracking.billed,
            timestamp: new Date().toISOString()
          },
          'business_event',
          req.ip,
          {
            module: 'timeTracking',
            action: 'change_billing_status',
            entity: 'timeTracking',
            entityId: timeTracking._id,
            changes: {
              billed: {
                old: oldData.billed,
                new: timeTracking.billed
              }
            }
          }
        );
      }
      
      // Zeitänderungen besonders wichtig
      if (changes.startTime || changes.endTime || changes.duration) {
        logger.info(`Zeiterfassung Zeitangaben geändert: ${timeTracking.description}`, {
          userId: req.user.id,
          userName: req.user.name,
          timeTrackingId: timeTracking._id,
          changes: {
            startTime: changes.startTime,
            endTime: changes.endTime,
            duration: changes.duration
          }
        });
        
        await SystemLog.logInfo(
          `Zeiterfassung Zeitangaben geändert: ${timeTracking.description}`,
          req.user.id,
          req.user.name,
          { 
            timeTrackingId: timeTracking._id,
            changes: {
              startTime: changes.startTime,
              endTime: changes.endTime,
              duration: changes.duration
            },
            timestamp: new Date().toISOString()
          },
          'business_event',
          req.ip,
          {
            module: 'timeTracking',
            action: 'update_time',
            entity: 'timeTracking',
            entityId: timeTracking._id,
            changes: {
              startTime: changes.startTime,
              endTime: changes.endTime,
              duration: changes.duration
            }
          }
        );
      }
      
      // Allgemeine Aktualisierung loggen
      logger.info(`Zeiterfassung aktualisiert: ${timeTracking.description}`, {
        userId: req.user.id,
        userName: req.user.name,
        timeTrackingId: timeTracking._id,
        description: timeTracking.description,
        duration: timeTracking.duration,
        durationFormatted,
        order: timeTracking.order,
        orderNumber: orderInfo,
        changes
      });
      
      await SystemLog.logInfo(
        `Zeiterfassung aktualisiert: ${durationFormatted}`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingId: timeTracking._id,
          description: timeTracking.description,
          duration: timeTracking.duration,
          durationFormatted,
          order: timeTracking.order,
          orderNumber: orderInfo,
          changes,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'timeTracking',
          action: 'update',
          entity: 'timeTracking',
          entityId: timeTracking._id,
          changes
        }
      );
    }

    res.status(200).json({
      success: true,
      data: timeTracking
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Zeiterfassung: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      timeTrackingId: req.params.id,
      requestBody: req.body
    });
    
    await SystemLog.logError(
      `Fehler beim Aktualisieren der Zeiterfassung: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        timeTrackingId: req.params.id,
        requestData: {
          description: req.body.description,
          startTime: req.body.startTime,
          endTime: req.body.endTime
        }
      },
      'data_operation_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'update',
        entity: 'timeTracking',
        entityId: req.params.id
      }
    );
    
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
      // Nicht existierenden Arbeitszeiteintrag loggen
      logger.warn(`Versuch, nicht existierende Zeiterfassung zuzuweisen: ID ${req.params.id}`, {
        userId: req.user.id,
        timeTrackingId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierende Zeiterfassung zuzuweisen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'assign',
          entity: 'timeTracking'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Zuweisungsversuch loggen
      logger.warn(`Nicht autorisierter Zuweisungsversuch für Zeiterfassung: ID ${req.params.id}`, {
        userId: req.user.id,
        timeTrackingId: timeTracking._id,
        timeTrackingUserId: timeTracking.user
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Zuweisungsversuch für Zeiterfassung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingId: timeTracking._id,
          timeTrackingUserId: timeTracking.user
        },
        'authorization_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'assign',
          entity: 'timeTracking',
          entityId: timeTracking._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Prüfe, ob der zugewiesene Benutzer existiert
    let assignedUserName = 'Niemand';
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        // Nicht existierenden Benutzer für Zuweisung loggen
        logger.warn(`Versuch, Zeiterfassung einem nicht existierenden Benutzer zuzuweisen: ID ${userId}`, {
          userId: req.user.id,
          timeTrackingId: timeTracking._id,
          assignToUserId: userId
        });
        
        await SystemLog.logWarning(
          `Versuch, Zeiterfassung einem nicht existierenden Benutzer zuzuweisen: ID ${userId}`,
          req.user.id,
          req.user.name,
          { 
            timeTrackingId: timeTracking._id,
            assignToUserId: userId
          },
          'validation_error',
          req.ip,
          {
            module: 'timeTracking',
            action: 'assign',
            entity: 'timeTracking',
            entityId: timeTracking._id
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
    const oldAssignedTo = timeTracking.assignedTo;

    // Hier explizit null setzen, wenn userId null oder leerer String ist
    const updateData = { assignedTo: userId };
    
    logger.debug('Aktualisiere Zeiterfassungszuweisung', {
      timeTrackingId: timeTracking._id,
      description: timeTracking.description,
      oldAssignedTo,
      newAssignedTo: userId,
      updateData
    });

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

    // Zuweisungsnachricht basierend auf Änderungstyp
    let assignmentMessage;
    if (!oldAssignedTo && userId) {
      assignmentMessage = `Zeiterfassung wurde ${assignedUserName} zugewiesen`;
    } else if (oldAssignedTo && !userId) {
      assignmentMessage = `Zuständigkeit für Zeiterfassung wurde entfernt`;
    } else if (oldAssignedTo && userId && String(oldAssignedTo) !== String(userId)) {
      assignmentMessage = `Zuständigkeit für Zeiterfassung wurde neu zugewiesen an ${assignedUserName}`;
    } else {
      assignmentMessage = `Keine Änderung der Zuständigkeit für Zeiterfassung`;
    }

    // Erfolgreiche Zeiterfassungszuweisung loggen, aber nur bei tatsächlicher Änderung
    if (String(oldAssignedTo || '') !== String(userId || '')) {
      logger.info(assignmentMessage, {
        userId: req.user.id,
        timeTrackingId: timeTracking._id,
        description: timeTracking.description,
        oldAssignedTo,
        newAssignedTo: userId
      });
      
      await SystemLog.logInfo(
        `${assignmentMessage}: ${timeTracking.description}`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingId: timeTracking._id,
          description: timeTracking.description,
          oldAssignedTo,
          newAssignedTo: userId,
          newAssignedToName: assignedUserName,
          timestamp: new Date().toISOString()
        },
        'business_event',
        req.ip,
        {
          module: 'timeTracking',
          action: 'assign',
          entity: 'timeTracking',
          entityId: timeTracking._id,
          changes: {
            assignedTo: {
              old: oldAssignedTo,
              new: userId
            }
          }
        }
      );
    }

    res.status(200).json({
      success: true,
      data: timeTracking,
      message: assignmentMessage
    });
  } catch (error) {
    logger.error(`Fehler bei Zeiterfassungszuweisung für ID ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      timeTrackingId: req.params.id,
      assignToUserId: req.body.userId
    });
    
    await SystemLog.logError(
      `Fehler bei Zeiterfassungszuweisung für ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        timeTrackingId: req.params.id,
        assignToUserId: req.body.userId
      },
      'data_operation_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'assign',
        entity: 'timeTracking',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler bei der Zeiterfassungszuweisung'
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
      // Nicht existierenden Arbeitszeiteintrag loggen
      logger.warn(`Versuch, nicht existierende Zeiterfassung zu löschen: ID ${req.params.id}`, {
        userId: req.user.id,
        timeTrackingId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierende Zeiterfassung zu löschen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'delete',
          entity: 'timeTracking'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Arbeitszeiteintrag nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (timeTracking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Löschversuch loggen
      logger.warn(`Nicht autorisierter Löschversuch für Zeiterfassung: ID ${req.params.id}`, {
        userId: req.user.id,
        timeTrackingId: timeTracking._id,
        timeTrackingUserId: timeTracking.user
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Löschversuch für Zeiterfassung: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          timeTrackingId: timeTracking._id,
          timeTrackingUserId: timeTracking.user
        },
        'authorization_warning',
        req.ip,
        {
          module: 'timeTracking',
          action: 'delete',
          entity: 'timeTracking',
          entityId: timeTracking._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Daten für Logging speichern, bevor der Eintrag gelöscht wird
    const timeTrackingInfo = {
      id: timeTracking._id,
      description: timeTracking.description,
      duration: timeTracking.duration,
      startTime: timeTracking.startTime,
      endTime: timeTracking.endTime,
      order: timeTracking.order
    };
    
    // Dauer formatieren (aus Minuten in Stunden:Minuten)
    const durationFormatted = timeTracking.duration ? 
      `${Math.floor(timeTracking.duration / 60)}h ${timeTracking.duration % 60}min` : 
      'nicht berechnet';

    // Auftragsinformationen für Logging abrufen, falls vorhanden
    let orderInfo = "Kein Auftrag";
    if (timeTracking.order) {
      const order = await Order.findById(timeTracking.order).select('orderNumber');
      if (order) {
        orderInfo = order.orderNumber;
      }
    }

    // Hinweis: In neueren Mongoose-Versionen ist remove() veraltet,
    // verwende stattdessen deleteOne()
    await timeTracking.deleteOne();

    // Erfolgreiche Löschung loggen
    logger.info(`Zeiterfassung gelöscht: ${timeTrackingInfo.description} (${durationFormatted})`, {
      userId: req.user.id,
      userName: req.user.name,
      timeTrackingId: timeTrackingInfo.id,
      description: timeTrackingInfo.description,
      duration: timeTrackingInfo.duration,
      durationFormatted,
      startTime: timeTrackingInfo.startTime,
      endTime: timeTrackingInfo.endTime,
      orderInfo
    });
    
    await SystemLog.logInfo(
      `Zeiterfassung gelöscht: ${timeTrackingInfo.description} (${durationFormatted})`,
      req.user.id,
      req.user.name,
      { 
        timeTrackingId: timeTrackingInfo.id,
        description: timeTrackingInfo.description,
        duration: timeTrackingInfo.duration,
        durationFormatted,
        startTime: timeTrackingInfo.startTime,
        endTime: timeTrackingInfo.endTime,
        order: timeTrackingInfo.order,
        orderNumber: orderInfo,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'timeTracking',
        action: 'delete',
        entity: 'timeTracking',
        entityId: timeTrackingInfo.id
      }
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen der Zeiterfassung: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      timeTrackingId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim Löschen der Zeiterfassung: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        timeTrackingId: req.params.id 
      },
      'data_operation_error',
      req.ip,
      {
        module: 'timeTracking',
        action: 'delete',
        entity: 'timeTracking',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};