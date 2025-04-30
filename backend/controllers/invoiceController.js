// backend/controllers/invoiceController.js (mit Logging)
const Invoice = require('../models/Invoice');
const TimeTracking = require('../models/TimeTracking');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');

// @desc    Alle Rechnungen abrufen (mit optionaler Filterung nach Kunde oder Auftrag)
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    // Basisfilter für den aktuellen Benutzer
    const filter = { createdBy: req.user.id };
    
    // Prüfe auf zusätzliche Filter in der Anfrage
    if (req.query.customer) {
      filter.customer = req.query.customer;
    }
    
    if (req.query.order) {
      filter.order = req.query.order;
    }

    const invoices = await Invoice.find(filter)
      .populate('customer', 'name')
      .populate('order', 'orderNumber');

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungen:', error);
    
    // Fehler beim Abrufen loggen
    await createLog(
      'error',
      `Fehler beim Abrufen der Rechnungen: ${error.message}`,
      req,
      { 
        error: error.stack,
        filters: req.query
      },
      'data_access_error'
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Rechnung nach ID abrufen
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name address taxId')
      .populate('order', 'orderNumber description')
      .populate('timeTracking');

    if (!invoice) {
      await createLog(
        'warning',
        `Zugriff auf nicht existierende Rechnung versucht: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_access_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Zugriff auf Rechnung: ID ${req.params.id}`,
        req,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          ownerUserId: invoice.createdBy
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
      data: invoice
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnung:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Abrufen der Rechnung mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        invoiceId: req.params.id
      },
      'data_access_error'
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Rechnung erstellen
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    await createLog(
      'warning',
      'Versuch, Rechnung mit ungültigen Daten zu erstellen',
      req,
      { validationErrors: errors.array() },
      'validation_error'
    );
    
    return res.status(400).json({ errors: errors.array() });
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

    // Setze arbeitszeitbezogene Einträge als abgerechnet
    if (req.body.timeTracking && req.body.timeTracking.length > 0) {
      await TimeTracking.updateMany(
        { _id: { $in: req.body.timeTracking } },
        { billed: true }
      );
      
      // Abrechnung der Zeiterfassung loggen
      await createLog(
        'info',
        `Zeiterfassungseinträge als abgerechnet markiert`,
        req,
        { 
          timeTrackingIds: req.body.timeTracking,
          count: req.body.timeTracking.length
        },
        'time_tracking_billed'
      );
    }

    const invoice = await Invoice.create(req.body);

    // Rechnungsdetails für Log sammeln
    const invoiceDetails = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      order: invoice.order,
      totalAmount: invoice.totalAmount,
      itemsCount: invoice.items.length,
      status: invoice.status
    };

    // Erfolgreiche Rechnungserstellung loggen
    await createLog(
      'info',
      `Neue Rechnung erstellt: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
      req,
      invoiceDetails,
      'invoice_created'
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
    console.error('Fehler beim Erstellen der Rechnung:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Erstellen der Rechnung: ${error.message}`,
      req,
      { 
        error: error.stack,
        invoiceData: {
          customer: req.body.customer,
          order: req.body.order,
          itemsCount: req.body.items ? req.body.items.length : 0,
          subtotal: req.body.subtotal
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

// @desc    Rechnung aktualisieren
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    let invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      await createLog(
        'warning',
        `Versuch, nicht existierende Rechnung zu aktualisieren: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Aktualisierungsversuch für Rechnung: ID ${req.params.id}`,
        req,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          ownerUserId: invoice.createdBy
        },
        'authorization_warning'
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Alter Status für Statusänderungserkennung
    const oldStatus = invoice.status;

    // Auch alte Zeiterfassungsdaten speichern
    const oldTimeTracking = [...(invoice.timeTracking || [])];
    
    // Prüfen, ob neue Zeiterfassungsdaten hinzugefügt wurden
    if (req.body.timeTracking && req.body.timeTracking.length > 0) {
      // Finde die Einträge, die neu hinzugefügt wurden
      const newTimeTrackingIds = req.body.timeTracking.filter(id => 
        !oldTimeTracking.some(oldId => oldId.toString() === id.toString())
      );
      
      if (newTimeTrackingIds.length > 0) {
        // Als abgerechnet markieren
        await TimeTracking.updateMany(
          { _id: { $in: newTimeTrackingIds } },
          { billed: true }
        );
        
        // Abrechnung der Zeiterfassung loggen
        await createLog(
          'info',
          `Neue Zeiterfassungseinträge zur Rechnung ${invoice.invoiceNumber} hinzugefügt und als abgerechnet markiert`,
          req,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            newTimeTrackingIds,
            count: newTimeTrackingIds.length
          },
          'time_tracking_billed'
        );
      }
    }
    
    // Prüfen, ob Zeiterfassungsdaten entfernt wurden
    if (oldTimeTracking.length > 0 && (!req.body.timeTracking || req.body.timeTracking.length === 0)) {
      // Als nicht abgerechnet markieren
      await TimeTracking.updateMany(
        { _id: { $in: oldTimeTracking } },
        { billed: false }
      );
      
      // Entfernung der Zeiterfassung loggen
      await createLog(
        'info',
        `Zeiterfassungseinträge von Rechnung ${invoice.invoiceNumber} entfernt und als nicht abgerechnet markiert`,
        req,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          removedTimeTrackingIds: oldTimeTracking,
          count: oldTimeTracking.length
        },
        'time_tracking_unbilled'
      );
    } else if (oldTimeTracking.length > 0 && req.body.timeTracking) {
      // Prüfen, ob einzelne Einträge entfernt wurden
      const removedTimeTrackingIds = oldTimeTracking.filter(oldId => 
        !req.body.timeTracking.some(id => id.toString() === oldId.toString())
      );
      
      if (removedTimeTrackingIds.length > 0) {
        // Als nicht abgerechnet markieren
        await TimeTracking.updateMany(
          { _id: { $in: removedTimeTrackingIds } },
          { billed: false }
        );
        
        // Entfernung der Zeiterfassung loggen
        await createLog(
          'info',
          `Einzelne Zeiterfassungseinträge von Rechnung ${invoice.invoiceNumber} entfernt und als nicht abgerechnet markiert`,
          req,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            removedTimeTrackingIds,
            count: removedTimeTrackingIds.length
          },
          'time_tracking_unbilled'
        );
      }
    }

    invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Prüfen, ob sich der Status geändert hat
    if (oldStatus !== invoice.status) {
      // Statusänderung separat loggen
      await createLog(
        'info',
        `Rechnungsstatus geändert: ${invoice.invoiceNumber} von "${oldStatus}" zu "${invoice.status}"`,
        req,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          oldStatus,
          newStatus: invoice.status
        },
        'invoice_status_changed'
      );
      
      // Bei Bezahlung spezielle Meldung loggen
      if (invoice.status === 'bezahlt') {
        await createLog(
          'info',
          `Rechnung als bezahlt markiert: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
          req,
          { 
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            customer: invoice.customer
          },
          'invoice_paid'
        );
      }
    }

    // Erfolgreiche Rechnungsaktualisierung loggen
    await createLog(
      'info',
      `Rechnung aktualisiert: ${invoice.invoiceNumber}`,
      req,
      { 
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        status: invoice.status
      },
      'invoice_updated'
    );

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Rechnung:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Aktualisieren der Rechnung mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        invoiceId: req.params.id,
        updateData: {
          status: req.body.status,
          subtotal: req.body.subtotal,
          itemsCount: req.body.items ? req.body.items.length : 'nicht angegeben'
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

// @desc    Rechnung löschen
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      await createLog(
        'warning',
        `Versuch, nicht existierende Rechnung zu löschen: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Löschversuch für Rechnung: ID ${req.params.id}`,
        req,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          ownerUserId: invoice.createdBy
        },
        'authorization_warning'
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Rechnungsdetails für Log sammeln
    const invoiceDetails = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      order: invoice.order,
      totalAmount: invoice.totalAmount,
      status: invoice.status
    };

    // Setze arbeitszeitbezogene Einträge als nicht abgerechnet
    if (invoice.timeTracking && invoice.timeTracking.length > 0) {
      await TimeTracking.updateMany(
        { _id: { $in: invoice.timeTracking } },
        { billed: false }
      );
      
      // Änderung des Abrechnungsstatus loggen
      await createLog(
        'info',
        `Zeiterfassungseinträge durch Rechnungslöschung als nicht abgerechnet markiert`,
        req,
        { 
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          timeTrackingIds: invoice.timeTracking,
          count: invoice.timeTracking.length
        },
        'time_tracking_unbilled'
      );
    }

    // Hinweis: In neueren Mongoose-Versionen ist remove() veraltet,
    // verwende stattdessen deleteOne()
    await invoice.deleteOne();

    // Erfolgreiche Rechnungslöschung loggen
    await createLog(
      'info',
      `Rechnung gelöscht: ${invoice.invoiceNumber}, Betrag: ${invoice.totalAmount}`,
      req,
      invoiceDetails,
      'invoice_deleted'
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Rechnung:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Löschen der Rechnung mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        invoiceId: req.params.id
      },
      'data_operation_error'
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};