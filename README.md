# 💬 Real-Time Chat App

A **Next.js** real-time chat application with:
- **MongoDB Atlas** for user & message storage
- **Socket.io** for instant messaging
- **JWT authentication** (Signup/Login)
- **Tailwind CSS** for modern UI
- **Real-time messaging** with custom Socket.io server

---

## 🚀 Features
✅ **User Authentication** – Signup & Login with JWT (username or email)  
✅ **Real-time Chat** – Messages sent instantly via Socket.io  
✅ **User Search** – Find and chat with other users  
✅ **Responsive UI** – Built with Tailwind CSS  
✅ **Message History** – Persistent chat history stored in MongoDB  
✅ **User Connections** – Manage your chat connections and favorites  
🔄 **Translation Feature** – Coming soon! Messages will be automatically translated between languages  

---

## 📦 Tech Stack
- **Frontend:** Next.js 15.4.6 (React 19)
- **Backend:** Next.js API Routes + Custom Socket.io Server
- **Database:** MongoDB Atlas (Mongoose)
- **Real-time:** Socket.io with custom server on separate port
- **Auth:** JWT + bcryptjs
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Setup environment variables
Create a `.env.local` file in the root:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
SOCKET_PORT=3006
```

### 🗄️ MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database named `chat_translate`
4. Add a Network Access entry for your IP
5. Copy your connection string and paste into `.env.local`

### 🖥️ Run the App

**Important:** You need to run both servers for the full chat experience!

#### Terminal 1: Next.js Frontend
```bash
npm run dev
```
Frontend runs on: http://localhost:3000

#### Terminal 2: Socket.io Server
```bash
npm run dev:socket
```
Socket server runs on: http://localhost:3006

---

## 📌 Pages & Components
- `/signup` → Register new account
- `/login` → Login and save JWT token
- `/` → Main chat interface with:
  - **Sidebar**: Profile, Favorites, Connections
  - **Connections Panel**: Search and select users to chat with
  - **Chat Interface**: Real-time messaging with selected user

---

## 🔄 How It Works

1. **Signup/Login** – User data stored in MongoDB Atlas, passwords hashed with bcrypt
2. **Socket Connection** – When logged in, user connects to Socket.io server on port 3006
3. **User Selection** – Browse connections or search for users to chat with
4. **Real-time Messaging** – Messages sent instantly via Socket.io events
5. **Message Persistence** – All messages saved to MongoDB for chat history
6. **Live Updates** – Messages appear in real-time for both sender and receiver

---

## 🏗️ Architecture

### Dual Server Setup
- **Port 3000**: Next.js frontend with API routes
- **Port 3006**: Custom Socket.io server for real-time messaging
- **MongoDB**: Centralized database for users and messages

### Socket Events
- `join-user`: User joins their personal chat room
- `send-message`: Send message to another user
- `receive-message`: Receive message from another user
- `message-sent`: Confirmation of message delivery

---

## 📷 Screenshots

### Login Page
![Login Page](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Login+Page)

### Chat Interface
![Chat Interface](https://via.placeholder.com/800x400/10B981/FFFFFF?text=Chat+Interface)

### User Connections
![User Connections](https://via.placeholder.com/800x400/F59E0B/FFFFFF?text=User+Connections)

---

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy both frontend and socket server

### Socket Server Deployment
For production, you'll need to deploy the Socket.io server separately:
- **Railway** - Easy deployment with environment variables
- **DigitalOcean** - Custom server setup
- **Heroku** - Container-based deployment

---

## 🔧 Development

### Available Scripts
- `npm run dev` - Start Next.js development server
- `npm run dev:socket` - Start Socket.io server
- `npm run setup` - Setup environment variables
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure
```
my-app/
├── app/
│   ├── api/           # API routes (auth, users, messages)
│   ├── components/    # React components
│   │   ├── ChatInterface.tsx
│   │   ├── ModernChatInterface.tsx
│   │   ├── Connections.tsx
│   │   ├── Profile.tsx
│   │   └── Sidebar.tsx
│   ├── login/         # Login page
│   ├── signup/        # Signup page
│   └── page.tsx       # Main chat page
├── lib/               # Database and socket utilities
├── models/            # MongoDB models (User, Message)
├── types/             # TypeScript interfaces
├── server.js          # Custom Socket.io server
└── public/            # Static assets
```

---

## 🔮 Upcoming Features

- **🌍 Auto Translation** - Messages will be automatically translated between users' preferred languages
- **📱 Mobile App** - React Native version for iOS and Android
- **🔔 Push Notifications** - Real-time notifications for new messages
- **📁 File Sharing** - Send images, documents, and media files
- **👥 Group Chats** - Multi-user conversations
- **🎨 Themes** - Dark/light mode and custom color schemes

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Chat App Team** - [GitHub Profile](https://github.com/your-username)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [Socket.io](https://socket.io/) for real-time communication
- [MongoDB Atlas](https://www.mongodb.com/atlas) for database hosting
- [Tailwind CSS](https://tailwindcss.com/) for beautiful styling
- [TypeScript](https://www.typescriptlang.org/) for type safety

---

## 📞 Support

If you have any questions or need help:
- 📧 Email: support@chatapp.com
- 💬 Discord: [Join our server](https://discord.gg/chatapp)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/chat-app/issues)

---

**⭐ Star this repository if you found it helpful!**
