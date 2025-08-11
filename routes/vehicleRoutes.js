// routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middlewares/authMiddleware'); 

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

// Entretien routes
router.post('/:id/entretiens', vehicleController.addEntretien);
router.delete('/:id/entretiens', vehicleController.deleteEntretien);
router.patch('/:id/entretiens/:entretienId/complete', vehicleController.completeEntretien);
router.delete('/vehicles/:id/entretiens/:entretienId', vehicleController.deleteEntretien);


module.exports = router;