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
console.log('📡 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? 'Set' : 'Not set');

// Import models
const User = require('./models/User');
const Message = require('./models/Message');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Reset all users to offline status on server start
    await User.updateMany({}, { isOnline: false, lastActivity: new Date() });
    console.log('🔄 Reset all users to offline status');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize Next.js
const app = next({ dev, hostname, port: 3000 });
const handle = app.getRequestHandler();

// Socket.IO server setup
let io;

const initializeSocketIO = () => {
  io = new Server({
    path: '/api/socket',
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005',
        'http://192.168.10.4:3000',
        'http://192.168.10.4:3001',
        'http://192.168.10.4:3002',
        'http://192.168.10.4:3003',
        'http://192.168.10.4:3004',
        'http://192.168.10.4:3005',
        '*'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    },
    transports: ['polling'], // Use only polling to avoid WebSocket issues
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowUpgrades: false, // Disable upgrades to prevent WebSocket errors
    maxHttpBufferSize: 1e8,
    // Enhanced error handling and connection stability
    connectTimeout: 45000,
    // Additional WebSocket error prevention
    wsEngine: false // Disable WebSocket engine
  });

  console.log('🚀 Socket.io server initialized');

  // Store connected users for quick lookup - ENHANCED for multiple users
  const connectedUsers = new Map(); // socketId -> userId
  const userSockets = new Map(); // userId -> Set of socketIds
  const userLastActivity = new Map(); // userId -> last activity timestamp
  const MAX_ACTIVITY_UPDATE_INTERVAL = 10000; // 10 seconds minimum between activity updates

  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Handle user authentication and room joining
    socket.on('join-user', async (userId) => {
      try {
        if (!userId) {
          console.log('❌ No userId provided for join-user');
          return;
        }

        // Join user to their personal room
        socket.join(userId);
        socket.userId = userId;
        
        // Add to connected users maps
        connectedUsers.set(socket.id, userId);
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        console.log(`🏠 User ${userId} joined room using socket ${socket.id}`);
        console.log(`🔗 User ${userId} added to connected users map`);
        console.log(`📊 Total connected users: ${connectedUsers.size}`);
        
        // Join user to conversation rooms for all their active chats
        // This ensures they receive real-time updates for all conversations
        console.log(`🔗 User ${userId} ready for real-time conversation updates`);
        
        // Handle joining specific conversation rooms
        socket.on('join-conversation', (data) => {
          try {
            const { room, userId: roomUserId } = data;
            if (room && roomUserId === userId) {
              socket.join(room);
              console.log(`🔗 User ${userId} joined conversation room: ${room}`);
            }
          } catch (error) {
            console.error('❌ Error joining conversation room:', error);
          }
        });

        // Mark user as online
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastActivity: new Date()
        });
        console.log(`👤 User ${userId} marked as online`);

        // Broadcast user online status to all clients
        io.emit('user-status-changed', { 
          userId, 
          status: 'online', 
          lastActivity: new Date() 
        });

      } catch (error) {
        console.error('❌ Error in join-user:', error);
      }
    });

    // Handle sending messages - OPTIMIZED for speed
    socket.on('send-message', async (data) => {
      try {
        const { senderId, receiverId, text, tempId } = data;

        // Join both users to the conversation room for real-time updates
        const sendRoom = `chat_${senderId}_${receiverId}`;
        socket.join(sendRoom);
        console.log(`🔗 User ${senderId} joined conversation room: ${sendRoom}`);
        
        // Notify receiver to join the same conversation room
        io.to(receiverId).emit('join-conversation-request', { room: sendRoom, userId: receiverId });
        console.log(`📡 Requested receiver ${receiverId} to join room: ${sendRoom}`);
        
        // Also notify receiver to join the reverse room for compatibility
        const sendReverseRoom = `chat_${receiverId}_${senderId}`;
        io.to(receiverId).emit('join-conversation-request', { room: sendReverseRoom, userId: receiverId });
        console.log(`📡 Requested receiver ${receiverId} to join reverse room: ${sendReverseRoom}`);

        // Save message to database
        const message = new Message({
          senderId: senderId,
          receiverId: receiverId,
          text: text
        });

        await message.save();

        // Emit message to conversation room for real-time delivery to both users
        io.in(sendRoom).emit('receive-message', {
          id: message._id,
          senderId: senderId,
          receiverId: receiverId,
          text: text,
          timestamp: message.timestamp
        });
        
        console.log(`📡 Message sent to conversation room: ${sendRoom}`);
        
        // Also emit to the reverse room name for compatibility
        const reverseRoom = `chat_${receiverId}_${senderId}`;
        io.in(reverseRoom).emit('receive-message', {
          id: message._id,
          senderId: senderId,
          receiverId: receiverId,
          text: text,
          timestamp: message.timestamp
        });
        
        console.log(`📡 Message also sent to reverse room: ${reverseRoom}`);
        
        // Also ensure receiver gets the message directly (fallback)
        io.to(receiverId).emit('receive-message', {
          id: message._id,
          senderId: senderId,
          receiverId: receiverId,
          text: text,
          timestamp: message.timestamp
        });

        // Confirm to sender
        console.log('📤 Sending message-sent confirmation with tempId:', tempId);
        socket.emit('message-sent', {
          tempId: tempId,
          id: message._id,
          timestamp: message.timestamp
        });

        // Update sender's last activity (non-blocking)
        User.findByIdAndUpdate(senderId, {
          lastActivity: new Date()
        }).catch(err => console.error('Activity update error:', err));

      } catch (error) {
        console.error('❌ Message sending error:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Handle getting messages - OPTIMIZED with caching
    socket.on('get-messages', async (data) => {
      try {
        const { senderId, receiverId } = data;
        
        // Join both users to the conversation room for real-time updates
        const getRoom = `chat_${senderId}_${receiverId}`;
        socket.join(getRoom);
        console.log(`🔗 User ${senderId} joined conversation room: ${getRoom}`);
        
        // Notify receiver to join the same conversation room
        io.to(receiverId).emit('join-conversation-request', { room: getRoom, userId: receiverId });
        console.log(`📡 Requested receiver ${receiverId} to join room: ${getRoom}`);
        
        // Also notify receiver to join the reverse room for compatibility
        const getReverseRoom = `chat_${receiverId}_${senderId}`;
        io.to(receiverId).emit('join-conversation-request', { room: getReverseRoom, userId: receiverId });
        console.log(`📡 Requested receiver ${receiverId} to join reverse room: ${getReverseRoom}`);
        
        // Find messages between these two users
        const messages = await Message.find({
          $and: [
            {
              $or: [
                { senderId: senderId, receiverId: receiverId },
                { senderId: receiverId, receiverId: senderId }
              ]
            },
            { deletedForEveryone: { $ne: true } },
            {
              $or: [
                { deletedFor: { $exists: false } },
                { deletedFor: { $nin: [senderId, receiverId] } }
              ]
            }
          ]
        }).sort({ timestamp: 1 }).limit(100); // Limit to last 100 messages for performance
        
        // Send messages back to the client
        console.log(`📨 Sending ${messages.length} messages to client. Query params:`, {
          senderId,
          receiverId,
          totalMessages: messages.length
        });
        
        // Log any messages that might have deletion flags
        const messagesWithDeletionFlags = messages.filter(m => m.deletedForEveryone || (m.deletedFor && m.deletedFor.length > 0));
        if (messagesWithDeletionFlags.length > 0) {
          console.log(`⚠️ Found ${messagesWithDeletionFlags.length} messages with deletion flags:`, 
            messagesWithDeletionFlags.map(m => ({
              id: m._id,
              deletedForEveryone: m.deletedForEveryone,
              deletedFor: m.deletedFor
            }))
          );
        }
        
        // Transform messages to ensure they have proper id field
        const transformedMessages = messages.map(msg => ({
          id: msg._id.toString(),
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          text: msg.text,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          isDeleted: msg.isDeleted,
          deletedFor: msg.deletedFor,
          deletedForEveryone: msg.deletedForEveryone,
          reactions: msg.reactions
        }));
        
        socket.emit('messages-loaded', { messages: transformedMessages });

      } catch (error) {
        console.error('❌ Error getting messages:', error);
        socket.emit('error', 'Failed to get messages');
      }
    });

    // Handle message deletion - OPTIMIZED
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, senderId, receiverId, deleteType } = data;

        console.log(`🗑️ Delete message request:`, {
          messageId,
          senderId,
          receiverId,
          deleteType,
          socketId: socket.id
        });

        // Verify the message exists
        const message = await Message.findById(messageId);
        if (!message) {
          console.error(`❌ Message ${messageId} not found for deletion`);
          socket.emit('delete-error', {
            messageId: messageId,
            error: 'Message not found',
            errorType: 'message_not_found'
          });
          return;
        }

        // For "delete for everyone", only the sender can do this
        if (deleteType === 'for-everyone') {
          // Check if the user requesting deletion is the actual sender
          if (message.senderId.toString() !== senderId) {
            console.warn(`⚠️ Unauthorized delete for everyone attempt: ${senderId} tried to delete message from ${message.senderId}`);
            socket.emit('delete-error', {
              messageId: messageId,
              error: 'Only the message sender can delete this message for everyone',
              errorType: 'authorization'
            });
            return;
          }

          console.log(`🌍 Deleting message ${messageId} for everyone`);
          
          // Mark the message as deleted for everyone
          message.deletedForEveryone = true;
          
          // Ensure deletedFor array includes both users
          if (!message.deletedFor) {
            message.deletedFor = [];
          }
          if (!message.deletedFor.includes(senderId)) {
            message.deletedFor.push(senderId);
          }
          if (!message.deletedFor.includes(receiverId)) {
            message.deletedFor.push(receiverId);
          }
          
          await message.save();

          console.log(`🗑️ Message ${messageId} marked as deleted for everyone in database`);
          console.log(`📊 Message state after deletion:`, {
            deletedForEveryone: message.deletedForEveryone,
            deletedFor: message.deletedFor,
            messageId: messageId
          });

          // Notify both sender and receiver immediately using room-based broadcasting
          // Create a unique room for this conversation
          const conversationRoom = `chat_${senderId}_${receiverId}`;
          
          console.log(`📡 Broadcasting delete event to conversation room: ${conversationRoom}`);
          
          // Emit to the conversation room so both users get the update instantly
          io.in(conversationRoom).emit('message-deleted-for-everyone', {
            messageId: messageId,
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Delete event broadcasted to room ${conversationRoom}`);
          
          // Also emit to the reverse room name for compatibility
          const reverseRoom = `chat_${receiverId}_${senderId}`;
          io.in(reverseRoom).emit('message-deleted-for-everyone', {
            messageId: messageId,
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Delete event also broadcasted to reverse room ${reverseRoom}`);

          console.log(`✅ Message ${messageId} deleted for everyone. Notified sender ${senderId} and receiver ${receiverId}`);

        } else if (deleteType === 'for-me') {
          // For "delete for me", both sender and receiver can delete messages
          // Check if the user is either the sender or receiver of this message
          if (message.senderId.toString() !== senderId && message.receiverId.toString() !== senderId) {
            console.warn(`⚠️ Unauthorized delete for me attempt: ${senderId} tried to delete message they don't own`);
            socket.emit('delete-error', {
              messageId: messageId,
              error: 'You can only delete messages you sent or received',
              errorType: 'authorization'
            });
            return;
          }

          console.log(`👁️ Deleting message ${messageId} for user ${senderId} only`);
          
          // Mark message as deleted for this user only
          if (!message.deletedFor) {
            message.deletedFor = [];
          }
          if (!message.deletedFor.includes(senderId)) {
            message.deletedFor.push(senderId);
            await message.save();
            console.log(`✅ Message ${messageId} marked as deleted for ${senderId}`);
          } else {
            console.log(`ℹ️ Message ${messageId} already deleted for ${senderId}`);
          }

          // Notify only the requesting user
          socket.emit('message-deleted-for-me', {
            messageId: messageId,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ Delete for me completed for message ${messageId}`);
        }

      } catch (error) {
        console.error('❌ Message deletion error:', error);
        socket.emit('delete-error', {
          messageId: data.messageId,
          error: 'Failed to delete message',
          errorType: 'server_error'
        });
      }
    });

    // Handle message reactions - OPTIMIZED
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, reaction, userId } = data;

        // Validate input data
        if (!messageId || !reaction || !userId) {
          return;
        }

        // Validate reaction is a valid emoji - Extended list to match frontend
        const validReactions = ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉', '🔥', '💯', '👏', '🙏', '🤔', '😴', '🤮', '💪', '🎯', '🚀', '⭐', '💎'];
        if (!validReactions.includes(reaction)) {
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
          if (result.senderId && result.receiverId) {
            const senderId = result.senderId.toString();
            const receiverId = result.receiverId.toString();
            
            // Convert reactions Map to object for frontend compatibility
            const reactions = result.reactions ? Object.fromEntries(result.reactions) : {};
            
            const reactionData = {
              messageId: messageId,
              reaction: reaction,
              userId: userId,
              reactions: reactions
            };

            // Send to both users immediately
            io.to(senderId).emit('reaction-added', reactionData);
            io.to(receiverId).emit('reaction-added', reactionData);
            
            console.log(`🎭 Reaction added: ${reaction} by user ${userId} on message ${messageId}`);
            console.log(`📤 Sent to users: ${senderId} and ${receiverId}`);
            console.log(`📊 Reactions data sent:`, reactions);
          }
        }

      } catch (error) {
        console.error('❌ Add reaction error:', error);
      }
    });

    // Handle removing reactions - OPTIMIZED
    socket.on('remove-reaction', async (data) => {
      try {
        const { messageId, userId } = data;

        // Validate input data
        if (!messageId || !userId) {
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
          if (result.senderId && result.receiverId) {
            const senderId = result.senderId.toString();
            const receiverId = result.receiverId.toString();
            
            // Convert reactions Map to object for frontend compatibility
            const reactions = result.reactions ? Object.fromEntries(result.reactions) : {};
            
            const reactionData = {
              messageId: messageId,
              userId: userId,
              reactions: reactions
            };

            // Send to both users immediately
            io.to(senderId).emit('reaction-removed', reactionData);
            io.to(receiverId).emit('reaction-removed', reactionData);
            
            console.log(`🗑️ Reaction removed by user ${userId} on message ${messageId}`);
            console.log(`📤 Sent to users: ${senderId} and ${receiverId}`);
            console.log(`📊 Reactions data sent:`, reactions);
          }
        }

      } catch (error) {
        console.error('❌ Remove reaction error:', error);
      }
    });

    // Handle user activity updates - OPTIMIZED with rate limiting
    socket.on('user-activity', async (userId) => {
      try {
        if (!userId) return;
        
        const now = Date.now();
        const lastActivity = userLastActivity.get(userId) || 0;
        
        // Rate limit activity updates to prevent spam
        if (now - lastActivity < MAX_ACTIVITY_UPDATE_INTERVAL) {
          console.log(`⏭️ Skipping activity update for ${userId} - too frequent`);
          return;
        }
        
        userLastActivity.set(userId, now);
        console.log(`👤 User activity update: ${userId}`);
        
        // Update user's last activity and mark as online
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastActivity: new Date()
        });
        
        // Broadcast user online status to all connected clients
        io.emit('user-status-changed', { 
          userId, 
          status: 'online', 
          lastActivity: new Date() 
        });
        
        console.log(`✅ User ${userId} marked as online with updated activity`);
        
      } catch (error) {
        console.error('❌ Error updating user activity:', error);
      }
    });

    // Handle user heartbeat for more accurate online status - RATE LIMITED
    socket.on('user-heartbeat', async (userId) => {
      try {
        if (!userId) return;
        
        const now = Date.now();
        const lastHeartbeat = userLastActivity.get(userId) || 0;
        
        // Rate limit heartbeat updates (less frequent than activity)
        if (now - lastHeartbeat < MAX_ACTIVITY_UPDATE_INTERVAL * 2) {
          return; // Silent skip for heartbeats
        }
        
        userLastActivity.set(userId, now);
        
        // Update user's last activity without broadcasting (less noisy)
        await User.findByIdAndUpdate(userId, {
          lastActivity: new Date()
        });
        
        console.log(`💓 User heartbeat: ${userId}`);
        
      } catch (error) {
        console.error('❌ Error handling user heartbeat:', error);
      }
    });

    // Handle getting online status - OPTIMIZED with caching
    socket.on('get-online-status', async () => {
      try {
        // Get all users from database
        const allUsers = await User.find({}).select('_id username email isOnline lastActivity');
        
        // Create a set of connected user IDs for quick lookup
        const connectedUserIds = new Set(connectedUsers.values());
        
        // Transform users with actual online status
        const userStatuses = allUsers.map(user => {
          const userId = user._id.toString();
          const isActuallyOnline = connectedUserIds.has(userId);
          
          return {
            id: userId,
            username: user.username,
            email: user.email,
            isOnline: isActuallyOnline,
            lastActivity: user.lastActivity
          };
        });
        
        // Send statuses back to client
        socket.emit('online-status', userStatuses);

      } catch (error) {
        console.error('❌ Error getting online status:', error);
      }
    });

    // Handle disconnection - OPTIMIZED for multiple connections
    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;
        if (userId) {
          // Remove from connected users maps
          connectedUsers.delete(socket.id);
          if (userSockets.has(userId)) {
            userSockets.get(userId).delete(socket.id);
            if (userSockets.get(userId).size === 0) {
              userSockets.delete(userId);
              userLastActivity.delete(userId); // Clean up activity tracking
              
              // Mark user as offline only if no more connections
              await User.findByIdAndUpdate(userId, {
                isOnline: false,
                lastActivity: new Date()
              });
              
              // Broadcast user offline status to all connected clients
              io.emit('user-status-changed', { 
                userId, 
                status: 'offline', 
                lastActivity: new Date() 
              });
              
              console.log(`👤 User ${userId} marked as offline - no more active connections`);
            } else {
              console.log(`👤 User ${userId} still has ${userSockets.get(userId).size} active connections`);
            }
          }
          
          console.log(`👋 User disconnected: ${socket.id} Reason: ${socket.disconnectReason || 'unknown'}`);
          console.log(`📊 Total connected users: ${connectedUsers.size}`);
        }
      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      }
    });

    // Handle transport errors gracefully
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  console.log('🎯 Socket.io server running on /api/socket');
  console.log('📱 Chat app is ready!');
};

// Start the server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Initialize Socket.IO
    initializeSocketIO();
    
    // Create HTTP server for Socket.IO only
    const server = createServer((req, res) => {
      // Socket.IO server only - return simple response
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Socket.IO Server Running');
    });

    // Attach Socket.IO to the server
    io.attach(server);

    // Start listening
    server.listen(port, () => {
      console.log(`🌐 Socket.IO Server Ready on http://localhost:${port}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
