// src/services/authService.js
import axiosInstance from './axiosInstance';

/**
 * Benutzeranmeldung
 * @param {string} email - E-Mail des Benutzers
 * @param {string} password - Passwort des Benutzers
 * @returns {Promise} Promise mit Antwort, enthält Token bei erfolgreicher Anmeldung
 */
export const loginUser = async (email, password) => {
  try {
    const response = await axiosInstance.post('/users/login', { email, password });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Login error in service:", error);
    // Wichtig: Wir werfen den Fehler hier, damit er in AuthContext behandelt werden kann
    throw error;
  }
};

/**
 * Benutzer registrieren
 * @param {Object} userData - Benutzerdaten (name, email, password)
 * @returns {Promise} Promise mit Antwort, enthält Token bei erfolgreicher Registrierung
 */
export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post('/users/register', userData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Register error in service:", error);
    // Wichtig: Wir werfen den Fehler hier, damit er in AuthContext behandelt werden kann
    throw error;
  }
};

/**
 * Aktuellen Benutzer abrufen
 * @returns {Promise} Promise mit Benutzerdaten
 */
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get('/users/me');
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Get current user error:", error);
    throw error;
  }
};

/**
 * Benutzerdetails aktualisieren
 * @param {Object} userData - Aktualisierte Benutzerdaten
 * @returns {Promise} Promise mit aktualisierten Benutzerdaten
 */
export const updateUserDetails = async (userData) => {
  return axiosInstance.put('/users/me', userData);
};

/**
 * Passwort aktualisieren
 * @param {Object} passwordData - Altes und neues Passwort
 * @returns {Promise} Promise mit Antwort
 */
export const updatePassword = async (passwordData) => {
  return axiosInstance.put('/users/updatepassword', passwordData);
};