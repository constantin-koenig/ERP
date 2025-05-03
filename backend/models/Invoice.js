// backend/models/Invoice.js (Mit Zahlungsplan-Optionen)
const mongoose = require('mongoose');
const SystemSettings = require('./SystemSettings');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Bitte geben Sie eine Rechnungsnummer an'],
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Bitte geben Sie einen Kunden an']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Menge muss mindestens 1 sein']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Preis kann nicht negativ sein']
    }
  }],
  timeTracking: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeTracking'
  }],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Zwischensumme kann nicht negativ sein']
  },
  taxRate: {
    type: Number,
    default: 19,
    min: [0, 'Steuersatz kann nicht negativ sein']
  },
  taxAmount: {
    type: Number
  },
  totalAmount: {
    type: Number
  },
  // Neue Felder für den Zahlungsplan
  paymentSchedule: {
    type: String,
    enum: ['full', 'installments'],
    default: 'full' // Standard: Vollständige Zahlung
  },
  installments: [{
    description: {
      type: String,
      required: true
    },
    percentage: {
      type: Number,
      required: true,
      min: [0, 'Prozentsatz kann nicht negativ sein'],
      max: [100, 'Prozentsatz kann nicht über 100% sein']
    },
    amount: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidDate: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: ['erstellt', 'versendet', 'teilweise bezahlt', 'bezahlt', 'storniert'],
    default: 'erstellt'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Berechne Steuer und Gesamtsumme vor dem Speichern
InvoiceSchema.pre('save', async function(next) {
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.totalAmount = this.subtotal + this.taxAmount;
  
  // Setze Fälligkeitsdatum auf 30 Tage nach Rechnungsdatum, falls nicht angegeben
  if (!this.dueDate) {
    const dueDate = new Date(this.issueDate);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate;
  }
  
  // Zahlungsplan aktualisieren, wenn keiner existiert oder wenn sich der Gesamtbetrag geändert hat
  const needsInstallmentUpdate = (
    this.paymentSchedule === 'installments' && 
    (
      !this.installments || 
      this.installments.length === 0 ||
      this.isNew || 
      this.isModified('totalAmount') || 
      this.isModified('paymentSchedule')
    )
  );
  
  if (needsInstallmentUpdate) {
    try {
      // Systemeinstellungen für Zahlungsplan laden
      const settings = await SystemSettings.getSettings();
      const installments = [];
      
      if (settings.paymentInstallments) {
        // Erste Rate
        const firstAmount = (this.totalAmount * settings.paymentInstallments.firstRate) / 100;
        installments.push({
          description: 'Anzahlung nach Auftragsbestätigung',
          percentage: settings.paymentInstallments.firstRate,
          amount: firstAmount,
          dueDate: new Date(this.issueDate), // Fällig am Rechnungsdatum
          isPaid: false
        });
        
        // Zweite Rate
        const secondAmount = (this.totalAmount * settings.paymentInstallments.secondRate) / 100;
        const secondDueDate = new Date(this.issueDate);
        secondDueDate.setDate(secondDueDate.getDate() + 14); // 14 Tage nach Rechnungsdatum
        installments.push({
          description: 'Teilzahlung nach Materiallieferung',
          percentage: settings.paymentInstallments.secondRate,
          amount: secondAmount,
          dueDate: secondDueDate,
          isPaid: false
        });
        
        // Dritte/finale Rate
        const finalAmount = (this.totalAmount * settings.paymentInstallments.finalRate) / 100;
        const finalDueDate = new Date(this.dueDate); // Fällig am Gesamtfälligkeitsdatum
        installments.push({
          description: 'Restzahlung nach Abnahme',
          percentage: settings.paymentInstallments.finalRate,
          amount: finalAmount,
          dueDate: finalDueDate,
          isPaid: false
        });
        
        this.installments = installments;
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Zahlungsplans:', error);
      // Fallback: Keine Raten, einfach fortfahren
    }
  }
  
  next();
});

// Methode zum Aktualisieren des Zahlungsstatus basierend auf den Raten
InvoiceSchema.methods.updatePaymentStatus = function() {
  if (this.paymentSchedule === 'full' || !this.installments || this.installments.length === 0) {
    // Bei vollständiger Zahlung oder ohne Raten gibt es nur bezahlt/nicht bezahlt
    return;
  }
  
  const paidInstallments = this.installments.filter(i => i.isPaid);
  
  if (paidInstallments.length === 0) {
    // Keine Rate bezahlt
    this.status = this.status === 'versendet' ? 'versendet' : 'erstellt';
  } else if (paidInstallments.length < this.installments.length) {
    // Einige Raten bezahlt
    this.status = 'teilweise bezahlt';
  } else {
    // Alle Raten bezahlt
    this.status = 'bezahlt';
  }
};

module.exports = mongoose.model('Invoice', InvoiceSchema);