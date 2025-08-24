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
connectDB().then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Reset all users to offline when server starts
  try {
    await User.updateMany({}, { isOnline: false });
    console.log('🔄 Reset all users to offline status');
  } catch (error) {
    console.error('❌ Error resetting user statuses:', error);
  }
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
      origin: [
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:3003", 
        "http://localhost:3004", 
        "http://localhost:3005",
        "http://192.168.10.4:3000",
        "http://192.168.10.4:3001",
        "http://192.168.10.4:3002",
        "http://192.168.10.4:3003",
        "http://192.168.10.4:3004",
        "http://192.168.10.4:3005",
        "*"
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      preflightContinue: false,
      optionsSuccessStatus: 204
    },
    transports: ['polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowUpgrades: false,
    maxHttpBufferSize: 1e6,
    allowRequest: (req, callback) => {
      // Allow all requests for now
      callback(null, true);
    },
    connectTimeout: 45000
  });

  console.log('🚀 Socket.io server initialized');
  console.log('🔧 Server configuration:', {
    path: '/api/socket',
    cors: {
      origin: [
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:3002", 
        "http://localhost:3003", 
        "http://localhost:3004", 
        "http://localhost:3005",
        "http://192.168.10.4:3000",
        "http://192.168.10.4:3001",
        "http://192.168.10.4:3002",
        "http://192.168.10.4:3003",
        "http://192.168.10.4:3004",
        "http://192.168.10.4:3005",
        "*"
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      preflightContinue: false,
      optionsSuccessStatus: 204
    },
    transports: ['polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowUpgrades: false
  });

  // Helper functions for socket operations
  // Track connected users
  const connectedUsers = new Map(); // socketId -> userId

  const broadcastOnlineUserCount = async () => {
    try {
      // Only count users who are actually connected via socket
      const actualOnlineCount = connectedUsers.size;
      io.emit('online-user-count-updated', { count: actualOnlineCount });
    } catch (error) {
      console.error('❌ Error broadcasting online user count:', error);
    }
  };

  // Get all connected user IDs
  const getConnectedUserIds = () => {
    return Array.from(connectedUsers.values());
  };

  // Broadcast user status to all clients
  const broadcastUserStatus = (userId, status, lastActivity) => {
    io.emit('user-status-changed', {
      userId: userId,
      status: status,
      lastActivity: lastActivity
    });
  };

  const checkInactiveUsers = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      const inactiveUsers = await User.find({
        isOnline: true,
        lastActivity: { $lt: fiveMinutesAgo }
      });
      
      if (inactiveUsers.length > 0) {
        console.log(`🕐 Found ${inactiveUsers.length} inactive users, marking as offline`);
        
        for (const user of inactiveUsers) {
          await User.findByIdAndUpdate(user._id, {
            isOnline: false
          });
          
          // Broadcast status change
          io.emit('user-status-changed', {
            userId: user._id.toString(),
            status: 'offline',
            lastActivity: user.lastActivity
          });
        }
        
        // Broadcast updated online user count
        await broadcastOnlineUserCount();
      }
    } catch (error) {
      console.error('❌ Error checking inactive users:', error);
    }
  };

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);
    console.log('🔗 Socket transport:', socket.conn.transport.name);
    console.log('🔗 Socket details:', {
      id: socket.id,
      transport: socket.conn.transport.name,
      remoteAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });

    // Set up periodic check for inactive users
    const inactiveCheckInterval = setInterval(checkInactiveUsers, 60000); // Check every minute

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        type: error.type,
        socketId: socket.id
      });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log('👋 User disconnected:', socket.id, 'Reason:', reason);
      
      // Clear the inactive check interval
      clearInterval(inactiveCheckInterval);
      
      // Remove user from connected users map
      if (socket.userId) {
        connectedUsers.delete(socket.id);
        
        console.log(`🔗 User ${socket.userId} removed from connected users map`);
        console.log(`📊 Total connected users: ${connectedUsers.size}`);
        console.log(`🔗 Connected user IDs: ${Array.from(connectedUsers.values())}`);
        
        // Check if user has other active connections
        const userStillHasConnections = Array.from(connectedUsers.values()).includes(socket.userId);
        
        if (!userStillHasConnections) {
          // User has no more active connections, mark as offline
          try {
            await User.findByIdAndUpdate(socket.userId, {
              isOnline: false,
              lastActivity: new Date()
            });
            
            // Broadcast to all other users that this user is now offline
            socket.broadcast.emit('user-status-changed', {
              userId: socket.userId,
              status: 'offline',
              lastActivity: new Date()
            });
            
            console.log(`👤 User ${socket.userId} marked as offline (no more connections)`);
          } catch (error) {
            console.error('❌ Error updating user offline status:', error);
          }
        } else {
          console.log(`👤 User ${socket.userId} still has other active connections, keeping online status`);
        }
        
        // Always update last activity
        try {
          await User.findByIdAndUpdate(socket.userId, {
            lastActivity: new Date()
          });
        } catch (error) {
          console.error('❌ Error updating user last activity:', error);
        }
        
        // Broadcast updated online user count
        await broadcastOnlineUserCount();
        
        // Force all clients to refresh their status
        io.emit('force-status-refresh');
      }
    });

    // Handle transport errors
    socket.conn.on('error', (error) => {
      console.error('❌ Transport error for socket:', socket.id, error);
      console.error('❌ Transport error details:', {
        type: error.type || 'Unknown type',
        message: error.message || 'No message',
        code: error.code || 'No code',
        transport: socket.conn.transport.name,
        readyState: socket.conn.transport.readyState
      });
      
      // If it's a critical transport error, try to recover
      if (error.type === 'TransportError' || error.message?.includes('transport')) {
        console.log(`🔄 Attempting to recover transport for socket: ${socket.id}`);
        
        // Try to force a transport reset
        try {
          if (socket.conn.transport && socket.conn.transport.writable) {
            socket.conn.transport.close();
          }
        } catch (resetError) {
          console.log(`⚠️ Could not reset transport for socket: ${socket.id}`, resetError.message);
        }
      }
    });

    // Handle transport close events
    socket.conn.on('close', (reason) => {
      console.log(`🔌 Transport closed for socket: ${socket.id}, Reason: ${reason}`);
      
      // If transport closed unexpectedly, try to reconnect
      if (reason === 'transport error' || reason === 'transport close') {
        console.log(`🔄 Transport closed unexpectedly for socket: ${socket.id}, attempting recovery...`);
        // The client will automatically attempt to reconnect
      }
    });

    // Handle transport packet events
    socket.conn.on('packet', (packet) => {
      // Log only important packets to avoid spam
      if (packet.type === 'error') {
        console.error(`📦 Error packet received for socket: ${socket.id}`, packet);
      }
    });

    // Handle transport upgrade events
    socket.conn.on('upgrade', () => {
      console.log(`🔄 Transport upgraded for socket: ${socket.id}`);
    });

    // Handle transport drain events
    socket.conn.on('drain', () => {
      console.log(`💧 Transport drained for socket: ${socket.id}`);
    });

    // Handle ping for connection heartbeat
    socket.on('ping', () => {
      socket.emit('pong');
      console.log(`💓 Ping received from socket: ${socket.id}, sent pong response`);
    });

    // Join user to their personal room
    socket.on('join-user', async (userId) => {
      socket.join(userId);
      console.log(`🏠 User ${userId} joined room using socket ${socket.id}`);
      console.log(`👥 Users in room ${userId}:`, io.sockets.adapter.rooms.get(userId)?.size || 0);
      
      // Store user ID in socket for easier debugging
      socket.userId = userId;
      
      // Track this user as connected (allow multiple connections)
      connectedUsers.set(socket.id, userId);
      
      console.log(`🔗 User ${userId} added to connected users map`);
      console.log(`📊 Total connected users: ${connectedUsers.size}`);
      console.log(`🔗 Connected user IDs: ${Array.from(connectedUsers.values())}`);
      
      // Update user status to online when they join (don't override if already online)
      try {
        const user = await User.findById(userId);
        if (user) {
          // Only update if not already online or if this is a new session
          if (!user.isOnline) {
            await User.findByIdAndUpdate(userId, {
              isOnline: true,
              lastActivity: new Date()
            });
            
            // Broadcast to all other users that this user is now online
            socket.broadcast.emit('user-status-changed', {
              userId: userId,
              status: 'online',
              lastActivity: new Date()
            });
            
            console.log(`👤 User ${userId} marked as online`);
          } else {
            console.log(`👤 User ${userId} already online, updating activity only`);
          }
          
          // Always update last activity
          await User.findByIdAndUpdate(userId, {
            lastActivity: new Date()
          });
        }
        
        // Also emit to the user who joined to confirm their status
        socket.emit('user-status-changed', {
          userId: userId,
          status: 'online',
          lastActivity: new Date()
        });
        
        // Broadcast updated online user count
        await broadcastOnlineUserCount();
        
        // Force all clients to refresh their status
        io.emit('force-status-refresh');
        
      } catch (error) {
        console.error('❌ Error updating user online status:', error);
      }
      
      // Confirm room join to client
      socket.emit('room-joined', {
        userId: userId,
        socketId: socket.id,
        roomSize: io.sockets.adapter.rooms.get(userId)?.size || 0
      });
    });

    // Handle user activity updates (heartbeat)
    socket.on('user-activity', async (userId) => {
      try {
        await User.findByIdAndUpdate(userId, {
          lastActivity: new Date()
        });
        
        // Broadcast activity update to other users
        socket.broadcast.emit('user-activity-updated', {
          userId: userId,
          lastActivity: new Date()
        });
      } catch (error) {
        console.error('❌ Error updating user activity:', error);
      }
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      try {
        const { senderId, receiverId, text } = data;
        console.log('📨 Received message:', data);

        // Update sender's last activity
        await User.findByIdAndUpdate(senderId, {
          lastActivity: new Date()
        });

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

        // Confirm message sent to sender with tempId if provided
        socket.emit('message-sent', {
          tempId: data.tempId,
          id: message._id,
          timestamp: message.timestamp
        });

      } catch (error) {
        console.error('❌ Message handling error:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Handle message deletion
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, senderId, receiverId, deleteType } = data;
        console.log('🗑️ Message deletion requested:', data);
        console.log('👤 Sender ID:', senderId);
        console.log('👥 Receiver ID:', receiverId);
        console.log('🎯 Delete type:', deleteType);
        console.log('🔌 Socket ID:', socket.id);
        console.log('🔌 Socket connected:', socket.connected);
        console.log('👤 Socket user ID:', socket.userId);
        console.log('👥 Total connected sockets:', io.sockets.sockets.size);
        console.log('🏠 Current rooms:', Array.from(io.sockets.adapter.rooms.keys()).filter(room => !room.startsWith('/'))); // Filter out internal rooms

        // Verify the message exists and belongs to the sender
        const message = await Message.findById(messageId);
        if (!message) {
          console.log('❌ Message not found for deletion:', messageId);
          // Check if this might be a temporary message ID
          if (messageId.startsWith('temp-')) {
            console.log('⚠️ This appears to be a temporary message ID, cannot delete');
            socket.emit('delete-error', {
              messageId: messageId,
              error: 'Cannot delete temporary message. Please wait for message confirmation.',
              errorType: 'temporary_message'
            });
          } else {
            // Try to find the message with different ID formats
            console.log('🔍 Trying to find message with different ID formats...');
            const allMessages = await Message.find({
              $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
              ]
            }).limit(10);
            
            console.log('🔍 Recent messages in this conversation:', allMessages.map(m => ({
              id: m._id,
              text: m.text?.substring(0, 50),
              timestamp: m.timestamp
            })));
            
            socket.emit('delete-error', {
              messageId: messageId,
              error: 'Message not found. It may have been already deleted or is not in this conversation.',
              errorType: 'message_not_found'
            });
          }
          return;
        }

        console.log('✅ Message found:', message._id, 'Sender:', message.sender, 'Receiver:', message.receiver);

        // Check if the user requesting deletion is the actual sender of the message
        if (message.sender.toString() !== senderId) {
          console.log('❌ Unauthorized deletion attempt:', messageId);
          console.log('❌ Message sender:', message.sender.toString());
          console.log('❌ Requested by:', senderId);
          console.log('❌ Authorization failed - only message sender can delete for everyone');
          
          // Emit a more specific error type for authorization issues
          socket.emit('delete-error', {
            messageId: messageId,
            error: 'Only the message sender can delete this message for everyone',
            errorType: 'authorization',
            senderId: message.sender.toString(),
            requestedBy: senderId
          });
          return;
        }

        console.log('✅ User authorized to delete message');

        // Check if message is already deleted for everyone
        if (message.deletedForEveryone) {
          console.log('⚠️ Message already deleted for everyone:', messageId);
          socket.emit('delete-error', {
            messageId: messageId,
            error: 'Message is already deleted for everyone',
            errorType: 'already_deleted',
            alreadyDeleted: true
          });
          return;
        }

        // Check if message is already deleted for the requesting user
        if (message.deletedFor && message.deletedFor.includes(senderId)) {
          console.log('⚠️ Message already deleted for user:', messageId, senderId);
          socket.emit('delete-error', {
            messageId: messageId,
            error: 'Message is already deleted for you',
            errorType: 'already_deleted',
            alreadyDeleted: true
          });
          return;
        }

        if (deleteType === 'for-everyone') {
          console.log('🌍 Processing delete for everyone...');
          
          // Mark the message as deleted for everyone instead of completely deleting it
          // This allows us to track deletion history and handle edge cases better
          message.deletedForEveryone = true;
          message.deletedFor = [senderId, receiverId]; // Mark as deleted for both users
          await message.save();
          console.log('✅ Message marked as deleted for everyone in database:', messageId);

          // Notify both sender and receiver that the message was deleted
          // Use emit to both users to ensure real-time updates
          console.log(`📡 Emitting message-deleted-for-everyone to receiver: ${receiverId}`);
          io.to(receiverId).emit('message-deleted-for-everyone', {
            messageId: messageId,
            deletedBy: senderId,
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date()
          });

          // Also emit to the sender's room to ensure they get the event
          console.log(`📡 Emitting message-deleted-for-everyone to sender: ${senderId}`);
          io.to(senderId).emit('message-deleted-for-everyone', {
            messageId: messageId,
            deletedBy: senderId,
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date()
          });

          console.log('📡 Emitted message-deleted-for-everyone to both users');
          
          // Debug: Check which rooms exist
          console.log('🏠 Available rooms:', Array.from(io.sockets.adapter.rooms.keys()));
          console.log('👥 Users in receiver room:', io.sockets.adapter.rooms.get(receiverId)?.size || 0);
          console.log('👤 Users in sender room:', io.sockets.adapter.rooms.get(senderId)?.size || 0);
          
          // Fallback: Also emit to all connected sockets to ensure delivery
          console.log('🔄 Fallback: Broadcasting to all connected sockets');
          io.emit('message-deleted-for-everyone', {
            messageId: messageId,
            deletedBy: senderId,
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date()
          });
          
          console.log('✅ Delete for everyone completed successfully');
        } else {
          console.log('👁️ Processing delete for me...');
          
          // Delete for me - mark message as deleted for the sender
          if (!message.deletedFor) {
            message.deletedFor = [];
          }
          if (!message.deletedFor.includes(senderId)) {
            message.deletedFor.push(senderId);
            await message.save();
          }
          console.log('✅ Message marked as deleted for sender:', messageId);

          // Notify both sender and receiver about the deletion
          io.to(receiverId).emit('message-deleted-for-user', {
            messageId: messageId,
            userId: senderId
          });

          // Confirm deletion to sender
          socket.emit('message-deleted-for-me', {
            messageId: messageId
          });
        }

      } catch (error) {
        console.error('❌ Message deletion error:', error);
        console.error('❌ Error stack:', error.stack);
        socket.emit('error', 'Failed to delete message');
      }
    });

    // Handle "delete for me" from any user (sender or receiver)
    socket.on('delete-message-for-me', async (data) => {
      try {
        const { messageId, userId } = data;
        console.log('👁️ Delete for me requested:', data);

        // Verify the message exists
        const message = await Message.findById(messageId);
        if (!message) {
          console.log('❌ Message not found for delete-for-me:', messageId);
          return;
        }

        // Check if user is sender or receiver
        if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
          console.log('❌ Unauthorized delete-for-me attempt:', messageId);
          return;
        }

        // Mark message as deleted for this user
        if (!message.deletedFor) {
          message.deletedFor = [];
        }
        if (!message.deletedFor.includes(userId)) {
          message.deletedFor.push(userId);
          await message.save();
        }
        console.log('✅ Message marked as deleted for user:', messageId, userId);

        // Notify both sender and receiver about the deletion
        const otherUserId = message.sender.toString() === userId ? message.receiver.toString() : message.sender.toString();
        
        // Emit to the user who deleted the message
        socket.emit('message-deleted-for-me', {
          messageId: messageId
        });

        // Emit to the other user (sender or receiver) to notify them
        io.to(otherUserId).emit('message-deleted-for-user', {
          messageId: messageId,
          userId: userId
        });

      } catch (error) {
        console.error('❌ Delete for me error:', error);
        socket.emit('error', 'Failed to delete message for me');
      }
    });
    
    // Handle getting messages between two users
    socket.on('get-messages', async (data) => {
      try {
        const { senderId, receiverId } = data;
        console.log('📚 Getting messages between:', senderId, 'and', receiverId);
        
        // Find messages between these two users
        const messages = await Message.find({
          $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId }
          ],
          deletedForEveryone: { $ne: true }, // Exclude messages deleted for everyone
          $or: [
            { deletedFor: { $exists: false } },
            { deletedFor: { $nin: [senderId] } } // Exclude messages deleted for the requesting user
          ]
        }).sort({ timestamp: 1 }); // Sort by timestamp ascending
        
        console.log(`📚 Found ${messages.length} messages`);
        
        // Send messages back to the client
        socket.emit('messages-loaded', {
          messages: messages.map(msg => ({
            id: msg._id,
            sender: msg.sender,
            receiver: msg.receiver,
            text: msg.text,
            timestamp: msg.timestamp,
            isRead: msg.isRead,
            deletedFor: msg.deletedFor || []
          }))
        });
        
      } catch (error) {
        console.error('❌ Error getting messages:', error);
        socket.emit('error', 'Failed to load messages');
      }
    });

    // Handle request for current online status of all users
    socket.on('get-online-status', async () => {
      try {
        console.log('📊 Client requested online status');
        console.log('🔗 Currently connected users:', Array.from(connectedUsers.values()));
        
        // Get all users from database
        const allUsers = await User.find({}).select('_id username email isOnline lastActivity');
        
        // Create a set of connected user IDs for quick lookup
        const connectedUserIds = new Set(connectedUsers.values());
        
        console.log('👥 All users in database:', allUsers.length);
        console.log('🔗 Connected user IDs:', Array.from(connectedUserIds));
        
        // Transform users with actual online status
        const userStatuses = allUsers.map(user => {
          const userId = user._id.toString();
          const isActuallyOnline = connectedUserIds.has(userId);
          
          console.log(`👤 User ${user.username} (${userId}): isOnline=${user.isOnline}, actuallyConnected=${isActuallyOnline}`);
          
          return {
            id: userId,
            username: user.username,
            email: user.email,
            isOnline: isActuallyOnline, // Only true if actually connected via socket
            lastActivity: user.lastActivity || user.lastSeen,
            status: isActuallyOnline ? 'online' : 'offline'
          };
        });
        
        console.log('📊 Sending user statuses:', userStatuses.map(u => `${u.username}: ${u.status}`));
        
        // Send current status to the requesting client
        socket.emit('online-status-updated', { userStatuses });
        
      } catch (error) {
        console.error('❌ Error getting online status:', error);
        socket.emit('error', 'Failed to get online status');
      }
    });

    // Handle message reactions
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, reaction, userId } = data;
        console.log('🎭 Adding reaction:', { messageId, reaction, userId });

        // Validate input data
        if (!messageId || !reaction || !userId) {
          console.error('❌ Invalid reaction data:', { messageId, reaction, userId });
          return;
        }

        // Validate reaction is a valid emoji
        const validReactions = ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉'];
        if (!validReactions.includes(reaction)) {
          console.error('❌ Invalid reaction emoji:', reaction);
          return;
        }

        // Update message with reaction
        const result = await Message.findByIdAndUpdate(
          messageId,
          { [`reactions.${userId}`]: reaction },
          { new: true }
        );

        if (result) {
          // Emit reaction added to both sender and receiver
          const message = await Message.findById(messageId);
          if (message && message.senderId && message.receiverId) {
            const senderId = message.senderId.toString();
            const receiverId = message.receiverId.toString();
            
            const reactionData = {
              messageId,
              reaction,
              userId,
              reactions: Object.fromEntries(message.reactions || new Map())
            };
            
            console.log('📡 Emitting reaction-added to sender:', senderId, reactionData);
            io.to(senderId).emit('reaction-added', reactionData);
            
            if (senderId !== receiverId) {
              console.log('📡 Emitting reaction-added to receiver:', receiverId, reactionData);
              io.to(receiverId).emit('reaction-added', reactionData);
            }
          }
          console.log('✅ Reaction added successfully');
        }
      } catch (error) {
        console.error('❌ Error adding reaction:', error);
      }
    });

    socket.on('remove-reaction', async (data) => {
      try {
        const { messageId, userId } = data;
        console.log('🗑️ Removing reaction:', { messageId, userId });

        // Validate input data
        if (!messageId || !userId) {
          console.error('❌ Invalid remove reaction data:', { messageId, userId });
          return;
        }

        // Remove reaction from message
        const result = await Message.findByIdAndUpdate(
          messageId,
          { $unset: { [`reactions.${userId}`]: 1 } },
          { new: true }
        );

        if (result) {
          // Emit reaction removed to both sender and receiver
          const message = await Message.findById(messageId);
          if (message && message.senderId && message.receiverId) {
            const senderId = message.senderId.toString();
            const receiverId = message.receiverId.toString();
            
            const reactionData = {
              messageId,
              userId,
              reactions: Object.fromEntries(message.reactions || new Map())
            };
            
            console.log('📡 Emitting reaction-removed to sender:', senderId, reactionData);
            io.to(senderId).emit('reaction-removed', reactionData);
            
            if (senderId !== receiverId) {
              console.log('📡 Emitting reaction-removed to receiver:', receiverId, reactionData);
              io.to(receiverId).emit('reaction-removed', reactionData);
            }
          }
          console.log('✅ Reaction removed successfully');
        }
      } catch (error) {
        console.error('❌ Error removing reaction:', error);
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🌐 Ready on http://${hostname}:${port}`);
    console.log('🎯 Socket.io server running on /api/socket');
    console.log('📱 Chat app is ready!');
  });
});
