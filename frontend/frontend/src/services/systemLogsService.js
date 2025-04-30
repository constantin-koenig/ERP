// frontend/frontend/src/services/systemLogsService.js (Neu)
import axiosInstance from './axiosInstance';

/**
 * Ruft Systemlogs ab
 * @param {Object} filters - Optionale Filter (level, user, startDate, endDate)
 * @param {number} page - Seitennummer für Paginierung
 * @param {number} limit - Anzahl der Einträge pro Seite
 * @returns {Promise} Promise mit Systemlogs
 */
export const getSystemLogs = async (filters = {}, page = 1, limit = 100) => {
  const params = { ...filters, page, limit };
  return axiosInstance.get('/logs', { params });
};

/**
 * Erstellt einen neuen Systemlog
 * @param {Object} logData - Log-Daten (level, message, details, source)
 * @returns {Promise} Promise mit erstelltem Log
 */
export const createSystemLog = async (logData) => {
  return axiosInstance.post('/logs', logData);
};

/**
 * Ruft Systemlog-Statistiken ab
 * @returns {Promise} Promise mit Log-Statistiken
 */
export const getSystemLogStats = async () => {
  return axiosInstance.get('/logs/stats');
};

/**
 * Exportiert Systemlogs als CSV
 * @param {Object} filters - Optionale Filter (level, user, startDate, endDate)
 * @returns {Promise} Promise mit CSV-Daten
 */
export const exportSystemLogs = async (filters = {}) => {
  // Hier muss ein spezieller Downloadmechanismus verwendet werden
  const queryParams = new URLSearchParams(filters).toString();
  const downloadUrl = `${axiosInstance.defaults.baseURL}/logs/export?${queryParams}`;
  
  // Browser-Download auslösen
  window.location.href = downloadUrl;
  
  // Dummy-Promise zurückgeben, da der tatsächliche Download über window.location erfolgt
  return Promise.resolve({ success: true, message: 'Download gestartet' });
};