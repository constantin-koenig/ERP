// frontend/frontend/src/pages/admin/TemplateEditor.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { DocumentTextIcon, SaveIcon } from '@heroicons/react/outline';

const TemplateEditor = () => {
  const [activeTemplate, setActiveTemplate] = useState('invoice');
  const [templateContent, setTemplateContent] = useState(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rechnung {{invoiceNumber}}</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { text-align: center; margin-bottom: 20px; }
    .company-details { margin-bottom: 30px; }
    .invoice-details { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .total { text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rechnung</h1>
  </div>
  
  <div class="company-details">
    <h2>{{companyName}}</h2>
    <p>{{companyAddress}}</p>
  </div>
  
  <div class="invoice-details">
    <p><strong>Rechnungsnummer:</strong> {{invoiceNumber}}</p>
    <p><strong>Datum:</strong> {{invoiceDate}}</p>
    <p><strong>Fälligkeitsdatum:</strong> {{dueDate}}</p>
  </div>
  
  <div class="customer-details">
    <h3>Rechnungsempfänger</h3>
    <p>{{customerName}}</p>
    <p>{{customerAddress}}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Beschreibung</th>
        <th>Menge</th>
        <th>Einzelpreis</th>
        <th>Gesamtpreis</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}} €</td>
        <td>{{totalPrice}} €</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <div class="total">
    <p>Zwischensumme: {{subtotal}} €</p>
    <p>MwSt ({{taxRate}}%): {{taxAmount}} €</p>
    <p><strong>Gesamtbetrag: {{totalAmount}} €</strong></p>
  </div>
  
  <div class="footer">
    <p>{{invoiceFooter}}</p>
  </div>
</body>
</html>`);

  const templates = [
    { id: 'invoice', name: 'Rechnung', icon: DocumentTextIcon },
    { id: 'quote', name: 'Angebot', icon: DocumentTextIcon },
    { id: 'delivery', name: 'Lieferschein', icon: DocumentTextIcon },
    { id: 'contract', name: 'Vertrag', icon: DocumentTextIcon },
    { id: 'email', name: 'E-Mail-Vorlage', icon: DocumentTextIcon }
  ];

  const handleSave = () => {
    // Hier würde der API-Aufruf zum Speichern der Vorlage stattfinden
    toast.success('Vorlage erfolgreich gespeichert');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dokumentvorlagen</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="flex border-b border-gray-200">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`px-4 py-3 text-sm font-medium ${
                activeTemplate === template.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTemplate(template.id)}
            >
              <template.icon className="h-5 w-5 inline-block mr-2" />
              {template.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label htmlFor="templateContent" className="block text-sm font-medium text-gray-700">
              {templates.find(t => t.id === activeTemplate)?.name} Vorlage
            </label>
            <div className="mt-1">
              <textarea
                id="templateContent"
                name="templateContent"
                rows={20}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Verwenden Sie Handlebars-Syntax für dynamische Inhalte: {'{{variable}}'}
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleSave}
            >
              <SaveIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;