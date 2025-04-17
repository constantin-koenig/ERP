// frontend/frontend/src/services/systemSettingsService.js
import axiosInstance from './axiosInstance';

/**
 * Systemeinstellungen abrufen (Admin)
 * @returns {Promise} Promise mit Systemeinstellungen
 */
export const getSystemSettings = async () => {
  return axiosInstance.get('/settings');
};

/**
 * Öffentliche Systemeinstellungen abrufen
 * @returns {Promise} Promise mit öffentlichen Systemeinstellungen
 */
export const getPublicSettings = async () => {
  return axiosInstance.get('/settings/public');
};

/**
 * Systemeinstellungen aktualisieren (Admin)
 * @param {Object} settingsData - Aktualisierte Systemeinstellungen
 * @returns {Promise} Promise mit aktualisierten Systemeinstellungen
 */
export const updateSystemSettings = async (settingsData) => {
  return axiosInstance.put('/settings', settingsData);
};

/**
 * AGB abrufen
 * @returns {Promise} Promise mit AGB
 */
export const getTermsAndConditions = async () => {
  return axiosInstance.get('/settings/terms');
};

/**
 * Datenschutzerklärung abrufen
 * @returns {Promise} Promise mit Datenschutzerklärung
 */
export const getPrivacyPolicy = async () => {
  return axiosInstance.get('/settings/privacy');
};