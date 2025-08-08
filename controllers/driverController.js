const Driver = require('../models/Driver');

// Get all drivers for logged-in user
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({ user: req.user.userId });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add driver for logged-in user
exports.addDriver = async (req, res) => {
    console.log('User from token:', req.user);
  try {
    const { nom, prenom, permis, telephone, statut, photo } = req.body;

    const newDriver = new Driver({
      nom,
      prenom,
      permis,
      telephone,
      statut,
      photo,
      user: req.user.userId,
    });

    const savedDriver = await newDriver.save();
    res.status(201).json(savedDriver);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a driver if owned by logged-in user
exports.deleteDriver = async (req, res) => {
    console.log("Delete request for ID:", req.params.id);
    console.log("User from token:", req.user.userId);
  try {
    const driver = await Driver.findOne({ _id: req.params.id, user: req.user.userId });

    if (!driver) {
      return res.status(404).json({ message: 'Chauffeur introuvable ou accès refusé' });
      
    }

    await driver.remove();
    res.status(200).json({ message: 'Chauffeur supprimé' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
