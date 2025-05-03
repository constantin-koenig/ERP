// backend/models/TimeTracking.js (Mit Abrechnungsanpassungen)
const mongoose = require('mongoose');
const SystemSettings = require('./SystemSettings');

const TimeTrackingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bitte geben Sie einen Benutzer an']
  },
  // Hinzugefügtes Feld für den zugewiesenen Benutzer
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional
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
  // Neue Felder für die Abrechnung
  billableDuration: {
    type: Number,
    comment: 'Abrechenbare Dauer in Minuten (nach Abrechnungsintervall gerundet)'
  },
  hourlyRate: {
    type: Number,
    default: 0,
    comment: 'Stundensatz zum Zeitpunkt der Erstellung'
  },
  amount: {
    type: Number,
    default: 0,
    comment: 'Berechneter Betrag für die abrechenbare Zeit'
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

// Hilfsfunktion zum Aufrunden auf ein bestimmtes Intervall
function roundToInterval(minutes, interval) {
  if (interval <= 0) return minutes;
  
  // Anzahl an vollen Intervallen
  const fullIntervals = Math.floor(minutes / interval);
  
  // Wenn es einen Rest gibt, runde auf das nächste volle Intervall auf
  if (minutes % interval > 0) {
    return (fullIntervals + 1) * interval;
  }
  
  return fullIntervals * interval;
}

// Berechne die Dauer und den Betrag vor dem Speichern
TimeTrackingSchema.pre('save', async function(next) {
  if (this.startTime && this.endTime) {
    // Tatsächliche Dauer in Minuten berechnen
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
    
    // Systemeinstellungen laden, um Abrechnungsintervall und Stundensatz zu erhalten
    try {
      const settings = await SystemSettings.getSettings();
      
      // Stundensatz übernehmen, falls noch nicht gesetzt
      if (!this.hourlyRate) {
        this.hourlyRate = settings.hourlyRate || 0;
      }
      
      // Abrechnungsintervall anwenden
      const billingInterval = settings.billingInterval || 15; // Standard: 15 Minuten
      this.billableDuration = roundToInterval(this.duration, billingInterval);
      
      // Betrag berechnen: (abrechenbare Minuten / 60) * Stundensatz
      this.amount = (this.billableDuration / 60) * this.hourlyRate;
    } catch (error) {
      console.error('Fehler beim Laden der Systemeinstellungen:', error);
      // Fallback: Keine Rundung, keine Berechnung
      this.billableDuration = this.duration;
      this.amount = 0;
    }
  }
  next();
});

module.exports = mongoose.model('TimeTracking', TimeTrackingSchema);