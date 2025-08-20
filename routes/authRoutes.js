const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/register', upload.single('profileImage'), authController.register);
router.post('/login', authController.login);
router.put('/:id', auth, authController.updateProfile);
router.put('/profile/image', auth, upload.single('profileImage'), authController.updateProfileImage);


module.exports = router;