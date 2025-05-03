// src/services/systemSettingsService.js - Mit Abrechnungseinstellungen
import axiosInstance from './axiosInstance';

/**
 * Holt die Systemeinstellungen
 * @returns {Promise} - Axios-Promise mit den Systemeinstellungsdaten
 */
export const getSystemSettings = () => {
  return axiosInstance.get('/settings');
};

/**
 * Holt die öffentlichen Systemeinstellungen (für nicht angemeldete Benutzer)
 * @returns {Promise} - Axios-Promise mit den öffentlichen Systemeinstellungsdaten
 */
export const getPublicSettings = () => {
  return axiosInstance.get('/settings/public');
};

/**
 * Aktualisiert die Systemeinstellungen
 * @param {Object} settingsData - Aktualisierte Systemeinstellungsdaten
 * @returns {Promise} - Axios-Promise
 */
export const updateSystemSettings = (settingsData) => {
  return axiosInstance.put('/settings', settingsData);
};

/**
 * Holt die AGB
 * @returns {Promise} - Axios-Promise mit den AGB
 */
export const getTermsAndConditions = () => {
  return axiosInstance.get('/settings/terms');
};

/**
 * Holt die Datenschutzerklärung
 * @returns {Promise} - Axios-Promise mit der Datenschutzerklärung
 */
export const getPrivacyPolicy = () => {
  return axiosInstance.get('/settings/privacy');
};

/**
 * Holt speziell die Abrechnungseinstellungen
 * @returns {Promise} - Axios-Promise mit den Abrechnungseinstellungen
 */
export const getBillingSettings = () => {
  return axiosInstance.get('/settings/billing');
};