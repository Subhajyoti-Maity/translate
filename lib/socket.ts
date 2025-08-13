import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import connectDB from './mongodb';
import Message from '../models/Message';
import User from '../models/User';

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: any, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join user to their personal room
      socket.on('join-user', (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
      });

      // Handle sending messages
      socket.on('send-message', async (data) => {
        try {
          await connectDB();
          const { senderId, receiverId, text } = data;

          // Save message to database
          const message = new Message({
            sender: senderId,
            receiver: receiverId,
            text: text
          });

          await message.save();

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
          console.error('Message handling error:', error);
          socket.emit('error', 'Failed to send message');
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    console.log('Socket.io server initialized successfully');
  }

  res.end();
};

export default ioHandler;
