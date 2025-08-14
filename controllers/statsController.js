const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Entretien = require('../models/Maintenance');
const Driver = require('../models/Driver');

//GET
exports.getStatisticsSummary = async (req, res) => {
    try {
    const userId = req.user.userId;
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all user's vehicles
    const vehicles = await Vehicle.find({ user: userId });
    const vehicleIds = vehicles.map(v => v._id);

    // Get maintenance records for the period
    const maintenanceRecords = await Entretien.find({
      user: userId,
      date: { $gte: startDate, $lte: now }
    });

    // Calculate total costs
    const totalVehicleCosts = vehicles.reduce((sum, vehicle) => sum + (vehicle.coutVehicle || 0), 0);
    const totalMaintenanceCosts = maintenanceRecords.reduce((sum, maintenance) => sum + maintenance.cout, 0);
    const totalCost = totalVehicleCosts + totalMaintenanceCosts;

    // Calculate total distance
    const totalDistance = vehicles.reduce((sum, vehicle) => sum + vehicle.kilometrage, 0);

    // Count active vehicles
    const activeVehicles = vehicles.filter(v => v.etat === 'En service').length;

    // Calculate average efficiency
    const vehiclesWithConsumption = vehicles.filter(v => v.consommation > 0);
    const averageEfficiency = vehiclesWithConsumption.length > 0
      ? vehiclesWithConsumption.reduce((sum, vehicle) => {
          // Calculate efficiency: lower consumption = higher efficiency
          const baseConsumption = 10.0;
          const efficiency = ((baseConsumption - vehicle.consommation) / baseConsumption * 100);
          return sum + Math.max(0, Math.min(100, efficiency));
        }, 0) / vehiclesWithConsumption.length
      : 0;

    // Calculate cost breakdown
    const costBreakdown = {
      carburant: maintenanceRecords
        .filter(m => m.type.toLowerCase().includes('carburant'))
        .reduce((sum, m) => sum + m.cout, 0),
      entretien: maintenanceRecords
        .filter(m => !['carburant', 'assurance', 'réparation'].some(keyword => 
          m.type.toLowerCase().includes(keyword)))
        .reduce((sum, m) => sum + m.cout, 0),
      assurance: maintenanceRecords
        .filter(m => m.type.toLowerCase().includes('assurance'))
        .reduce((sum, m) => sum + m.cout, 0),
      reparation: maintenanceRecords
        .filter(m => m.type.toLowerCase().includes('réparation'))
        .reduce((sum, m) => sum + m.cout, 0)
    };

    // Generate monthly trends for the last 6 months
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthMaintenanceRecords = await Entretien.find({
        user: userId,
        date: { $gte: monthStart, $lte: monthEnd }
      });

      const monthCost = monthMaintenanceRecords.reduce((sum, m) => sum + m.cout, 0);
      
      // Calculate approximate distance for the month (simplified calculation)
      const monthKm = totalDistance / 6; // Approximate equal distribution
      
      monthlyTrends.push({
        month: monthStart.toLocaleString('fr-FR', { month: 'short' }),
        cost: monthCost,
        km: monthKm
      });
    }

    res.json({
      totalCost,
      totalDistance,
      activeVehicles,
      averageEfficiency,
      costBreakdown,
      monthlyTrends
    });

  } catch (error) {
    console.error('Error fetching statistics summary:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }

}

//GET
exports.performanceStats = async (req, res) =>{
    try {
    const userId = req.user.userId;
    
    const vehicles = await Vehicle.find({ user: userId })
      .populate('responsable', 'nom prenom');

    const vehiclePerformance = vehicles.map(vehicle => {
      // Calculate efficiency based on consumption
      const baseConsumption = 10.0;
      const efficiency = vehicle.consommation > 0
        ? Math.max(0, Math.min(100, ((baseConsumption - vehicle.consommation) / baseConsumption * 100)))
        : 0;

      const status = efficiency >= 85 ? 'Excellent' 
        : efficiency >= 70 ? 'Bon'
        : efficiency >= 50 ? 'Moyen'
        : 'Faible';

      return {
        id: vehicle._id,
        vehicle: `${vehicle.marque} ${vehicle.modele}`,
        km: vehicle.kilometrage,
        conso: vehicle.consommation,
        efficiency: Math.round(efficiency),
        status,
        etat: vehicle.etat,
        responsable: vehicle.responsable ? 
          `${vehicle.responsable.nom} ${vehicle.responsable.prenom}` : null
      };
    });

    res.json(vehiclePerformance);

  } catch (error) {
    console.error('Error fetching vehicle performance:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// Get driver statistics
exports.driverStats = async (req, res) =>{
    try {
    const userId = req.user.userId;
    
    const drivers = await Driver.find({ user: userId });
    
    // Get vehicles assigned to each driver
    const vehicles = await Vehicle.find({ user: userId }).populate('responsable');
    
    const driverStats = await Promise.all(drivers.map(async (driver) => {
      // Get vehicles assigned to this driver
      const driverVehicles = vehicles.filter(v => 
        v.responsable && v.responsable._id.toString() === driver._id.toString()
      );

      // Calculate total kilometers for this driver
      const totalKm = driverVehicles.reduce((sum, v) => sum + v.kilometrage, 0);

      // Calculate average efficiency for driver's vehicles
      const avgEfficiency = driverVehicles.length > 0
        ? driverVehicles.reduce((sum, v) => {
            const baseConsumption = 10.0;
            const efficiency = v.consommation > 0
              ? Math.max(0, Math.min(100, ((baseConsumption - v.consommation) / baseConsumption * 100)))
              : 0;
            return sum + efficiency;
          }, 0) / driverVehicles.length
        : 0;

      // Mock calculations for driving score and trips (you can enhance this with real trip data)
      const drivingScore = Math.min(100, Math.max(60, 75 + (driver._id.toString().length % 25)));
      const ecoScore = Math.min(100, Math.max(50, avgEfficiency + (driver._id.toString().length % 20)));
      const totalTrips = Math.floor(totalKm / 100) + (driver._id.toString().length % 20); // Approximate

      return {
        id: driver._id,
        name: `${driver.nom} ${driver.prenom}`,
        km: totalKm,
        note: Math.round(drivingScore),
        trips: totalTrips,
        eco_score: Math.round(ecoScore),
        vehiclesCount: driverVehicles.length,
        statut: driver.statut
      };
    }));

    // Sort by driving score (highest first)
    driverStats.sort((a, b) => b.note - a.note);

    res.json(driverStats);

  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }

}

exports.costData = async (req, res) => {
    try {
    const userId = req.user.userId;
    const { period = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const maintenanceRecords = await Entretien.find({
      user: userId,
      date: { $gte: startDate, $lte: now }
    });

    // Categorize costs
    const costAnalysis = {
      carburant: {
        total: 0,
        records: [],
        percentage: 0
      },
      entretien: {
        total: 0,
        records: [],
        percentage: 0
      },
      assurance: {
        total: 0,
        records: [],
        percentage: 0
      },
      reparation: {
        total: 0,
        records: [],
        percentage: 0
      }
    };

    let totalCost = 0;

    maintenanceRecords.forEach(record => {
      const type = record.type.toLowerCase();
      
      if (type.includes('carburant')) {
        costAnalysis.carburant.total += record.cout;
        costAnalysis.carburant.records.push(record);
      } else if (type.includes('assurance')) {
        costAnalysis.assurance.total += record.cout;
        costAnalysis.assurance.records.push(record);
      } else if (type.includes('réparation')) {
        costAnalysis.reparation.total += record.cout;
        costAnalysis.reparation.records.push(record);
      } else {
        costAnalysis.entretien.total += record.cout;
        costAnalysis.entretien.records.push(record);
      }
      
      totalCost += record.cout;
    });

    // Calculate percentages
    Object.keys(costAnalysis).forEach(key => {
      costAnalysis[key].percentage = totalCost > 0 
        ? Math.round((costAnalysis[key].total / totalCost) * 100)
        : 0;
    });

    res.json({
      totalCost,
      breakdown: costAnalysis,
      period,
      recordsCount: maintenanceRecords.length
    });

  } catch (error) {
    console.error('Error fetching cost analysis:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

exports.getRecommendations = async (req, res) =>{
    try {
    const userId = req.user.userId;

    const vehicles = await Vehicle.find({ user: userId });
    const maintenanceRecords = await Entretien.find({ user: userId });

    const insights = [];

    // Calculate fuel efficiency insight
    const vehiclesWithConsumption = vehicles.filter(v => v.consommation > 0);
    const avgConsumption = vehiclesWithConsumption.length > 0
      ? vehiclesWithConsumption.reduce((sum, v) => sum + v.consommation, 0) / vehiclesWithConsumption.length
      : 0;

    if (avgConsumption > 7) {
      insights.push({
        type: 'fuel_efficiency',
        title: 'Économie Potentielle',
        value: '15-20%',
        description: 'Réduction possible des coûts de carburant avec une meilleure planification des trajets et formation éco-conduite',
        priority: 'high',
        category: 'cost_reduction'
      });
    }

    // Maintenance prediction insight
    const vehiclesNeedingMaintenance = vehicles.filter(v => {
      const lastMaintenance = maintenanceRecords
        .filter(m => m.vehicule.toString() === v._id.toString())
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      if (!lastMaintenance) return v.kilometrage > 10000;
      
      const daysSinceLastMaintenance = (new Date() - new Date(lastMaintenance.date)) / (1000 * 60 * 60 * 24);
      return daysSinceLastMaintenance > 90 || v.kilometrage - (lastMaintenance.kilometrage || 0) > 5000;
    });

    if (vehiclesNeedingMaintenance.length > 0) {
      insights.push({
        type: 'predictive_maintenance',
        title: 'Maintenance Prédictive',
        value: `${vehiclesNeedingMaintenance.length} véhicule${vehiclesNeedingMaintenance.length > 1 ? 's' : ''}`,
        description: 'Véhicules nécessitant un entretien selon les données d\'utilisation et historique',
        priority: vehiclesNeedingMaintenance.length > 2 ? 'high' : 'medium',
        category: 'maintenance',
        vehicles: vehiclesNeedingMaintenance.map(v => `${v.marque} ${v.modele}`)
      });
    }

    // Best performing vehicle insight
    const bestVehicle = vehiclesWithConsumption.reduce((best, current) => {
      return current.consommation < best.consommation ? current : best;
    }, vehiclesWithConsumption[0]);

    if (bestVehicle) {
      insights.push({
        type: 'performance_leader',
        title: 'Performance Optimale',
        value: `${bestVehicle.marque} ${bestVehicle.modele}`,
        description: `Véhicule le plus efficace avec une consommation de ${bestVehicle.consommation}L/100km`,
        priority: 'info',
        category: 'performance'
      });
    }

    // Cost trend insight
    const recentMaintenanceCosts = maintenanceRecords
      .filter(m => {
        const monthsAgo3 = new Date();
        monthsAgo3.setMonth(monthsAgo3.getMonth() - 3);
        return new Date(m.date) >= monthsAgo3;
      })
      .reduce((sum, m) => sum + m.cout, 0);

    const previousMaintenanceCosts = maintenanceRecords
      .filter(m => {
        const monthsAgo6 = new Date();
        monthsAgo6.setMonth(monthsAgo6.getMonth() - 6);
        const monthsAgo3 = new Date();
        monthsAgo3.setMonth(monthsAgo3.getMonth() - 3);
        return new Date(m.date) >= monthsAgo6 && new Date(m.date) < monthsAgo3;
      })
      .reduce((sum, m) => sum + m.cout, 0);

    if (previousMaintenanceCosts > 0 && recentMaintenanceCosts > previousMaintenanceCosts * 1.2) {
      insights.push({
        type: 'cost_increase',
        title: 'Augmentation des Coûts',
        value: `+${Math.round(((recentMaintenanceCosts - previousMaintenanceCosts) / previousMaintenanceCosts) * 100)}%`,
        description: 'Les coûts de maintenance ont augmenté significativement ces derniers mois',
        priority: 'high',
        category: 'cost_analysis'
      });
    }

    res.json({
      insights,
      summary: {
        totalInsights: insights.length,
        highPriority: insights.filter(i => i.priority === 'high').length,
        categories: [...new Set(insights.map(i => i.category))]
      }
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }

}


