
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController')
router.use(auth);

router.get('/vehicles/stats/:userId', dashboardController.getVehicleStats );
router.get('/vehicles/recent/:userId', dashboardController.getRecentVehicles);
router.get('/activities/recent/:userId', dashboardController.getRecentActivities);
router.get('/stats/monthly/:userId', dashboardController.getMonthlyStats);
router.get('/dashboard/summary/:userId', dashboardController.getDashboardSummary);

module.exports = router;
