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

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    rating: Number,
    createdAt: { type: Date, default: Date.now }
});

const Name = mongoose.model('Name', nameSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// API Routes
app.get('/api/names', async (req, res) => {
    try {
        // Get all names and sort by creation date
        const names = await Name.find().sort({ createdAt: 1 });
        
        // Remove duplicates keeping the first occurrence
        const uniqueNames = names.reduce((acc, current) => {
            const x = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
            if (!x) {
                return acc.concat([current]);
            }
            return acc;
        }, []);
        
        res.json(uniqueNames);
    } catch (error) {
        console.error('Error fetching names:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/names', async (req, res) => {
    try {
        const { name } = req.body;
        // Check for existing name case-insensitively
        const existingName = await Name.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });
        
        if (existingName) {
            return res.json(existingName);
        }

        const newName = new Name({ name });
        await newName.save();
        res.json(newName);
    } catch (error) {
        console.error('Error saving name:', error);
        res.status(500).json({ error: error.message });
    }
});

// Feedback Routes
app.post('/api/feedback', async (req, res) => {
    try {
        const newFeedback = new Feedback({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message,
            rating: req.body.rating
        });
        await newFeedback.save();
        res.json(newFeedback);
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
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