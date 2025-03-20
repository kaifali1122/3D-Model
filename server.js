require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// MongoDB connection URL from environment variables
const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
    console.error('MONGODB_URL not found in environment variables');
    process.exit(1);
}

// MongoDB connection with error handling
mongoose.connect(MONGODB_URL)
    .then(() => {
        console.log('Connected to MongoDB successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Name Schema
const nameSchema = new mongoose.Schema({
    name: String,
    createdAt: { type: Date, default: Date.now }
});

const Name = mongoose.model('Name', nameSchema);

// Routes
app.get('/api/names', async (req, res) => {
    try {
        const names = await Name.find().sort({ createdAt: -1 });
        res.json(names);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/names', async (req, res) => {
    try {
        const newName = new Name({ name: req.body.name });
        await newName.save();
        res.json(newName);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 