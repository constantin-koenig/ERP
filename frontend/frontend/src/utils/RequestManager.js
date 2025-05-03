// src/utils/requestManager.js
/**
 * Request Manager zur Verhinderung doppelter API-Anfragen
 */

// Tracking der aktiven Anfragen
const activeRequests = new Map();

/**
 * Generiert einen eindeutigen Schlüssel für eine Anfrage
 * @param {string} url - URL der Anfrage
 * @param {string} method - HTTP-Methode (GET, POST, etc.)
 * @param {object} params - Anfrageoptionen/Parameter
 * @returns {string} Eindeutiger Schlüssel
 */
const getRequestKey = (url, method = 'GET', params = {}) => {
  // Kombiniere URL, Methode und Parameter zu einem eindeutigen Schlüssel
  return `${method}:${url}:${JSON.stringify(params)}`;
};

/**
 * Prüft, ob eine identische Anfrage aktiv ist
 * @param {string} key - Anfrageschlüssel
 * @returns {boolean} Ob die Anfrage aktiv ist
 */
const isRequestActive = (key) => {
  return activeRequests.has(key);
};

/**
 * Registriert eine neue Anfrage
 * @param {string} key - Anfrageschlüssel
 * @param {Promise} promise - Promise der Anfrage
 * @returns {Promise} Das ursprüngliche Promise
 */
const registerRequest = (key, promise) => {
  activeRequests.set(key, promise);
  
  // Nach Abschluss der Anfrage aus dem Register entfernen
  promise.finally(() => {
    activeRequests.delete(key);
  });
  
  return promise;
};

/**
 * Führt eine Anfrage aus oder gibt eine laufende Anfrage zurück
 * @param {Function} requestFn - Anfragefunktion, die ein Promise zurückgibt
 * @param {string} url - URL der Anfrage
 * @param {string} method - HTTP-Methode
 * @param {object} params - Anfrageoptionen/Parameter
 * @returns {Promise} Promise der Anfrage
 */
const executeRequest = (requestFn, url, method = 'GET', params = {}) => {
  const key = getRequestKey(url, method, params);
  
  // Prüfe, ob bereits eine identische Anfrage läuft
  if (isRequestActive(key)) {
    console.log(`Doppelte Anfrage verhindert: ${key}`);
    return activeRequests.get(key);
  }
  
  // Führe die Anfrage aus und registriere sie
  const promise = requestFn();
  return registerRequest(key, promise);
};

export default {
  executeRequest
};