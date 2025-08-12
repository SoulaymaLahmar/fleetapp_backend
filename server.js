//
let express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

//
let app = express();
app.use(cors()); // Allow all origins (not recommended for production)
app.use(express.json());

//
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch((err) => console.error(err));

//
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) =>{
    res.send("it's working ! ");
})

//auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

//vehicle routes
const vehicleRoutes = require('./routes/vehicleRoutes');
app.use('/api/vehicles', vehicleRoutes);

//driver routes
const driverRoutes = require('./routes/driverRoutes');
app.use('/api/drivers', driverRoutes);

//notification routes 
const notificationRoutes = require('./routes/notificationRoutes')
app.use('/api/notifications', notificationRoutes)

//
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
