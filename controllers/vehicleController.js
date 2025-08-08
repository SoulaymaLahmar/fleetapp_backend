const Vehicle = require('../models/Vehicle');

const BASE_URL = process.env.BASE_URL || ''; // ex: http://10.0.2.2:5000

// GET /api/vehicles  -> vehicles for logged user
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user.id }).sort({ createdAt: -1 });
    // map image -> imageUrl
    const result = vehicles.map(v => {
      const obj = v.toObject();
      obj.imageUrl = obj.image ? `${BASE_URL}/${obj.image}` : null;
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/vehicles
exports.addVehicle = async (req, res) => {
  try {
    const { title, model, licensePlate, status, kilometrage, carburant, consommation } = req.body;
    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : undefined; // normalize windows path

    const newVehicle = new Vehicle({
      title,
      model,
      licensePlate,
      status,
      kilometrage,
      carburant,
      consommation,
      image: imagePath,
      user: req.user.id
    });

    await newVehicle.save();
    const obj = newVehicle.toObject();
    obj.imageUrl = obj.image ? `${BASE_URL}/${obj.image}` : null;
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/vehicles/:id
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Véhicule introuvable' });
    res.json({ message: 'Véhicule supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/vehicles/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status: req.body.status },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ message: 'Véhicule introuvable' });
    const obj = vehicle.toObject();
    obj.imageUrl = obj.image ? `${BASE_URL}/${obj.image}` : null;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/vehicles/:id/historique
exports.addHistorique = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Véhicule introuvable' });

    const entry = {
      description: req.body.description || '',
      date: new Date().toISOString()
    };
    vehicle.historique.push(entry);
    await vehicle.save();

    const obj = vehicle.toObject();
    obj.imageUrl = obj.image ? `${BASE_URL}/${obj.image}` : null;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
