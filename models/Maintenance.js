const mongoose = require('mongoose');

const entretienSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true
  },
  cout: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  statut: {
    type: String,
    enum: ['planifie', 'en_cours', 'termine', 'annule'],
    default: 'planifie'
  },
  description: {
    type: String,
    trim: true
  },
  vehicule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

entretienSchema.pre('save', function(next) {
  this.dateModification = new Date();
  next();
});

entretienSchema.index({ vehicule: 1, date: 1 });
entretienSchema.index({ vehicule: 1, statut: 1 });

module.exports = mongoose.model('Entretien', entretienSchema);