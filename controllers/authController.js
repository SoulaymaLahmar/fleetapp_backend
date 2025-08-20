const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//creer un compte 
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Champs requis manquants" });
    }

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const photo = req.file ? `/uploads/${req.file.filename}` : '';

    const user = new User({
      name,
      email,
      password: hashedPassword,
      profileImage: photo,
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


//se connecter
exports.login = async (req, res) =>{
    const {email, password} = req.body;

    try{
        const user = await User.findOne({email});
        if(!user) return res.status(404).json({message: 'user not found'});

        // DEBUG: Log the user data
        console.log('=== BACKEND USER DEBUG ===');
        console.log('User from DB:', user);
        console.log('ProfileImage:', user.profileImage);
        console.log('========================');

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({message: 'invalid password'});

        const token = jwt.sign({ userId: user._id}, process.env.JWT_SECRET, {expiresIn: '1d'});
        
        const responseUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage || ''
        };
        
        // DEBUG: Log what we're sending
        console.log('Response user:', responseUser);
        
        res.json({
            message: 'login successful',
            token,
            user: responseUser
        })
    }catch (err){
        res.status(500).json({message: 'server error', error: err.message})
    }
};
// mise a jour du profile (edit profile screen)
exports.updateProfile = async (req, res) => {
    const {name, email, phone} = req.body;
    const userId = req.params.id;

    try{
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {name, email, phone},
            {new: true}
        );

        if (!updatedUser) return res.status(404).json({message: 'utilisateur non trouvé'});

        res.json({
            message:'profil mis a jour avec succés',
            user : {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone || '',
                profileImage: updatedUser.profileImage || '' 
            },
        });
    } catch(err) {
        res.status(500).json({ message: 'erreur serveur', error: err.message});
    }
};

exports.updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucune image envoyée' });
    }

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Image de profil mise à jour',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        profileImage: updatedUser.profileImage || ''
      }
    });
  } catch (err) {
    console.error('Error updating profile image:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
};