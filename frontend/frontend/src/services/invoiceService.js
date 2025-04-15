// src/services/invoiceService.js
import axiosInstance from './axiosInstance';

/**
 * Ruft alle Rechnungen vom Server ab
 * @returns {Promise} Promise mit allen Rechnungen
 */
export const getInvoices = () => {
  return axiosInstance.get('/invoices');
};

/**
 * Ruft eine spezifische Rechnung vom Server ab
 * @param {string} id - ID der Rechnung
 * @returns {Promise} Promise mit Rechnungsdaten
 */
export const getInvoice = (id) => {
  return axiosInstance.get(`/invoices/${id}`);
};

/**
 * Erstellt eine neue Rechnung
 * @param {Object} invoiceData - Rechnungsdaten
 * @returns {Promise} Promise mit der erstellten Rechnung
 */
export const createInvoice = (invoiceData) => {
  return axiosInstance.post('/invoices', invoiceData);
};

/**
 * Aktualisiert eine bestehende Rechnung
 * @param {string} id - ID der Rechnung
 * @param {Object} invoiceData - Aktualisierte Rechnungsdaten
 * @returns {Promise} Promise mit der aktualisierten Rechnung
 */
export const updateInvoice = (id, invoiceData) => {
  return axiosInstance.put(`/invoices/${id}`, invoiceData);
};

/**
 * Löscht eine Rechnung
 * @param {string} id - ID der Rechnung
 * @returns {Promise} Promise mit Status des Löschvorgangs
 */
export const deleteInvoice = (id) => {
  return axiosInstance.delete(`/invoices/${id}`);
};

/**
 * Ändert den Status einer Rechnung
 * @param {string} id - ID der Rechnung
 * @param {string} status - Neuer Status ('erstellt', 'versendet', 'bezahlt', 'storniert')
 * @returns {Promise} Promise mit der aktualisierten Rechnung
 */
export const updateInvoiceStatus = (id, status) => {
  return axiosInstance.put(`/invoices/${id}`, { status });
};

/**
 * Generiert eine PDF für eine Rechnung (Platzhalter-Funktion)
 * In einer echten Anwendung würde diese Funktion eine PDF generieren oder herunterladen
 * @param {string} id - ID der Rechnung
 * @returns {Promise} Promise mit PDF-Daten oder Download-URL
 */
export const generateInvoicePdf = (id) => {
  return axiosInstance.get(`/invoices/${id}/pdf`);
};

/**
 * Sendet eine Rechnung per E-Mail (Platzhalter-Funktion)
 * In einer echten Anwendung würde diese Funktion die Rechnung per E-Mail versenden
 * @param {string} id - ID der Rechnung
 * @param {Object} emailData - E-Mail-Informationen (Empfänger, Betreff, etc.)
 * @returns {Promise} Promise mit Sendestatus
 */
export const sendInvoiceEmail = (id, emailData = {}) => {
  return axiosInstance.post(`/invoices/${id}/send`, emailData);
};

/**
 * Ruft Statistiken zu Rechnungen ab (z.B. für Dashboard)
 * In einer echten Anwendung würde diese Funktion Statistiken wie offene Beträge, bezahlte Beträge, etc. liefern
 * @returns {Promise} Promise mit Rechnungsstatistiken
 */
export const getInvoiceStatistics = () => {
  return axiosInstance.get('/invoices/statistics');
};