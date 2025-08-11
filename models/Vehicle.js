const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  marque: { type: String, required: true, trim: true },
  modele: { type: String, required: true, trim: true },
  numeroSerie: { type: String, required: true, unique: true, trim: true },
  etat: { type: String, enum: ['En service', 'En maintenance', 'Hors service'], default: 'En service' },
  type: { type: String, required: true, trim: true },
  kilometrage: { type: Number, default: 0, min: 0 },
  carburant: { type: String, enum: ['Essence', 'Diesel', 'Électrique', 'Hybride'], required: true },
  consommation: { type: Number, min: 0 },
  image: { type: String },
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },

  // 📌 Réels tableaux
  historiqueEntretiens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entretien'
  }],
  entretiensAVenir: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entretien'
  }]

}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
