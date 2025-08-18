const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Entretien = require('../models/Maintenance'); 
const Driver = require('../models/Driver');

exports.getVehicleStats = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const stats = await Vehicle.aggregate([
  { $match: { user: new mongoose.Types.ObjectId(userId) } },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      enService: { $sum: { $cond: [{ $eq: ['$etat', 'En service'] }, 1, 0] } },
      enMaintenance: { $sum: { $cond: [{ $eq: ['$etat', 'En maintenance'] }, 1, 0] } },
      horsService: { $sum: { $cond: [{ $eq: ['$etat', 'Hors service'] }, 1, 0] } },
      totalKilometrage: { $sum: { $ifNull: ['$kilometrage', 0] } },
      coutTotal: { $sum: { $ifNull: ['$coutVehicle', 0] } }
    }
  }
]);


    const result = stats.length > 0 ? stats[0] : {
      total: 0,
      enService: 0,
      enMaintenance: 0,
      horsService: 0,
      totalKilometrage: 0,
      coutTotal: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getRecentVehicles = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const vehicles = await Vehicle.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('responsable', 'nom prenom')
      .select('marque modele etat kilometrage carburant image createdAt');

    const safeVehicles = vehicles.map(v => ({
      _id: v._id,
      marque: v.marque || "Inconnu",
      modele: v.modele || "Inconnu",
      etat: v.etat || "En service",
      kilometrage: v.kilometrage || 0,
      carburant: v.carburant || "Essence",
      image: v.image || "",
      responsable: v.responsable || null,
      createdAt: v.createdAt
    }));

    res.json({ vehicles: safeVehicles });
  } catch (error) {
    console.error('Erreur lors de la récupération des véhicules récents:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.getRecentActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const activities = [];
    const recentVehicles = await Vehicle.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('marque modele createdAt');

    recentVehicles.forEach(vehicle => {
      activities.push({
        title: `Ajout véhicule ${vehicle.marque || ""} ${vehicle.modele || ""}`,
        date: vehicle.createdAt,
        type: 'Ajout',
        color: '#3B82F6',
        _id: vehicle._id
      });
    });

    const recentMaintenance = await Entretien.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('vehicule', 'marque modele')
      .select('type date statut vehicule createdAt');

    recentMaintenance.forEach(maintenance => {
      activities.push({
        title: `${maintenance.type} ${maintenance.vehicule?.marque || ""} ${maintenance.vehicule?.modele || ""}`,
        date: maintenance.createdAt,
        type: 'Entretien',
        color: '#10B981',
        _id: maintenance._id
      });
    });

    const recentDriverAssignments = await Vehicle.find({
      user: userId,
      responsable: { $ne: null }
    })
      .sort({ updatedAt: -1 })
      .limit(2)
      .populate('responsable', 'nom prenom')
      .select('marque modele responsable updatedAt');

    recentDriverAssignments.forEach(vehicle => {
      if (vehicle.responsable) {
        activities.push({
          title: `Chauffeur ${vehicle.responsable.nom} ${vehicle.responsable.prenom} affecté`,
          date: vehicle.updatedAt,
          type: 'Affectation',
          color: '#8B5CF6',
          _id: vehicle._id
        });
      }
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const limitedActivities = activities.slice(0, limit);

    res.json({ activities: limitedActivities });
  } catch (error) {
    console.error('Erreur lors de la récupération des activités récentes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getMonthlyStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const maintenanceStats = await Entretien.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId), // ✅ correction ici
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cout' },
          maintenanceCount: { $sum: 1 }
        }
      }
    ]);

    const vehicleStats = await Vehicle.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } }, // ✅ correction ici aussi
      {
        $group: {
          _id: null,
          totalDistance: { $sum: '$kilometrage' },
          fuelConsumption: { $sum: '$consommation' }
        }
      }
    ]);

    const maintenance = maintenanceStats.length > 0 ? maintenanceStats[0] : { totalCost: 0, maintenanceCount: 0 };
    const vehicles = vehicleStats.length > 0 ? vehicleStats[0] : { totalDistance: 0, fuelConsumption: 0 };

    const totalCost = maintenance.totalCost + (vehicles.fuelConsumption * 1.5);

    res.json({
      totalCost: Math.round(totalCost),
      fuelConsumption: vehicles.fuelConsumption || 0,
      totalDistance: vehicles.totalDistance || 0,
      maintenanceCount: maintenance.maintenanceCount
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques mensuelles:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const vehicleStats = await Vehicle.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$etat', count: { $sum: 1 } } }
    ]);

    const driverCount = await Driver.countDocuments({ user: userId });

    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyMaintenance = await Entretien.countDocuments({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const vehicleStatsSummary = {
      total: 0,
      enService: 0,
      enMaintenance: 0,
      horsService: 0
    };

    vehicleStats.forEach(stat => {
      vehicleStatsSummary.total += stat.count;
      switch (stat._id) {
        case 'En service':
          vehicleStatsSummary.enService = stat.count;
          break;
        case 'En maintenance':
          vehicleStatsSummary.enMaintenance = stat.count;
          break;
        case 'Hors service':
          vehicleStatsSummary.horsService = stat.count;
          break;
      }
    });

    res.json({
      vehicles: vehicleStatsSummary,
      drivers: driverCount,
      monthlyMaintenance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
