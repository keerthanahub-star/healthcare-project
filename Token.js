const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenNumber: {
    type: String,
    required: true
  },
  shift: {
    type: String,
    enum: ['morning', 'evening'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'serving', 'completed', 'missed'],
    default: 'pending'
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  emergencyNumber: {
    type: Number,
    default: null
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  servedAt: {
    type: Date,
    default: null
  },
  missedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
tokenSchema.index({ patientId: 1, date: 1, shift: 1 });
tokenSchema.index({ date: 1, shift: 1, status: 1 });
tokenSchema.index({ isEmergency: 1, date: 1, shift: 1 });

module.exports = mongoose.model('Token', tokenSchema);

