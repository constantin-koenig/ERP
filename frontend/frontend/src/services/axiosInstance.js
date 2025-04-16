// src/services/axiosInstance.js
import axios from 'axios'
import { toast } from 'react-toastify'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const axiosInstance = axios.create({
  baseURL,
  timeout: 8000, // Erhöht für langsamere Verbindungen
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor zum Hinzufügen des Auth-Tokens
axiosInstance.interceptors.request.use(
  (config) => {
    // Vor jeder Anfrage den Token aus dem localStorage holen
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Interceptor zur Behandlung von Antworten und Fehlern
axiosInstance.interceptors.response.use(
  (response) => {
    // Erfolgreiche Antworten unverändert weiterleiten
    return response
  },
  (error) => {
    console.error('Response error:', error)
    
    // Wenn der Server antwortet, aber ein Fehler auftritt
    if (error.response) {
      // 401 Unauthorized - Token ungültig oder abgelaufen
      if (error.response.status === 401) {
        // Nur ausloggen, wenn der Fehler nicht bei Login/Register auftritt
        const isAuthEndpoint = error.config.url.includes('/login') || 
                              error.config.url.includes('/register')
        
        if (!isAuthEndpoint) {
          // Bei anderen Endpunkten den Benutzer ausloggen
          localStorage.removeItem('token')
          toast.error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.', {
            toastId: 'session-expired',
            autoClose: 5000
          })
          
          // Optional: Zu Login-Seite umleiten
          // window.location.href = '/login'
        }
      } 
      // 403 Forbidden - Keine Berechtigung
      else if (error.response.status === 403) {
        toast.error('Du hast keine Berechtigung, diese Aktion durchzuführen.', {
          toastId: 'permission-denied',
          autoClose: 5000
        })
      }
      // 500 Internal Server Error - Server-Fehler
      else if (error.response.status >= 500) {
        toast.error('Ein Serverfehler ist aufgetreten. Bitte versuche es später erneut.', {
          toastId: 'server-error',
          autoClose: 5000
        })
      }
    }
    // Keine Antwort vom Server (Netzwerkfehler)
    else if (error.request) {
      toast.error('Keine Antwort vom Server. Bitte überprüfe deine Internetverbindung.', {
        toastId: 'network-error',
        autoClose: 5000
      })
    }
    // Andere Fehler
    else {
      toast.error('Ein unerwarteter Fehler ist aufgetreten.', {
        toastId: 'unexpected-error',
        autoClose: 5000
      })
    }
    
    // Fehler für weitere Verarbeitung weiterleiten
    return Promise.reject(error)
  }
)

export default axiosInstance