// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCustomers } from '../../services/customerService';
import { getOrders } from '../../services/orderService';
import { getInvoices } from '../../services/invoiceService';
import { getTimeTrackings } from '../../services/timeTrackingService';
import { 
  UserGroupIcon, 
  ClipboardListIcon, 
  CurrencyEuroIcon, 
  ClockIcon,
  DocumentAddIcon,
  ChartPieIcon
} from '@heroicons/react/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: { count: 0, loading: true },
    orders: { count: 0, loading: true },
    invoices: { count: 0, loading: true, data: [] },
    timeTracking: { count: 0, loading: true }
  });
  const [recentItems, setRecentItems] = useState({
    orders: { loading: true, data: [] },
    invoices: { loading: true, data: [] }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Kunden laden
        const customersResponse = await getCustomers();
        setStats(prev => ({
          ...prev,
          customers: { count: customersResponse.data.count, loading: false }
        }));

        // Aufträge laden
        const ordersResponse = await getOrders();
        setStats(prev => ({
          ...prev,
          orders: { count: ordersResponse.data.count, loading: false }
        }));
        setRecentItems(prev => ({
          ...prev,
          orders: { 
            loading: false, 
            data: ordersResponse.data.data
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5) 
          }
        }));

        // Rechnungen laden
        const invoicesResponse = await getInvoices();
        const invoices = invoicesResponse.data.data || [];
        const openInvoices = invoices.filter(inv => inv.status !== 'bezahlt');
        setStats(prev => ({
          ...prev,
          invoices: { 
            count: invoicesResponse.data.count, 
            loading: false, 
            data: invoices
          }
        }));
        setRecentItems(prev => ({
          ...prev,
          invoices: { 
            loading: false, 
            data: invoices
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5) 
          }
        }));

        // Arbeitszeiten laden
        const timeResponse = await getTimeTrackings();
        setStats(prev => ({
          ...prev,
          timeTracking: { count: timeResponse.data.count, loading: false }
        }));
      } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Daten:', error);
      }
    };

    fetchData();
  }, []);

  // Dashboard-Karten
  const statCards = [
    {
      title: 'Kunden',
      count: stats.customers.count,
      loading: stats.customers.loading,
      link: '/customers',
      icon: UserGroupIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'Aufträge',
      count: stats.orders.count,
      loading: stats.orders.loading,
      link: '/orders',
      icon: ClipboardListIcon,
      color: 'bg-green-500'
    },
    {
      title: 'Rechnungen',
      count: stats.invoices.count,
      loading: stats.invoices.loading,
      link: '/invoices',
      icon: CurrencyEuroIcon,
      color: 'bg-yellow-500'
    },
    {
      title: 'Arbeitszeiteinträge',
      count: stats.timeTracking.count,
      loading: stats.timeTracking.loading,
      link: '/time-tracking',
      icon: ClockIcon,
      color: 'bg-purple-500'
    }
  ];

  const quickActions = [
    {
      title: 'Neuen Kunden anlegen',
      link: '/customers/new',
      icon: UserGroupIcon,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      title: 'Neuen Auftrag erstellen',
      link: '/orders/new',
      icon: ClipboardListIcon,
      color: 'bg-green-100 text-green-800'
    },
    {
      title: 'Zeit erfassen',
      link: '/time-tracking/new',
      icon: ClockIcon,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      title: 'Rechnung erstellen',
      link: '/invoices/new',
      icon: DocumentAddIcon,
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];

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

  // Finanzdaten für Übersicht berechnen
  const calculateFinancials = () => {
    if (stats.invoices.loading) {
      return { totalOpen: 0, totalPaid: 0, loading: true };
    }

    const invoices = stats.invoices.data || [];
    const openInvoices = invoices.filter(inv => inv.status !== 'bezahlt' && inv.status !== 'storniert');
    const paidInvoices = invoices.filter(inv => inv.status === 'bezahlt');

    const totalOpen = openInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return { totalOpen, totalPaid, loading: false };
  };

  const financials = calculateFinancials();

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Willkommen im ERP-System. Hier siehst du eine Übersicht deiner Daten.
        </p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${card.color} rounded-md p-3`}>
                    <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {card.title}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
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
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-blue-600 hover:text-blue-900">
                  Alle anzeigen
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Schnellzugriff */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Schnellzugriff</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-300 p-4 flex items-center"
            >
              <div className={`rounded-md p-2 ${action.color}`}>
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="ml-3 text-sm font-medium text-gray-900">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Finanzübersicht */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Finanzübersicht</h3>
            <ChartPieIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-800 mb-2">Bezahlte Rechnungen</h4>
                <p className="text-2xl font-bold text-green-600">
                  {financials.loading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    formatCurrency(financials.totalPaid)
                  )}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Offene Rechnungen</h4>
                <p className="text-2xl font-bold text-yellow-600">
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

        {/* Letzte Arbeitszeiten */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Letzte Aktivitäten</h3>
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm font-medium">
            <Link to="/time-tracking" className="text-blue-600 hover:text-blue-900">
              Zur Zeiterfassung
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Letzte Aufträge */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Neueste Aufträge</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentItems.orders.loading ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                Daten werden geladen...
              </div>
            ) : recentItems.orders.data.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                Keine Aufträge vorhanden
              </div>
            ) : (
              recentItems.orders.data.map(order => (
                <Link 
                  key={order._id} 
                  to={`/orders/${order._id}`}
                  className="block px-4 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {order.customer && order.customer.name ? order.customer.name : 'Kunde'}
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <div className="text-sm text-gray-500">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm font-medium">
            <Link to="/orders" className="text-blue-600 hover:text-blue-900">
              Alle Aufträge anzeigen
            </Link>
          </div>
        </div>

        {/* Letzte Rechnungen */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Neueste Rechnungen</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentItems.invoices.loading ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                Daten werden geladen...
              </div>
            ) : recentItems.invoices.data.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                Keine Rechnungen vorhanden
              </div>
            ) : (
              recentItems.invoices.data.map(invoice => (
                <Link 
                  key={invoice._id} 
                  to={`/invoices/${invoice._id}`}
                  className="block px-4 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {invoice.customer && invoice.customer.name ? invoice.customer.name : 'Kunde'} - {formatDate(invoice.issueDate)}
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${invoice.status === 'bezahlt' ? 'bg-green-100 text-green-800' : 
                           invoice.status === 'versendet' ? 'bg-blue-100 text-blue-800' : 
                           invoice.status === 'storniert' ? 'bg-red-100 text-red-800' : 
                           'bg-yellow-100 text-yellow-800'}`}
                      >
                        {invoice.status}
                      </span>
                      <div className="ml-2 text-sm text-gray-500">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm font-medium">
            <Link to="/invoices" className="text-blue-600 hover:text-blue-900">
              Alle Rechnungen anzeigen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;