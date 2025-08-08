const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  permis: { type: String, required: true, unique: true },
  telephone: { type: String, required: true },
  statut: { type: String, enum: ['Disponible', 'Occupé', 'Inactif'], default: 'Disponible' },
  photo: { type: String },


  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
