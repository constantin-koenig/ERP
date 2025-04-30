// frontend/frontend/src/pages/admin/TermsEditor.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Ein einfacher Editor für die AGB und Datenschutzerklärung
const TermsEditor = ({ value, onChange }) => {
  const [content, setContent] = useState('');
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    setContent(value || '');
  }, [value]);
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setContent(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  return (
    <textarea
      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full h-96 sm:text-sm 
        ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md font-mono`}
      value={content}
      onChange={handleChange}
    ></textarea>
  );
};

export default TermsEditor;