// src/services/timeTrackingService.js
import axiosInstance from './axiosInstance';

/**
 * Ruft alle Zeiterfassungseinträge vom Server ab
 * @returns {Promise} Promise mit allen Zeiterfassungseinträgen
 */
export const getTimeTrackings = () => {
  return axiosInstance.get('/time-tracking');
};

/**
 * Ruft einen spezifischen Zeiterfassungseintrag vom Server ab
 * @param {string} id - ID des Zeiterfassungseintrags
 * @returns {Promise} Promise mit Zeiterfassungsdaten
 */
export const getTimeTracking = (id) => {
  return axiosInstance.get(`/time-tracking/${id}`);
};

/**
 * Ruft alle Zeiterfassungseinträge für einen bestimmten Auftrag ab
 * @param {string} orderId - ID des Auftrags
 * @returns {Promise} Promise mit Zeiterfassungseinträgen für den Auftrag
 */
export const getTimeTrackingsByOrder = (orderId) => {
  return axiosInstance.get(`/time-tracking/order/${orderId}`);
};

/**
 * Erstellt einen neuen Zeiterfassungseintrag
 * @param {Object} timeData - Zeiterfassungsdaten
 * @returns {Promise} Promise mit dem erstellten Zeiterfassungseintrag
 */
export const createTimeTracking = (timeData) => {
  return axiosInstance.post('/time-tracking', timeData);
};

/**
 * Aktualisiert einen bestehenden Zeiterfassungseintrag
 * @param {string} id - ID des Zeiterfassungseintrags
 * @param {Object} timeData - Aktualisierte Zeiterfassungsdaten
 * @returns {Promise} Promise mit dem aktualisierten Zeiterfassungseintrag
 */
export const updateTimeTracking = (id, timeData) => {
  return axiosInstance.put(`/time-tracking/${id}`, timeData);
};

/**
 * Löscht einen Zeiterfassungseintrag
 * @param {string} id - ID des Zeiterfassungseintrags
 * @returns {Promise} Promise mit Status des Löschvorgangs
 */
export const deleteTimeTracking = (id) => {
  return axiosInstance.delete(`/time-tracking/${id}`);
};

/**
 * Markiert einen Zeiterfassungseintrag als abgerechnet oder nicht abgerechnet
 * @param {string} id - ID des Zeiterfassungseintrags
 * @param {boolean} billed - Abrechnungsstatus
 * @returns {Promise} Promise mit dem aktualisierten Zeiterfassungseintrag
 */
export const updateTimeTrackingBillingStatus = (id, billed) => {
  return axiosInstance.put(`/time-tracking/${id}`, { billed });
};

/**
 * Markiert mehrere Zeiterfassungseinträge als abgerechnet oder nicht abgerechnet
 * @param {Array} ids - Array von IDs der Zeiterfassungseinträge
 * @param {boolean} billed - Abrechnungsstatus
 * @returns {Promise} Promise mit den aktualisierten Zeiterfassungseinträgen
 */
export const bulkUpdateTimeTrackingBillingStatus = (ids, billed) => {
  return axiosInstance.put('/time-tracking/bulk-update', { ids, billed });
};

/**
 * Ruft Statistiken zu Arbeitszeiten ab (z.B. für Dashboard)
 * @returns {Promise} Promise mit Arbeitszeitstatistiken
 */
export const getTimeTrackingStatistics = () => {
  return axiosInstance.get('/time-tracking/statistics');
};

/**
 * Ruft die Gesamtarbeitszeit für einen bestimmten Zeitraum ab
 * @param {Date} startDate - Startdatum des Zeitraums
 * @param {Date} endDate - Enddatum des Zeitraums
 * @returns {Promise} Promise mit der Gesamtarbeitszeit in Minuten
 */
export const getTotalTimeForPeriod = (startDate, endDate) => {
  return axiosInstance.get('/time-tracking/total', {
    params: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  });
};