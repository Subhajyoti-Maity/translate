# 💬 Real-Time Chat Application

A **Next.js 15** real-time chat application with **Socket.io** for instant messaging, **MongoDB** for data persistence, and **JWT authentication**. Built with modern React 19 patterns and TypeScript for type safety.

---

## 🚀 Features

### ✅ **Core Functionality**
- **User Authentication** – Secure signup & login with JWT tokens
- **Real-time Chat** – Instant messaging between users via Socket.io
- **User Management** – Profile editing, user search, and connections
- **Message System** – Send, receive, and delete messages (for yourself or everyone)
- **Responsive Design** – Modern UI built with Tailwind CSS v4
- **Connection Status** – Real-time online/offline indicators
- **User Search** – Find and connect with other users

### ✅ **Advanced Features**
- **Message Persistence** – All conversations saved to MongoDB
- **User Connections** – Browse and manage chat connections
- **Profile Management** – Edit username, email, and personal information
- **Real-time Status** – Live connection status indicators
- **Message History** – Persistent chat history across sessions
- **Error Handling** – Comprehensive error handling and user feedback
- **Message Deletion** – Delete messages for yourself or for everyone
- **Connection Management** – Add users to favorites and manage connections

### 🔄 **Coming Soon**
- **Translation Feature** – Automatic message translation between languages
- **File Sharing** – Send images, documents, and media files
- **Group Chats** – Multi-user conversations
- **Push Notifications** – Real-time notifications for new messages
- **Message Reactions** – React to messages with emojis
- **Typing Indicators** – Show when someone is typing

---

## 📦 Tech Stack

- **Frontend:** Next.js 15.4.6 (React 19.1.0) with TypeScript
- **Backend:** Next.js API Routes + Custom Socket.io Server
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** Socket.io v4.8.1 with dedicated server
- **Authentication:** JWT + bcryptjs for password hashing
- **Styling:** Tailwind CSS v4.1.11 with responsive design
- **State Management:** React Hooks (useState, useEffect, useRef, useCallback, useMemo)
- **Development:** ESLint, PostCSS, Turbopack, TypeScript 5
- **Utilities:** date-fns for date formatting, dotenv for environment management

---

## ⚙️ Installation & Setup

### 1️⃣ **Clone the repository**
```bash
git clone https://github.com/your-username/Real-Time-Chat-Application-master.git
cd Real-Time-Chat-Application-master
```

### 2️⃣ **Install dependencies**
```bash
npm install
```

### 3️⃣ **Setup environment variables**
Run the setup script to create `.env.local`:
```bash
npm run setup
```

Or manually create `.env.local`:
```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/chat_app?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
SOCKET_PORT=3006
```

### 🗄️ **MongoDB Setup**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database named `chat_app`
3. Add your IP to Network Access
4. Copy the connection string to `.env.local`

---

## 🖥️ Running the Application

**Important:** You need to run both servers for the full chat experience!

### **Terminal 1: Next.js Frontend**
```bash
npm run dev
```
🌐 Frontend: http://localhost:3000

### **Terminal 2: Socket.io Server**
```bash
npm run dev:socket
```
🔌 Socket Server: http://localhost:3006

---

## 📱 Application Structure

### **Pages**
- `/` → Main chat interface with sidebar and messaging
- `/login` → User authentication
- `/signup` → New user registration

### **Main Components**
- **Sidebar** → Profile, Favorites, Connections management
- **Connections Panel** → User search and selection
- **Chat Interface** → Real-time messaging with selected user
- **Profile Section** → User profile editing and management
- **Message Component** → Individual message display with actions
- **Reaction System** → Message reactions and interactions

---

## 🔄 How It Works

### **Authentication Flow**
1. User signs up/logs in → JWT token generated and stored
2. Token validated on each API request via middleware
3. User data fetched and stored in local state
4. Automatic redirect to main chat interface

### **Real-time Messaging**
1. User connects to Socket.io server on login
2. Messages sent via `send-message` event
3. Server broadcasts to recipient via `receive-message`
4. Messages stored in MongoDB for persistence
5. Real-time updates for both sender and receiver
6. Connection status updates in real-time

### **Message Management**
- **Send Message** → Instant delivery via Socket.io
- **Delete for Me** → Remove message from your view only
- **Delete for Everyone** → Remove message for all participants
- **Message Reactions** → Add reactions to messages
- **Message History** → Load previous conversations

---

## 🏗️ Architecture

### **Dual Server Setup**
- **Port 3000**: Next.js frontend with API routes
- **Port 3006**: Dedicated Socket.io server for real-time communication
- **MongoDB**: Centralized data storage for users and messages

### **API Endpoints**
- `POST /api/auth/signup` → User registration
- `POST /api/auth/login` → User authentication
- `GET /api/users/search` → Find users to chat with
- `GET /api/users/profile` → Get user profile
- `PUT /api/users/profile` → Update user profile
- `GET /api/users/online` → Get online users
- `GET /api/users/favorites` → Get user favorites
- `GET /api/messages` → Get conversation history
- `POST /api/messages` → Send new message
- `GET /api/socket-status` → Check socket connection status

### **Socket Events**
- `join-user` → User joins personal chat room
- `send-message` → Send message to recipient
- `receive-message` → Receive incoming message
- `message-sent` → Confirm message delivery
- `delete-message` → Delete message (for me/everyone)
- `message-deleted-for-everyone` → Notify all participants of deletion
- `user-online` → Update user online status
- `user-offline` → Update user offline status

---

## 📁 Project Structure

