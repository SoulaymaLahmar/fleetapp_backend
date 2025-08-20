// routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middlewares/authMiddleware'); 
const Entretien = require('../models/Maintenance');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


router.use(auth); //use it to all routes

// Vehicle routes
router.get('/', vehicleController.getAllVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', upload.single('image'),vehicleController.addVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.patch('/:id/status', vehicleController.updateVehicle);

// Driver assignment routes
router.put('/:id/assign-driver', vehicleController.assignDriver);
router.patch('/:id/remove-driver', vehicleController.removeDriver);

// Entretien routes
router.get('/:id/entretiens', vehicleController.getallEntretiens);
router.post('/:id/entretiens', vehicleController.addEntretien);
router.delete('/:id/entretiens', vehicleController.deleteEntretien);
router.put('/:id/entretiens/:entretienId', vehicleController.updateEntretien);
router.put('/:id/entretiens/:entretienId/complete', vehicleController.completeEntretien);

module.exports = router;