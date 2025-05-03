// src/main.jsx - StrictMode entfernt, um doppelte API-Anfragen zu vermeiden
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Globale Toast-Konfiguration
const toastContainerConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
  // Setze hier kein Theme, es wird dynamisch in der App angepasst
};

// StrictMode wurde entfernt, um doppelte API-Anfragen zu vermeiden
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
      <ToastContainer {...toastContainerConfig} />
    </AuthProvider>
  </BrowserRouter>
)