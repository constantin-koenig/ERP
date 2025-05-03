// frontend/frontend/src/services/axiosInstance.js (Anpassung mit requestManager)
import axios from 'axios';
import { toast } from 'react-toastify';
import requestManager from '../utils/RequestManager.js'; // Importiere den RequestManager

// Definierte API-URLs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

// Diese Funktion wandelt eine relative URL in eine absolute URL um
export const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  console.log('Input image URL:', imageUrl);
  
  // Wenn die URL bereits vollständig ist, nicht ändern
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    console.log('URL ist bereits absolut:', imageUrl);
    return imageUrl;
  }
  
  // Wenn imageUrl ein Data-URI ist (base64-encoded Bild)
  if (imageUrl.startsWith('data:')) {
    console.log('URL ist eine Data-URI:', imageUrl.substring(0, 30) + '...');
    return imageUrl;
  }
  
  // Wenn die URL einen führenden Slash hat, entferne ihn
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
  
  // Kombiniere mit der API-Basis-URL
  const fullUrl = `${API_URL}/${normalizedPath}`;
  console.log('Generierte vollständige URL:', fullUrl);
  return fullUrl;
};

// Für direkten Zugriff auf Uploads vom Backend aus der App heraus
export const getDirectUploadUrl = (path) => {
  return `${API_URL}/uploads/${path}`;
};

const axiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 8000, // Erhöht für langsamere Verbindungen
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor zum Hinzufügen des Auth-Tokens
axiosInstance.interceptors.request.use(
  (config) => {
    // Vor jeder Anfrage den Token aus dem localStorage holen
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor zur Behandlung von Antworten und Fehlern
axiosInstance.interceptors.response.use(
  (response) => {
    // Erfolgreiche Antworten unverändert weiterleiten
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Wenn der Server antwortet, aber ein Fehler auftritt
    if (error.response) {
      // 401 Unauthorized - Token ungültig oder abgelaufen
      if (error.response.status === 401) {
        // Nur ausloggen, wenn der Fehler nicht bei Login/Register auftritt
        const isAuthEndpoint = error.config.url.includes('/login') || 
                              error.config.url.includes('/register');
        
        if (!isAuthEndpoint) {
          // Bei anderen Endpunkten den Benutzer ausloggen
          localStorage.removeItem('token');
          toast.error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.', {
            toastId: 'session-expired',
            autoClose: 5000
          });
        }
      } 
      // 403 Forbidden - Keine Berechtigung
      else if (error.response.status === 403) {
        toast.error('Du hast keine Berechtigung, diese Aktion durchzuführen.', {
          toastId: 'permission-denied',
          autoClose: 5000
        });
      }
      // 500 Internal Server Error - Server-Fehler
      else if (error.response.status >= 500) {
        toast.error('Ein Serverfehler ist aufgetreten. Bitte versuche es später erneut.', {
          toastId: 'server-error',
          autoClose: 5000
        });
      }
    }
    // Keine Antwort vom Server (Netzwerkfehler)
    else if (error.request) {
      toast.error('Keine Antwort vom Server. Bitte überprüfe deine Internetverbindung.', {
        toastId: 'network-error',
        autoClose: 5000
      });
    }
    // Andere Fehler
    else {
      toast.error('Ein unerwarteter Fehler ist aufgetreten.', {
        toastId: 'unexpected-error',
        autoClose: 5000
      });
    }
    
    // Fehler für weitere Verarbeitung weiterleiten
    return Promise.reject(error);
  }
);

// Erweiterter axiosInstance-Export mit requestManager-Integration
const enhancedAxiosInstance = {
  get: (url, config) => {
    return requestManager.executeRequest(
      () => axiosInstance.get(url, config),
      url,
      'GET',
      config
    );
  },
  post: (url, data, config) => {
    return requestManager.executeRequest(
      () => axiosInstance.post(url, data, config),
      url,
      'POST',
      { data, ...config }
    );
  },
  put: (url, data, config) => {
    return requestManager.executeRequest(
      () => axiosInstance.put(url, data, config),
      url,
      'PUT',
      { data, ...config }
    );
  },
  delete: (url, config) => {
    return requestManager.executeRequest(
      () => axiosInstance.delete(url, config),
      url,
      'DELETE',
      config
    );
  }
};

export default enhancedAxiosInstance;