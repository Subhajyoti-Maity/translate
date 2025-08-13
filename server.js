const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.SOCKET_PORT || 3006;

// Check environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  console.error('Please create a .env.local file with your MongoDB connection string');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set in .env.local');
  console.error('Please create a .env.local file with your JWT secret');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log('📡 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? 'Set' : 'Missing');

// Import after environment check
const connectDB = require('./lib/mongodb');
const User = require('./models/User');
const Message = require('./models/Message');

// Connect to MongoDB
connectDB().then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  console.log('🚀 Socket.io server initialized');

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Join user to their personal room
    socket.on('join-user', (userId) => {
      socket.join(userId);
      console.log(`🏠 User ${userId} joined room`);
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { senderId, receiverId, text } = data;
        console.log('📨 Received message:', data);

        // Save message to database
        const message = new Message({
          sender: senderId,
          receiver: receiverId,
          text: text
        });

        await message.save();
        console.log('💾 Message saved to database:', message._id);

        // Emit message to receiver
        io.to(receiverId).emit('receive-message', {
          id: message._id,
          sender: senderId,
          receiver: receiverId,
          text: text,
          timestamp: message.timestamp
        });

        // Confirm message sent to sender
        socket.emit('message-sent', {
          id: message._id,
          timestamp: message.timestamp
        });

      } catch (error) {
        console.error('❌ Message handling error:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 User disconnected:', socket.id);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🌐 Ready on http://${hostname}:${port}`);
    console.log('🎯 Socket.io server running on /api/socket');
    console.log('📱 Chat app is ready!');
  });
});
