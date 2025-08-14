
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const statsController = require('../controllers/statsController')
router.use(auth);

router.get('/summary', statsController.getStatisticsSummary);
router.get('/vehicles/performance', statsController.performanceStats)
router.get('/drivers/stats', statsController.driverStats);
router.get('/costs/analysis', statsController.costData);
router.get('/insights', statsController.getRecommendations);
module.exports = router;
