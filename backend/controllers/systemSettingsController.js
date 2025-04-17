// backend/controllers/systemSettingsController.js
const SystemSettings = require('../models/SystemSettings');
const { validationResult } = require('express-validator');

// @desc    Systemeinstellungen abrufen
// @route   GET /api/settings
// @access  Private
exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Systemeinstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Systemeinstellungen'
    });
  }
};

// @desc    Öffentliche Systemeinstellungen abrufen (für nicht angemeldete Benutzer)
// @route   GET /api/settings/public
// @access  Public
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // Nur bestimmte Felder zurückgeben, die öffentlich sein sollen
    const publicSettings = {
      companyName: settings.companyName,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      allowRegistration: settings.allowRegistration,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage
    };
    
    res.status(200).json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der öffentlichen Systemeinstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der öffentlichen Systemeinstellungen'
    });
  }
};

// @desc    Systemeinstellungen aktualisieren
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSystemSettings = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Aktuelle Einstellungen abrufen
    let settings = await SystemSettings.getSettings();
    
    // Aktualisierte Felder hinzufügen
    const updatedFields = { ...req.body, updatedBy: req.user.id, updatedAt: Date.now() };
    
    // Einstellungen aktualisieren
    settings = await SystemSettings.findByIdAndUpdate(
      settings._id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Systemeinstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Aktualisieren der Systemeinstellungen'
    });
  }
};

// @desc    AGB abrufen
// @route   GET /api/settings/terms
// @access  Public
exports.getTermsAndConditions = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    res.status(200).json({
      success: true,
      data: {
        termsAndConditions: settings.termsAndConditions
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der AGB:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der AGB'
    });
  }
};

// @desc    Datenschutzerklärung abrufen
// @route   GET /api/settings/privacy
// @access  Public
exports.getPrivacyPolicy = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    res.status(200).json({
      success: true,
      data: {
        privacyPolicy: settings.privacyPolicy
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Datenschutzerklärung:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Datenschutzerklärung'
    });
  }
};