// backend/models/SystemSettings.js (Mit den zusätzlichen Feldern)
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
  
  // Neue Finanzeinstellungen
  hourlyRate: {
    type: Number,
    default: 100, // Standardstundensatz in der Währungseinheit (z.B. EUR)
    min: 0
  },
  billingInterval: {
    type: Number,
    enum: [1, 15, 30, 60], // Mögliche Werte: 1, 15, 30 oder 60 Minuten
    default: 15 // Standard: Jede angefangene 15 Minuten wird berechnet
  },
  defaultPaymentSchedule: {
    type: String,
    enum: ['full', 'installments'],
    default: 'full' // Standard: Vollständige Zahlung
  },
  paymentInstallments: {
    firstRate: {
      type: Number,
      default: 30, // 30% nach Auftragsbestätigung
      min: 0,
      max: 100
    },
    secondRate: {
      type: Number,
      default: 30, // 30% nach Materiallieferung
      min: 0,
      max: 100
    },
    finalRate: {
      type: Number,
      default: 40, // 40% nach Abnahme
      min: 0,
      max: 100
    }
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

// Stellen Sie sicher, dass die Summe der Raten 100% ergibt
SystemSettingsSchema.pre('save', function(next) {
  if (this.paymentInstallments) {
    const totalPercent = 
      this.paymentInstallments.firstRate + 
      this.paymentInstallments.secondRate + 
      this.paymentInstallments.finalRate;
    
    if (Math.round(totalPercent) !== 100) {
      const error = new Error('Die Summe der Raten muss 100% ergeben.');
      return next(error);
    }
  }
  next();
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