const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const driverController = require('../controllers/driverController');

router.get('/', auth, driverController.getAllDrivers);
router.post('/', auth, driverController.addDriver);
router.delete('/:id', auth, driverController.deleteDriver);
router.patch('/:id/status', auth, driverController.updateDriver);

module.exports = router;
