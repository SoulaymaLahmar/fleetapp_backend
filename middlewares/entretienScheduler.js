// services/entretienScheduler.js
const Entretien = require('../models/Maintenance');

class EntretienScheduler {
  
  /**
   * Met à jour automatiquement les statuts des entretiens
   * - Les entretiens planifiés dont la date est passée restent planifiés
   *   (ils doivent être marqués manuellement comme terminés)
   * - Cette fonction peut être appelée périodiquement ou lors de certaines actions
   */
  static async updateEntretiensStatus() {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Début de la journée

      // Optionnel: Marquer automatiquement comme "en retard" les entretiens planifiés
      // dont la date est dépassée (vous pouvez ajouter ce statut au schema si nécessaire)
      
      console.log('Vérification des statuts d\'entretien...');
      
      // Pour l'instant, nous gardons la logique simple
      // Les entretiens restent "planifiés" même si la date est passée
      // Cela permet à l'utilisateur de les marquer manuellement comme terminés
      
      return { success: true, message: 'Statuts vérifiés' };
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statuts d\'entretien:', error);
      return { success: false, error: error.message };
    }
  }

  
  static async getOverdueEntretiens(userId = null) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filter = {
        statut: 'planifie',
        date: { $lt: today }
      };

      if (userId) {
        filter.user = userId;
      }

      const overdueEntretiens = await Entretien.find(filter)
        .populate('vehicule', 'marque modele numeroSerie')
        .populate('user', 'nom email')
        .sort({ date: 1 });

      return overdueEntretiens;
    } catch (error) {
      console.error('Erreur lors de la récupération des entretiens en retard:', error);
      throw error;
    }
  }

  static async getUpcomingEntretiens(days = 7, userId = null) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      futureDate.setHours(23, 59, 59, 999);

      let filter = {
        statut: 'planifie',
        date: { 
          $gte: today,
          $lte: futureDate
        }
      };

      if (userId) {
        filter.user = userId;
      }

      const upcomingEntretiens = await Entretien.find(filter)
        .populate('vehicule', 'marque modele numeroSerie')
        .populate('user', 'nom email')
        .sort({ date: 1 });

      return upcomingEntretiens;
    } catch (error) {
      console.error('Erreur lors de la récupération des entretiens à venir:', error);
      throw error;
    }
  }

  /**
   * Statistiques des entretiens
   */
  static async getEntretiensStats(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await Entretien.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: '$statut',
            count: { $sum: 1 },
            totalCost: { $sum: '$cout' }
          }
        }
      ]);

      // Entretiens en retard
      const overdue = await Entretien.countDocuments({
        user: userId,
        statut: 'planifie',
        date: { $lt: today }
      });

      // Entretiens ce mois
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const thisMonth = await Entretien.countDocuments({
        user: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      return {
        byStatus: stats,
        overdue,
        thisMonth,
        total: stats.reduce((sum, stat) => sum + stat.count, 0)
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  }

}

module.exports = EntretienScheduler;