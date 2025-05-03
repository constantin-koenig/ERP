// src/pages/invoices/InvoiceForm.jsx (korrigierte Version)
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import { createInvoice, getInvoice, updateInvoice } from '../../services/invoiceService'
import { getCustomers } from '../../services/customerService'
import { getOrders } from '../../services/orderService'
import { getTimeTrackings } from '../../services/timeTrackingService'
import { getSystemSettings } from '../../services/systemSettingsService'
import { ArrowLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/outline'
import { useTheme } from '../../context/ThemeContext'
import SearchableSelect from '../../components/ui/SearchableSelect' // Durchsuchbares Dropdown

const InvoiceSchema = Yup.object().shape({
  customer: Yup.string().required('Kunde ist erforderlich'),
  items: Yup.array()
    .of(
      Yup.object().shape({
        description: Yup.string().required('Beschreibung ist erforderlich'),
        quantity: Yup.number()
          .required('Menge ist erforderlich')
          .min(1, 'Menge muss mindestens 1 sein'),
        unitPrice: Yup.number()
          .required('Einzelpreis ist erforderlich')
          .min(0, 'Preis kann nicht negativ sein')
      })
    )
    .min(1, 'Mindestens eine Rechnungsposition ist erforderlich'),
  subtotal: Yup.number().required('Zwischensumme ist erforderlich').min(0, 'Zwischensumme kann nicht negativ sein'),
  taxRate: Yup.number().required('Steuersatz ist erforderlich').min(0, 'Steuersatz kann nicht negativ sein')
})

const InvoiceForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const orderId = queryParams.get('orderId')
  const { isDarkMode } = useTheme()

  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [billingSettings, setBillingSettings] = useState({
    hourlyRate: 100,
    billingInterval: 15,
    defaultPaymentSchedule: 'full',
    paymentInstallments: {
      firstRate: 30,
      secondRate: 30,
      finalRate: 40
    }
  })
  const [initialValues, setInitialValues] = useState({
    invoiceNumber: '',
    customer: orderId || '',
    order: orderId || '',
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0
      }
    ],
    timeTracking: [],
    subtotal: 0,
    taxRate: 19,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'erstellt',
    notes: '',
    // Neue Felder für Zahlungsplan
    paymentSchedule: 'full', // Standard: Vollständige Zahlung
    installments: [] // Wird automatisch gefüllt
  })
  const [loading, setLoading] = useState(id ? true : false)
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        
        // Lade Kunden, Aufträge und Zeiteinträge
        const [customersResponse, ordersResponse, timeResponse, settingsResponse] = await Promise.all([
          getCustomers(),
          getOrders(),
          getTimeTrackings(),
          getSystemSettings()
        ])
        
        setCustomers(customersResponse.data.data)
        setOrders(ordersResponse.data.data)
        
        // Filtere nur nicht abgerechnete Zeiteinträge
        const unbilledTimeEntries = timeResponse.data.data.filter(entry => !entry.billed)
        setTimeEntries(unbilledTimeEntries)
        
        // Abrechnungseinstellungen laden
        if (settingsResponse.data.success) {
          const settings = settingsResponse.data.data;
          setBillingSettings({
            hourlyRate: settings.hourlyRate || 100,
            billingInterval: settings.billingInterval || 15,
            defaultPaymentSchedule: settings.defaultPaymentSchedule || 'full',
            paymentInstallments: settings.paymentInstallments || {
              firstRate: 30,
              secondRate: 30,
              finalRate: 40
            }
          });
          
          // Steuersatz und Zahlungsplan in initialValues setzen
          setInitialValues(prev => ({
            ...prev,
            taxRate: settings.taxRate || 19,
            paymentSchedule: settings.defaultPaymentSchedule || 'full'
          }));
        }

        // Wenn orderId in URL vorhanden ist, setze den entsprechenden Kunden
        if (orderId) {
          const orderData = ordersResponse.data.data.find(order => order._id === orderId);
          if (orderData) {
            // Finde den zugehörigen Kunden
            if (orderData.customer) {
              let customerId;
              if (typeof orderData.customer === 'object') {
                customerId = orderData.customer._id;
              } else {
                customerId = orderData.customer;
              }
              
              // Setze den Kunden und die Auftragsdaten
              setSelectedCustomerId(customerId);
              setSelectedOrderId(orderId);
              
              setInitialValues(prev => ({
                ...prev,
                customer: customerId,
                order: orderId,
                // Füge Auftragspositionen hinzu, wenn vorhanden
                items: orderData.items && orderData.items.length > 0 
                  ? [...orderData.items] 
                  : prev.items
              }));
            }
          }
        }
        
        setDataLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden der Daten')
        setDataLoading(false)
      }
    }

    const fetchInvoice = async () => {
      if (id) {
        try {
          const response = await getInvoice(id)
          const invoice = response.data.data
          
          // Formatiere Datumsfelder für das Formular
          const formatDateForInput = (dateString) => {
            if (!dateString) return ''
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
          }
          
          // Setze ausgewählten Kunden und Auftrag
          if (invoice.customer && typeof invoice.customer === 'object') {
            setSelectedCustomerId(invoice.customer._id)
          } else if (invoice.customer) {
            setSelectedCustomerId(invoice.customer)
          }
          
          if (invoice.order && typeof invoice.order === 'object') {
            setSelectedOrderId(invoice.order._id)
          } else if (invoice.order) {
            setSelectedOrderId(invoice.order)
          }

          setInitialValues({
            invoiceNumber: invoice.invoiceNumber || '',
            customer: invoice.customer._id || invoice.customer || '',
            order: invoice.order?._id || invoice.order || '',
            items: invoice.items && invoice.items.length > 0 ? invoice.items : [
              { description: '', quantity: 1, unitPrice: 0 }
            ],
            timeTracking: invoice.timeTracking || [],
            subtotal: invoice.subtotal || 0,
            taxRate: invoice.taxRate || 19,
            issueDate: formatDateForInput(invoice.issueDate),
            dueDate: formatDateForInput(invoice.dueDate),
            status: invoice.status || 'erstellt',
            notes: invoice.notes || '',
            // Zahlungsplan-Felder
            paymentSchedule: invoice.paymentSchedule || 'full',
            installments: invoice.installments || []
          })
          setLoading(false)
        } catch (error) {
          toast.error('Rechnung konnte nicht geladen werden')
          navigate('/invoices')
        }
      }
    }

    fetchData()
    if (id) {
      fetchInvoice()
    }
  }, [id, navigate, orderId])

  // Format der Daten für die SearchableSelect-Komponenten
  const customerOptions = customers.map(customer => ({
    value: customer._id,
    label: customer.name
  }));

  // Filtern der Aufträge basierend auf dem ausgewählten Kunden
  const filteredOrders = selectedCustomerId 
    ? orders.filter(order => 
        order.customer === selectedCustomerId || 
        (order.customer && order.customer._id === selectedCustomerId)
      )
    : orders;

  // Formatieren der gefilterten Aufträge für die SearchableSelect
  const orderOptions = filteredOrders.map(order => ({
    value: order._id,
    label: `${order.orderNumber} - ${order.description.substring(0, 40)}${order.description.length > 40 ? '...' : ''}`
  }));

  // Filtern der Zeiteinträge basierend auf dem ausgewählten Auftrag
  const filteredTimeEntries = selectedOrderId 
    ? timeEntries.filter(entry => 
        entry.order === selectedOrderId || 
        (entry.order && entry.order._id === selectedOrderId)
      )
    : timeEntries;

  // Formatieren der Zeiteinträge für die Darstellung
  const timeEntryOptions = filteredTimeEntries.map(entry => {
    // Datum und Beschreibung kürzen für bessere Lesbarkeit
    const date = new Date(entry.startTime).toLocaleDateString('de-DE');
    const duration = entry.duration 
      ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min` 
      : '-';
    // Beschreibung auf 40 Zeichen begrenzen
    const shortDesc = entry.description && entry.description.length > 40 
      ? `${entry.description.substring(0, 40)}...` 
      : entry.description;
      
    return {
      value: entry._id,
      label: `${date}: ${shortDesc} (${duration})`,
      // Zusätzliche Informationen für die Berechnung
      amount: entry.amount || 0,
      hourlyRate: entry.hourlyRate || 0,
      billableDuration: entry.billableDuration || entry.duration || 0
    };
  });

  const handleCustomerChange = (e, setFieldValue) => {
    const customerId = e.target.value
    setSelectedCustomerId(customerId)
    setFieldValue('customer', customerId)
    
    // Zurücksetzen des ausgewählten Auftrags, wenn der Kunde geändert wird
    setSelectedOrderId('')
    setFieldValue('order', '')
    setFieldValue('timeTracking', [])
  }

  const handleOrderChange = (e, setFieldValue) => {
    const orderId = e.target.value
    setSelectedOrderId(orderId)
    setFieldValue('order', orderId)
    
    // Zurücksetzen der ausgewählten Zeiteinträge
    setFieldValue('timeTracking', [])
    
    // Wenn ein Auftrag ausgewählt wurde, fülle die Rechnungspositionen aus den Auftragspositionen
    if (orderId) {
      const selectedOrder = orders.find(order => order._id === orderId)
      if (selectedOrder && selectedOrder.items && selectedOrder.items.length > 0) {
        setFieldValue('items', [...selectedOrder.items])
        
        // Berechne Zwischensumme
        const subtotal = calculateSubtotal(selectedOrder.items);
        setFieldValue('subtotal', subtotal)
      }
    }
  }

  const handlePaymentScheduleChange = (e, setFieldValue, values) => {
    const schedule = e.target.value;
    setFieldValue('paymentSchedule', schedule);
    
    // Bei Änderung zu Ratenzahlung automatisch Vorschlag generieren
    if (schedule === 'installments') {
      // Berechne die Raten basierend auf der aktuellen Zwischensumme und den gespeicherten Rateneinstellungen
      const totalAmount = values.subtotal * (1 + values.taxRate / 100);
      
      // Daten für die 3 Raten
      const firstAmount = (totalAmount * billingSettings.paymentInstallments.firstRate) / 100;
      const secondAmount = (totalAmount * billingSettings.paymentInstallments.secondRate) / 100;
      const finalAmount = (totalAmount * billingSettings.paymentInstallments.finalRate) / 100;
      
      // Fälligkeitsdaten berechnen
      const issueDate = values.issueDate ? new Date(values.issueDate) : new Date();
      const secondDueDate = new Date(issueDate);
      secondDueDate.setDate(secondDueDate.getDate() + 14); // 14 Tage nach Rechnungsdatum
      
      const dueDate = values.dueDate ? new Date(values.dueDate) : new Date(issueDate);
      dueDate.setDate(issueDate.getDate() + 30); // 30 Tage nach Rechnungsdatum
      
      // Installments erstellen
      const installments = [
        {
          description: 'Anzahlung nach Auftragsbestätigung',
          percentage: billingSettings.paymentInstallments.firstRate,
          amount: firstAmount,
          dueDate: values.issueDate,
          isPaid: false
        },
        {
          description: 'Teilzahlung nach Materiallieferung',
          percentage: billingSettings.paymentInstallments.secondRate,
          amount: secondAmount,
          dueDate: secondDueDate.toISOString().split('T')[0],
          isPaid: false
        },
        {
          description: 'Restzahlung nach Abnahme',
          percentage: billingSettings.paymentInstallments.finalRate,
          amount: finalAmount,
          dueDate: values.dueDate,
          isPaid: false
        }
      ];
      
      setFieldValue('installments', installments);
    } else {
      // Bei Wechsel zu Vollzahlung, Raten zurücksetzen
      setFieldValue('installments', []);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Wenn Ratenzahlung ausgewählt ist, aber keine Raten definiert sind, generiere sie
      if (values.paymentSchedule === 'installments' && (!values.installments || values.installments.length === 0)) {
        toast.error('Fehler: Keine Raten definiert für Ratenzahlung. Bitte wählen Sie einen anderen Zahlungsplan.');
        setSubmitting(false);
        return;
      }
      
      if (id) {
        await updateInvoice(id, values)
        toast.success('Rechnung erfolgreich aktualisiert')
      } else {
        await createInvoice(values)
        toast.success('Rechnung erfolgreich erstellt')
      }
      navigate('/invoices')
    } catch (error) {
      toast.error(`Fehler beim ${id ? 'Aktualisieren' : 'Erstellen'} der Rechnung`)
    } finally {
      setSubmitting(false)
    }
  }

  // Verbesserte Funktion zur Berechnung der Zwischensumme
  const calculateSubtotal = (items) => {
    if (!items || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      // Stelle sicher, dass alle Werte als Zahlen behandelt werden
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }

  // Funktion zum Berechnen der Gesamtsumme (inkl. MwSt)
  const calculateTotal = (subtotal, taxRate) => {
    const tax = (subtotal * taxRate) / 100;
    return subtotal + tax;
  }

  if (loading || dataLoading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Daten werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {id ? 'Rechnung bearbeiten' : 'Neue Rechnung erstellen'}
        </h2>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
          Zurück
        </button>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={InvoiceSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rechnungsnummer
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="invoiceNumber"
                    id="invoiceNumber"
                    placeholder="Wird automatisch generiert"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leer lassen für automatische Generierung
                  </p>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kunde *
                </label>
                <div className="mt-1">
                  {/* Durchsuchbare Kundenauswahl */}
                  <SearchableSelect
                    name="customer"
                    id="customer"
                    value={values.customer}
                    onChange={(e) => handleCustomerChange(e, setFieldValue)}
                    options={customerOptions}
                    placeholder="Bitte Kunde auswählen"
                    error={errors.customer && touched.customer ? errors.customer : ""}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auftrag
                </label>
                <div className="mt-1">
                  {/* Durchsuchbare Auftragsauswahl */}
                  <SearchableSelect
                    name="order"
                    id="order"
                    value={values.order}
                    onChange={(e) => handleOrderChange(e, setFieldValue)}
                    options={orderOptions}
                    placeholder="Keinen Auftrag auswählen"
                    disabled={!selectedCustomerId}
                  />
                  {!selectedCustomerId && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Bitte zuerst einen Kunden auswählen
                    </p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <div className="mt-1">
                  <Field
                    as="select"
                    name="status"
                    id="status"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="erstellt">Erstellt</option>
                    <option value="versendet">Versendet</option>
                    <option value="teilweise bezahlt">Teilweise bezahlt</option>
                    <option value="bezahlt">Bezahlt</option>
                    <option value="storniert">Storniert</option>
                  </Field>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rechnungsdatum
                </label>
                <div className="mt-1">
                  <Field
                    type="date"
                    name="issueDate"
                    id="issueDate"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fälligkeitsdatum
                </label>
                <div className="mt-1">
                  <Field
                    type="date"
                    name="dueDate"
                    id="dueDate"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>
              
              {/* Zahlungsplan-Auswahl */}
              <div className="sm:col-span-6">
                <label htmlFor="paymentSchedule" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zahlungsplan
                </label>
                <div className="mt-1">
                  <Field
                    as="select"
                    name="paymentSchedule"
                    id="paymentSchedule"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    onChange={(e) => handlePaymentScheduleChange(e, setFieldValue, values)}
                  >
                    <option value="full">Vollständige Zahlung bei Fälligkeit</option>
                    <option value="installments">Ratenzahlung (30-30-40 Prinzip)</option>
                  </Field>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Bei Ratenzahlung wird der Gesamtbetrag in drei Zahlungen aufgeteilt: 30% nach Auftragsbestätigung, 30% nach Materiallieferung und 40% nach Abnahme.
                </p>
              </div>
              
              {/* Zeige Ratendetails an, wenn Ratenzahlung ausgewählt ist */}
              {values.paymentSchedule === 'installments' && values.installments && values.installments.length > 0 && (
                <div className="sm:col-span-6">
                  <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Zahlungsraten</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={isDarkMode ? 'bg-gray-600' : 'bg-gray-100'}>
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Beschreibung
                            </th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Anteil (%)
                            </th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Betrag
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Fälligkeitsdatum
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {values.installments.map((installment, index) => (
                            <tr key={index} className={isDarkMode ? 'bg-gray-700' : 'bg-white'}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {installment.description}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                                {installment.percentage}%
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                                {new Intl.NumberFormat('de-DE', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(installment.amount)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {installment.dueDate}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Die Raten werden automatisch basierend auf dem Rechnungsbetrag berechnet. Die Summe entspricht 100% des Gesamtbetrags.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="sm:col-span-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Rechnungspositionen</h3>
                <FieldArray name="items">
                  {({ remove, push }) => (
                    <div>
                      {values.items.length > 0 &&
                        values.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-start">
                            <div className="col-span-6">
                              <label
                                htmlFor={`items.${index}.description`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Beschreibung *
                              </label>
                              <Field
                                name={`items.${index}.description`}
                                type="text"
                                className={`mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                                  errors.items && 
                                  errors.items[index] && 
                                  errors.items[index].description && 
                                  touched.items && 
                                  touched.items[index] && 
                                  touched.items[index].description 
                                    ? 'border-red-300 dark:border-red-500' 
                                    : ''
                                }`}
                              />
                              <ErrorMessage
                                name={`items.${index}.description`}
                                component="div"
                                className="mt-1 text-sm text-red-600 dark:text-red-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <label
                                htmlFor={`items.${index}.quantity`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Menge *
                              </label>
                              <Field
                                name={`items.${index}.quantity`}
                                type="number"
                                min="1"
                                className={`mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                                  errors.items && 
                                  errors.items[index] && 
                                  errors.items[index].quantity && 
                                  touched.items && 
                                  touched.items[index] && 
                                  touched.items[index].quantity 
                                    ? 'border-red-300 dark:border-red-500' 
                                    : ''
                                }`}
                                onChange={(e) => {
                                  // Aktuelle Werte von allen Positionen erfassen
                                  const updatedItems = [...values.items];
                                  // Aktualisiere das spezifische Feld
                                  updatedItems[index].quantity = Number(e.target.value);
                                  
                                  // Aktualisiere das Formularfeld
                                  setFieldValue(`items.${index}.quantity`, Number(e.target.value));
                                  
                                  // Berechne die neue Gesamtsumme aus den aktualisierten Werten
                                  const newSubtotal = calculateSubtotal(updatedItems);
                                  setFieldValue('subtotal', newSubtotal);
                                  
                                  // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                                  if (values.paymentSchedule === 'installments') {
                                    const total = calculateTotal(newSubtotal, values.taxRate);
                                    
                                    // Aktualisiere die Ratenbeträge
                                    const updatedInstallments = values.installments.map(installment => ({
                                      ...installment,
                                      amount: (total * installment.percentage) / 100
                                    }));
                                    
                                    setFieldValue('installments', updatedInstallments);
                                  }
                                }}
                              />
                              <ErrorMessage
                                name={`items.${index}.quantity`}
                                component="div"
                                className="mt-1 text-sm text-red-600 dark:text-red-400"
                              />
                            </div>
                            <div className="col-span-3">
                              <label
                                htmlFor={`items.${index}.unitPrice`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Einzelpreis (€) *
                              </label>
                              <Field
                                name={`items.${index}.unitPrice`}
                                type="number"
                                step="0.01"
                                min="0"
                                className={`mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                                  errors.items && 
                                  errors.items[index] && 
                                  errors.items[index].unitPrice && 
                                  touched.items && 
                                  touched.items[index] && 
                                  touched.items[index].unitPrice 
                                    ? 'border-red-300 dark:border-red-500' 
                                    : ''
                                }`}
                                onChange={(e) => {
                                  // Aktuelle Werte von allen Positionen erfassen
                                  const updatedItems = [...values.items];
                                  // Aktualisiere das spezifische Feld
                                  updatedItems[index].unitPrice = Number(e.target.value);
                                  
                                  // Aktualisiere das Formularfeld
                                  setFieldValue(`items.${index}.unitPrice`, Number(e.target.value));
                                  
                                  // Berechne die neue Gesamtsumme aus den aktualisierten Werten
                                  const newSubtotal = calculateSubtotal(updatedItems);
                                  setFieldValue('subtotal', newSubtotal);
                                  
                                  // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                                  if (values.paymentSchedule === 'installments') {
                                    const total = calculateTotal(newSubtotal, values.taxRate);
                                    
                                    // Aktualisiere die Ratenbeträge
                                    const updatedInstallments = values.installments.map(installment => ({
                                      ...installment,
                                      amount: (total * installment.percentage) / 100
                                    }));
                                    
                                    setFieldValue('installments', updatedInstallments);
                                  }
                                }}
                              />
                              <ErrorMessage
                                name={`items.${index}.unitPrice`}
                                component="div"
                                className="mt-1 text-sm text-red-600 dark:text-red-400"
                              />
                            </div>
                            <div className="col-span-1 flex items-end">
                              <button
                                type="button"
                                className="mt-1 mb-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                onClick={() => {
                                  if (values.items.length > 1) {
                                    // Erstelle eine Kopie der Items ohne das zu entfernende Element
                                    const newItems = [...values.items];
                                    newItems.splice(index, 1);
                                    
                                    // Entferne das Element aus dem Formular
                                    remove(index);
                                    
                                    // Berechne die neue Zwischensumme
                                    const newSubtotal = calculateSubtotal(newItems);
                                    setFieldValue('subtotal', newSubtotal);
                                    
                                    // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                                    if (values.paymentSchedule === 'installments') {
                                      const total = calculateTotal(newSubtotal, values.taxRate);
                                      
                                      // Aktualisiere die Ratenbeträge
                                      const updatedInstallments = values.installments.map(installment => ({
                                        ...installment,
                                        amount: (total * installment.percentage) / 100
                                      }));
                                      
                                      setFieldValue('installments', updatedInstallments);
                                    }
                                  } else {
                                    toast.warning('Mindestens eine Position ist erforderlich');
                                  }
                                }}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          onClick={() => {
                            // Füge neue Position hinzu
                            push({ description: '', quantity: 1, unitPrice: 0 });
                            
                            // Aktualisiere Zwischensumme mit einem kleinen Delay
                            setTimeout(() => {
                              const newItems = [...values.items, { description: '', quantity: 1, unitPrice: 0 }];
                              const newSubtotal = calculateSubtotal(newItems);
                              setFieldValue('subtotal', newSubtotal);
                            }, 50);
                          }}
                        >
                          <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
                          Position hinzufügen
                        </button>
                      </div>
                      {errors.items && typeof errors.items === 'string' && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.items}</div>
                      )}
                    </div>
                  )}
                </FieldArray>
              </div>

              {/* Ausgewählte Zeiteinträge mit SearchableSelect */}
              {(selectedOrderId || selectedCustomerId) && filteredTimeEntries.length > 0 && (
                <div className="sm:col-span-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Zeiteinträge</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <div className="mb-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                          checked={values.timeTracking.length === filteredTimeEntries.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Alle auswählen
                              const allTimeEntryIds = filteredTimeEntries.map(entry => entry._id);
                              setFieldValue('timeTracking', allTimeEntryIds);
                              
                              // Berechne Zwischensumme für Zeiteinträge
                              const timeEntryTotal = filteredTimeEntries.reduce((sum, entry) => {
                                return sum + (entry.amount || 0);
                              }, 0);
                              
                              // Aktuelle Zwischensumme der Artikelpositionen
                              const itemsSubtotal = calculateSubtotal(values.items);
                              
                              // Gesamtsumme aktualisieren
                              const newSubtotal = itemsSubtotal + timeEntryTotal;
                              setFieldValue('subtotal', newSubtotal);
                              
                              // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                              if (values.paymentSchedule === 'installments') {
                                const total = calculateTotal(newSubtotal, values.taxRate);
                                
                                // Aktualisiere die Ratenbeträge
                                const updatedInstallments = values.installments.map(installment => ({
                                  ...installment,
                                  amount: (total * installment.percentage) / 100
                                }));
                                
                                setFieldValue('installments', updatedInstallments);
                              }
                            } else {
                              // Alle abwählen
                              setFieldValue('timeTracking', []);
                              
                              // Berechne Zwischensumme ohne Zeiteinträge
                              const itemsSubtotal = calculateSubtotal(values.items);
                              setFieldValue('subtotal', itemsSubtotal);
                              
                              // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                              if (values.paymentSchedule === 'installments') {
                                const total = calculateTotal(itemsSubtotal, values.taxRate);
                                
                                // Aktualisiere die Ratenbeträge
                                const updatedInstallments = values.installments.map(installment => ({
                                  ...installment,
                                  amount: (total * installment.percentage) / 100
                                }));
                                
                                setFieldValue('installments', updatedInstallments);
                              }
                            }
                          }}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                          Alle auswählen / abwählen
                        </span>
                      </label>
                    </div>

                    {/* Suchfeld für Zeiteinträge, wenn mehr als 5 vorhanden sind */}
                    {filteredTimeEntries.length > 5 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Zeiteinträge durchsuchen
                        </label>
                        <div className="flex space-x-2">
                          <SearchableSelect
                            id="timeEntrySelect"
                            name="timeEntrySelect"
                            value=""
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              if (selectedId && !values.timeTracking.includes(selectedId)) {
                                const updatedTimeTracking = [...values.timeTracking, selectedId];
                                setFieldValue('timeTracking', updatedTimeTracking);
                                
                                // Suche den ausgewählten Zeiteintrag
                                const selectedEntry = filteredTimeEntries.find(entry => entry._id === selectedId);
                                if (selectedEntry) {
                                  // Aktuelle Zwischensumme berechnen
                                  const itemsSubtotal = calculateSubtotal(values.items);
                                  
                                  // Berechne zusätzlichen Betrag für den ausgewählten Zeiteintrag
                                  const entryAmount = selectedEntry.amount || 0;
                                  
                                  // Aktualisiere Zwischensumme
                                  const newSubtotal = itemsSubtotal + entryAmount;
                                  setFieldValue('subtotal', newSubtotal);
                                  
                                  // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                                  if (values.paymentSchedule === 'installments') {
                                    const total = calculateTotal(newSubtotal, values.taxRate);
                                    
                                    // Aktualisiere die Ratenbeträge
                                    const updatedInstallments = values.installments.map(installment => ({
                                      ...installment,
                                      amount: (total * installment.percentage) / 100
                                    }));
                                    
                                    setFieldValue('installments', updatedInstallments);
                                  }
                                }
                              }
                            }}
                            options={timeEntryOptions.filter(option => !values.timeTracking.includes(option.value))}
                            placeholder="Zeiteinträge suchen und hinzufügen"
                            threshold={0} // Immer Suchfeld anzeigen
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-60 overflow-y-auto">
                      {filteredTimeEntries.map(entry => (
                        <div key={entry._id} className="mb-2">
                          <label className="flex items-center">
                            <Field
                              type="checkbox"
                              name="timeTracking"
                              value={entry._id}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                              onChange={(e) => {
                                // Standard Formik-Handler für Checkbox-Arrays aufrufen
                                const { checked } = e.target;
                                const { value } = e.target;
                                const { timeTracking } = values;
                                
                                let newTimeTracking;
                                if (checked) {
                                  newTimeTracking = [...timeTracking, value];
                                } else {
                                  newTimeTracking = timeTracking.filter(v => v !== value);
                                }
                                
                                // Formularfeld aktualisieren
                                setFieldValue('timeTracking', newTimeTracking);
                                
                                // Berechne neue Zwischensumme basierend auf ausgewählten Zeiteinträgen
                                // Artikel-Zwischensumme
                                const itemsSubtotal = calculateSubtotal(values.items);
                                
                                // Zeiteinträge-Zwischensumme
                                const selectedEntries = filteredTimeEntries.filter(entry => 
                                  newTimeTracking.includes(entry._id)
                                );
                                const timeEntryTotal = selectedEntries.reduce((sum, entry) => {
                                  return sum + (entry.amount || 0);
                                }, 0);
                                
                                // Gesamtsumme
                                const newSubtotal = itemsSubtotal + timeEntryTotal;
                                setFieldValue('subtotal', newSubtotal);
                                
                                // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                                if (values.paymentSchedule === 'installments') {
                                  const total = calculateTotal(newSubtotal, values.taxRate);
                                  
                                  // Aktualisiere die Ratenbeträge
                                  const updatedInstallments = values.installments.map(installment => ({
                                    ...installment,
                                    amount: (total * installment.percentage) / 100
                                  }));
                                  
                                  setFieldValue('installments', updatedInstallments);
                                }
                              }}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                              {new Date(entry.startTime).toLocaleDateString('de-DE')}: {entry.description} (
                              {entry.duration
                                ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                                : '-'}
                              ) - {new Intl.NumberFormat('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(entry.amount || 0)}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="sm:col-span-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Zwischensumme (€) *
                    </label>
                    <div className="mt-1">
                      <Field
                        type="number"
                        name="subtotal"
                        id="subtotal"
                        step="0.01"
                        min="0"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                          errors.subtotal && touched.subtotal ? 'border-red-300 dark:border-red-500' : ''
                        }`}
                        onChange={(e) => {
                          const newSubtotal = Number(e.target.value);
                          setFieldValue('subtotal', newSubtotal);
                          
                          // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                          if (values.paymentSchedule === 'installments') {
                            const total = calculateTotal(newSubtotal, values.taxRate);
                            
                            // Aktualisiere die Ratenbeträge
                            const updatedInstallments = values.installments.map(installment => ({
                              ...installment,
                              amount: (total * installment.percentage) / 100
                            }));
                            
                            setFieldValue('installments', updatedInstallments);
                          }
                        }}
                      />
                      <ErrorMessage name="subtotal" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steuersatz (%) *
                    </label>
                    <div className="mt-1">
                      <Field
                        type="number"
                        name="taxRate"
                        id="taxRate"
                        step="0.1"
                        min="0"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                          errors.taxRate && touched.taxRate ? 'border-red-300 dark:border-red-500' : ''
                        }`}
                        onChange={(e) => {
                          const newTaxRate = Number(e.target.value);
                          setFieldValue('taxRate', newTaxRate);
                          
                          // Aktualisiere auch die Raten, wenn Ratenzahlung ausgewählt ist
                          if (values.paymentSchedule === 'installments') {
                            const total = calculateTotal(values.subtotal, newTaxRate);
                            
                            // Aktualisiere die Ratenbeträge
                            const updatedInstallments = values.installments.map(installment => ({
                              ...installment,
                              amount: (total * installment.percentage) / 100
                            }));
                            
                            setFieldValue('installments', updatedInstallments);
                          }
                        }}
                      />
                      <ErrorMessage name="taxRate" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steuer
                    </label>
                    <div className="mt-1">
                      <div className="shadow-sm block w-full sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-800">
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format((values.subtotal * values.taxRate) / 100)}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gesamtbetrag
                    </label>
                    <div className="mt-1">
                      <div className="shadow-sm block w-full sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-800 font-medium">
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(Number(values.subtotal) + (Number(values.subtotal) * Number(values.taxRate)) / 100)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notizen
                </label>
                <div className="mt-1">
                  <Field
                    as="textarea"
                    id="notes"
                    name="notes"
                    rows={6}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md notes-textarea notes-input"
                    placeholder="Interne Notizen zur Rechnung. Diese erscheinen nicht auf der Rechnung selbst."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Interne Hinweise zur Rechnung, wie besondere Vereinbarungen, Zahlungsbedingungen oder Kontextinformationen.
                  Zeilenumbrüche werden bei der Anzeige beibehalten.
                </p>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Wird gespeichert...' : id ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default InvoiceForm