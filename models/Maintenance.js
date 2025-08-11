
const mongoose = require('mongoose');

const entretienSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  cout: {
    type: Number,
    required: true,
    min: 0
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
  statut: {
    type: String,
    enum: ['planifie', 'en_cours', 'termine'],
    default: 'planifie'
  },
  technicien: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Entretien', entretienSchema);