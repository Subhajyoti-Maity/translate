'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import Connections from './components/Connections';
import Profile from './components/Profile';
import Favorites from './components/Favorites';
import ModernChatInterface from './components/ModernChatInterface';
import { User, Message, ProfileUpdateData } from '../types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // Socket ref to prevent recreation
  const socketRef = useRef<Socket | null>(null);
  const isInitializedRef = useRef(false);

  // Simple effect to check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('🔍 Loading user data:', { token: !!token, userData });
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('✅ Parsed user data:', parsedUser);
        
        // Validate user data structure
        if (!parsedUser.id || !parsedUser.username || !parsedUser.email) {
          console.error('❌ Invalid user data structure:', parsedUser);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else {
      console.log('❌ No token or user data found, redirecting to login');
      window.location.href = '/login';
    }
    setIsLoading(false);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id || isInitializedRef.current) return;
    
    console.log('🔌 Initializing socket connection for user:', user.id);
    isInitializedRef.current = true;
    
    // Create socket connection
    const socket = io('http://localhost:3006', {
      path: '/api/socket',
      transports: ['polling'],
      query: { userId: user.id }
    });
    
    socketRef.current = socket;
    
    // Socket event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
      
      // Join user room
      socket.emit('join-user', user.id);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });
    
    socket.on('receive-message', (message: Message) => {
      console.log('📨 Received message:', message);
      
      // Only add message if it's for the current user
      if (message.receiver === user.id || message.sender === user.id) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === message.id);
          if (exists) return prev;
          
          return [...prev, {
            ...message,
            timestamp: new Date(message.timestamp)
          }];
        });
      }
    });
    
    socket.on('message-sent', (data: { tempId: string; id: string; timestamp: Date }) => {
      console.log('✅ Message confirmed:', data);
      
      // Update temporary message with real ID
      setMessages(prev => prev.map(msg => 
        msg.id === data.tempId 
          ? { ...msg, id: data.id, timestamp: new Date(data.timestamp) }
          : msg
      ));
    });
    
    socket.on('message-deleted-for-everyone', (data: { messageId: string; senderId: string; receiverId: string }) => {
      console.log('🗑️ Message deleted for everyone event received:', data);
      
      // Check if this user is involved in the message (sender or receiver)
      if (data.senderId === user?.id || data.receiverId === user?.id) {
        console.log('✅ User is involved in this message, removing it');
        
        // Remove the message from local state
        setMessages(prev => {
          const filtered = prev.filter(msg => {
            const msgId = msg.id?.toString();
            const deleteId = data.messageId?.toString();
            return msgId !== deleteId;
          });
          
          console.log(`✅ Removed message ${data.messageId} from local state. Messages before: ${prev.length}, after: ${filtered.length}`);
          return filtered;
        });
        
        // Show success notification
        console.log('✅ Message deleted for everyone successfully!');
      } else {
        console.log('🚫 User not involved in this message, ignoring delete event');
      }
    });
    
    socket.on('message-deleted-for-me', (data: { messageId: string }) => {
      console.log('👁️ Message deleted for me:', data.messageId);
      
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, deletedFor: [...(msg.deletedFor || []), user.id] }
          : msg
      ));
    });
    
    // Handle delete errors
    socket.on('delete-error', (data: { messageId: string; error: string }) => {
      console.error('❌ Delete error:', data.error);
      alert(`Delete failed: ${data.error}`);
    });
    
    // Handle loading existing messages
    socket.on('messages-loaded', (data: { messages: Message[] }) => {
      console.log('📚 Messages loaded:', data.messages.length);
      
      // Replace current messages with loaded ones
      setMessages(data.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    });
    
    // Cleanup function
    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [user?.id]);

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setActiveTab('chat');
    
    // Clear current messages
    setMessages([]);
    
    // Load existing messages for this conversation
    if (socketRef.current && user) {
      socketRef.current.emit('get-messages', {
        senderId: user.id,
        receiverId: selectedUser.id
      });
    }
  };

  const handleProfileUpdate = (data: ProfileUpdateData) => {
    console.log('Profile update:', data);
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const handleDeleteMessage = async (messageId: string, deleteType: 'for-me' | 'for-everyone') => {
    try {
      console.log('Deleting message:', { messageId, deleteType });
      
      // Check if this is a temporary message (starts with 'temp-')
      if (messageId.startsWith('temp-')) {
        // For temporary messages, just remove from local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        console.log('Temporary message removed locally');
        return;
      }
      
      // For real messages, handle based on delete type
      if (deleteType === 'for-me') {
        // Remove message from local state immediately for "delete for me"
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        console.log('Message deleted for me');
        
        // Emit socket event for real-time updates
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('delete-message', {
            messageId,
            deleteType,
            senderId: user?.id,
            receiverId: selectedUser?.id
          });
        }
      } else {
        // For "delete for everyone", we need to wait for server confirmation
        console.log('Waiting for server confirmation for delete for everyone...');
        
        // Emit socket event for real-time updates
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('delete-message', {
            messageId,
            deleteType,
            senderId: user?.id,
            receiverId: selectedUser?.id
          });
          
          // Set a timeout to handle cases where the socket event might not be received
          setTimeout(() => {
            // Check if the message still exists in local state
            const messageStillExists = messages.some(msg => msg.id === messageId);
            if (messageStillExists) {
              console.log('Message still exists after timeout, removing manually...');
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
          }, 5000); // 5 second timeout for better reliability
        } else {
          console.error('Socket not connected, cannot delete message for everyone');
          alert('Connection lost. Please refresh the page and try again.');
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('An error occurred while deleting the message. Please try again.');
    }
  };

  const sendMessage = (text: string) => {
    if (!user || !selectedUser || !socketRef.current) return;

    // Generate temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMessage: Message = {
      id: tempId,
      sender: user.id,
      receiver: selectedUser.id,
      text: text,
      timestamp: new Date(),
      isRead: false
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, tempMessage]);
    
    // Send message via socket
    socketRef.current.emit('send-message', {
      senderId: user.id,
      receiverId: selectedUser.id,
      text,
      tempId
    });
    
    console.log('Message sent:', tempMessage);
  };

  const handleLogout = () => {
    console.log('🚪 Logging out user:', user);
    
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Reset all state
    setUser(null);
    setSelectedUser(null);
    setMessages([]);
    setActiveTab('chat');
    setIsConnected(false);
    isInitializedRef.current = false;
    
    console.log('🧹 All data cleared, redirecting to login');
    
    // Redirect to login page
    window.location.href = '/login';
  };

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found for refresh');
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('🔄 Refreshed user data:', userData);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
      } else {
        console.error('Failed to refresh user data');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const renderMiddlePanel = () => {
    switch (activeTab) {
      case 'profile':
        return <Profile user={user!} onProfileUpdate={handleProfileUpdate} onRefresh={refreshUserData} />;
      case 'favorites':
        return (
          <Favorites 
            currentUserId={user?.id || ''}
            onUserSelect={handleUserSelect}
            selectedUserId={selectedUser?.id}
          />
        );
      case 'connections':
        return (
          <Connections 
            onUserSelect={handleUserSelect} 
            selectedUserId={selectedUser?.id}
            currentUserId={user?.id || ''}
          />
        );
      case 'chat':
      default:
        return (
          <Connections 
            onUserSelect={handleUserSelect} 
            selectedUserId={selectedUser?.id}
            currentUserId={user?.id || ''}
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
          onDeleteMessage={handleDeleteMessage}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl mb-4">
              <span className="text-4xl text-white">💬</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Welcome to Chat App
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Connect with friends and family in real-time
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Ready to chat!' : 'Connecting to server...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-blue-600 mb-1">0</div>
              <div className="text-sm text-gray-600">Available Users</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-green-600 mb-1">{messages.length}</div>
              <div className="text-sm text-gray-600">Total Messages</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Getting Started
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 font-bold">1.</span>
                <span className="text-sm text-gray-700">Select a user from the left panel to start chatting</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 font-bold">2.</span>
                <span className="text-sm text-gray-700">Use "Delete for Everyone" to remove messages from both sides</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 font-bold">3.</span>
                <span className="text-sm text-gray-700">Use "Delete for Me" to hide messages only from your view</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 font-bold">4.</span>
                <span className="text-sm text-gray-700">Reply to specific messages using the 💬 button</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Chat App...</h2>
          <p className="text-gray-500">Please wait while we connect you</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Required</h2>
          <p className="text-gray-500">Please log in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Status Bar */}
      <div className={`px-4 py-2 text-sm font-medium text-center ${
        isConnected 
          ? 'bg-green-100 text-green-800 border-b border-green-200' 
          : 'bg-red-100 text-red-800 border-b border-red-200'
      }`}>
        {isConnected ? (
          <span>🟢 Connected to chat server - Real-time messaging active</span>
        ) : (
          <span>🔴 Disconnected from chat server - Messages may not be delivered</span>
        )}
      </div>
      
      {/* Left Sidebar - Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Middle Panel - Dynamic based on active tab */}
      {renderMiddlePanel()}

      {/* Right Panel - Chat Interface or Tab-specific content */}
      {renderRightPanel()}

      {/* Action Buttons - Floating */}
      <div className="fixed top-4 right-4 flex space-x-2">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg font-sans"
        >
          Logout
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to clear all data and start fresh?')) {
              handleLogout();
            }
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-200 shadow-lg font-sans"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}