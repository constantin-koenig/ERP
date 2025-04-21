const Invoice = require('../models/Invoice');
const TimeTracking = require('../models/TimeTracking');
const { validationResult } = require('express-validator');

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
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
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
    }

    const invoice = await Invoice.create(req.body);

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
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
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
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
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (invoice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Setze arbeitszeitbezogene Einträge als nicht abgerechnet
    if (invoice.timeTracking && invoice.timeTracking.length > 0) {
      await TimeTracking.updateMany(
        { _id: { $in: invoice.timeTracking } },
        { billed: false }
      );
    }

    // Hinweis: In neueren Mongoose-Versionen ist remove() veraltet,
    // verwende stattdessen deleteOne()
    await invoice.deleteOne();

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