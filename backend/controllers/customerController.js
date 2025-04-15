const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

// @desc    Alle Kunden abrufen
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ createdBy: req.user.id });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Kunden nach ID abrufen
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Kunden erstellen
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Füge den aktuellen Benutzer als Ersteller hinzu
    req.body.createdBy = req.user.id;

    const customer = await Customer.create(req.body);

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Kunden aktualisieren
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};

// @desc    Kunden löschen
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    await customer.remove();

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