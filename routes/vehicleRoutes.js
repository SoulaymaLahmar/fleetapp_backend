const express = require('express');
const router = express.Router();
const { addVehicle, getVehicles, deleteVehicle, updateStatus, addHistorique } = require('../controllers/vehicleController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/',  addVehicle);
router.get('/', getVehicles);
router.delete('/:id',  deleteVehicle);
router.patch('/:id/status',  updateStatus);
router.post('/:id/historique', addHistorique);

module.exports = router;
