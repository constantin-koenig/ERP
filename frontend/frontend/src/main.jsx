// src/main.jsx - Angepasst für längere Toast-Anzeigen
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
  autoClose: 5000,       // 5 Sekunden
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
  theme: "light",
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastContainer {...toastContainerConfig} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)