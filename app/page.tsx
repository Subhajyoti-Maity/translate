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
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
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

  // Fetch initial users
  useEffect(() => {
    if (user?.id) {
      const fetchInitialUsers = async () => {
        try {
          console.log('🔍 Fetching initial users for user:', user.id);
          const response = await fetch(`/api/users/search?q=&userId=${user.id}`);
          const data = await response.json();
          if (data.users) {
            console.log('🔍 Initial users fetched:', data.users);
            console.log('🔍 Users status from API:', data.users.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
            console.log('🔍 Setting allUsers to:', data.users);
            setAllUsers(data.users);
          }
        } catch (error) {
          console.error('Failed to fetch initial users:', error);
        }
      };
      fetchInitialUsers();
    }
  }, [user?.id]);

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
      console.log('🔌 Emitted join-user for:', user.id);
      
      // Get online status for all users
      socket.emit('get-online-status');
      console.log('🔌 Emitted get-online-status');
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

    // Handle user status changes (online/offline)
    socket.on('user-status-changed', (data: { userId: string; status: string; lastActivity: string }) => {
      console.log('👤 User status changed:', data);
      
      // Update selected user status if it's the one that changed
      if (selectedUser && selectedUser.id === data.userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          status: data.status as 'online' | 'offline' | 'away',
          lastActivity: data.lastActivity
        } : null);
      }
    });

    // Handle reaction events
    socket.on('reaction-added', (data: { messageId: string; reaction: string; userId: string; reactions: Record<string, string> }) => {
      console.log('🎭 Reaction added:', data);
      // Update messages with new reactions
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    socket.on('reaction-removed', (data: { messageId: string; userId: string; reactions: Record<string, string> }) => {
      console.log('🗑️ Reaction removed:', data);
      // Update messages with updated reactions
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    // Handle online status updates for all users
    socket.on('online-status-updated', (data: { userStatuses: User[] }) => {
      console.log('👥 Online status updated for all users:', data.userStatuses.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
      console.log('👥 Previous allUsers state:', allUsers.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));

      // Filter out the current user and ensure no duplicates
      const otherUsers = data.userStatuses.filter(u => u.id !== user?.id);
      console.log('👥 Filtered other users:', otherUsers.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));

      // Remove duplicates by keeping only unique user IDs
      const uniqueUsers = otherUsers.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      setAllUsers(uniqueUsers);
      console.log('👥 Updated allUsers state to:', uniqueUsers.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));

      if (selectedUser) {
        const updatedSelectedUser = uniqueUsers.find(u => u.id === selectedUser.id);
        if (updatedSelectedUser) {
          setSelectedUser(prev => prev ? {
            ...prev,
            status: updatedSelectedUser.status,
            isOnline: updatedSelectedUser.isOnline,
            lastActivity: updatedSelectedUser.lastActivity
          } : null);
        }
      }
      const onlineCount = uniqueUsers.filter(u => u.status === 'online').length;
      setOnlineUserCount(onlineCount);
      console.log('👥 Updated online user count to:', onlineCount);
    });

    // Handle user activity updates
    socket.on('user-activity-updated', (data: { userId: string; lastActivity: Date }) => {
      console.log('👤 User activity updated:', data);
      
      // Update selected user activity if it's the one that changed
      if (selectedUser && selectedUser.id === data.userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          lastActivity: data.lastActivity.toISOString()
        } : null);
      }
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

  // Send periodic activity updates to keep user status active
  useEffect(() => {
    if (socketRef.current && user?.id) {
      const interval = setInterval(() => {
        socketRef.current?.emit('user-activity', user.id);
      }, 30000); // Send activity update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Handle page unload to mark user as offline
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socketRef.current && user?.id) {
        // Send a final activity update before leaving
        socketRef.current.emit('user-activity', user.id);
        // The disconnect event will handle marking the user as offline
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

  const handleReactionToggle = (messageId: string, reaction: string, userId: string) => {
    console.log('🎭 page.tsx: handleReactionToggle called with:', { messageId, reaction, userId });
    console.log('🎭 page.tsx: reaction type:', typeof reaction, 'value:', reaction);
    console.log('🎭 page.tsx: messageId type:', typeof messageId, 'value:', messageId);
    
    // Validate inputs
    if (!messageId || !reaction || !userId) {
      console.error('❌ Invalid reaction data:', { messageId, reaction, userId });
      return;
    }
    
    // Validate reaction is a valid emoji
    const validReactions = ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉'];
    if (!validReactions.includes(reaction)) {
      console.error('❌ Invalid reaction emoji:', reaction);
      console.error('❌ Expected emoji, got:', reaction);
      console.error('❌ This suggests a parameter order issue in the call chain');
      return;
    }
    
    if (socketRef.current) {
      const currentMessage = messages.find(msg => msg.id === messageId);
      const currentReaction = currentMessage?.reactions?.[userId];
      
      if (currentReaction === reaction) {
        // Remove reaction
        socketRef.current.emit('remove-reaction', { messageId, userId });
        console.log('🗑️ Removing reaction:', { messageId, reaction, userId });
      } else {
        // Add/change reaction
        socketRef.current.emit('add-reaction', { messageId, reaction, userId });
        console.log('🎭 Adding reaction:', { messageId, reaction, userId });
      }
    } else {
      console.error('❌ Socket not connected');
    }
  };

  const handleForwardMessage = (messageId: string, text: string, recipientId: string) => {
    console.log('📤 page.tsx: handleForwardMessage called with:', { messageId, text, recipientId });
    
    if (!user || !socketRef.current) {
      console.error('❌ User not logged in or socket not connected');
      return;
    }
    
    // Send forwarded message via socket
    socketRef.current.emit('send-message', {
      senderId: user.id,
      receiverId: recipientId,
      text: `↪️ Forwarded: ${text}`,
      tempId: `forward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    console.log('📤 Message forwarded successfully:', { messageId, text, recipientId });
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
            socket={socketRef.current}
            users={allUsers}
          />
        );
      case 'chat':
      default:
        return (
          <Connections 
            onUserSelect={handleUserSelect} 
            selectedUserId={selectedUser?.id}
            currentUserId={user?.id || ''}
            socket={socketRef.current}
            users={allUsers}
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
          onReactionToggle={handleReactionToggle}
          onForwardMessage={handleForwardMessage}
          availableUsers={allUsers}
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
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 font-bold">5.</span>
                <span className="text-sm text-gray-700">Forward messages to other users using the 📤 button</span>
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
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isOnline={user.isOnline} userCount={onlineUserCount} />

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