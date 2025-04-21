// frontend/frontend/src/services/authService.js (erweitert)
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
  // Diese Funktion gibt direkt die Antwort des Servers zurück, ohne einen erneuten Login zu versuchen
  return axiosInstance.put('/users/me', userData);
};

/**
 * Passwort aktualisieren
 * @param {Object} passwordData - Altes und neues Passwort
 * @returns {Promise} Promise mit Antwort
 */
export const updatePassword = async (passwordData) => {
  // Sende nur die wirklich benötigten Daten
  const payload = {
    currentPassword: passwordData.currentPassword,
    newPassword: passwordData.newPassword
  };
  
  return axiosInstance.put('/users/updatepassword', payload);
};

/**
 * Profilbild hochladen
 * @param {FormData} formData - FormData-Objekt mit dem Profilbild
 * @returns {Promise} Promise mit Antwort
 */
export const uploadProfileImage = async (formData) => {
  return axiosInstance.post('/users/upload-profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

/**
 * Passwort zurücksetzen anfordern
 * @param {string} email - E-Mail des Benutzers
 * @returns {Promise} Promise mit Antwort
 */
export const forgotPassword = async (email) => {
  return axiosInstance.post('/users/forgotpassword', { email });
};

/**
 * Passwort zurücksetzen
 * @param {string} resetToken - Token für das Zurücksetzen des Passworts
 * @param {string} password - Neues Passwort
 * @returns {Promise} Promise mit Antwort
 */
export const resetPassword = async (resetToken, password) => {
  return axiosInstance.put(`/users/resetpassword/${resetToken}`, { password });
};

/**
 * Konto aktivieren (nach Einladung)
 * @param {string} activationToken - Aktivierungstoken
 * @param {string} password - Neues Passwort
 * @returns {Promise} Promise mit Antwort
 */
export const activateAccount = async (activationToken, password) => {
  return axiosInstance.put(`/users/activate/${activationToken}`, { password });
};

/**
 * Ruft eine Liste von Benutzern für Zuweisungen ab (eingeschränkte Informationen)
 * @returns {Promise} Promise mit Liste der zuweisbaren Benutzer
 */
export const getAssignableUsers = async () => {
  return axiosInstance.get('/users/assignable');
};

// Admin-Funktionen

/**
 * Alle Benutzer abrufen (Admin)
 * @returns {Promise} Promise mit allen Benutzern
 */
export const getUsers = async () => {
  return axiosInstance.get('/users');
};

/**
 * Benutzer nach ID abrufen (Admin)
 * @param {string} id - Benutzer-ID
 * @returns {Promise} Promise mit Benutzerdaten
 */
export const getUser = async (id) => {
  return axiosInstance.get(`/users/${id}`);
};

/**
 * Benutzer einladen (Admin)
 * @param {Object} userData - Benutzerdaten für die Einladung
 * @returns {Promise} Promise mit Antwort
 */
export const inviteUser = async (userData) => {
  return axiosInstance.post('/users', userData);
};

/**
 * Benutzer aktualisieren (Admin)
 * @param {string} id - Benutzer-ID
 * @param {Object} userData - Aktualisierte Benutzerdaten
 * @returns {Promise} Promise mit aktualisierten Benutzerdaten
 */
export const updateUser = async (id, userData) => {
  return axiosInstance.put(`/users/${id}`, userData);
};

/**
 * Benutzer löschen (Admin)
 * @param {string} id - Benutzer-ID
 * @returns {Promise} Promise mit Antwort
 */
export const deleteUser = async (id) => {
  return axiosInstance.delete(`/users/${id}`);
};