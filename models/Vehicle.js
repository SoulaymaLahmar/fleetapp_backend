const mongoose = require('mongoose');

const historiqueSchema = new mongoose.Schema({
  description: String,
  date: String
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  model: { type: String },
  licensePlate: { type: String },
  status: { type: String, default: 'Disponible' },
  kilometrage: { type: String },
  carburant: { type: String },
  consommation: { type: String },
  image: { type: String }, // stocke le path relatif ex: uploads/vehicles/123.jpg
  historique: [historiqueSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
