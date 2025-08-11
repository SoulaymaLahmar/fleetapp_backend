const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Entretien = require('../models/Maintenance');

// GET all vehicles for the user
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user.userId })
      .populate('responsable');
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('responsable');

    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    // Récupérer les entretiens planifiés (futurs) triés par date croissante
    const entretiensAVenir = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    // Récupérer l'historique des entretiens terminés triés par date décroissante
    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'termine'
    }).sort({ date: -1 });

    res.json({
      ...vehicle.toObject(),
      entretiensAVenir,
      historiqueEntretiens
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST add new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const { marque, modele, numeroSerie, etat, type, kilometrage, carburant, consommation, image } = req.body;

    const newVehicle = new Vehicle({
      marque,
      modele,
      numeroSerie,
      etat,
      type,
      kilometrage,
      carburant,
      consommation,
      image,
      user: req.user.userId,
    });

    const savedVehicle = await newVehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE a vehicle and its related entretiens
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    await Entretien.deleteMany({ vehicule: req.params.id });
    await vehicle.deleteOne();

    res.json({ message: 'Véhicule supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH update vehicle status
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    if (!['En service', 'En maintenance', 'Hors service'].includes(req.body.etat)) {
      return res.status(400).json({ message: 'État invalide' });
    }

    vehicle.etat = req.body.etat;
    const updatedVehicle = await vehicle.save();

    res.json(updatedVehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT assign driver to vehicle
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Chauffeur non trouvé' });

    vehicle.responsable = driverId;
    await vehicle.save();

    await vehicle.populate('responsable');
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH remove driver from vehicle
exports.removeDriver = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    vehicle.responsable = null;
    await vehicle.save();

    res.json({ message: 'Chauffeur retiré', vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST add maintenance (entretien)
exports.addEntretien = async (req, res) => {
  try {
    const { type, date } = req.body;
    const vehicleId = req.params.id;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    // Extraire coût s’il est dans le type ex: "Révision - 150 TND"
    let entretienType = type;
    let cout = 0;
    const match = type.match(/^(.+?)\s*-\s*(\d+(?:\.\d+)?)\s*TND$/i);
    if (match) {
      entretienType = match[1].trim();
      cout = parseFloat(match[2]);
    }

    const newEntretien = new Entretien({
      type: entretienType,
      date: new Date(date),
      cout,
      vehicule: vehicleId,
      statut: 'planifie'
    });

    await newEntretien.save();

    // Récupérer les listes mises à jour des entretiens
    const entretiensAVenir = await Entretien.find({
      vehicule: vehicleId,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicleId,
      statut: 'termine'
    }).sort({ date: -1 });

    await vehicle.populate('responsable');

    res.json({
      ...vehicle.toObject(),
      entretiensAVenir,
      historiqueEntretiens
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE an entretien
exports.deleteEntretien = async (req, res) => {
  try {
    const { id: vehicleId, entretienId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    const deletedEntretien = await Entretien.findOneAndDelete({
      _id: entretienId,
      vehicule: vehicleId,
    });

    if (!deletedEntretien) {
      return res.status(404).json({ message: 'Entretien non trouvé' });
    }

    res.json({ message: 'Entretien supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// PATCH mark entretien as completed
exports.completeEntretien = async (req, res) => {
  try {
    const { entretienId } = req.params;
    const vehicleId = req.params.id;

    const entretien = await Entretien.findOne({ _id: entretienId, vehicule: vehicleId });
    if (!entretien) return res.status(404).json({ message: 'Entretien non trouvé' });

    entretien.statut = 'termine';
    await entretien.save();

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Véhicule non trouvé' });

    const entretiensAVenir = await Entretien.find({
      vehicule: vehicleId,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicleId,
      statut: 'termine'
    }).sort({ date: -1 });

    await vehicle.populate('responsable');

    res.json({
      ...vehicle.toObject(),
      entretiensAVenir,
      historiqueEntretiens
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
