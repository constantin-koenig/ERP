// backend/models/Order.js (aktualisiert)
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: [true, 'Bitte geben Sie eine Auftragsnummer an'],
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Bitte geben Sie einen Kunden an']
  },
  description: {
    type: String,
    required: [true, 'Bitte geben Sie eine Auftragsbeschreibung an']
  },
  status: {
    type: String,
    enum: ['neu', 'in Bearbeitung', 'abgeschlossen', 'storniert'],
    default: 'neu'
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
  totalAmount: {
    type: Number,
    min: [0, 'Gesamtsumme kann nicht negativ sein']
  },
  startDate: {
    type: Date
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
  // Zugewiesener Benutzer - nicht erforderlich
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Berechne die Gesamtsumme vor dem Speichern
OrderSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
  next();
});

module.exports = mongoose.model('Order', OrderSchema);