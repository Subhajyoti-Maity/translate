'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import Connections from './components/Connections';
import Profile from './components/Profile';
import Favorites from './components/Favorites';
import ModernChatInterface from './components/ModernChatInterface';
import { User, Message } from '../types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    } else {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Initialize socket connection with explicit server URL
      const newSocket = io('http://localhost:3006', {
        path: '/api/socket',
        transports: ['websocket', 'polling']
      });
      
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to Socket.io server');
        setIsConnected(true);
        newSocket.emit('join-user', user.id);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.io server');
        setIsConnected(false);
      });

      newSocket.on('receive-message', (message: Message) => {
        console.log('Received message:', message);
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => {
            // Ensure timestamps are Date objects
            const msgTimestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
            const messageTimestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
            
            return msg.id === message.id || 
              (msg.tempId && msg.tempId === message.tempId) ||
              (msg.text === message.text && msg.sender === message.sender && 
               Math.abs(msgTimestamp.getTime() - messageTimestamp.getTime()) < 1000);
          });
          
          if (messageExists) {
            console.log('Message already exists, not adding duplicate');
            return prev;
          }
          
          // Ensure timestamp is a Date object
          const messageWithDate = {
            ...message,
            timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
          };
          return [...prev, messageWithDate];
        });
      });

      newSocket.on('message-sent', (data) => {
        console.log('Message sent confirmation:', data);
        // Update message with server timestamp, ensuring timestamp is a Date object
        setMessages(prev => 
          prev.map(msg => 
            msg.tempId === data.tempId 
              ? { 
                  ...msg, 
                  id: data.id, 
                  timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp), 
                  tempId: undefined 
                }
              : msg
          )
        );
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      return () => {
        console.log('Cleaning up socket connection');
        newSocket.close();
      };
    }
  }, [user]);

  // Clean up duplicate messages
  useEffect(() => {
    if (messages.length > 0) {
      setMessages(prev => {
        const uniqueMessages = prev.filter((msg, index, self) => {
          // Find the first occurrence of a message with the same id
          const firstIndex = self.findIndex(m => m.id === msg.id);
          
          // If this is not the first occurrence, it's a duplicate
          if (index !== firstIndex) {
            return false;
          }
          
          // Also check for messages with same content, sender, and very close timestamps
          const duplicateContent = self.findIndex(m => {
            // Ensure timestamps are Date objects
            const mTimestamp = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp);
            const msgTimestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
            
            return m.id !== msg.id && 
              m.text === msg.text && 
              m.sender === msg.sender && 
              Math.abs(mTimestamp.getTime() - msgTimestamp.getTime()) < 1000;
          });
          
          return duplicateContent === -1;
        });
        
        if (uniqueMessages.length !== prev.length) {
          console.log(`Cleaned up ${prev.length - uniqueMessages.length} duplicate messages`);
        }
        
        return uniqueMessages;
      });
    }
  }, [messages.length]);

  const handleUserSelect = async (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setActiveTab('chat'); // Switch to chat tab when user is selected
    
    // For demo purposes, create some sample messages
    const sampleMessages: Message[] = [
      {
        id: '1',
        sender: selectedUser.id,
        receiver: user?.id || '',
        text: "Hello! How are you doing?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: true
      },
      {
        id: '2',
        sender: user?.id || '',
        receiver: selectedUser.id,
        text: "I'm doing great, thanks! How about you?",
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        isRead: true
      },
      {
        id: '3',
        sender: selectedUser.id,
        receiver: user?.id || '',
        text: "Do you know about JavaScript and TypeScript? I need some help on my project. Can you assist me?",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        isRead: true
      }
    ];
    
    setMessages(sampleMessages);
  };

  const sendMessage = (text: string) => {
    if (!socket || !user || !selectedUser) return;

    // Generate a truly unique ID using multiple sources of randomness
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substr(2, 9);
    const random2 = Math.random().toString(36).substr(2, 9);
    const random3 = Math.random().toString(36).substr(2, 9);
    const uniqueId = `temp-${timestamp}-${random1}-${random2}-${random3}`;

    const tempMessage: Message = {
      id: uniqueId,
      tempId: uniqueId,
      sender: user.id,
      receiver: selectedUser.id,
      text: text,
      timestamp: new Date(),
      isRead: false
    };

    setMessages(prev => {
      // Clean up any duplicate messages before adding new one
      const uniqueMessages = prev.filter((msg, index, self) => {
        // Remove messages with duplicate IDs
        const firstIndex = self.findIndex(m => m.id === msg.id);
        if (index !== firstIndex) return false;
        
        // Remove messages with duplicate content and very close timestamps
        const duplicateContent = self.findIndex(m => {
          // Ensure timestamps are Date objects
          const mTimestamp = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp);
          const msgTimestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
          
          return m.id !== msg.id && 
            m.text === msg.text && 
            m.sender === msg.sender && 
            Math.abs(mTimestamp.getTime() - msgTimestamp.getTime()) < 1000;
        });
        
        return duplicateContent === -1;
      });
      return [...uniqueMessages, tempMessage];
    });

    console.log('Sending message via socket:', {
      senderId: user.id,
      receiverId: selectedUser.id,
      text
    });

    socket.emit('send-message', {
      senderId: user.id,
      receiverId: selectedUser.id,
      text
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const renderMiddlePanel = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile user={user!} />;
      case 'favorites':
        return (
          <Favorites 
            currentUserId={user!.id}
            onUserSelect={handleUserSelect}
            selectedUserId={selectedUser?.id}
          />
        );
      case 'chat':
      default:
        return (
          <Connections 
            onUserSelect={handleUserSelect} 
            selectedUserId={selectedUser?.id}
            currentUserId={user!.id}
          />
        );
    }
  };

  const renderRightPanel = () => {
    if (activeTab !== 'chat') {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-4">
              {activeTab === 'profile' ? '👤' : '❤️'}
            </div>
            <h2 className="text-xl font-semibold mb-2 font-sans">
              {activeTab === 'profile' ? 'Profile View' : 'Favorites View'}
            </h2>
            <p className="text-sm text-gray-400 font-sans">
              {activeTab === 'profile' 
                ? 'View and manage your profile information' 
                : 'Manage your favorite connections'
              }
            </p>
          </div>
        </div>
      );
    }

    if (selectedUser) {
      return (
        <ModernChatInterface
          user={user!}
          selectedUser={selectedUser}
          messages={messages}
          onSendMessage={sendMessage}
        />
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold mb-2 font-sans">Welcome to Chat App</h2>
          <p className="text-sm text-gray-400 font-sans">Select a user from the connections to start chatting</p>
          <div className="mt-4 text-sm text-gray-400">
            <p>Socket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Middle Panel - Dynamic based on active tab */}
      {renderMiddlePanel()}

      {/* Right Panel - Chat Interface or Tab-specific content */}
      {renderRightPanel()}

      {/* Logout Button - Floating */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg font-sans"
      >
        Logout
      </button>
    </div>
  );
}
