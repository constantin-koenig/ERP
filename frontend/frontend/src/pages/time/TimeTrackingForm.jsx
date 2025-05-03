// src/pages/time/TimeTrackingForm.jsx - Mit Abrechnungsanpassungen
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { createTimeTracking, getTimeTracking, updateTimeTracking } from '../../services/timeTrackingService';
import { getOrders } from '../../services/orderService';
import { getUsers } from '../../services/authService';
import { getSystemSettings } from '../../services/systemSettingsService';
import { ArrowLeftIcon } from '@heroicons/react/outline';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/ui/SearchableSelect';

const TimeTrackingSchema = Yup.object().shape({
  description: Yup.string().required('Beschreibung ist erforderlich'),
  startTime: Yup.date().required('Startzeit ist erforderlich'),
  endTime: Yup.date()
    .required('Endzeit ist erforderlich')
    .min(
      Yup.ref('startTime'),
      'Endzeit muss nach der Startzeit liegen'
    ),
  hourlyRate: Yup.number()
    .min(0, 'Stundensatz kann nicht negativ sein')
    .required('Stundensatz ist erforderlich')
});

const TimeTrackingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get('orderId');
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(id ? true : false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billingSettings, setBillingSettings] = useState({
    hourlyRate: 100,
    billingInterval: 15,
  });

  const [initialValues, setInitialValues] = useState({
    description: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    order: orderId || '',
    assignedTo: user?.id || '',
    hourlyRate: 100,
    billed: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lade Aufträge und Benutzer
        const [ordersResponse, usersResponse, settingsResponse] = await Promise.all([
          getOrders(),
          getUsers(),
          getSystemSettings()
        ]);
        
        setOrders(ordersResponse.data.data);
        setUsers(usersResponse.data.data);
        
        // Abrechnungseinstellungen laden
        if (settingsResponse.data.success) {
          const settings = settingsResponse.data.data;
          setBillingSettings({
            hourlyRate: settings.hourlyRate || 100,
            billingInterval: settings.billingInterval || 15,
          });
          
          // Stundensatz in initialValues setzen
          setInitialValues(prev => ({
            ...prev,
            hourlyRate: settings.hourlyRate || 100
          }));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        toast.error('Fehler beim Laden der Daten');
      }
    };

    fetchData();

    if (id) {
      const fetchTimeTracking = async () => {
        try {
          const response = await getTimeTracking(id);
          const timeEntry = response.data.data;
          
          // Formatiere Datumsfelder für das Formular
          const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toISOString().slice(0, 16);
          };
          
          setInitialValues({
            description: timeEntry.description || '',
            startTime: formatDateForInput(timeEntry.startTime),
            endTime: formatDateForInput(timeEntry.endTime),
            order: timeEntry.order || '',
            assignedTo: timeEntry.assignedTo || user?.id || '',
            hourlyRate: timeEntry.hourlyRate || billingSettings.hourlyRate,
            billed: timeEntry.billed || false
          });
          
          if (timeEntry.order) {
            const orderResponse = await getOrders({ id: timeEntry.order });
            if (orderResponse.data.data.length > 0) {
              setSelectedOrder(orderResponse.data.data[0]);
            }
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Fehler beim Laden des Zeiteintrags:', error);
          toast.error('Fehler beim Laden des Zeiteintrags');
          navigate('/time-tracking');
        }
      };

      fetchTimeTracking();
    } else {
      setLoading(false);
    }
  }, [id, navigate, orderId, user?.id]);

  // Hilfsfunktion zum Berechnen des abrechenbaren Betrags
  const calculateBillableAmount = (startTime, endTime, hourlyRate) => {
    // Tatsächliche Dauer in Minuten berechnen
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationInMinutes = Math.round((end - start) / (1000 * 60));
    
    if (durationInMinutes <= 0) return { duration: 0, billableDuration: 0, amount: 0 };
    
    // Abrechnungsintervall anwenden
    const billableDuration = roundToInterval(durationInMinutes, billingSettings.billingInterval);
    
    // Betrag berechnen: (abrechenbare Minuten / 60) * Stundensatz
    const amount = (billableDuration / 60) * hourlyRate;
    
    return {
      duration: durationInMinutes,
      billableDuration,
      amount
    };
  };
  
  // Hilfsfunktion zum Aufrunden auf ein bestimmtes Intervall
  const roundToInterval = (minutes, interval) => {
    if (interval <= 0) return minutes;
    
    // Anzahl an vollen Intervallen
    const fullIntervals = Math.floor(minutes / interval);
    
    // Wenn es einen Rest gibt, runde auf das nächste volle Intervall auf
    if (minutes % interval > 0) {
      return (fullIntervals + 1) * interval;
    }
    
    return fullIntervals * interval;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Berechne die abrechenbare Dauer und den Betrag
      const { duration, billableDuration, amount } = calculateBillableAmount(
        values.startTime, 
        values.endTime, 
        values.hourlyRate
      );
      
      const timeTrackingData = {
        ...values,
        // Zusätzliche Felder für die Abrechnung
        duration,
        billableDuration,
        amount
      };
      
      if (id) {
        await updateTimeTracking(id, timeTrackingData);
        toast.success('Zeiteintrag erfolgreich aktualisiert');
      } else {
        await createTimeTracking(timeTrackingData);
        toast.success('Zeiteintrag erfolgreich erstellt');
      }
      navigate('/time-tracking');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error(`Fehler beim ${id ? 'Aktualisieren' : 'Erstellen'} des Zeiteintrags`);
    } finally {
      setSubmitting(false);
    }
  };

  const orderOptions = orders.map(order => ({
    value: order._id,
    label: `${order.orderNumber}: ${order.description.substring(0, 50)}${order.description.length > 50 ? '...' : ''}`
  }));

  const userOptions = users.map(user => ({
    value: user._id,
    label: user.name
  }));

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Daten werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {id ? 'Zeiteintrag bearbeiten' : 'Neue Zeit erfassen'}
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
        validationSchema={TimeTrackingSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values, errors, touched, setFieldValue }) => {
          // Berechne die abrechenbare Dauer bei jeder Änderung der relevanten Felder
          const { duration, billableDuration, amount } = calculateBillableAmount(
            values.startTime, 
            values.endTime, 
            values.hourlyRate
          );
          
          return (
            <Form className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Beschreibung *
                  </label>
                  <div className="mt-1">
                    <Field
                      as="textarea"
                      id="description"
                      name="description"
                      rows={3}
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.description && touched.description ? 'border-red-300 dark:border-red-500' : ''
                      }`}
                    />
                    <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Startzeit *
                  </label>
                  <div className="mt-1">
                    <Field
                      type="datetime-local"
                      name="startTime"
                      id="startTime"
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.startTime && touched.startTime ? 'border-red-300 dark:border-red-500' : ''
                      }`}
                    />
                    <ErrorMessage name="startTime" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Endzeit *
                  </label>
                  <div className="mt-1">
                    <Field
                      type="datetime-local"
                      name="endTime"
                      id="endTime"
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.endTime && touched.endTime ? 'border-red-300 dark:border-red-500' : ''
                      }`}
                    />
                    <ErrorMessage name="endTime" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auftrag
                  </label>
                  <div className="mt-1">
                    <SearchableSelect
                      name="order"
                      id="order"
                      value={values.order}
                      onChange={(e) => {
                        const orderId = e.target.value;
                        setFieldValue('order', orderId);
                        
                        // Finde den ausgewählten Auftrag für zusätzliche Informationen
                        const selectedOrder = orders.find(order => order._id === orderId);
                        setSelectedOrder(selectedOrder);
                      }}
                      options={orderOptions}
                      placeholder="Keinen Auftrag zuordnen"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bearbeiter
                  </label>
                  <div className="mt-1">
                    <SearchableSelect
                      name="assignedTo"
                      id="assignedTo"
                      value={values.assignedTo}
                      onChange={(e) => setFieldValue('assignedTo', e.target.value)}
                      options={userOptions}
                      placeholder="Benutzer auswählen"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stundensatz (€) *
                  </label>
                  <div className="mt-1">
                    <Field
                      type="number"
                      name="hourlyRate"
                      id="hourlyRate"
                      min="0"
                      step="0.01"
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.hourlyRate && touched.hourlyRate ? 'border-red-300 dark:border-red-500' : ''
                      }`}
                    />
                    <ErrorMessage name="hourlyRate" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Standardstundensatz: {billingSettings.hourlyRate} €/h
                  </p>
                </div>
                
                <div className="sm:col-span-6">
                  <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Abrechnungsinformationen</h3>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tatsächliche Dauer:</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(duration)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Abrechenbare Dauer (je {billingSettings.billingInterval} min):
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(billableDuration)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Abrechenbarer Betrag:</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                    </div>
                    
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Hinweis: Jede angefangene {billingSettings.billingInterval} Minuten werden voll berechnet.
                    </p>
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <Field
                        type="checkbox"
                        name="billed"
                        id="billed"
                        className={`focus:ring-blue-500 h-4 w-4 text-blue-600 ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                        } rounded`}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="billed" className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Bereits abgerechnet
                      </label>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Dieser Zeiteintrag wird in den unbezahlten Stunden nicht mehr angezeigt.
                      </p>
                    </div>
                  </div>
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
                    {isSubmitting ? 'Wird gespeichert...' : id ? 'Aktualisieren' : 'Speichern'}
                  </button>
                </div>
              </div>
            </Form>
          )
        }}
      </Formik>
    </div>
  );
};

export default TimeTrackingForm;