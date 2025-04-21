// src/services/orderService.js (aktualisiert)
import axiosInstance from './axiosInstance';

/**
 * Ruft alle Aufträge vom Server ab
 * @returns {Promise} Promise mit allen Aufträgen
 */
export const getOrders = () => {
  return axiosInstance.get('/orders');
};

/**
 * Ruft einen spezifischen Auftrag vom Server ab
 * @param {string} id - ID des Auftrags
 * @returns {Promise} Promise mit Auftragsdaten
 */
export const getOrder = (id) => {
  return axiosInstance.get(`/orders/${id}`);
};

/**
 * Erstellt einen neuen Auftrag
 * @param {Object} orderData - Auftragsdaten
 * @returns {Promise} Promise mit dem erstellten Auftrag
 */
export const createOrder = (orderData) => {
  return axiosInstance.post('/orders', orderData);
};

/**
 * Aktualisiert einen bestehenden Auftrag
 * @param {string} id - ID des Auftrags
 * @param {Object} orderData - Aktualisierte Auftragsdaten
 * @returns {Promise} Promise mit dem aktualisierten Auftrag
 */
export const updateOrder = (id, orderData) => {
  return axiosInstance.put(`/orders/${id}`, orderData);
};

/**
 * Löscht einen Auftrag
 * @param {string} id - ID des Auftrags
 * @returns {Promise} Promise mit Status des Löschvorgangs
 */
export const deleteOrder = (id) => {
  return axiosInstance.delete(`/orders/${id}`);
};

/**
 * Aktualisiert den Status eines Auftrags
 * @param {string} id - ID des Auftrags
 * @param {string} status - Neuer Status ('neu', 'in Bearbeitung', 'abgeschlossen', 'storniert')
 * @returns {Promise} Promise mit dem aktualisierten Auftrag
 */
export const updateOrderStatus = (id, status) => {
  return axiosInstance.put(`/orders/${id}`, { status });
};

/**
 * Weist einen Benutzer einem Auftrag zu oder hebt die Zuweisung auf
 * @param {string} id - ID des Auftrags
 * @param {string|null} userId - ID des Benutzers oder null für Aufhebung der Zuweisung
 * @returns {Promise} Promise mit dem aktualisierten Auftrag
 */
export const assignOrder = (id, userId) => {
  return axiosInstance.put(`/orders/${id}/assign`, { userId });
};

/**
 * Ruft alle Aufträge für einen bestimmten Kunden ab
 * @param {string} customerId - ID des Kunden
 * @returns {Promise} Promise mit Aufträgen des Kunden
 */
export const getOrdersByCustomer = (customerId) => {
  return axiosInstance.get('/orders', {
    params: { customer: customerId }
  });
};

/**
 * Ruft Statistiken zu Aufträgen ab (z.B. für Dashboard)
 * @returns {Promise} Promise mit Auftragsstatistiken
 */
export const getOrderStatistics = () => {
  return axiosInstance.get('/orders/statistics');
};

/**
 * Berechnet den Gesamtumsatz für einen bestimmten Zeitraum
 * @param {Date} startDate - Startdatum des Zeitraums
 * @param {Date} endDate - Enddatum des Zeitraums
 * @returns {Promise} Promise mit dem Gesamtumsatz
 */
export const getOrdersRevenue = (startDate, endDate) => {
  return axiosInstance.get('/orders/revenue', {
    params: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  });
};

/**
 * Fügt eine Position zu einem Auftrag hinzu
 * @param {string} id - ID des Auftrags
 * @param {Object} item - Positionsdaten
 * @returns {Promise} Promise mit dem aktualisierten Auftrag
 */
export const addOrderItem = (id, item) => {
  return axiosInstance.post(`/orders/${id}/items`, item);
};

/**
 * Aktualisiert eine Position in einem Auftrag
 * @param {string} id - ID des Auftrags
 * @param {number} itemIndex - Index der Position
 * @param {Object} item - Aktualisierte Positionsdaten
 * @returns {Promise} Promise mit dem aktualisierten Auftrag
 */
export const updateOrderItem = (id, itemIndex, item) => {
  return axiosInstance.put(`/orders/${id}/items/${itemIndex}`, item);
};

/**
 * Entfernt eine Position aus einem Auftrag
 * @param {string} id - ID des Auftrags
 * @param {number} itemIndex - Index der Position
 * @returns {Promise} Promise mit dem aktualisierten Auftrag
 */
export const removeOrderItem = (id, itemIndex) => {
  return axiosInstance.delete(`/orders/${id}/items/${itemIndex}`);
};