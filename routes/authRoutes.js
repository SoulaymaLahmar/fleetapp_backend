const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware')
const verifyToken = require('../middlewares/verifyToken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/users/:id', authController.updateProfile);
router.patch(
  '/profile-image',
  verifyToken,
  upload.single('image'),
  authController.updateProfileImage
);

module.exports = router;