import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import productRoutes from './routes/product-routes';

dotenv.config();

const app = express();
const server = http.createServer(app); // Use raw HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);

app.get('/', (_req, res) => {
  res.send('API is up and running');
});

// --- Real-time Socket.IO Logic ---
io.on('connection', socket => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on('join', ({ userId }) => {
    socket.join(userId); // Join room with userId
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('sendMessage', ({ senderId, receiverId, message }) => {
    io.to(receiverId).emit('receiveMessage', { senderId, message, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// --- MongoDB and Server Start ---
mongoose
  .connect(MONGO_URI!)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
