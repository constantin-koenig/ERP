// frontend/frontend/src/components/dashboard/DashboardLayouts.jsx
import React from 'react';
import { useDashboard, DASHBOARD_LAYOUTS } from '../../context/DashboardContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  UserGroupIcon, 
  ClipboardListIcon, 
  CurrencyEuroIcon, 
  ClockIcon,
  ChartPieIcon,
  PlusIcon
} from '@heroicons/react/outline';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Gemeinsame Formatierungsfunktionen
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
  } catch (error) {
    return dateString;
  }
};

// Statistikkarten, die in allen Layouts verwendet werden
export const StatCards = ({ stats, loading }) => {
  const { isDarkMode } = useTheme();
  
  const statCards = [
    {
      title: 'Kunden',
      count: stats.customers.count,
      loading: stats.customers.loading,
      link: '/customers',
      icon: UserGroupIcon,
      color: isDarkMode ? 'bg-blue-800' : 'bg-blue-500'
    },
    {
      title: 'Aufträge',
      count: stats.orders.count,
      loading: stats.orders.loading,
      link: '/orders',
      icon: ClipboardListIcon,
      color: isDarkMode ? 'bg-green-800' : 'bg-green-500'
    },
    {
      title: 'Rechnungen',
      count: stats.invoices.count,
      loading: stats.invoices.loading,
      link: '/invoices',
      icon: CurrencyEuroIcon,
      color: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-500'
    },
    {
      title: 'Arbeitszeiteinträge',
      count: stats.timeTracking.count,
      loading: stats.timeTracking.loading,
      link: '/time-tracking',
      icon: ClockIcon,
      color: isDarkMode ? 'bg-purple-800' : 'bg-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {statCards.map((card, index) => (
        <Link
          key={index}
          to={card.link}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300"
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`${card.color} rounded-md p-3`}>
                  <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-4 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {card.title}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                    {card.loading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      card.count
                    )}
                  </div>
                </dd>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 sm:px-5 sm:py-3">
            <div className="text-sm">
              <span className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                Alle anzeigen
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

// Komponenten für die verschiedenen Layouts
export const DefaultDashboard = ({ stats, recentOrders, recentInvoices, financials, loading }) => {
  return (
    <div className="space-y-6">
      <StatCards stats={stats} loading={loading} />
      
      {/* Schnellzugriff */}
      <QuickActions />
      
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Finanzübersicht */}
        <FinancialOverview financials={financials} loading={loading} />
        
        {/* Letzte Aktivitäten */}
        <RecentActivities />
      </div>
      
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Letzte Aufträge */}
        <RecentItemsList
          title="Neueste Aufträge"
          items={recentOrders.data}
          loading={recentOrders.loading}
          linkPath="/orders"
          linkText="Alle Aufträge anzeigen"
          renderItem={(order) => (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-1 sm:mb-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.orderNumber}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  {order.customer && order.customer.name ? order.customer.name : 'Kunde'}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatCurrency(order.totalAmount)}
              </div>
            </div>
          )}
        />
        
        {/* Letzte Rechnungen */}
        <RecentItemsList
          title="Neueste Rechnungen"
          items={recentInvoices.data}
          loading={recentInvoices.loading}
          linkPath="/invoices"
          linkText="Alle Rechnungen anzeigen"
          renderItem={(invoice) => (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-1 sm:mb-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {invoice.invoiceNumber}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  {invoice.customer && invoice.customer.name ? invoice.customer.name : 'Kunde'} - {formatDate(invoice.issueDate)}
                </div>
              </div>
              <div className="flex items-center">
                <span 
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-2
                  ${invoice.status === 'bezahlt' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                     invoice.status === 'versendet' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : 
                     invoice.status === 'storniert' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : 
                     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'}`}
                >
                  {invoice.status}
                </span>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(invoice.totalAmount)}
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export const CompactDashboard = ({ stats, recentOrders, recentInvoices, financials, loading }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Kompakte Statistik-Karten */}
        {Object.entries(stats).map(([key, value], index) => {
          // Icon je nach Statistik-Typ
          let Icon = UserGroupIcon;
          if (key === 'orders') Icon = ClipboardListIcon;
          else if (key === 'invoices') Icon = CurrencyEuroIcon;
          else if (key === 'timeTracking') Icon = ClockIcon;
          
          // Titel basierend auf Schlüssel
          const titles = {
            customers: 'Kunden',
            orders: 'Aufträge',
            invoices: 'Rechnungen',
            timeTracking: 'Zeiten'
          };
          
          return (
            <Link 
              key={key} 
              to={`/${key}`} 
              className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow flex items-center"
            >
              <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{titles[key] || key}</div>
                <div className="text-lg font-semibold dark:text-white">
                  {value.loading ? "..." : value.count}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Schnellzugriff-Leiste */}
      <QuickActions compact />
      
      {/* Kombinierte Übersicht */}
      <div className="grid grid-cols-1 gap-4">
        {/* Finanzübersicht (kompakt) */}
        <FinancialOverview financials={financials} loading={loading} compact />
        
        {/* Letzte Aufträge und Rechnungen in einer Zeile */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Letzte Aktivitäten</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Zeige abwechselnd Aufträge und Rechnungen */}
            {[...Array(4)].map((_, i) => {
              // Auftrag oder Rechnung je nach Index
              const showOrder = i % 2 === 0;
              const item = showOrder 
                ? (recentOrders.data && recentOrders.data[Math.floor(i/2)]) 
                : (recentInvoices.data && recentInvoices.data[Math.floor(i/2)]);
              
              if (!item) return null;
              
              return (
                <div key={i} className="px-4 py-2 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      {showOrder ? (
                        <ClipboardListIcon className="h-4 w-4 text-gray-400 mr-2" />
                      ) : (
                        <CurrencyEuroIcon className="h-4 w-4 text-gray-400 mr-2" />
                      )}
                      <span className="dark:text-white">
                        {showOrder ? item.orderNumber : item.invoiceNumber}
                      </span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {formatCurrency(item.totalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2 text-right">
            <Link to="/orders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-4">
              Alle Aufträge
            </Link>
            <Link to="/invoices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Alle Rechnungen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DetailedDashboard = ({ stats, recentOrders, recentInvoices, financials, loading }) => {
  return (
    <div className="space-y-8">
      <StatCards stats={stats} loading={loading} />
      
      {/* Erweiterte Finanzübersicht */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Finanzübersicht</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Bezahlte Rechnungen */}
          <div className="bg-green-50 dark:bg-green-900 border border-green-100 dark:border-green-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Bezahlte Rechnungen</h4>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-300">
              {financials.loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(financials.totalPaid)
              )}
            </p>
          </div>
          
          {/* Offene Rechnungen */}
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-100 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Offene Rechnungen</h4>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-300">
              {financials.loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(financials.totalOpen)
              )}
            </p>
          </div>
          
          {/* Umsatz aktueller Monat */}
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Umsatz (Monat)</h4>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-300">
              {financials.loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(financials.totalPaid + financials.totalOpen)
              )}
            </p>
          </div>
        </div>
        
        {/* Umsatzdiagramm */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Umsatzentwicklung</h3>
          <div className="h-48 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 p-2">
            {/* Platzhalter für Diagramm */}
            <div className="flex items-center justify-center h-full">
              <ChartPieIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Schnellzugriff */}
      <QuickActions />
      
      {/* Aufträge mit erweiterter Ansicht */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aufträge</h3>
          <Link to="/orders/new" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
            + Neuer Auftrag
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Auftragsnr.
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kunde
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Betrag
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fälligkeitsdatum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {recentOrders.loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Daten werden geladen...
                  </td>
                </tr>
              ) : recentOrders.data.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Keine Aufträge vorhanden
                  </td>
                </tr>
              ) : (
                recentOrders.data.slice(0, 5).map((order) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/orders/${order._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.customer && order.customer.name ? order.customer.name : 'Kunde'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === 'neu' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                          order.status === 'in Bearbeitung' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                          order.status === 'abgeschlossen' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.dueDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right">
          <Link to="/orders" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Alle Aufträge anzeigen
          </Link>
        </div>
      </div>
      
      {/* Rechnungen mit erweiterter Ansicht */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Rechnungen</h3>
          <Link to="/invoices/new" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
            + Neue Rechnung
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rechnungsnr.
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kunde
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Betrag
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fälligkeitsdatum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {recentInvoices.loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Daten werden geladen...
                  </td>
                </tr>
              ) : recentInvoices.data.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Keine Rechnungen vorhanden
                  </td>
                </tr>
              ) : (
                recentInvoices.data.slice(0, 5).map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/invoices/${invoice._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {invoice.customer && invoice.customer.name ? invoice.customer.name : 'Kunde'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${invoice.status === 'erstellt' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                          invoice.status === 'versendet' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                          invoice.status === 'bezahlt' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.dueDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right">
          <Link to="/invoices" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Alle Rechnungen anzeigen
          </Link>
        </div>
      </div>
    </div>
  );
};

// Hilfskompnenten für die Dashboard-Layouts
const QuickActions = ({ compact = false }) => {
  const quickActions = [
    {
      title: 'Neuen Kunden anlegen',
      link: '/customers/new',
      icon: UserGroupIcon,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    },
    {
      title: 'Neuen Auftrag erstellen',
      link: '/orders/new',
      icon: ClipboardListIcon,
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
    },
    {
      title: 'Zeit erfassen',
      link: '/time-tracking/new',
      icon: ClockIcon,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
    },
    {
      title: 'Rechnung erstellen',
      link: '/invoices/new',
      icon: CurrencyEuroIcon,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
    }
  ];

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className={`rounded-md p-1.5 ${action.color}`}>
                <action.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-4 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Schnellzugriff</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            to={action.link}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-300 p-3 flex items-center"
          >
            <div className={`rounded-md p-2 ${action.color}`}>
              <action.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">{action.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const FinancialOverview = ({ financials, loading, compact = false }) => {
  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Finanzübersicht</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-900 border border-green-100 dark:border-green-800 rounded-lg p-2">
            <div className="text-xs text-green-800 dark:text-green-200">Bezahlt</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-300">
              {loading ? '...' : formatCurrency(financials.totalPaid)}
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-100 dark:border-yellow-800 rounded-lg p-2">
            <div className="text-xs text-yellow-800 dark:text-yellow-200">Offen</div>
            <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-300">
              {loading ? '...' : formatCurrency(financials.totalOpen)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Finanzübersicht</h3>
        <ChartPieIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-green-50 dark:bg-green-900 border border-green-100 dark:border-green-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Bezahlte Rechnungen</h4>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-300">
              {financials.loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(financials.totalPaid)
              )}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-100 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Offene Rechnungen</h4>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-300">
              {financials.loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatCurrency(financials.totalOpen)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecentActivities = () => {
  // Beispiel-Aktivitäten (in einer echten Anwendung würden diese von der API kommen)
  const activities = [
    { id: 1, text: 'Ein neuer Auftrag wurde erstellt', time: '10:30', user: 'Max Mustermann' },
    { id: 2, text: 'Rechnung #R2023-0042 wurde bezahlt', time: '09:15', user: 'System' },
    { id: 3, text: 'Neuer Kunde "Muster GmbH" hinzugefügt', time: 'Gestern', user: 'Anna Schmidt' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-4 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Letzte Aktivitäten</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.map((activity) => (
          <div key={activity.id} className="px-4 py-3">
            <div className="flex justify-between">
              <div className="text-sm text-gray-900 dark:text-white">{activity.text}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.user}</div>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm font-medium">
        <Link to="/aktivitaeten" className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
          Zur Zeiterfassung
        </Link>
      </div>
    </div>
  );
};

const RecentItemsList = ({ title, items, loading, linkPath, linkText, renderItem }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-4 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {loading ? (
          <div className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            Daten werden geladen...
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Keine Daten vorhanden
          </div>
        ) : (
          items.slice(0, 5).map((item) => (
            <Link 
              key={item._id} 
              to={`${linkPath}/${item._id}`}
              className="block px-4 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {renderItem(item)}
            </Link>
          ))
        )}
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm font-medium">
        <Link to={linkPath} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
          {linkText}
        </Link>
      </div>
    </div>
  );
};

// Hauptkomponente für das Dashboard, die das entsprechende Layout basierend auf den Benutzereinstellungen rendert
export const DashboardContent = ({ stats, recentOrders, recentInvoices, financials, loading }) => {
  const { layout } = useDashboard();
  
  switch (layout) {
    case DASHBOARD_LAYOUTS.COMPACT:
      return (
        <CompactDashboard 
          stats={stats} 
          recentOrders={recentOrders} 
          recentInvoices={recentInvoices} 
          financials={financials} 
          loading={loading} 
        />
      );
    case DASHBOARD_LAYOUTS.DETAILED:
      return (
        <DetailedDashboard 
          stats={stats} 
          recentOrders={recentOrders} 
          recentInvoices={recentInvoices} 
          financials={financials} 
          loading={loading} 
        />
      );
    case DASHBOARD_LAYOUTS.DEFAULT:
    default:
      return (
        <DefaultDashboard 
          stats={stats} 
          recentOrders={recentOrders} 
          recentInvoices={recentInvoices} 
          financials={financials} 
          loading={loading} 
        />
      );
  }
};

export default DashboardContent;