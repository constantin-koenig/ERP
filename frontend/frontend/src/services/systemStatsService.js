// frontend/frontend/src/services/systemStatsService.js (Neu)
import axiosInstance from './axiosInstance';

/**
 * Ruft allgemeine Systemstatistiken ab
 * @returns {Promise} Promise mit Systemstatistiken
 */
export const getSystemStats = async () => {
  return axiosInstance.get('/stats');
};

/**
 * Ruft monatliche Umsatzstatistiken ab
 * @param {number} year - Jahr für die Statistik (Optional, Standard: aktuelles Jahr)
 * @returns {Promise} Promise mit monatlichen Umsatzdaten
 */
export const getMonthlyRevenue = async (year = new Date().getFullYear()) => {
  return axiosInstance.get(`/stats/monthly-revenue?year=${year}`);
};

/**
 * Ruft Kundenverteilungsstatistiken ab
 * @returns {Promise} Promise mit Kundenverteilungsdaten
 */
export const getCustomerDistribution = async () => {
  return axiosInstance.get('/stats/customer-distribution');
};

/**
 * Ruft Auftragsstatistiken ab
 * @returns {Promise} Promise mit Auftragsstatistikdaten
 */
export const getOrderStatistics = async () => {
  return axiosInstance.get('/stats/order-statistics');
};