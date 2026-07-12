const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/users', require('./routes/users'));
app.use('/api/conversations', require('./routes/conversations'));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.IO
require('./socket')(io);

// Seed default rooms
const seedRooms = async () => {
  const Room = require('./models/Room');
  const defaults = [
    { name: 'general',  description: 'General discussions for everyone', emoji: '💬' },
    // { name: 'random',   description: 'Random chatter and fun stuff',     emoji: '🎲' },
    // { name: 'tech',     description: 'Tech talk and development',         emoji: '💻' },
    // { name: 'design',   description: 'UI/UX and design discussions',      emoji: '🎨' },
  ];
  for (const r of defaults) {
    await Room.findOneAndUpdate({ name: r.name }, r, { upsert: true, new: true });
  }
  console.log('🌱 Default rooms seeded');
};

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatflow')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedRooms();
  })
  .catch((err) => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 ChatFlow server running on http://localhost:${PORT}`);
});
