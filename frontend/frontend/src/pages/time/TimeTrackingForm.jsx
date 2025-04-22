// src/pages/time/TimeTrackingForm.jsx - Mit durchsuchbarer Auswahl
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { createTimeTracking, getTimeTracking, updateTimeTracking } from '../../services/timeTrackingService'
import { getOrders } from '../../services/orderService'
import { ArrowLeftIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { useTheme } from '../../context/ThemeContext'
import SearchableSelect from '../../components/ui/SearchableSelect' // Durchsuchbares Dropdown

// Funktion zum Formatieren von Datum und Zeit für HTML-Inputfelder
const formatDateTimeForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16) // Format: "YYYY-MM-DDThh:mm"
}

// Funktion zur Berechnung der Dauer in Minuten zwischen zwei Datumswerten
const calculateDurationInMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (end <= start) return 0;
  
  // Differenz in Millisekunden und Umrechnung in Minuten
  const diffMs = end - start;
  return Math.round(diffMs / 60000); // 60000 ms = 1 Minute
}

const TimeTrackingSchema = Yup.object().shape({
  description: Yup.string().required('Beschreibung ist erforderlich'),
  startTime: Yup.date().required('Startzeit ist erforderlich'),
  endTime: Yup.date()
    .required('Endzeit ist erforderlich')
    .test('is-after-startTime', 'Endzeit muss nach Startzeit liegen', function (value) {
      const { startTime } = this.parent
      return !startTime || !value || new Date(value) > new Date(startTime)
    })
})

const TimeTrackingForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const orderId = queryParams.get('orderId')
  const { isDarkMode } = useTheme()

  const [orders, setOrders] = useState([])
  const [initialValues, setInitialValues] = useState({
    order: orderId || '',
    description: '',
    startTime: formatDateTimeForInput(new Date()),
    endTime: formatDateTimeForInput(new Date(Date.now() + 60 * 60 * 1000)) // Standard: 1 Stunde später
  })
  const [loading, setLoading] = useState(id ? true : false)
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await getOrders()
        setOrders(response.data.data)
        setOrdersLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden der Aufträge')
        setOrdersLoading(false)
      }
    }

    const fetchTimeTracking = async () => {
      if (id) {
        try {
          const response = await getTimeTracking(id)
          const timeTracking = response.data.data
          
          setInitialValues({
            order: timeTracking.order?._id || timeTracking.order || '',
            description: timeTracking.description || '',
            startTime: formatDateTimeForInput(timeTracking.startTime),
            endTime: formatDateTimeForInput(timeTracking.endTime)
          })
          setLoading(false)
        } catch (error) {
          toast.error('Zeiteintrag konnte nicht geladen werden')
          navigate('/time-tracking')
        }
      }
    }

    fetchOrders()
    fetchTimeTracking()
  }, [id, navigate])

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Berechne die Dauer in Minuten
      const duration = calculateDurationInMinutes(values.startTime, values.endTime);
      
      // Füge die berechnete Dauer zum values-Objekt hinzu
      const timeTrackingData = {
        ...values,
        duration: duration
      };
      
      if (id) {
        await updateTimeTracking(id, timeTrackingData)
        toast.success('Zeiteintrag erfolgreich aktualisiert')
      } else {
        await createTimeTracking(timeTrackingData)
        toast.success('Zeiteintrag erfolgreich erstellt')
      }
      navigate('/time-tracking')
    } catch (error) {
      toast.error(`Fehler beim ${id ? 'Aktualisieren' : 'Erstellen'} des Zeiteintrags`)
    } finally {
      setSubmitting(false)
    }
  }

  // Formatiere die Aufträge für das durchsuchbare Dropdown
  const orderOptions = orders.map(order => ({
    value: order._id,
    label: `${order.orderNumber} - ${order.description.substring(0, 40)}${order.description.length > 40 ? '...' : ''}`
  }));

  if (loading || ordersLoading) {
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
        {({ isSubmitting, values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auftrag
                </label>
                <div className="mt-1">
                  {/* Durchsuchbares Dropdown für Aufträge */}
                  <SearchableSelect
                    name="order"
                    id="order"
                    value={values.order}
                    onChange={(e) => setFieldValue('order', e.target.value)}
                    options={orderOptions}
                    placeholder="Keinem Auftrag zuordnen"
                    threshold={5} // Zeige Suche ab 5 Einträgen
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Beschreibung *
                </label>
                <div className="mt-1">
                  <Field
                    as="textarea"
                    name="description"
                    id="description"
                    rows={6}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md notes-textarea notes-input ${
                      errors.description && touched.description ? 'border-red-300 dark:border-red-500' : ''
                    }`}
                    placeholder="Beschreiben Sie hier die durchgeführten Tätigkeiten. Stichpunkte und Zeilenumbrüche bleiben erhalten."
                  />
                  <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Bitte beschreiben Sie Ihre Tätigkeiten detailliert. Listen Sie einzelne Schritte gerne mit Aufzählungszeichen auf.
                  Der Text wird genau so angezeigt, wie Sie ihn eingeben, einschließlich Zeilenumbrüchen.
                </p>
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

              {values.startTime && values.endTime && (() => {
                try {
                  const start = new Date(values.startTime);
                  const end = new Date(values.endTime);
                  if (end > start) {
                    const diffMs = end - start;
                    const diffMins = Math.floor(diffMs / 60000);
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    
                    return (
                      <div className="sm:col-span-6">
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                          <strong>Berechnete Dauer:</strong> {hours}h {mins}min ({diffMins} Minuten)
                        </div>
                      </div>
                    );
                  }
                } catch (error) {
                  return null;
                }
              })()}
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

export default TimeTrackingForm