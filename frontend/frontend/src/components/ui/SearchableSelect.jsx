// src/components/ui/SearchableSelect.jsx
import { useState, useEffect, useRef } from 'react';
import { SearchIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/outline';
import { useTheme } from '../../context/ThemeContext';

/**
 * Eine verbesserte durchsuchbare Select-Komponente mit optimierter Benutzeroberfläche
 * 
 * @param {Object} props
 * @param {string} props.name - Formular-Feldname
 * @param {string} props.id - Element-ID
 * @param {string} props.value - Aktuell ausgewählter Wert
 * @param {Function} props.onChange - Callback bei Wertänderung
 * @param {Array} props.options - Array von Optionsobjekten [{ value: 'id', label: 'Name' }]
 * @param {string} props.placeholder - Placeholder für leere Auswahl
 * @param {boolean} props.disabled - Ob das Feld deaktiviert ist
 * @param {number} props.threshold - Ab wie vielen Optionen eine Suche angezeigt wird (Default: 5)
 * @param {string} props.className - Zusätzliche CSS-Klassen
 * @param {string} props.error - Fehlermeldung für Validierung
 */
const SearchableSelect = ({ 
  name, 
  id, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Bitte wählen", 
  disabled = false,
  threshold = 5,
  className = "",
  error = ""
}) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsContainerRef = useRef(null);
  
  // Ausgewähltes Element finden
  const selectedOption = options.find(option => option.value === value);
  
  // Optionen beim ersten Render laden
  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);
  
  // Effekt zum Filtern der Optionen bei Suchbegriffänderung
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(options);
      setHighlightedIndex(-1);
    } else {
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = options.filter(option => 
        option.label.toLowerCase().includes(searchTermLower)
      );
      setFilteredOptions(filtered);
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    }
  }, [searchTerm, options]);
  
  // Effekt zum Schließen des Dropdown bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fokussiere das Suchfeld, wenn das Dropdown geöffnet wird
  useEffect(() => {
    if (isOpen && searchInputRef.current && options.length > threshold) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 10);
    }
  }, [isOpen, options.length, threshold]);
  
  // Scroll zum hervorgehobenen Element
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsContainerRef.current) {
      const highlightedElement = optionsContainerRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [highlightedIndex]);
  
  // Handler für Optionsauswahl
  const handleSelectOption = (selectedValue) => {
    onChange({ target: { name, value: selectedValue } });
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };
  
  // Tastaturhandler
  const handleKeyDown = (e) => {
    if (!isOpen) {
      // Öffnen des Dropdowns mit Pfeil nach unten
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prevIndex => {
          if (prevIndex >= filteredOptions.length - 1) return 0;
          return prevIndex + 1;
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prevIndex => {
          if (prevIndex <= 0) return filteredOptions.length - 1;
          return prevIndex - 1;
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex].value);
        } else if (filteredOptions.length === 1) {
          // Wenn es nur eine Option gibt, wähle diese
          handleSelectOption(filteredOptions[0].value);
        }
        break;
        
      case 'Tab':
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
        
      default:
        break;
    }
  };
  
  // Bestimme, ob eine Suche angezeigt werden soll
  const showSearch = options.length > threshold;
  
  // CSS-Klassen für den Dropdown-Container
  const containerClasses = `relative ${className} ${error ? 'has-error' : ''}`;
  
  // CSS-Klassen für den Button
  const buttonClasses = `
    relative w-full
    ${error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-500' 
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600'
    }
    ${disabled 
      ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400' 
      : 'bg-white text-gray-700 cursor-pointer dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
    }
    rounded-md border py-2 px-3 text-left shadow-sm focus:outline-none focus:ring-1 sm:text-sm
  `;
  
  // CSS-Klassen für das Dropdown-Menü
  const dropdownClasses = `
    absolute z-20 mt-1 w-full rounded-md
    ${isDarkMode 
      ? 'bg-gray-800 border border-gray-700 shadow-lg' 
      : 'bg-white border border-gray-200 shadow-lg'
    }
    max-h-60 overflow-auto focus:outline-none
  `;
  
  return (
    <div className={containerClasses} ref={dropdownRef}>
      {/* Ausgewählter Wert / Trigger für Dropdown */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={buttonClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {isOpen 
            ? <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            : <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          }
        </span>
      </button>
      
      {/* Eigentlicher Select für Formular-Submission */}
      <select 
        name={name} 
        id={id} 
        value={value} 
        onChange={onChange}
        className="sr-only" // Versteckt, nur für die Formularübermittlung
        disabled={disabled}
        tabIndex="-1" // Nicht fokussierbar
        aria-hidden="true"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Dropdown */}
      {isOpen && (
        <div 
          className={dropdownClasses}
          role="listbox"
          tabIndex="-1"
          aria-labelledby={`${id}-label`}
        >
          {/* Suchfeld (nur anzeigen, wenn mehr als threshold Optionen) */}
          {showSearch && (
            <div className={`sticky top-0 z-10 p-2 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} aria-hidden="true" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  className={`pl-10 pr-10 py-2 border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } rounded-md w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {searchTerm && (
                  <button 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setSearchTerm("")}
                  >
                    <XIcon 
                      className={`h-4 w-4 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Optionsliste */}
          <ul 
            className="py-1 overflow-auto max-h-60"
            role="listbox"
            ref={optionsContainerRef}
          >
            {/* Leerer Eintrag / Zurücksetzen */}
            <li 
              id={`${id}-option-empty`}
              role="option"
              aria-selected={value === ""}
              className={`cursor-pointer select-none relative px-3 py-2 ${
                value === "" 
                  ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900' 
                  : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
              } ${highlightedIndex === -1 ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              onClick={() => handleSelectOption("")}
              onMouseEnter={() => setHighlightedIndex(-1)}
            >
              <span className="block truncate font-normal">
                {placeholder}
              </span>
              {value === "" && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg 
                    className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-blue-600'}`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </li>
            
            {/* Optionen */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li 
                  key={option.value}
                  id={`${id}-option-${option.value}`}
                  role="option"
                  aria-selected={option.value === value}
                  className={`cursor-pointer select-none relative px-3 py-2 ${
                    option.value === value 
                      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900' 
                      : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
                  } ${highlightedIndex === index ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                  onClick={() => handleSelectOption(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="block truncate font-normal">
                    {option.label}
                  </span>
                  {option.value === value && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg 
                        className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-blue-600'}`} 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className={`px-3 py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Keine Ergebnisse gefunden
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Fehlermeldung */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;