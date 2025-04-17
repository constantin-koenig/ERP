// frontend/frontend/src/pages/admin/TermsEditor.jsx
import { useState, useEffect } from 'react';

// Ein einfacher Editor für die AGB und Datenschutzerklärung
const TermsEditor = ({ value, onChange }) => {
  const [content, setContent] = useState('');
  
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
      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full h-96 sm:text-sm border-gray-300 rounded-md font-mono"
      value={content}
      onChange={handleChange}
    ></textarea>
  );
};

export default TermsEditor;