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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectionsToDelete, setConnectionsToDelete] = useState<{ id: string; username: string; email: string; status: string }[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Socket ref to prevent recreation
  const socketRef = useRef<Socket | null>(null);
  const isInitializedRef = useRef(false);

  // Simple effect to check authentication
  useEffect(() => {
    // Don't run authentication check if we're logging out
    if (isLoggingOut) {
      console.log('🚪 Skipping authentication check - logging out');
      return;
    }
    
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
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    setIsLoading(false);
  }, [isLoggingOut]);

  // Fetch initial users
  useEffect(() => {
    if (user?.id) {
      const fetchInitialUsers = async () => {
        try {
          console.log('🔍 Fetching initial users for user:', user.id);
          const response = await fetch(`/api/users/search?q=&userId=${user.id}`);
          const data = await response.json();
          
          if (response.ok && data.users) {
            console.log('🔍 Initial users fetched:', data.users);
            console.log('🔍 Users status from API:', data.users.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
            console.log('🔍 Setting allUsers to:', data.users);
            setAllUsers(data.users);
          } else if (response.status === 401 && data.code === 'USER_NOT_FOUND') {
            console.error('❌ User not found in database, redirecting to login');
            // Clear invalid data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
          } else {
            console.error('❌ Failed to fetch users:', data.error || 'Unknown error');
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
    socket.on('delete-error', (data: { messageId: string; error: string; errorType?: string }) => {
      console.log('❌ Delete error:', data.error);
      
      // Handle different error types gracefully
      switch (data.errorType) {
        case 'authorization':
          // Authorization errors are expected and shouldn't be shown as errors
          console.log('ℹ️ Delete operation not allowed:', data.error);
          return;
        case 'already_deleted':
          // Message already deleted - this is informational
          console.log('ℹ️ Message already deleted:', data.error);
          return;
        case 'temporary_message':
          // Temporary message - user should wait
          console.log('ℹ️ Temporary message - wait for confirmation:', data.error);
          return;
        case 'message_not_found':
          // Message not found - might be a sync issue
          console.warn('⚠️ Message not found:', data.error);
          return;
        default:
          // For other errors, show a warning
          console.warn('⚠️ Delete operation failed:', data.error);
      }
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

    // Handle force status refresh from server
    socket.on('force-status-refresh', () => {
      console.log('🔄 Server requested force status refresh');
      // Request fresh status immediately
      socket.emit('get-online-status');
    });

    // Handle individual user status changes
    socket.on('user-status-changed', (data: { userId: string; status: 'online' | 'offline'; lastActivity: Date }) => {
      console.log('👤 User status changed:', data);
      
      // Update the specific user in allUsers
      setAllUsers(prev => prev.map(user => 
        user.id === data.userId 
          ? { 
              ...user, 
              status: data.status, 
              isOnline: data.status === 'online',
              lastActivity: data.lastActivity.toISOString()
            }
          : user
      ));
      
      // Update selectedUser if it's the one that changed
      if (selectedUser && selectedUser.id === data.userId) {
        console.log('🔄 Updating selectedUser status immediately:', {
          username: selectedUser.username,
          from: { status: selectedUser.status, isOnline: selectedUser.isOnline },
          to: { status: data.status, isOnline: data.status === 'online' }
        });
        setSelectedUser(prev => prev ? {
          ...prev,
          status: data.status,
          isOnline: data.status === 'online',
          lastActivity: data.lastActivity.toISOString()
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
      
      // Update allUsers with the latest status
      const uniqueUsers = data.userStatuses.map(serverUser => {
        const existingUser = allUsers.find(u => u.id === serverUser.id);
        return existingUser ? { ...existingUser, ...serverUser } : serverUser;
      });
      
      console.log('👥 Filtered other users:', uniqueUsers.filter(u => u.id !== user.id).map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
      
      // Update allUsers state
      setAllUsers(uniqueUsers);
      console.log('👥 Updated allUsers state to:', uniqueUsers.map((u: User) => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));

      // Update selectedUser with the latest status if it exists in the updated users
      if (selectedUser) {
        const updatedSelectedUser = uniqueUsers.find(u => u.id === selectedUser.id);
        if (updatedSelectedUser) {
          console.log('👤 Updating selectedUser status:', {
            from: { status: selectedUser.status, isOnline: selectedUser.isOnline },
            to: { status: updatedSelectedUser.status, isOnline: updatedSelectedUser.isOnline }
          });
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

  // Update selectedUser status when allUsers changes
  useEffect(() => {
    if (selectedUser && allUsers.length > 0) {
      const updatedUser = allUsers.find(u => u.id === selectedUser.id);
      if (updatedUser && (
        updatedUser.status !== selectedUser.status || 
        updatedUser.isOnline !== selectedUser.isOnline ||
        updatedUser.lastActivity !== selectedUser.lastActivity
      )) {
        console.log('🔄 Syncing selectedUser status with allUsers:', {
          username: selectedUser.username,
          from: { status: selectedUser.status, isOnline: selectedUser.isOnline },
          to: { status: updatedUser.status, isOnline: updatedUser.isOnline }
        });
        setSelectedUser(prev => prev ? {
          ...prev,
          status: updatedUser.status,
          isOnline: updatedUser.isOnline,
          lastActivity: updatedUser.lastActivity
        } : null);
      }
    }
  }, [allUsers, selectedUser]);

  // Send periodic activity updates to keep user status active
  useEffect(() => {
    if (socketRef.current && user?.id) {
      const interval = setInterval(() => {
        socketRef.current?.emit('user-activity', user.id);
      }, 30000); // Send activity update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Periodic status refresh to ensure synchronization
  useEffect(() => {
    if (socketRef.current && user?.id) {
      const statusInterval = setInterval(() => {
        console.log('🔄 Periodic status refresh requested');
        socketRef.current?.emit('get-online-status');
      }, 10000); // Refresh status every 10 seconds

      return () => clearInterval(statusInterval);
    }
  }, [user?.id]);

  // Force status sync when selectedUser changes
  useEffect(() => {
    if (selectedUser && socketRef.current) {
      console.log('🔄 Selected user changed, requesting fresh status');
      socketRef.current.emit('get-online-status');
    }
  }, [selectedUser?.id]); // Only trigger when selectedUser ID changes

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
    // Get the latest status for this user from allUsers
    const userWithLatestStatus = allUsers.find(u => u.id === selectedUser.id);
    const userToSelect = userWithLatestStatus || selectedUser;
    
    console.log('👤 Selecting user with status:', {
      username: userToSelect.username,
      status: userToSelect.status,
      isOnline: userToSelect.isOnline
    });
    
    setSelectedUser(userToSelect);
    setActiveTab('chat');
    
    // Clear current messages
    setMessages([]);
    
    // Load existing messages for this conversation
    if (socketRef.current && user) {
      socketRef.current.emit('get-messages', {
        senderId: user.id,
        receiverId: userToSelect.id
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

  // Test function to verify logout process
  const testLogout = () => {
    console.log('🧪 Testing logout process...');
    console.log('🔍 Current user state:', user);
    console.log('🔍 Current localStorage:', {
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user')
    });
    
    // Simulate logout
    handleLogout();
  };

  // Utility function to clear all cached data
  const clearAllCachedData = () => {
    console.log('🧹 Clearing all cached data...');
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Clear any other potential storage
    if (typeof window !== 'undefined') {
      // Clear IndexedDB if available
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
    }
    
    console.log('✅ All cached data cleared');
  };

  // Complete cleanup function for logout
  const performCompleteCleanup = () => {
    console.log('🧹 Performing complete cleanup...');
    
    // Clear all storage
    clearAllCachedData();
    
    // Reset all React state
    setUser(null);
    setSelectedUser(null);
    setMessages([]);
    setActiveTab('chat');
    setIsConnected(false);
    setAllUsers([]);
    setOnlineUserCount(0);
    setIsLoading(false);
    isInitializedRef.current = false;
    
    // Clear any refs
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    console.log('✅ Complete cleanup finished');
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out user:', user?.username);
      console.log('🔍 Current localStorage before logout:', {
        token: !!localStorage.getItem('token'),
        user: !!localStorage.getItem('user'),
        userData: localStorage.getItem('user')
      });
      
      // Show loading state and set logout flag
      setIsLoading(true);
      setIsLoggingOut(true);
      
      // Perform complete cleanup
      performCompleteCleanup();
      
      // Verify data is cleared
      console.log('🔍 localStorage after logout:', {
        token: !!localStorage.getItem('token'),
        user: !!localStorage.getItem('user')
      });
      
      console.log('✅ Logout completed successfully');
      
      // Redirect to login page
      console.log('🔄 Redirecting to login page...');
      window.location.href = '/login';
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      
      // Force cleanup even if there's an error
      performCompleteCleanup();
      
      // Redirect to login
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false); // Reset logout flag
    }
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

  const handleDeleteConnections = () => {
    try {
      console.log('🔍 Delete connections clicked');
      console.log('🔍 Current user ID:', user?.id);
      console.log('🔍 All users count:', allUsers.length);
      console.log('🔍 All users:', allUsers.map(u => ({ id: u.id, username: u.username })));
      
      // Filter out the current user from the connections to delete
      const availableConnections = allUsers.filter(connectionUser => connectionUser.id !== user?.id);
      
      console.log('🔍 Available connections (excluding current user):', availableConnections.length);
      console.log('🔍 Available connections:', availableConnections.map(u => ({ id: u.id, username: u.username })));
      
      if (!availableConnections || availableConnections.length === 0) {
        setError('No connections found to delete');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Create connection selection interface (excluding current user)
      const connectionOptions = availableConnections.map(connectionUser => ({
        id: connectionUser.id,
        username: connectionUser.username,
        email: connectionUser.email,
        status: connectionUser.status || 'offline'
      }));

      console.log('🔍 Connection options for deletion:', connectionOptions);

      // Show connection selection modal
      setShowDeleteModal(true);
      setConnectionsToDelete(connectionOptions);
      setError(null); // Clear any previous errors
      
    } catch (error) {
      console.error('❌ Error in handleDeleteConnections:', error);
      setError('Error loading connections');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteSelectedConnection = async (connectionId: string) => {
    try {
      console.log('🗑️ Deleting connection:', connectionId);
      
      // Find the connection details
      const connectionToDelete = connectionsToDelete.find(conn => conn.id === connectionId);
      if (!connectionToDelete) {
        console.error('❌ Connection not found for deletion');
        return;
      }

      // Show confirmation
      const confirmed = confirm(`Are you sure you want to delete the connection with ${connectionToDelete.username} (${connectionToDelete.email})? This action cannot be undone.`);
      
      if (!confirmed) {
        return;
      }

      // Delete the connection from database
      const response = await fetch(`/api/users/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Connection deleted successfully');
        
        // Remove from local state
        setAllUsers(prev => prev.filter(user => user.id !== connectionId));
        
        // If this was the selected user, clear selection
        if (selectedUser && selectedUser.id === connectionId) {
          setSelectedUser(null);
          setMessages([]);
        }
        
        // Update online user count
        const remainingUsers = allUsers.filter(user => user.id !== connectionId);
        const onlineCount = remainingUsers.filter(u => u.status === 'online').length;
        setOnlineUserCount(onlineCount);
        
        alert(`Connection with ${connectionToDelete.username} has been deleted successfully.`);
        
        // Close modal
        setShowDeleteModal(false);
        setConnectionsToDelete([]);
        
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to delete connection:', errorData);
        alert(`Failed to delete connection: ${errorData.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ Error deleting connection:', error);
      alert('An error occurred while deleting the connection. Please try again.');
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setConnectionsToDelete([]);
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
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          <div className="text-center relative z-10">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl mb-6 transform hover:scale-110 transition-transform duration-300">
                <span className="text-6xl text-white">
                  {activeTab === 'profile' ? '👤' : '❤️'}
                </span>
              </div>
              
              {/* Animated Rings */}
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
            
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 font-sans">
              {activeTab === 'profile' ? 'Profile View' : 'Favorites View'}
            </h2>
            <p className="text-lg text-gray-600 mb-8 font-sans max-w-md mx-auto">
              {activeTab === 'profile' 
                ? 'View and manage your profile information with our beautiful interface' 
                : 'Manage your favorite connections and keep them close'
              }
            </p>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="text-3xl mb-3">✨</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Modern Design</h3>
                <p className="text-sm text-gray-600">Beautiful, responsive interface that works on all devices</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Fast & Secure</h3>
                <p className="text-sm text-gray-600">Built with the latest technologies for optimal performance</p>
              </div>
            </div>
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="mb-12">
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl mb-6 transform hover:scale-110 transition-transform duration-300">
                <span className="text-6xl text-white">💬</span>
              </div>
              
              {/* Animated Rings */}
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>
            
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 font-sans">
              Welcome to Chat App
            </h1>
            <p className="text-xl text-gray-600 mb-8 font-sans max-w-2xl mx-auto">
              Connect with friends and family in real-time with our beautiful, modern chat experience
            </p>
          </div>

          {/* Connection Status Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 mb-12 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-lg font-semibold text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {isConnected ? 'Ready to chat!' : 'Connecting to server...'}
            </p>
            
            {/* Connection Animation */}
            {isConnected ? (
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-8 mb-12 max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">{allUsers.length}</div>
              <div className="text-sm text-gray-600 font-medium">Available Users</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2">{messages.length}</div>
              <div className="text-sm text-gray-600 font-medium">Total Messages</div>
            </div>
          </div>

          {/* Getting Started Guide */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 border border-blue-100/50 shadow-xl max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
              <span className="mr-3">💡</span>
              Getting Started
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm rounded-full flex items-center justify-center font-bold">1</span>
                  <span className="text-sm text-gray-700">Select a user from the left panel to start chatting</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm rounded-full flex items-center justify-center font-bold">2</span>
                  <span className="text-sm text-gray-700">Use "Delete for Everyone" to remove messages from both sides</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-pink-500 to-red-500 text-white text-sm rounded-full flex items-center justify-center font-bold">3</span>
                  <span className="text-sm text-gray-700">Use "Delete for Me" to hide messages only from your view</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 text-white text-sm rounded-full flex items-center justify-center font-bold">4</span>
                  <span className="text-sm text-gray-700">Reply to specific messages using the 💬 button</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-orange-500 to-yellow-500 text-white text-sm rounded-full flex items-center justify-center font-bold">5</span>
                  <span className="text-sm text-gray-700">Forward messages to other users using the 📤 button</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-green-500 text-white text-sm rounded-full flex items-center justify-center font-bold">6</span>
                  <span className="text-sm text-gray-700">Add reactions to messages with emojis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6">
              <span className="text-4xl text-white">💬</span>
            </div>
            
            {/* Animated Rings */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 font-sans">
            Loading Chat App...
          </h2>
          <p className="text-gray-500 font-medium">Please wait while we connect you</p>
          
          {/* Loading Animation */}
          <div className="flex justify-center mt-8 space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6">
              <span className="text-4xl text-white">🔐</span>
            </div>
            
            {/* Animated Rings */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-red-300 via-orange-300 to-yellow-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-4 font-sans">
            Authentication Required
          </h2>
          <p className="text-gray-500 font-medium mb-8">Please log in to continue</p>
          
          {/* Action Buttons */}
          <div className="flex space-x-4 justify-center">
            <a 
              href="/login"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
            >
              🔐 Login
            </a>
            <a 
              href="/signup"
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
            >
              ✨ Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Status Bar */}
      <div className={`px-6 py-3 text-sm font-medium text-center backdrop-blur-sm transition-all duration-300 ${
        isConnected 
          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-b border-green-200/50 shadow-sm' 
          : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-b border-red-200/50 shadow-sm'
      }`}>
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span>
            {isConnected ? (
              '🟢 Connected to chat server - Real-time messaging active'
            ) : (
              '🔴 Disconnected from chat server - Messages may not be delivered'
            )}
          </span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          isOnline={user.isOnline} 
          userCount={onlineUserCount}
          onLogout={handleLogout}
          onDeleteConnections={handleDeleteConnections}
        />

        {/* Middle Panel - Dynamic based on active tab */}
        <div className="flex-1 overflow-hidden">
          {renderMiddlePanel()}
        </div>

        {/* Right Panel - Chat Interface or Tab-specific content */}
        <div className="flex-1 overflow-hidden">
          {renderRightPanel()}
        </div>
      </div>

      {/* Action Buttons - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-50 flex space-x-3">
        {/* Logout and test buttons removed from top-right corner */}
      </div>

      {/* Multiple Login Info */}
      <div className="fixed top-20 right-4 z-40 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
        <div className="flex items-center space-x-2">
          <span>💡</span>
          <span>Multiple logins supported</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-32 right-4 z-40 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="break-words">{error}</span>
          </div>
        </div>
      )}

      {/* Delete Connections Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Delete Connection</h3>
              <button
                onClick={handleCloseDeleteModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Select which connection you want to delete. This action cannot be undone.
            </p>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {connectionsToDelete.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      connection.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-800">{connection.username}</div>
                      <div className="text-sm text-gray-500">{connection.email}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSelectedConnection(connection.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}