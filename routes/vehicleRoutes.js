// routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middlewares/authMiddleware'); 
const Entretien = require('../models/Maintenance');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');


// Apply auth middleware to all routes
router.use(auth);

// Vehicle CRUD routes
router.get('/', vehicleController.getAllVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', vehicleController.addVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.patch('/:id/status', vehicleController.updateVehicle);

// Driver assignment routes
router.put('/:id/assign-driver', vehicleController.assignDriver);
router.patch('/:id/remove-driver', vehicleController.removeDriver);


// GET - Récupérer un véhicule avec ses entretiens
router.get('/:id', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).populate('responsable');

    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Récupérer les entretiens du véhicule
    const entretiensAVenir = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'termine'
    }).sort({ date: -1 });

    // Ajouter les entretiens au véhicule
    const vehicleData = vehicle.toObject();
    vehicleData.entretiensAVenir = entretiensAVenir;
    vehicleData.historiqueEntretiens = historiqueEntretiens;

    res.json(vehicleData);
  } catch (error) {
    console.error('Erreur lors de la récupération du véhicule:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST - Ajouter un entretien
router.post('/:id/entretiens', auth, async (req, res) => {
  try {
    console.log('Données reçues pour entretien:', req.body);
    console.log('ID véhicule:', req.params.id);
    console.log('Utilisateur:', req.user.userId);

    const { type, cout, date, statut, description } = req.body;

    // Validation de l'ID du véhicule
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de véhicule invalide' });
    }

    // Vérifier que le véhicule existe et appartient à l'utilisateur
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!vehicle) {
      console.log('Véhicule non trouvé pour ID:', req.params.id, 'User:', req.user.userId);
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Validation des données
    if (!type || cout === undefined || !date) {
      return res.status(400).json({ 
        message: 'Les champs type, cout et date sont requis',
        received: { type, cout, date }
      });
    }

    // Convertir le coût en nombre
    const coutNumber = parseFloat(cout);
    if (isNaN(coutNumber) || coutNumber < 0) {
      return res.status(400).json({ message: 'Le coût doit être un nombre positif' });
    }

    // Valider et convertir la date
    const entretienDate = new Date(date);
    if (isNaN(entretienDate.getTime())) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    // Déterminer automatiquement le statut si non fourni
    let finalStatut = statut;
    if (!finalStatut) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateEntretien = new Date(entretienDate);
      dateEntretien.setHours(0, 0, 0, 0);

      finalStatut = dateEntretien < today ? 'termine' : 'planifie';
    }

    console.log('Création entretien avec:', {
      type,
      cout: coutNumber,
      date: entretienDate,
      statut: finalStatut,
      vehicule: vehicle._id,
      user: req.user.userId
    });

    // Créer le nouvel entretien
    const nouvelEntretien = new Entretien({
      type,
      cout: coutNumber,
      date: entretienDate,
      statut: finalStatut,
      description: description || '',
      vehicule: vehicle._id,
      user: req.user.userId
    });

    const savedEntretien = await nouvelEntretien.save();
    await updateVehicleCout(vehicle._id, req.user.userId);

    console.log('Entretien sauvegardé:', savedEntretien);

    // Récupérer le véhicule mis à jour avec tous les entretiens
    const vehicleUpdated = await Vehicle.findById(vehicle._id).populate('responsable');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entretiensAVenir = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'planifie',
      date: { $gte: today }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'termine'
    }).sort({ date: -1 });

    const vehicleData = vehicleUpdated.toObject();
    vehicleData.entretiensAVenir = entretiensAVenir;
    vehicleData.historiqueEntretiens = historiqueEntretiens;

    console.log('Réponse envoyée:', {
      entretiensAVenir: entretiensAVenir.length,
      historiqueEntretiens: historiqueEntretiens.length
    });

    res.status(200).json(vehicleData);
  } catch (error) {
    console.error('Erreur détaillée lors de l\'ajout de l\'entretien:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// DELETE - Supprimer un entretien
router.delete('/:id/entretiens', auth, async (req, res) => {
  try {
    const { entretienId } = req.body;

    // Vérifier que le véhicule existe et appartient à l'utilisateur
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Vérifier que l'entretien existe et appartient à l'utilisateur
    const entretien = await Entretien.findOne({
      _id: entretienId,
      vehicule: vehicle._id,
      user: req.user.userId
    });

    if (!entretien) {
      return res.status(404).json({ message: 'Entretien non trouvé' });
    }

    // Supprimer l'entretien
    await Entretien.findByIdAndDelete(entretienId);
    await updateVehicleCout(vehicle._id, req.user.userId);

    // Récupérer le véhicule mis à jour avec les entretiens restants
    const vehicleUpdated = await Vehicle.findById(vehicle._id).populate('responsable');
    
    const entretiensAVenir = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'termine'
    }).sort({ date: -1 });

    const vehicleData = vehicleUpdated.toObject();
    vehicleData.entretiensAVenir = entretiensAVenir;
    vehicleData.historiqueEntretiens = historiqueEntretiens;

    res.json(vehicleData);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'entretien:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT - Mettre à jour un entretien
router.put('/:id/entretiens/:entretienId', auth, async (req, res) => {
  try {
    const { type, cout, date, statut, description } = req.body;

    // Vérifier que le véhicule existe et appartient à l'utilisateur
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Vérifier que l'entretien existe
    const entretien = await Entretien.findOne({
      _id: req.params.entretienId,
      vehicule: vehicle._id,
      user: req.user.userId
    });

    if (!entretien) {
      return res.status(404).json({ message: 'Entretien non trouvé' });
    }

    // Mettre à jour les champs
    if (type) entretien.type = type;
    if (cout !== undefined) entretien.cout = parseFloat(cout);
    if (date) entretien.date = new Date(date);
    if (statut) entretien.statut = statut;
    if (description !== undefined) entretien.description = description;

    await entretien.save();
    await updateVehicleCout(vehicle._id, req.user.userId);


    // Récupérer le véhicule mis à jour
    const vehicleUpdated = await Vehicle.findById(vehicle._id).populate('responsable');
    
    const entretiensAVenir = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'termine'
    }).sort({ date: -1 });

    const vehicleData = vehicleUpdated.toObject();
    vehicleData.entretiensAVenir = entretiensAVenir;
    vehicleData.historiqueEntretiens = historiqueEntretiens;

    res.json(vehicleData);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'entretien:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT - Marquer un entretien comme terminé
router.put('/:id/entretiens/:entretienId/complete', auth, async (req, res) => {
  try {
    // Vérifier que le véhicule existe et appartient à l'utilisateur
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Mettre à jour le statut de l'entretien
    const entretien = await Entretien.findOneAndUpdate(
      {
        _id: req.params.entretienId,
        vehicule: vehicle._id,
        user: req.user.userId
      },
      { 
        statut: 'termine',
        dateModification: new Date()
      },
      { new: true }
    );
    await updateVehicleCout(vehicle._id, req.user.userId);

    if (!entretien) {
      return res.status(404).json({ message: 'Entretien non trouvé' });
    }

    // Récupérer le véhicule mis à jour
    const vehicleUpdated = await Vehicle.findById(vehicle._id).populate('responsable');
    
    const entretiensAVenir = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'planifie',
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    const historiqueEntretiens = await Entretien.find({
      vehicule: vehicle._id,
      statut: 'termine'
    }).sort({ date: -1 });

    const vehicleData = vehicleUpdated.toObject();
    vehicleData.entretiensAVenir = entretiensAVenir;
    vehicleData.historiqueEntretiens = historiqueEntretiens;

    res.json(vehicleData);
  } catch (error) {
    console.error('Erreur lors de la finalisation de l\'entretien:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET - Obtenir tous les entretiens d'un véhicule
router.get('/:id/entretiens', auth, async (req, res) => {
  try {
    // Vérifier que le véhicule existe et appartient à l'utilisateur
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    const { statut, dateDebut, dateFin } = req.query;
    
    // Construire la requête de filtrage
    let filter = {
      vehicule: vehicle._id,
      user: req.user.userId
    };

    if (statut) {
      filter.statut = statut;
    }

    if (dateDebut && dateFin) {
      filter.date = {
        $gte: new Date(dateDebut),
        $lte: new Date(dateFin)
      };
    }

    const entretiens = await Entretien.find(filter).sort({ date: -1 });

    res.json(entretiens);
  } catch (error) {
    console.error('Erreur lors de la récupération des entretiens:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT - Assigner un conducteur (route existante, à garder)
router.put('/:id/assign-driver', auth, async (req, res) => {
  try {
    const { driverId } = req.body;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { responsable: driverId },
      { new: true }
    ).populate('responsable');

    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Erreur lors de l\'assignation du conducteur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

async function updateVehicleCout(vehicleId, userId) {
  const totalCout = await Entretien.aggregate([
    {
      $match: {
        vehicule: new mongoose.Types.ObjectId(vehicleId),
        user: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$cout" }
      }
    }
  ]);

  const cout = totalCout.length > 0 ? totalCout[0].total : 0;

  await Vehicle.findByIdAndUpdate(vehicleId, { coutVehicle: cout });
}

module.exports = router;