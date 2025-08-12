// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v2 as cloudinary } from 'cloudinary';
import express from 'express';
import { createApp } from './app';
import { paystackWebhook } from './controllers/payment/paystackWebhook';
import { networkInterfaces } from 'os';

// ✅ Cron jobs
import './cron/expireSwaps';
import './cron/deleteSwaps';

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ✅ Function to get local IP address dynamically
const getLocalIP = (): string => {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    const net = nets[name];
    if (!net) continue;

    for (const netInterface of net) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (netInterface.family === 'IPv4' && !netInterface.internal) {
        results.push(netInterface.address);
      }
    }
  }

  // Return the first valid IP, or fallback to localhost
  return results[0] || 'localhost';
};

// ✅ Parse environment variables
const PORT = parseInt(process.env.PORT || '5002', 10);
const MONGO_URI = process.env.MONGO_URI!;
const LOCAL_IP = getLocalIP();

// ✅ FIXED: Create a temporary io server first
const tempServer = http.createServer();
const io = new SocketIOServer(tempServer, {
  cors: {
    origin: '*',
  },
});

// ✅ Create Express app with io
const app = createApp(io);

// ✅ FIXED: Create HTTP server WITH the Express app
const server = http.createServer(app);

// ✅ FIXED: Attach Socket.IO to the correct server
io.attach(server, {
  cors: {
    origin: '*',
  },
});

// ✅ Paystack webhook (this should already be in your app.ts, but keeping for safety)
app.post(
  '/api/payment/webhook/paystack',
  express.raw({ type: 'application/json' }),
  paystackWebhook
);

// ✅ WebSocket logic
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join', ({ userId }) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('sendMessage', ({ senderId, receiverId, message }) => {
    io.to(receiverId).emit('receiveMessage', {
      senderId,
      message,
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ✅ MongoDB connection and server start
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📱 Mobile access: http://${LOCAL_IP}:${PORT}`);
      console.log(`🖥️  Admin Panel: http://localhost:${PORT}/admin`);
      console.log(`🌐 Detected IP: ${LOCAL_IP}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

