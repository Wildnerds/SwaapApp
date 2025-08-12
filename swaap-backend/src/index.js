"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const product_routes_1 = __importDefault(require("./routes/product-routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app); // Use raw HTTP server
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
    },
});
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/products', product_routes_1.default);
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
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
    .catch(err => console.error('❌ MongoDB connection error:', err));
