// frontend/frontend/src/pages/admin/SystemSettings.jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSystemSettings, updateSystemSettings } from '../../services/systemSettingsService';
import { useTheme } from '../../context/ThemeContext';
import {
  CogIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  MailIcon,
  UploadIcon
} from '@heroicons/react/outline';
import TermsEditor from './TermsEditor';

const SystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { isDarkMode } = useTheme();
  const [settingsData, setSettingsData] = useState({
    // Allgemeine Einstellungen
    companyName: '',
    companyLogo: '',

    // Finanzeinstellungen
    currency: 'EUR',
    currencySymbol: '€',
    taxRate: 19,
    paymentTerms: 30,

    // Rechtliche Einstellungen
    termsAndConditions: '',
    privacyPolicy: '',
    invoiceFooter: '',

    // Benutzereinstellungen
    allowRegistration: false,
    allowPasswordReset: true,

    // Systemeinstellungen
    maintenanceMode: false,
    maintenanceMessage: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSystemSettings();
      if (response.data.success) {
        setSettingsData(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Systemeinstellungen:', error);
      toast.error('Fehler beim Laden der Systemeinstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTextAreaChange = (name, value) => {
    setSettingsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await updateSystemSettings(settingsData);
      if (response.data.success) {
        toast.success('Systemeinstellungen wurden erfolgreich aktualisiert');
        setSettingsData(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Systemeinstellungen:', error);
      toast.error('Fehler beim Aktualisieren der Systemeinstellungen');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Nur Bilder erlauben
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Bitte wählen Sie eine gültige Bilddatei (JPEG, PNG, SVG)');
      return;
    }

    // Max. 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Das Bild darf maximal 2MB groß sein');
      return;
    }

    // Datei in Base64 umwandeln
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettingsData(prev => ({
        ...prev,
        companyLogo: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
        <p className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Einstellungen werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Systemeinstellungen</h1>

      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden sm:rounded-lg`}>
        <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? isDarkMode 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-blue-500 text-blue-600'
                  : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CogIcon className="h-5 w-5 inline mr-2" />
              Allgemein
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'finance'
                  ? isDarkMode 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-blue-500 text-blue-600'
                  : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CurrencyEuroIcon className="h-5 w-5 inline mr-2" />
              Finanzen
            </button>
            <button
              onClick={() => setActiveTab('legal')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'legal'
                  ? isDarkMode 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-blue-500 text-blue-600'
                  : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Rechtliches
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? isDarkMode 
                    ? 'border-blue-500 text-blue-400' 
                    : 'border-blue-500 text-blue-600'
                  : isDarkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
              Sicherheit
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Allgemeine Einstellungen */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Allgemeine Einstellungen</h2>

                <div>
                  <label htmlFor="companyName" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Firmenname
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="companyName"
                      id="companyName"
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                        ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                      value={settingsData.companyName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="logoUpload" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Firmenlogo
                  </label>
                  <div className="mt-1 flex items-center">
                    <div className={`h-16 w-36 overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                      {settingsData.companyLogo ? (
                        <img
                          src={settingsData.companyLogo}
                          alt="Firmenlogo"
                          className="h-full"
                        />
                      ) : (
                        <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Kein Logo</span>
                      )}
                    </div>
                    <label htmlFor="logoUpload" className="ml-5 cursor-pointer">
                      <span className={`inline-flex items-center px-3 py-2 border ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        } shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}>
                        <UploadIcon className="-ml-0.5 mr-2 h-4 w-4" />
                        Logo hochladen
                      </span>
                      <input
                        id="logoUpload"
                        name="logoUpload"
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png,image/svg+xml"
                        onChange={handleLogoUpload}
                      />
                    </label>
                  </div>
                  <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Empfohlene Größe: 240x80 Pixel. Max. 2MB (JPG, PNG, SVG)
                  </p>
                </div>

                <div>
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="maintenanceMode"
                        name="maintenanceMode"
                        type="checkbox"
                        className={`focus:ring-blue-500 h-4 w-4 text-blue-600 ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                        } rounded`}
                        checked={settingsData.maintenanceMode}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="maintenanceMode" className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Wartungsmodus aktivieren
                      </label>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Im Wartungsmodus können sich nur Administratoren anmelden.
                      </p>
                    </div>
                  </div>
                </div>

                {settingsData.maintenanceMode && (
                  <div>
                    <label htmlFor="maintenanceMessage" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Wartungsmeldung
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="maintenanceMessage"
                        name="maintenanceMessage"
                        rows={3}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                          ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                        value={settingsData.maintenanceMessage}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Finanzeinstellungen */}
            {activeTab === 'finance' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Finanzeinstellungen</h2>

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="currency" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Währung
                    </label>
                    <div className="mt-1">
                      <select
                        id="currency"
                        name="currency"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                          ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                        value={settingsData.currency}
                        onChange={handleChange}
                      >
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">US-Dollar (USD)</option>
                        <option value="GBP">Britisches Pfund (GBP)</option>
                        <option value="CHF">Schweizer Franken (CHF)</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="currencySymbol" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Währungssymbol
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="currencySymbol"
                        id="currencySymbol"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                          ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                        value={settingsData.currencySymbol}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="taxRate" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Standard-Mehrwertsteuersatz (%)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="taxRate"
                        id="taxRate"
                        min="0"
                        max="100"
                        step="0.1"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                          ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                        value={settingsData.taxRate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="paymentTerms" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Standard-Zahlungsfrist (Tage)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="paymentTerms"
                        id="paymentTerms"
                        min="0"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                          ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                        value={settingsData.paymentTerms}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="invoiceFooter" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Standard-Rechnungsfußzeile
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="invoiceFooter"
                      name="invoiceFooter"
                      rows={3}
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm 
                        ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'} rounded-md`}
                      value={settingsData.invoiceFooter}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* Rechtliche Einstellungen */}
            {activeTab === 'legal' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rechtliche Einstellungen</h2>

                <div>
                  <label htmlFor="termsAndConditions" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Allgemeine Geschäftsbedingungen (AGB)
                  </label>
                  <div className="mt-1">
                    <TermsEditor
                      value={settingsData.termsAndConditions}
                      onChange={(value) => handleTextAreaChange('termsAndConditions', value)}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="privacyPolicy" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Datenschutzerklärung
                  </label>
                  <div className="mt-1">
                    <TermsEditor
                      value={settingsData.privacyPolicy}
                      onChange={(value) => handleTextAreaChange('privacyPolicy', value)}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sicherheitseinstellungen */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sicherheitseinstellungen</h2>

                <div>
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="allowRegistration"
                        name="allowRegistration"
                        type="checkbox"
                        className={`focus:ring-blue-500 h-4 w-4 text-blue-600 ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                        } rounded`}
                        checked={settingsData.allowRegistration}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="allowRegistration" className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Öffentliche Registrierung erlauben
                      </label>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Wenn aktiviert, können sich neue Benutzer ohne Einladung registrieren.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="allowPasswordReset"
                        name="allowPasswordReset"
                        type="checkbox"
                        className={`focus:ring-blue-500 h-4 w-4 text-blue-600 ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                        } rounded`}
                        checked={settingsData.allowPasswordReset}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="allowPasswordReset" className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Passwort-Zurücksetzen erlauben
                      </label>
                      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Wenn aktiviert, können Benutzer ihr Passwort über die "Passwort vergessen"-Funktion zurücksetzen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${isDarkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-50 border-yellow-400'} border-l-4 p-4`}>
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>E-Mail-Konfiguration</h3>
                      <div className={`mt-2 text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                        <p>
                          Die E-Mail-Konfiguration für Benutzereinladungen und Passwort-Zurücksetzen wird in den
                          Servereinstellungen vorgenommen.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`px-4 py-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} text-right sm:px-6`}>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemSettings;