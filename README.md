# 💬 Real-Time Chat Application

A **Next.js** real-time chat application with **Socket.io** for instant messaging, **MongoDB** for data persistence, and **JWT authentication**. Built with modern React patterns and TypeScript for type safety.

---

## 🚀 Features

### ✅ **Core Functionality**
- **User Authentication** – Secure signup & login with JWT tokens
- **Real-time Chat** – Instant messaging between users via Socket.io
- **User Management** – Profile editing, user search, and connections
- **Message System** – Send, receive, and delete messages (for yourself or everyone)
- **Responsive Design** – Modern UI built with Tailwind CSS

### ✅ **Advanced Features**
- **Message Persistence** – All conversations saved to MongoDB
- **User Connections** – Browse and manage chat connections
- **Profile Management** – Edit username, email, and preferred language
- **Real-time Status** – Live connection status indicators
- **Message History** – Persistent chat history across sessions
- **Error Handling** – Comprehensive error handling and user feedback

### 🔄 **Coming Soon**
- **Translation Feature** – Automatic message translation between languages
- **File Sharing** – Send images, documents, and media files
- **Group Chats** – Multi-user conversations
- **Push Notifications** – Real-time notifications for new messages

---

## 📦 Tech Stack

- **Frontend:** Next.js 15.4.6 (React 19) with TypeScript
- **Backend:** Next.js API Routes + Custom Socket.io Server
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** Socket.io with dedicated server
- **Authentication:** JWT + bcryptjs for password hashing
- **Styling:** Tailwind CSS v4 with responsive design
- **State Management:** React Hooks (useState, useEffect, useRef, useCallback, useMemo)
- **Development:** ESLint, PostCSS, Turbopack

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
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/chat_translate?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
SOCKET_PORT=3006
```

### 🗄️ **MongoDB Setup**
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database named `chat_translate`
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

---

## 🔄 How It Works

### **Authentication Flow**
1. User signs up/logs in → JWT token generated and stored
2. Token validated on each API request
3. User data fetched and stored in local state

### **Real-time Messaging**
1. User connects to Socket.io server on login
2. Messages sent via `send-message` event
3. Server broadcasts to recipient via `receive-message`
4. Messages stored in MongoDB for persistence
5. Real-time updates for both sender and receiver

### **Message Management**
- **Send Message** → Instant delivery via Socket.io
- **Delete for Me** → Remove message from your view only
- **Delete for Everyone** → Remove message for all participants

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
- `GET /api/messages` → Get conversation history
- `POST /api/messages` → Send new message

### **Socket Events**
- `join-user` → User joins personal chat room
- `send-message` → Send message to recipient
- `receive-message` → Receive incoming message
- `message-sent` → Confirm message delivery
- `delete-message` → Delete message (for me/everyone)
- `message-deleted-for-everyone` → Notify all participants of deletion

---

## 📁 Project Structure

```
Real-Time-Chat-Application-master/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── users/             # User management
│   │   ├── messages/          # Message handling
│   │   └── socket-status/     # Connection status
│   ├── components/            # React components
│   │   ├── ChatInterface.tsx  # Main chat component
│   │   ├── Connections.tsx    # User connections panel
│   │   ├── Profile.tsx        # User profile management
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   └── UserSearch.tsx     # User search functionality
│   ├── login/                 # Login page
│   ├── signup/                # Signup page
│   └── page.tsx               # Main application page
├── lib/                       # Utility libraries
│   ├── mongodb.ts             # Database connection
│   ├── socket.ts              # Socket.io utilities
│   └── config.ts              # Configuration
├── models/                    # MongoDB models
│   ├── User.ts                # User schema
│   └── Message.ts             # Message schema
├── types/                     # TypeScript definitions
├── server.js                  # Socket.io server
├── setup-env.js               # Environment setup script
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

#### **Real-time Chat Not Working**
- Ensure both servers are running (Next.js + Socket.io)
- Check browser console for connection errors
- Verify Socket.io server is accessible on port 3006

#### **User Count Inconsistencies**
- Clear browser data and re-login
- Check server logs for user validation errors
- Verify database connection and user data integrity

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

---

**⭐ Star this repository if you found it helpful!**

**🚀 Ready to build amazing real-time chat experiences!**
