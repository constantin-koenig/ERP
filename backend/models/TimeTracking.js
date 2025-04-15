const mongoose = require('mongoose');

const TimeTrackingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bitte geben Sie einen Benutzer an']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  description: {
    type: String,
    required: [true, 'Bitte geben Sie eine Beschreibung an']
  },
  startTime: {
    type: Date,
    required: [true, 'Bitte geben Sie eine Startzeit an']
  },
  endTime: {
    type: Date,
    required: [true, 'Bitte geben Sie eine Endzeit an']
  },
  duration: {
    type: Number,
    comment: 'Dauer in Minuten'
  },
  billed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Berechne die Dauer vor dem Speichern
TimeTrackingSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  next();
});

module.exports = mongoose.model('TimeTracking', TimeTrackingSchema);