// frontend/frontend/src/components/ui/ToastContainerWithTheme.jsx
import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';

// Komponente, die das ToastContainer-Theme basierend auf dem aktuellen Theme aktualisiert
const ToastContainerWithTheme = () => {
  const { isDarkMode } = useTheme();
  
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
    theme: isDarkMode ? "dark" : "light", // Theme basierend auf Dark Mode
  };
  
  // Das Theme der Toasts aktualisieren, wenn sich der Dark Mode ändert
  useEffect(() => {
    // Diese Funktion wird aufgerufen, wenn sich isDarkMode ändert
    document.documentElement.style.setProperty(
      '--toastify-color-light', 
      isDarkMode ? '#2d3748' : '#fff'
    );
    document.documentElement.style.setProperty(
      '--toastify-text-color-light', 
      isDarkMode ? '#fff' : '#757575'
    );
    document.documentElement.style.setProperty(
      '--toastify-color-dark', 
      isDarkMode ? '#1a202c' : '#121212'
    );
  }, [isDarkMode]);
  
  return <ToastContainer {...toastContainerConfig} />;
};

export default ToastContainerWithTheme;