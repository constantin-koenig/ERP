// backend/controllers/customerController.js (mit Logging)
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');

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
    console.error('Fehler beim Abrufen der Kunden:', error);
    
    // Fehler beim Abrufen loggen
    await createLog(
      'error',
      `Fehler beim Abrufen der Kunden: ${error.message}`,
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

// @desc    Kunden nach ID abrufen
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      await createLog(
        'warning',
        `Zugriff auf nicht existierenden Kunden versucht: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_access_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Zugriff auf Kunden: ID ${req.params.id}`,
        req,
        { 
          customerId: customer._id,
          customerName: customer.name,
          ownerUserId: customer.createdBy
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
      data: customer
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Kunden:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Abrufen des Kunden mit ID ${req.params.id}: ${error.message}`,
      req,
      { error: error.stack, customerId: req.params.id },
      'data_access_error'
    );
    
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
    await createLog(
      'warning',
      'Versuch, Kunden mit ungültigen Daten zu erstellen',
      req,
      { validationErrors: errors.array() },
      'validation_error'
    );
    
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Füge den aktuellen Benutzer als Ersteller hinzu
    req.body.createdBy = req.user.id;

    const customer = await Customer.create(req.body);

    // Erfolgreiche Kundenerstellung loggen
    await createLog(
      'info',
      `Neuer Kunde erstellt: ${customer.name}`,
      req,
      { 
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email
      },
      'customer_created'
    );

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Kunden:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Erstellen des Kunden: ${error.message}`,
      req,
      { 
        error: error.stack,
        customerData: { 
          name: req.body.name,
          email: req.body.email
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

// @desc    Kunden aktualisieren
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      await createLog(
        'warning',
        `Versuch, nicht existierenden Kunden zu aktualisieren: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Aktualisierungsversuch für Kunden: ID ${req.params.id}`,
        req,
        { 
          customerId: customer._id,
          customerName: customer.name,
          ownerUserId: customer.createdBy
        },
        'authorization_warning'
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Alte Kundendaten für das Log und den Vergleich speichern
    const oldCustomerData = {
      name: customer.name,
      email: customer.email,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      address: customer.address,
      taxId: customer.taxId
    };

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Erfolgreiche Kundenaktualisierung loggen
    await createLog(
      'info',
      `Kunde aktualisiert: ${customer.name}`,
      req,
      { 
        customerId: customer._id,
        oldData: oldCustomerData,
        newData: {
          name: customer.name,
          email: customer.email,
          contactPerson: customer.contactPerson,
          phone: customer.phone,
          address: customer.address,
          taxId: customer.taxId
        }
      },
      'customer_updated'
    );

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kunden:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Aktualisieren des Kunden mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        customerId: req.params.id,
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

// @desc    Kunden löschen
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      await createLog(
        'warning',
        `Versuch, nicht existierenden Kunden zu löschen: ID ${req.params.id}`,
        req,
        { requestedId: req.params.id },
        'data_operation_warning'
      );
      
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      await createLog(
        'warning',
        `Nicht autorisierter Löschversuch für Kunden: ID ${req.params.id}`,
        req,
        { 
          customerId: customer._id,
          customerName: customer.name,
          ownerUserId: customer.createdBy
        },
        'authorization_warning'
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    await customer.deleteOne();

    // Erfolgreiche Kundenlöschung loggen
    await createLog(
      'info',
      `Kunde gelöscht: ${customer.name}`,
      req,
      { 
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email
      },
      'customer_deleted'
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Kunden:', error);
    
    // Fehler loggen
    await createLog(
      'error',
      `Fehler beim Löschen des Kunden mit ID ${req.params.id}: ${error.message}`,
      req,
      { 
        error: error.stack,
        customerId: req.params.id
      },
      'data_operation_error'
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};