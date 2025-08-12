import { Server } from 'socket.io';
import { connectToDatabase } from '@lib/mongodb';
import User from '@lib/models/User';
import Message from '@lib/models/Message';
import { Translate } from '@google-cloud/translate';

const translate = new Translate({ projectId: process.env.GOOGLE_PROJECT_ID, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });

const socketHandler = async (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', async socket => {
      console.log('Socket connected:', socket.id);

      socket.on('join', userId => {
        console.log(`User ${userId} joined`);
        socket.join(userId); // Room name is the userId
      });

      socket.on('send-message', async ({ senderId, receiverId, text }) => {
        console.log(`Message from ${senderId} to ${receiverId}: ${text}`);

        try {
          await connectToDatabase();

          // 1. Look up receiver's preferred language
          const receiver = await User.findById(receiverId);
          if (!receiver) {
            console.error(`Receiver ${receiverId} not found`);
            return;
          }
          const targetLanguage = receiver.language;

          // 2. Translate the message
          let translatedText = text; // Default if translation fails
          try {
            const [translation] = await translate.translate(text, targetLanguage);
            translatedText = translation;
            console.log(`Text: ${text}`);
            console.log(`Translation: ${translatedText}`);
          } catch (translateError) {
            console.error('Translation error:', translateError);
            // Consider emitting an error back to the client if translation fails
          }

          // 3. Save the translated message in MongoDB
          const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            text: translatedText, // Save the translated text
          });
          await newMessage.save();

          // 4. Emit 'receive-message' to the receiver's room
          io.to(receiverId).emit('receive-message', {
            senderId,
            text: translatedText,
            timestamp: newMessage.timestamp,
          });
        } catch (error) {
          console.error('Error processing message:', error);
          // Consider emitting an error back to the client
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });
  }
  res.end();
};

export default socketHandler;

export const config = {
  api: {
    bodyParser: false,
  },
};