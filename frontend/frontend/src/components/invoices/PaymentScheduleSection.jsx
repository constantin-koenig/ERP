// src/components/invoices/PaymentScheduleSection.jsx
import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CheckIcon, XIcon } from '@heroicons/react/outline';
import { useTheme } from '../../context/ThemeContext';

const PaymentScheduleSection = ({ invoice, onMarkAsPaid }) => {
  const { isDarkMode } = useTheme();

  // Formatierungsfunktionen
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Wenn keine Installments oder kein PaymentSchedule, nichts anzeigen
  if (!invoice || invoice.paymentSchedule !== 'installments' || !invoice.installments || invoice.installments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mt-6">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Zahlungsplan</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Diese Rechnung wird in mehreren Raten bezahlt.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rate
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Beschreibung
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Anteil
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Betrag
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fälligkeitsdatum
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {invoice.installments.map((installment, index) => (
              <tr key={index} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {installment.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                  {installment.percentage}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                  {formatCurrency(installment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                  {formatDate(installment.dueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {installment.isPaid ? (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                    }`}>
                      Bezahlt {installment.paidDate && `(${formatDate(installment.paidDate)})`}
                    </span>
                  ) : (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Offen
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {!installment.isPaid && onMarkAsPaid && (
                    <button
                      onClick={() => onMarkAsPaid(invoice._id, index)}
                      className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white ${
                        isDarkMode ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <CheckIcon className="-ml-0.5 mr-1 h-4 w-4" />
                      Als bezahlt markieren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentScheduleSection;