const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const driverController = require('../controllers/driverController');
const verifyToken = require('../middlewares/verifyToken');

router.get('/', auth, driverController.getAllDrivers);
router.post('/', verifyToken, driverController.addDriver);
router.delete('/:id', verifyToken, driverController.deleteDriver);

module.exports = router;
