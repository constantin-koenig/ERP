// backend/controllers/customerController.js (mit erweitertem Logging)
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');
const { createLog } = require('../middleware/logger');
const { logger } = require('../middleware/logger');
const SystemLog = require('../models/SystemLog');

// @desc    Alle Kunden abrufen
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ createdBy: req.user.id });

    // Erfolgreiches Abrufen aller Kunden loggen
    logger.debug(`Benutzer ${req.user.name} hat eine Liste von ${customers.length} Kunden abgerufen`, {
      userId: req.user.id,
      customersCount: customers.length
    });
    
    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kunden:', error);
    
    // Fehler beim Abrufen loggen (im SystemLog und Logger)
    logger.error(`Fehler beim Abrufen der Kundenliste: ${error.message}`, {
      userId: req.user.id,
      error: error.stack
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen der Kunden: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack },
      'data_access_error',
      req.ip,
      {
        module: 'customers',
        action: 'list',
        entity: 'customer'
      }
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
      // Nicht gefundenen Kunden loggen
      logger.warn(`Versuch, nicht existierenden Kunden abzurufen: ID ${req.params.id}`, {
        userId: req.user.id,
        customerId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Zugriff auf nicht existierenden Kunden versucht: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_access_warning',
        req.ip,
        {
          module: 'customers',
          action: 'view',
          entity: 'customer'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Zugriff loggen
      logger.warn(`Nicht autorisierter Zugriff auf Kunden: ID ${req.params.id}`, {
        userId: req.user.id,
        customerId: customer._id,
        customerName: customer.name
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Zugriff auf Kunden: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          customerId: customer._id,
          customerName: customer.name,
          ownerUserId: customer.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'customers',
          action: 'view',
          entity: 'customer',
          entityId: customer._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Erfolgreiches Abrufen eines Kunden loggen
    logger.info(`Benutzer ${req.user.name} hat Kundendetails abgerufen: ${customer.name}`, {
      userId: req.user.id,
      customerId: customer._id,
      customerName: customer.name
    });
    
    // Business-Event für Kundendetail-Ansicht
    await SystemLog.logInfo(
      `Kundendetails abgerufen: ${customer.name}`,
      req.user.id,
      req.user.name,
      { 
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'customers',
        action: 'view',
        entity: 'customer',
        entityId: customer._id
      }
    );

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Kunden:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Abrufen des Kunden mit ID ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      customerId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim Abrufen des Kunden mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { error: error.stack, customerId: req.params.id },
      'data_access_error',
      req.ip,
      {
        module: 'customers',
        action: 'view',
        entity: 'customer',
        entityId: req.params.id
      }
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
    // Validierungsfehler loggen
    logger.warn(`Validierungsfehler beim Erstellen eines Kunden durch Benutzer ${req.user.name}`, {
      userId: req.user.id,
      validationErrors: errors.array(),
      requestBody: req.body
    });
    
    await SystemLog.logWarning(
      'Versuch, Kunden mit ungültigen Daten zu erstellen',
      req.user.id,
      req.user.name,
      { validationErrors: errors.array() },
      'validation_error',
      req.ip,
      {
        module: 'customers',
        action: 'create',
        entity: 'customer'
      }
    );
    
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Füge den aktuellen Benutzer als Ersteller hinzu
    req.body.createdBy = req.user.id;

    const customer = await Customer.create(req.body);

    // Erfolgreich erstellten Kunden loggen
    logger.info(`Neuer Kunde erstellt: ${customer.name} von Benutzer ${req.user.name}`, {
      userId: req.user.id,
      customerId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email
    });

    // Erfolgreiche Kundenerstellung loggen
    await SystemLog.logInfo(
      `Neuer Kunde erstellt: ${customer.name}`,
      req.user.id,
      req.user.name,
      { 
        customerId: customer._id,
        customerName: customer.name,
        customerEmail: customer.email,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'customers',
        action: 'create',
        entity: 'customer',
        entityId: customer._id
      }
    );

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Kunden:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Erstellen des Kunden: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      customerData: { 
        name: req.body.name,
        email: req.body.email
      }
    });
    
    await SystemLog.logError(
      `Fehler beim Erstellen des Kunden: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        customerData: { 
          name: req.body.name,
          email: req.body.email
        }
      },
      'data_operation_error',
      req.ip,
      {
        module: 'customers',
        action: 'create',
        entity: 'customer'
      }
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
      // Nicht gefundenen Kunden loggen
      logger.warn(`Versuch, nicht existierenden Kunden zu aktualisieren: ID ${req.params.id}`, {
        userId: req.user.id,
        customerId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierenden Kunden zu aktualisieren: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'customers',
          action: 'update',
          entity: 'customer'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Aktualisierungsversuch loggen
      logger.warn(`Nicht autorisierter Aktualisierungsversuch für Kunden: ID ${req.params.id}`, {
        userId: req.user.id,
        customerId: customer._id,
        customerName: customer.name
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Aktualisierungsversuch für Kunden: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          customerId: customer._id,
          customerName: customer.name,
          ownerUserId: customer.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'customers',
          action: 'update',
          entity: 'customer',
          entityId: customer._id
        }
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
      taxId: customer.taxId,
      notes: customer.notes
    };

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Identifiziere geänderte Felder für detailliertes Logging
    const changes = {};
    let changesMade = false;
    
    for (const key in oldCustomerData) {
      // Für verschachtelte Objekte wie address
      if (key === 'address' && customer.address) {
        // Wenn eines der Adressfelder anders ist
        if (JSON.stringify(oldCustomerData.address) !== JSON.stringify(customer.address)) {
          changes.address = {
            old: oldCustomerData.address,
            new: customer.address
          };
          changesMade = true;
        }
      } 
      // Für einfache Felder
      else if (oldCustomerData[key] !== customer[key]) {
        changes[key] = {
          old: oldCustomerData[key],
          new: customer[key]
        };
        changesMade = true;
      }
    }

    // Erstelle einen lesbaren Text der Änderungen für die Log-Nachricht
    let changesDescription = '';
    if (changesMade) {
      const changedFields = Object.keys(changes);
      changesDescription = `Geänderte Felder: ${changedFields.join(', ')}`;
    } else {
      changesDescription = 'Keine inhaltlichen Änderungen';
    }

    // Erfolgreich aktualisierten Kunden loggen
    logger.info(`Kunde aktualisiert: ${customer.name} von Benutzer ${req.user.name}. ${changesDescription}`, {
      userId: req.user.id,
      customerId: customer._id,
      customerName: customer.name,
      changes
    });

    // Erfolgreiche Kundenaktualisierung loggen
    await SystemLog.logInfo(
      `Kunde aktualisiert: ${customer.name}`,
      req.user.id,
      req.user.name,
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
        },
        changes,
        changesDescription,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'customers',
        action: 'update',
        entity: 'customer',
        entityId: customer._id,
        changes
      }
    );

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kunden:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Aktualisieren des Kunden mit ID ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      customerId: req.params.id,
      updateData: req.body
    });
    
    await SystemLog.logError(
      `Fehler beim Aktualisieren des Kunden mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        customerId: req.params.id,
        updateData: req.body
      },
      'data_operation_error',
      req.ip,
      {
        module: 'customers',
        action: 'update',
        entity: 'customer',
        entityId: req.params.id
      }
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
      // Nicht gefundenen Kunden loggen
      logger.warn(`Versuch, nicht existierenden Kunden zu löschen: ID ${req.params.id}`, {
        userId: req.user.id,
        customerId: req.params.id
      });
      
      await SystemLog.logWarning(
        `Versuch, nicht existierenden Kunden zu löschen: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { requestedId: req.params.id },
        'data_operation_warning',
        req.ip,
        {
          module: 'customers',
          action: 'delete',
          entity: 'customer'
        }
      );
      
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Stellen Sie sicher, dass der Benutzer der Eigentümer ist
    if (customer.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Nicht autorisierten Löschversuch loggen
      logger.warn(`Nicht autorisierter Löschversuch für Kunden: ID ${req.params.id}`, {
        userId: req.user.id,
        customerId: customer._id,
        customerName: customer.name
      });
      
      await SystemLog.logWarning(
        `Nicht autorisierter Löschversuch für Kunden: ID ${req.params.id}`,
        req.user.id,
        req.user.name,
        { 
          customerId: customer._id,
          customerName: customer.name,
          ownerUserId: customer.createdBy
        },
        'authorization_warning',
        req.ip,
        {
          module: 'customers',
          action: 'delete',
          entity: 'customer',
          entityId: customer._id
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Nicht autorisiert'
      });
    }

    // Kundeninformationen vor dem Löschen speichern
    const customerInfo = {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      createdBy: customer.createdBy
    };

    await customer.deleteOne();

    // Erfolgreich gelöschten Kunden loggen
    logger.info(`Kunde gelöscht: ${customerInfo.name} von Benutzer ${req.user.name}`, {
      userId: req.user.id,
      customerId: customerInfo.id,
      customerName: customerInfo.name
    });

    // Erfolgreiche Kundenlöschung loggen
    await SystemLog.logInfo(
      `Kunde gelöscht: ${customerInfo.name}`,
      req.user.id,
      req.user.name,
      { 
        customerId: customerInfo.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerInfo,
        timestamp: new Date().toISOString()
      },
      'business_event',
      req.ip,
      {
        module: 'customers',
        action: 'delete',
        entity: 'customer',
        entityId: customerInfo.id
      }
    );

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Kunden:', error);
    
    // Fehler loggen
    logger.error(`Fehler beim Löschen des Kunden mit ID ${req.params.id}: ${error.message}`, {
      error: error.stack,
      userId: req.user.id,
      customerId: req.params.id
    });
    
    await SystemLog.logError(
      `Fehler beim Löschen des Kunden mit ID ${req.params.id}: ${error.message}`,
      req.user.id,
      req.user.name,
      { 
        error: error.stack,
        customerId: req.params.id
      },
      'data_operation_error',
      req.ip,
      {
        module: 'customers',
        action: 'delete',
        entity: 'customer',
        entityId: req.params.id
      }
    );
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler'
    });
  }
};