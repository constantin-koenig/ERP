const mongoose = require('mongoose');

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
  status: {
    type: String,
    enum: ['erstellt', 'versendet', 'bezahlt', 'storniert'],
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
InvoiceSchema.pre('save', function(next) {
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.totalAmount = this.subtotal + this.taxAmount;
  
  // Setze Fälligkeitsdatum auf 30 Tage nach Rechnungsdatum, falls nicht angegeben
  if (!this.dueDate) {
    const dueDate = new Date(this.issueDate);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate;
  }
  
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);