// frontend/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Dark Mode aktivieren mit der Class-Strategie
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Spezifische Farben für den Dark Mode hinzufügen, falls erforderlich
        dark: {
          bg: '#1a1a1a',
          card: '#2d2d2d',
          text: '#f3f4f6',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}