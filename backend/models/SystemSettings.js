// backend/models/SystemSettings.js
const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  // Allgemeine Einstellungen
  companyName: {
    type: String,
    default: 'Mein Unternehmen'
  },
  companyLogo: {
    type: String, // URL zum Logo
    default: ''
  },
  
  // Finanzeinstellungen
  currency: {
    type: String,
    enum: ['EUR', 'USD', 'GBP', 'CHF'],
    default: 'EUR'
  },
  currencySymbol: {
    type: String,
    default: '€'
  },
  taxRate: {
    type: Number,
    default: 19
  },
  paymentTerms: {
    type: Number, // Tage
    default: 30
  },

  // Rechtliche Einstellungen
  termsAndConditions: {
    type: String,
    default: 'Standardmäßige AGB-Texte hier einfügen...'
  },
  privacyPolicy: {
    type: String,
    default: 'Standardmäßige Datenschutzerklärung hier einfügen...'
  },
  invoiceFooter: {
    type: String,
    default: 'Vielen Dank für Ihr Vertrauen. Bitte überweisen Sie den Rechnungsbetrag innerhalb der angegebenen Zahlungsfrist.'
  },
  
  // Benutzereinstellungen
  allowRegistration: {
    type: Boolean,
    default: false // Standardmäßig keine öffentliche Registrierung
  },
  allowPasswordReset: {
    type: Boolean,
    default: true
  },
  
  // Systemeinstellungen
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'Das System wird aktuell gewartet. Bitte versuchen Sie es später noch einmal.'
  },
  
  // Aktualisierungsinformationen
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Nutze versionKey für optimistische Sperrung
  timestamps: true
});

// Stellen Sie sicher, dass es nur einen Eintrag für die Systemeinstellungen gibt
SystemSettingsSchema.statics.getSettings = async function() {
  const settings = await this.findOne();
  if (settings) {
    return settings;
  }
  
  // Wenn es noch keine Einstellungen gibt, erstelle einen Standardeintrag
  return await this.create({});
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);