```
Real-Time-Chat-Application-master/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   │   ├── login/         # Login API
│   │   │   └── signup/        # Signup API
│   │   ├── users/             # User management
│   │   │   ├── profile/       # Profile management
│   │   │   ├── search/        # User search
│   │   │   ├── online/        # Online status
│   │   │   ├── favorites/     # User favorites
│   │   │   └── status/        # User status
│   │   ├── messages/          # Message handling
│   │   │   ├── [id]/          # Message-specific operations
│   │   │   │   ├── everyone/  # Delete for everyone
│   │   │   │   └── me/        # Delete for me
│   │   │   └── route.ts       # Message CRUD operations
│   │   ├── socket-status/     # Connection status
│   │   └── health/            # Health check endpoint
│   ├── components/            # React components
│   │   ├── ChatInterface.tsx  # Main chat component
│   │   ├── ModernChatInterface.tsx # Enhanced chat interface
│   │   ├── Connections.tsx    # User connections panel
│   │   ├── ConnectionsPanel.tsx # Connections management
│   │   ├── Profile.tsx        # User profile management
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── UserSearch.tsx     # User search functionality
│   │   ├── Message.tsx        # Individual message component
│   │   ├── ReactionBar.tsx    # Message reactions
│   │   ├── ReactionButton.tsx # Reaction buttons
│   │   ├── Chat.tsx           # Chat container
│   ├── login/                 # Login page
│   ├── signup/                # Signup page
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main application page
├── lib/                       # Utility libraries
│   ├── mongodb.ts             # Database connection
│   ├── mongodb.js             # Database connection (JS)
│   ├── socket.ts              # Socket.io utilities
│   └── config.ts              # Configuration
├── models/                    # MongoDB models
│   ├── User.ts                # User schema
│   ├── User.js                # User schema (JS)
│   ├── Message.ts             # Message schema
│   └── Message.js             # Message schema (JS)
├── types/                     # TypeScript definitions
├── middleware.ts              # Next.js middleware
├── server.js                  # Socket.io server
├── setup-env.js               # Environment setup script
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── postcss.config.mjs         # PostCSS configuration
└── package.json               # Dependencies and scripts
```

---

## 🔧 Development

### **Available Scripts**
```bash
npm run setup        # Setup environment variables
npm run dev          # Start Next.js development server
npm run dev:socket   # Start Socket.io server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### **Key Development Features**
- **TypeScript** for type safety and better development experience
- **ESLint** for code quality and consistency
- **Hot reloading** for fast development iterations
- **Comprehensive error handling** with user-friendly messages
- **Debug logging** for troubleshooting
- **Turbopack** for faster development builds
- **Tailwind CSS v4** for modern styling

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Port Already in Use (EADDRINUSE)**
```bash
# Kill process using port 3006
npx kill-port 3006
# Or restart the socket server
npm run dev:socket
```

#### **Profile Update Fails**
- Check browser console for detailed error messages
- Verify JWT token is valid and not expired
- Ensure all required fields are provided
- Check server logs for validation errors

#### **Real-time Chat Not Working**
- Ensure both servers are running (Next.js + Socket.io)
- Check browser console for connection errors
- Verify Socket.io server is accessible on port 3006
- Check network tab for failed requests

#### **User Count Inconsistencies**
- Clear browser data and re-login
- Check server logs for user validation errors
- Verify database connection and user data integrity
- Restart both servers if issues persist

#### **MongoDB Connection Issues**
- Verify MongoDB Atlas connection string
- Check network access settings
- Ensure database name is correct
- Verify username and password in connection string

---

## 🚀 Deployment

### **Vercel (Frontend)**
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy frontend

### **Socket Server Deployment**
- **Railway** → Easy deployment with environment variables
- **DigitalOcean** → Custom server setup
- **Heroku** → Container-based deployment
- **AWS EC2** → Full control over server configuration
- **Render** → Simple deployment with environment variables

### **Environment Variables for Production**
```env
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
SOCKET_PORT=3006
NODE_ENV=production
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Add comprehensive error handling
- Include debug logging for troubleshooting
- Test both frontend and socket server functionality
- Ensure responsive design works on all devices
- Add proper TypeScript types for new features
- Follow existing code style and patterns

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Real-Time Chat Application Team**

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Socket.io](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for database hosting
- [Tailwind CSS](https://tailwindcss.com/) for beautiful styling
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [React 19](https://react.dev/) for the latest React features

---

## 📞 Support

If you encounter issues or need help:
- 🐛 **GitHub Issues**: Report bugs and request features
- 📧 **Email**: support@chatapp.com
- 💬 **Discord**: Join our community server

---

## 🔄 Recent Updates

### **Latest Fixes & Improvements**
- ✅ Fixed "Maximum update depth exceeded" React error
- ✅ Resolved real-time chat functionality issues
- ✅ Fixed "delete for everyone" message deletion
- ✅ Corrected profile data display inconsistencies
- ✅ Fixed user count inconsistencies in connections tab
- ✅ Enhanced error handling and user feedback
- ✅ Improved profile update validation
- ✅ Added comprehensive debug logging
- ✅ Fixed language selection in profile editing
- ✅ Enhanced Socket.io connection management
- ✅ Improved message persistence and retrieval
- ✅ Added real-time user status updates
- ✅ Enhanced connection management system

### **Current Features**
- 🔐 JWT-based authentication system
- 💬 Real-time messaging with Socket.io
- 👥 User search and connection management
- 📱 Responsive design with Tailwind CSS
- 🗄️ MongoDB data persistence
- 🔄 Real-time connection status
- ✨ Modern React 19 patterns
- 🎯 TypeScript for type safety

---

**⭐ Star this repository if you found it helpful!**

**🚀 Ready to build amazing real-time chat experiences!**

**💡 Tip:** Make sure both servers are running for the complete chat experience!
