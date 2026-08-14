const mongoose = require('mongoose');

const doctorConfigSchema = new mongoose.Schema({
  maxTokensMorning: {
    type: Number,
    default: 30,
    min: 1
  },
  maxTokensEvening: {
    type: Number,
    default: 30,
    min: 1
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  currentTokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Only one config document should exist
doctorConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('DoctorConfig', doctorConfigSchema);

