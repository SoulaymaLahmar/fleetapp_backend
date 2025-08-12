const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

router.get('/', auth, notificationController.getallnotifications);
router.post('/', auth, notificationController.addNotification);
router.put('/mark-all-read', auth,notificationController.markallread );

module.exports = router;
