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
      },

      utilities: {
        '.overflow-wrap-anywhere': {
          'overflow-wrap': 'anywhere'
        },
        '.break-words': {
          'word-break': 'break-word',
          'overflow-wrap': 'break-word'
        },
        '.break-all': {
          'word-break': 'break-all'
        },
        '.text-wrap-all': {
          'white-space': 'pre-wrap',
          'word-wrap': 'break-word',
          'overflow-wrap': 'break-word',
          'word-break': 'normal',
          'overflow': 'hidden',
          'max-width': '100%'
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    function ({ addUtilities }) {
      const newUtilities = {
        '.overflow-wrap-anywhere': {
          'overflow-wrap': 'anywhere'
        },
        '.break-words': {
          'word-break': 'break-word',
          'overflow-wrap': 'break-word'
        },
        '.break-all': {
          'word-break': 'break-all'
        },
        '.text-wrap-all': {
          'white-space': 'pre-wrap',
          'word-wrap': 'break-word',
          'overflow-wrap': 'break-word',
          'word-break': 'normal',
          'overflow': 'hidden',
          'max-width': '100%'
        }
      }
      addUtilities(newUtilities, ['responsive'])
    }
  ],
}

