const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/doctor', require('./routes/doctor'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/queuease');
    console.log('MongoDB connected successfully');
    
    // Drop old username index if it exists (from previous schema)
    try {
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      const indexes = await usersCollection.indexes();
      
      // Check if username index exists
      const usernameIndex = indexes.find(idx => idx.key && idx.key.username);
      if (usernameIndex) {
        console.log('Removing old username index...');
        await usersCollection.dropIndex('username_1');
        console.log('Old username index removed successfully');
      }
    } catch (indexError) {
      // Index might not exist or already dropped, that's okay
      if (indexError.code !== 27) { // 27 is index not found error
        console.log('Note: Could not check/remove username index:', indexError.message);
      }
    }
    
    // Start server only after MongoDB is connected
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.error('Please make sure MongoDB is running on your system');
    console.error('To start MongoDB:');
    console.error('  Windows: Check Services or run: net start MongoDB');
    console.error('  Mac/Linux: sudo systemctl start mongod');
    process.exit(1);
  }
};

connectDB();

