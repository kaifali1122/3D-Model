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
app.use(express.static(__dirname));

// MongoDB connection URL from environment variables
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://your_mongodb_url';

// MongoDB connection with error handling and retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
    connectDB();
});

// Name Schema
const nameSchema = new mongoose.Schema({
    name: String,
    createdAt: { type: Date, default: Date.now }
});

const Name = mongoose.model('Name', nameSchema);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// API Routes
app.get('/api/names', async (req, res) => {
    try {
        const names = await Name.find().sort({ createdAt: -1 });
        res.json(names);
    } catch (error) {
        console.error('Error fetching names:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/names', async (req, res) => {
    try {
        const newName = new Name({ name: req.body.name });
        await newName.save();
        res.json(newName);
    } catch (error) {
        console.error('Error saving name:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 