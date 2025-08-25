'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Safe setMessages function to prevent undefined errors
  const safeSetMessages = useCallback((value: Message[] | ((prev: Message[]) => Message[])) => {
    try {
      if (typeof value === 'function') {
        setMessages(prev => {
          const result = value(prev || []);
          return Array.isArray(result) ? result : [];
        });
      } else {
        setMessages(Array.isArray(value) ? value : []);
      }
    } catch (error) {
      console.error('❌ Error in safeSetMessages:', error);
      setMessages([]);
    }
  }, []);
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectionsToDelete, setConnectionsToDelete] = useState<{ id: string; username: string; email: string; status: string }[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  
  // Socket ref to prevent recreation
  const socketRef = useRef<Socket | null>(null);
  const isInitializedRef = useRef(false);
  
  // Refs to prevent stale closures in socket event handlers
  const selectedUserRef = useRef<User | null>(null);
  const allUsersRef = useRef<User[]>([]);
  const lastStatusUpdateRef = useRef<number>(0);
  
  // Debounce refs to prevent rapid successive updates
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update refs when state changes
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  
  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  // Ensure allUsers is always an array - never undefined
  const safeSetAllUsers = useCallback((value: User[] | ((prev: User[]) => User[])) => {
    try {
      if (typeof value === 'function') {
        setAllUsers(prev => {
          const result = value(prev || []);
          const finalResult = Array.isArray(result) ? result : [];
          allUsersRef.current = finalResult; // Update ref
          return finalResult;
        });
      } else {
        const finalResult = Array.isArray(value) ? value : [];
        allUsersRef.current = finalResult; // Update ref
        setAllUsers(finalResult);
      }
    } catch (error) {
      console.error('❌ Error in safeSetAllUsers:', error);
      // Fallback to empty array if anything goes wrong
      const fallbackArray: User[] = [];
      allUsersRef.current = fallbackArray;
      setAllUsers(fallbackArray);
    }
  }, []);

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
            safeSetAllUsers(data.users);
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

  // Initialize socket connection - PREVENT MULTIPLE CONNECTIONS
  useEffect(() => {
    if (!user?.id || isInitializedRef.current) return;
    
    console.log('🔌 Initializing socket connection for user:', user.id);
    isInitializedRef.current = true;
    
    // Clean up any existing socket connection first
    if (socketRef.current) {
      console.log('🧹 Cleaning up existing socket connection');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
          // Create socket connection with enhanced configuration - FIXED for WebSocket errors
      const socket = io('http://localhost:3006', {
        path: '/api/socket',
        transports: ['polling'], // Start with polling only to avoid WebSocket errors
        upgrade: false, // Disable automatic upgrade to prevent WebSocket errors
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        query: { userId: user.id },
        // Enhanced error handling
        autoConnect: true,
        closeOnBeforeunload: true
      });
    
    socketRef.current = socket;
    
    // Socket event handlers
    socket.on('connect', () => {
      try {
        console.log('✅ Socket connected:', socket.id);
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Join user room
        socket.emit('join-user', user.id);
        console.log('🔌 Emitted join-user for:', user.id);
        
        // Get online status for all users
        socket.emit('get-online-status');
        console.log('🔌 Emitted get-online-status');
      } catch (error) {
        console.error('❌ Error in socket connect handler:', error);
      }
    });

    // Handle connection errors - ENHANCED for WebSocket issues
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Check if it's a WebSocket error and fallback to polling
      if (error.message && error.message.includes('websocket')) {
        console.log('🔄 WebSocket error detected, ensuring polling transport is used');
        if (socket.io && socket.io.opts) {
          socket.io.opts.transports = ['polling'];
          socket.io.opts.upgrade = false;
        }
      }
      
      // Log the error for debugging
      console.log('🔄 Connection error occurred, will retry with existing configuration');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            socketRef.current.connect();
          }
        }, 2000);
      }
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      setConnectionStatus('reconnecting');
    });

    // Handle successful reconnection
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Re-join user room and get status
      if (user?.id) {
        socket.emit('join-user', user.id);
        socket.emit('get-online-status');
      }
    });

    // Handle reconnection failures
    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
      setConnectionStatus('disconnected');
    });

    // Handle online status updates for all users - DEBOUNCED to prevent infinite loops
    socket.on('online-status', (userStatuses: User[]) => {
      try {
        console.log('📊 Online status updated:', userStatuses);
        
        // Clear any existing timeout
        if (statusUpdateTimeoutRef.current) {
          clearTimeout(statusUpdateTimeoutRef.current);
        }
        
        // Debounce the update to prevent rapid successive calls
        statusUpdateTimeoutRef.current = setTimeout(() => {
          if (userStatuses && Array.isArray(userStatuses)) {
                    safeSetAllUsers(prev => {
          // Handle case where prev is undefined (first call)
          if (!prev || !Array.isArray(prev)) {
            console.log('🔄 First time setting allUsers, initializing with:', userStatuses);
            return userStatuses;
          }
          
          // Create a map of new statuses for quick lookup
          const statusMap = new Map(userStatuses.map(u => [u.id, u]));
          
          // Check if there are actual changes before updating
          const hasChanges = prev.some(user => {
            const newStatus = statusMap.get(user.id);
            if (!newStatus) return false;
            
            return user.isOnline !== newStatus.isOnline ||
                   user.lastActivity !== newStatus.lastActivity;
          });
          
          // Only update if there are actual changes
          if (!hasChanges) {
            console.log('🔄 No status changes detected, skipping update');
            return prev;
          }
          
          console.log('🔄 Status changes detected, updating allUsers');
          return prev.map(user => {
            const newStatus = statusMap.get(user.id);
            if (newStatus) {
              return {
                ...user,
                isOnline: newStatus.isOnline,
                lastActivity: newStatus.lastActivity
              };
            }
            return user;
          });
        });
            
            // Update online user count
            const onlineCount = userStatuses.filter(u => u.isOnline).length;
            setOnlineUserCount(onlineCount);
            console.log('👥 Updated online user count to:', onlineCount);
            
            // Update the last status update time
            lastStatusUpdateRef.current = Date.now();
          }
        }, 300); // 300ms debounce delay
      } catch (error) {
        console.error('❌ Error handling online status update:', error);
      }
    });

    // Handle individual user status changes - DEBOUNCED to prevent infinite loops
    socket.on('user-status-changed', (data: { userId: string; status: 'online' | 'offline'; lastActivity: Date }) => {
      try {
        console.log('🔄 User status changed:', data);
        
        // Clear any existing timeout
        if (userStatusTimeoutRef.current) {
          clearTimeout(userStatusTimeoutRef.current);
        }
        
        // Debounce the update to prevent rapid successive calls
        userStatusTimeoutRef.current = setTimeout(() => {
                  safeSetAllUsers(prev => {
          // Handle case where prev is undefined (first call)
          if (!prev || !Array.isArray(prev)) {
            console.log('🔄 First time setting allUsers in user-status-changed, skipping update');
            return prev || [];
          }
          
          // Check if there are actual changes before updating
          const userToUpdate = prev.find(user => user.id === data.userId);
          if (!userToUpdate) return prev;
          
          const hasChanges = userToUpdate.status !== data.status ||
                           userToUpdate.isOnline !== (data.status === 'online') ||
                           userToUpdate.lastActivity !== (typeof data.lastActivity === 'string' ? data.lastActivity : new Date().toISOString());
          
          if (!hasChanges) {
            console.log('🔄 No status changes detected for user, skipping update');
            return prev;
          }
          
          console.log('🔄 Status changes detected for user, updating');
          return prev.map(user => 
            user.id === data.userId 
              ? { 
                  ...user, 
                  status: data.status, 
                  isOnline: data.status === 'online',
                  lastActivity: typeof data.lastActivity === 'string' ? data.lastActivity : new Date().toISOString()
                }
              : user
          );
        });
        }, 300); // 300ms debounce delay
      } catch (error) {
        console.error('❌ Error handling user status change:', error);
      }
    });

    // Handle user activity updates
    socket.on('user-activity-updated', (data: { userId: string; lastActivity: Date | string }) => {
      try {
        console.log('👤 User activity updated:', data);
        
        // Only update if it's the selected user
        const currentSelectedUser = selectedUserRef.current;
        if (currentSelectedUser && currentSelectedUser.id === data.userId) {
          let lastActivity: string;
          
          if (typeof data.lastActivity === 'string') {
            if (data.lastActivity && !isNaN(Date.parse(data.lastActivity))) {
              lastActivity = data.lastActivity;
            } else {
              lastActivity = new Date().toISOString();
            }
          } else if (data.lastActivity instanceof Date) {
            lastActivity = data.lastActivity.toISOString();
          } else {
            lastActivity = new Date().toISOString();
          }
          
          setSelectedUser(prev => {
            if (!prev || prev.id !== data.userId) return prev;
            return { ...prev, lastActivity: lastActivity };
          });
        }
      } catch (error) {
        console.error('❌ Error handling user activity update:', error);
      }
    });

    socket.on('disconnect', () => {
      try {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      } catch (error) {
        console.error('❌ Error handling socket disconnect:', error);
      }
    });
    
    socket.on('receive-message', (message: Message) => {
      try {
        console.log('📨 Received message:', message);
        
        // Validate message structure
        if (!message || !message.id || !message.senderId || !message.receiverId) {
          console.warn('⚠️ Invalid message structure received:', message);
          return;
        }
        
        // Join conversation room for real-time updates
        if (socketRef.current?.connected) {
          const conversationRoom = `chat_${message.senderId}_${message.receiverId}`;
          socketRef.current.emit('join-conversation', { room: conversationRoom, userId: user.id });
          console.log(`🔗 Joined conversation room: ${conversationRoom}`);
        }
        

        
        // Only add message if it's for the current user (as receiver)
        if (message.receiverId === user.id) {
          console.log('✅ Message is for current user, adding to messages');
          safeSetMessages(prev => {
            if (!prev || !Array.isArray(prev)) return [message];
            
            // Check if message already exists
            const exists = prev.some(msg => msg.id === message.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping duplicate');
              return prev;
            }
            
            return [...prev, {
              ...message,
              timestamp: new Date(message.timestamp)
            }];
          });
        } else if (message.senderId === user.id) {
          console.log('📤 Message is from current user, updating local message');
          // Update the temporary message with the real one from server
          safeSetMessages(prev => {
            if (!prev || !Array.isArray(prev)) return [message];
            
            return prev.map(msg => 
              msg.id === message.id || msg.tempId === message.id
                ? { ...message, timestamp: new Date(message.timestamp) }
                : msg
            );
          });
        } else {
          console.log('🚫 Message is not for current user, ignoring');
        }
      } catch (error) {
        console.error('❌ Error handling received message:', error);
      }
    });
    
    socket.on('message-sent', (data: { tempId: string; id: string; timestamp: Date }) => {
      try {
        console.log('✅ Message confirmed:', data);
        console.log('🔍 Looking for message with tempId:', data.tempId);
        
        // Update temporary message with real ID and remove tempId to stop showing "sending"
        safeSetMessages(prev => {
          console.log('📊 Current messages before update:', prev?.length);
          console.log('🔍 Messages with tempId:', prev?.filter(msg => msg.tempId));
          
          const updated = prev.map(msg => {
            if (msg.tempId === data.tempId) {
              console.log('✅ Found temporary message to update:', msg);
              return { ...msg, id: data.id, timestamp: new Date(data.timestamp), tempId: undefined };
            }
            return msg;
          });
          
          console.log('📊 Messages after update:', updated?.length);
          return updated;
        });
      } catch (error) {
        console.error('❌ Error handling message sent confirmation:', error);
      }
    });
    
    socket.on('message-deleted-for-everyone', (data: { messageId: string; senderId: string; receiverId: string }) => {
      try {
        console.log('🗑️ Message deleted for everyone event received:', data);
        console.log('👤 Current user ID:', user?.id);
        console.log('🔍 Checking if user is involved in deletion...');
        console.log('📊 Current messages count:', messages?.length);
        
        // Check if this user is involved in the message (sender or receiver)
        if (data.senderId === user?.id || data.receiverId === user?.id) {
          console.log('✅ User is involved in this message, removing it INSTANTLY');
          
          // Remove the message from local state IMMEDIATELY - no delays
          safeSetMessages(prev => {
            if (!prev || !Array.isArray(prev)) return [];
            
            console.log(`🔍 Before filtering: ${prev.length} messages`);
            console.log(`🔍 Looking for message ID: ${data.messageId}`);
            
            const filtered = prev.filter(msg => {
              const msgId = msg.id?.toString();
              const deleteId = data.messageId?.toString();
              
              // Debug ID comparison
              console.log(`🔍 Comparing: msgId="${msgId}" vs deleteId="${deleteId}"`);
              
              const shouldKeep = msgId !== deleteId;
              
              if (!shouldKeep) {
                console.log(`🗑️ Filtering out message: ${msgId} (matches delete ID: ${deleteId})`);
                console.log(`📝 Message details:`, msg);
              }
              return shouldKeep;
            });
            
            console.log(`✅ Removed message ${data.messageId} from local state. Messages before: ${prev.length}, after: ${filtered.length}`);
            
            // Verify the message was actually removed
            const messageStillExists = filtered.some(msg => msg.id?.toString() === data.messageId?.toString());
            if (messageStillExists) {
              console.warn('⚠️ Message still exists after filtering!');
            } else {
              console.log('✅ Message successfully removed from local state');
            }
            
            return filtered;
          });
          
          // Show success notification for sender
          if (data.senderId === user?.id) {
            console.log('✅ Message deleted for everyone successfully!');
            // You can add a toast notification here if needed
          }
          
          // NO DELAY - immediate UI update
          console.log('🚀 UI updated immediately - no delays');
          
        } else {
          console.log('🚫 User not involved in this message, ignoring delete event');
        }
      } catch (error) {
        console.error('❌ Error handling message deleted for everyone:', error);
      }
    });
    
    socket.on('message-deleted-for-me', (data: { messageId: string }) => {
      try {
        console.log('👁️ Message deleted for me:', data.messageId);
        
        // Remove message from local state immediately for "delete for me"
        safeSetMessages(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          
          console.log(`🔍 Removing message ${data.messageId} for current user only`);
          
          const filtered = prev.filter(msg => msg.id !== data.messageId);
          
          console.log(`✅ Message removed for me. Messages before: ${prev.length}, after: ${filtered.length}`);
          
          return filtered;
        });
        
        console.log('🚀 "Delete for me" completed instantly');
      } catch (error) {
        console.error('❌ Error handling message deleted for me:', error);
      }
    });
    
    // Handle delete errors
    socket.on('delete-error', (data: { messageId: string; error: string; errorType?: string }) => {
      try {
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
      } catch (error) {
        console.error('❌ Error handling delete error:', error);
      }
    });
    
    // Handle requests to join conversation rooms
    socket.on('join-conversation-request', (data) => {
      try {
        const { room, userId: roomUserId } = data;
        if (room && roomUserId === user?.id) {
          console.log(`🔗 User ${user?.id} joining conversation room via request: ${room}`);
          // The server will automatically join the user to the room
        }
      } catch (error) {
        console.error('❌ Error handling join conversation request:', error);
      }
    });
    
    // Handle loading existing messages
    socket.on('messages-loaded', (data: Message[] | { messages: Message[] }) => {
      try {
        // Handle both data formats: direct array or wrapped object
        let messages: Message[];
        if (Array.isArray(data)) {
          messages = data;
        } else if (data && data.messages && Array.isArray(data.messages)) {
          messages = data.messages;
        } else {
          console.warn('⚠️ Invalid messages data format:', data);
          messages = [];
        }
        
        console.log('📚 Messages loaded:', messages.length);
        
        // Replace current messages with loaded ones
        safeSetMessages(messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('❌ Error handling messages loaded:', error);
        // Fallback to empty array
        safeSetMessages([]);
      }
    });

    // Handle force status refresh from server
    socket.on('force-status-refresh', () => {
      try {
        console.log('🔄 Server requested force status refresh');
        // Request fresh status immediately
        socket.emit('get-online-status');
      } catch (error) {
        console.error('❌ Error handling force status refresh:', error);
      }
    });

    // Handle reaction events
    socket.on('reaction-added', (data: { messageId: string; reaction: string; userId: string; reactions: Record<string, string> }) => {
      try {
        console.log('🎭 Reaction added event received:', data);
        console.log('🎭 Reactions data structure:', typeof data.reactions, data.reactions);
        
        // Update messages with new reactions
        safeSetMessages(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          const updated = prev.map(msg => {
            if (msg.id === data.messageId) {
              console.log('🎭 Updating message reactions:', { 
                oldReactions: msg.reactions, 
                newReactions: data.reactions 
              });
              return { ...msg, reactions: data.reactions };
            }
            return msg;
          });
          console.log('🎭 Messages updated with reactions');
          return updated;
        });
      } catch (error) {
        console.error('❌ Error handling reaction added:', error);
      }
    });

    socket.on('reaction-removed', (data: { messageId: string; userId: string; reactions: Record<string, string> }) => {
      try {
        console.log('🗑️ Reaction removed event received:', data);
        console.log('🗑️ Reactions data structure:', typeof data.reactions, data.reactions);
        
        // Update messages with updated reactions
        safeSetMessages(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          const updated = prev.map(msg => {
            if (msg.id === data.messageId) {
              console.log('🗑️ Updating message reactions:', { 
                oldReactions: msg.reactions, 
                newReactions: data.reactions 
              });
              return { ...msg, reactions: data.reactions };
            }
            return msg;
          });
          console.log('🗑️ Messages updated with reactions');
          return updated;
        });
      } catch (error) {
        console.error('❌ Error handling reaction removed:', error);
      }
    });

    // Handle socket errors - ENHANCED for WebSocket issues
    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
      setIsConnected(false);
      
      // Check if it's a WebSocket error
      if (error.message && error.message.includes('websocket')) {
        console.log('🔄 WebSocket error detected, ensuring polling transport is used');
        if (socket.io && socket.io.opts) {
          socket.io.opts.transports = ['polling'];
          socket.io.opts.upgrade = false;
        }
      }
    });

    // Handle connect errors - ENHANCED for WebSocket issues
    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      setIsConnected(false);
      
      // Check if it's a WebSocket error and fallback to polling
      if (error.message && error.message.includes('websocket')) {
        console.log('🔄 WebSocket error detected, ensuring polling transport is used');
        if (socket.io && socket.io.opts) {
          socket.io.opts.transports = ['polling'];
          socket.io.opts.upgrade = false;
        }
      }
    });

    // Cleanup function
    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
      
      // Clear any pending timeouts to prevent memory leaks
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
        statusUpdateTimeoutRef.current = null;
      }
      if (userStatusTimeoutRef.current) {
        clearTimeout(userStatusTimeoutRef.current);
        userStatusTimeoutRef.current = null;
      }
      
      isInitializedRef.current = false;
    };
  }, [user?.id]);

      // Add window focus/blur and visibility change listeners for better online status tracking
    useEffect(() => {
      const handleWindowFocus = () => {
        if (selectedUser && socketRef.current && user) {
          console.log('🔄 Window focused, refreshing messages for better sync...');
          socketRef.current.emit('get-messages', {
            senderId: user.id,
            receiverId: selectedUser.id
          });
        }
        
        // Mark user as active when window gains focus
        if (socketRef.current && user) {
          console.log('👤 Window focused - marking user as active');
          socketRef.current.emit('user-activity', user.id);
        }
      };

      const handleWindowBlur = () => {
        // Note: We don't mark user as offline on blur as they might switch tabs
        // Only mark offline on actual disconnect
        console.log('👤 Window blurred - user may be switching tabs');
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && socketRef.current && user) {
          console.log('👤 Page became visible - marking user as active');
          socketRef.current.emit('user-activity', user.id);
        }
      };

      const handleBeforeUnload = () => {
        // This will trigger the disconnect event when user closes the tab/window
        console.log('👤 Page unloading - disconnect event will be triggered');
      };

      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('blur', handleWindowBlur);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('blur', handleWindowBlur);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [selectedUser, user]);

  // Update selectedUser status when allUsers changes - COMPLETELY REWRITTEN for maximum stability
  useEffect(() => {
    // Only run if we have both selectedUser and allUsers
    // Add extra safety checks to prevent any undefined access
    if (!selectedUser) return;
    
    // Use the ref to prevent race conditions - this is always stable
    let currentAllUsers: User[];
    try {
      currentAllUsers = allUsersRef.current;
      if (!currentAllUsers) return;
      if (!Array.isArray(currentAllUsers)) return;
      
      // Additional safety check - ensure allUsers is still valid when we access it
      if (typeof currentAllUsers.length !== 'number') return;
      if (currentAllUsers.length === 0) return;
    } catch (error) {
      console.error('❌ Error accessing allUsersRef:', error);
      return;
    }
    
    // Prevent rapid successive updates (throttle to 100ms)
    const now = Date.now();
    if (now - lastStatusUpdateRef.current < 100) {
      return;
    }
    
    // Find the corresponding user in currentAllUsers
    const updatedUser = currentAllUsers.find(u => u.id === selectedUser.id);
    if (!updatedUser) return;
    
    // Create a new object only if there are actual changes
    const hasChanges = 
      updatedUser.status !== selectedUser.status ||
      updatedUser.isOnline !== selectedUser.isOnline ||
      updatedUser.lastActivity !== selectedUser.lastActivity;
    
    if (hasChanges) {
      console.log('🔄 Updating selectedUser with new data:', {
        username: selectedUser.username,
        oldStatus: selectedUser.status,
        newStatus: updatedUser.status,
        oldOnline: selectedUser.isOnline,
        newOnline: updatedUser.isOnline
      });
      
      // Update the last update time
      lastStatusUpdateRef.current = now;
      
      // Use a stable update function with additional safety checks
      setSelectedUser(prev => {
        if (!prev || prev.id !== selectedUser.id) return prev;
        
        // Double-check that we're not setting the same values
        if (prev.status === updatedUser.status && 
            prev.isOnline === updatedUser.isOnline && 
            prev.lastActivity === updatedUser.lastActivity) {
          return prev; // No change needed
        }
        
        return {
          ...prev,
          status: updatedUser.status,
          isOnline: updatedUser.isOnline,
          lastActivity: updatedUser.lastActivity
        };
      });
    }
  }, [selectedUser?.id]); // REMOVED allUsers dependency - this was causing infinite loops

  // Send periodic activity updates to keep user status active - OPTIMIZED for better performance
  useEffect(() => {
    if (socketRef.current && user?.id) {
      const interval = setInterval(() => {
        // Only send activity if we're actually connected and not in a loading state
        if (isConnected && !isLoading) {
          socketRef.current?.emit('user-activity', user.id);
        }
      }, 60000); // Send activity update every 60 seconds (reduced from 30)

      return () => clearInterval(interval);
    }
  }, [user?.id, isConnected, isLoading]);

  // Periodic status refresh to ensure synchronization - OPTIMIZED to prevent infinite loops
  useEffect(() => {
    if (socketRef.current && user?.id) {
      const statusInterval = setInterval(() => {
        // Only request status refresh if we haven't received an update recently
        const now = Date.now();
        if (now - lastStatusUpdateRef.current > 10000) { // Increased to 10 seconds (from 5)
          console.log('🔄 Periodic status refresh requested');
          socketRef.current?.emit('get-online-status');
        } else {
          console.log('⏭️ Skipping periodic status refresh - recent update detected');
        }
      }, 15000); // Refresh status every 15 seconds for more responsive updates

      return () => clearInterval(statusInterval);
    }
  }, [user?.id]);

  // REMOVED: Force status sync when selectedUser changes - this was causing infinite loops
  // The status will be updated naturally through the online-status-updated event

  // Global error handler to catch unhandled promise rejections and WebSocket errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('❌ Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent the default error handling
    };

    const handleError = (event: ErrorEvent) => {
      console.error('❌ Global error:', event.error);
      
      // Check if it's a WebSocket error
      if (event.error && event.error.message && event.error.message.includes('websocket')) {
        console.log('🔄 WebSocket error caught globally, attempting to reconnect with polling');
        if (socketRef.current && socketRef.current.io && socketRef.current.io.opts) {
          socketRef.current.io.opts.transports = ['polling'];
          socketRef.current.io.opts.upgrade = false;
          socketRef.current.connect();
        }
      }
      
      event.preventDefault(); // Prevent the default error handling
    };

    // Add global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

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

  // Connection stability check to prevent infinite loops
  useEffect(() => {
    if (socketRef.current && user?.id) {
      let connectionAttempts = 0;
      const maxAttempts = 3;
      
      const checkConnection = () => {
        if (!isConnected && connectionAttempts < maxAttempts) {
          connectionAttempts++;
          console.log(`🔄 Connection attempt ${connectionAttempts}/${maxAttempts}`);
          
          // Try to reconnect
          socketRef.current?.connect();
          
          // Wait before next attempt
          setTimeout(() => {
            if (!isConnected && connectionAttempts < maxAttempts) {
              checkConnection();
            }
          }, 5000);
        }
      };
      
      // Only check connection if we're not connected
      if (!isConnected) {
        checkConnection();
      }
      
      return () => {
        connectionAttempts = maxAttempts; // Stop attempts on cleanup
      };
    }
  }, [user?.id, isConnected]);

    // Enhanced user activity tracking system - OPTIMIZED for multiple users
  useEffect(() => {
    if (socketRef.current && user?.id && isConnected) {
      let lastActivitySent = 0;
      const MIN_ACTIVITY_INTERVAL = 10000; // 10 seconds minimum between activity updates
      
      // Send periodic activity updates to keep user marked as online
      const activityInterval = setInterval(() => {
        if (socketRef.current && user && socketRef.current.connected && isConnected) {
          const now = Date.now();
          if (now - lastActivitySent >= MIN_ACTIVITY_INTERVAL) {
            try {
              socketRef.current.emit('user-activity', user.id);
              lastActivitySent = now;
            } catch (error) {
              console.error('❌ Error sending user activity:', error);
            }
          }
        }
      }, 20000); // Send activity every 20 seconds (reduced frequency)

      // Send heartbeat for more accurate online status tracking
      const heartbeatInterval = setInterval(() => {
        if (socketRef.current && user && socketRef.current.connected && isConnected) {
          try {
            socketRef.current.emit('user-heartbeat', user.id);
          } catch (error) {
            console.error('❌ Error sending user heartbeat:', error);
          }
        }
      }, 10000); // Send heartbeat every 10 seconds (reduced frequency)

      // Debounced user interaction handler
      let interactionTimeout: NodeJS.Timeout | undefined;
      const handleUserInteraction = () => {
        if (socketRef.current && user && socketRef.current.connected && isConnected) {
          if (interactionTimeout) {
            clearTimeout(interactionTimeout);
          }
          interactionTimeout = setTimeout(() => {
            const now = Date.now();
            if (now - lastActivitySent >= MIN_ACTIVITY_INTERVAL) {
              try {
                socketRef.current?.emit('user-activity', user.id);
                lastActivitySent = now;
              } catch (error) {
                console.error('❌ Error sending user interaction:', error);
              }
            }
          }, 1000); // Debounce interactions by 1 second
        }
      };

      // Track various user interactions
      document.addEventListener('mousedown', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      document.addEventListener('scroll', handleUserInteraction);
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);

      return () => {
        clearInterval(activityInterval);
        clearInterval(heartbeatInterval);
        if (interactionTimeout) {
          clearTimeout(interactionTimeout);
        }
        document.removeEventListener('mousedown', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('scroll', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [user?.id, isConnected]);

  const handleUserSelect = (selectedUser: User) => {
    // Get the latest status for this user from allUsers
    const userWithLatestStatus = allUsers?.find(u => u.id === selectedUser.id);
    const userToSelect = userWithLatestStatus || selectedUser;
    
    console.log('👤 Selecting user with status:', {
      username: userToSelect.username,
      status: userToSelect.status,
      isOnline: userToSelect.isOnline
    });
    
    setSelectedUser(userToSelect);
    setActiveTab('chat');
    
    // Clear current messages
    safeSetMessages([]);
    
    // Load existing messages for this conversation
    if (socketRef.current && user) {
      // Join conversation room for real-time updates
      const conversationRoom = `chat_${user.id}_${userToSelect.id}`;
      socketRef.current.emit('join-conversation', { room: conversationRoom, userId: user.id });
      console.log(`🔗 Joined conversation room: ${conversationRoom}`);
      
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
      console.log('🗑️ Deleting message:', { messageId, deleteType });
      console.log('🔌 Socket connection status:', socketRef.current?.connected);
      console.log('👤 Current user:', user?.id);
      console.log('👥 Selected user:', selectedUser?.id);
      
      // Check if this is a temporary message using the tempId property
      const message = messages.find(m => m.id === messageId);
      if (message?.tempId) {
        // For temporary messages, just remove from local state
        safeSetMessages(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          return prev.filter(msg => msg.id !== messageId);
        });
        console.log('✅ Temporary message removed locally');
        return;
      }
      
      // For real messages, handle based on delete type
      if (deleteType === 'for-me') {
        // Remove message from local state immediately for "delete for me"
        safeSetMessages(prev => {
          if (!prev || !Array.isArray(prev)) return [];
          return prev.filter(msg => msg.id !== messageId);
        });
        console.log('✅ Message deleted for me');
        
        // Emit socket event for real-time updates
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('delete-message', {
            messageId,
            deleteType,
            senderId: user?.id,
            receiverId: selectedUser?.id
          });
          console.log('📡 Delete for me event emitted');
        } else {
          console.warn('⚠️ Socket not connected for delete for me');
        }
      } else {
        // For "delete for everyone", emit socket event and wait for server confirmation
        console.log('🌍 Emitting delete for everyone event...');
        
        // Emit socket event for real-time updates
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('delete-message', {
            messageId,
            deleteType,
            senderId: user?.id,
            receiverId: selectedUser?.id
          });
          
          console.log('✅ Delete for everyone event emitted successfully');
        } else {
          console.error('❌ Socket not connected, cannot delete message for everyone');
          alert('Connection lost. Please refresh the page and try again.');
        }
      }
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      alert('An error occurred while deleting the message. Please try again.');
    }
  };

  const handleReactionToggle = async (messageId: string, reaction: string, userId: string) => {
    if (!user || !socketRef.current) return;
    
    // Validate messageId
    if (!messageId || messageId === 'undefined' || messageId === 'null') {
      console.error('❌ Invalid messageId for reaction:', messageId);
      setError('Invalid message ID for reaction. Please try again.');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    try {
      console.log('🎭 Toggling reaction via socket:', { messageId, reaction, userId });
      
      // Check if user already has a reaction on this message
      const currentMessage = messages?.find(msg => msg.id === messageId);
      const currentReaction = currentMessage?.reactions?.[userId];
      
      let action = 'add';
      if (currentReaction === reaction) {
        action = 'remove';
      }
      
      // Use socket events for real-time reactions
      if (action === 'add') {
        socketRef.current.emit('add-reaction', {
          messageId,
          reaction,
          userId: user.id
        });
        console.log('🎭 Emitted add-reaction event:', { messageId, reaction, userId: user.id });
      } else {
        socketRef.current.emit('remove-reaction', {
          messageId,
          userId: user.id
        });
        console.log('🎭 Emitted remove-reaction event:', { messageId, userId: user.id });
      }
      
      // Show immediate feedback
      setError(`Reaction ${action === 'add' ? 'added' : 'removed'}!`);
      setTimeout(() => setError(''), 2000);
      
    } catch (error) {
      console.error('❌ Error updating reaction:', error);
      setError('Failed to update reaction. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleForwardMessage = (messageId: string, text: string, recipientId: string) => {
    try {
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
    } catch (error) {
      console.error('❌ Error forwarding message:', error);
      setError('Failed to forward message. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };



  const sendMessage = (text: string) => {
    if (!user || !selectedUser || !socketRef.current) return;

    try {
      // Generate temporary ID
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const tempMessage: Message = {
        id: tempId,
        tempId: tempId, // Preserve tempId for later checking
        senderId: user.id,
        receiverId: selectedUser.id,
        text: text,
        timestamp: new Date(),
        isRead: false
      };

      // Add message to local state immediately
      safeSetMessages(prev => {
        if (!prev || !Array.isArray(prev)) return [tempMessage];
        return [...prev, tempMessage];
      });
      
      // Send message via socket
      socketRef.current.emit('send-message', {
        senderId: user.id,
        receiverId: selectedUser.id,
        text,
        tempId
      });
      
      console.log('Message sent:', tempMessage);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError('Failed to send message. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
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
    safeSetMessages([]);
    setActiveTab('chat');
    setIsConnected(false);
            safeSetAllUsers([]);
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
      console.log('🔍 All users count:', allUsers?.length || 0);
      console.log('🔍 All users:', allUsers?.map(u => ({ id: u.id, username: u.username })) || []);
      
      // Filter out the current user from the connections to delete
      const availableConnections = allUsers?.filter(connectionUser => connectionUser.id !== user?.id) || [];
      
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
        safeSetAllUsers(prev => prev?.filter(user => user.id !== connectionId) || []);
        
        // If this was the selected user, clear selection
        if (selectedUser && selectedUser.id === connectionId) {
          setSelectedUser(null);
          safeSetMessages([]);
        }
        
        // Update online user count
        const remainingUsers = allUsers?.filter(user => user.id !== connectionId) || [];
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
            users={allUsers?.filter(u => u.id !== user?.id) || []}
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
            users={allUsers?.filter(u => u.id !== user?.id) || []}
          />
        );
    }
  };

  const renderRightPanel = () => {
    if (activeTab !== 'chat') {
      return (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-cyan-50 via-pink-50 to-orange-50 relative overflow-hidden">
          {/* Enhanced Background Decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 rounded-full opacity-30 animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-300 via-orange-300 to-yellow-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-green-300 to-emerald-300 rounded-full opacity-25 animate-pulse" style={{animationDelay: '3s'}}></div>
          </div>
          
          <div className="text-center relative z-10">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500 via-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl mb-6 transform hover:scale-110 transition-transform duration-300 hover:shadow-3xl">
                <span className="text-6xl text-white filter drop-shadow-lg">
                  {activeTab === 'profile' ? '👤' : '❤️'}
                </span>
              </div>
              
              {/* Enhanced Animated Rings */}
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full opacity-25 animate-ping"></div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-pink-400 via-orange-400 to-yellow-400 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>
            
            <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4 font-sans drop-shadow-sm">
              {activeTab === 'profile' ? 'Profile View' : 'Favorites View'}
            </h2>
            <p className="text-lg text-gray-600 mb-8 font-sans max-w-md mx-auto">
              {activeTab === 'profile' 
                ? 'View and manage your profile information with our beautiful interface' 
                : 'Manage your favorite connections and keep them close'
              }
            </p>
            
            {/* Enhanced Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-purple-300/50">
                <div className="text-3xl mb-3">✨</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Modern Design</h3>
                <p className="text-sm text-gray-700">Beautiful, responsive interface that works on all devices</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50/90 via-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-200/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-blue-300/50">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Fast & Secure</h3>
                <p className="text-sm text-gray-700">Built with the latest technologies for optimal performance</p>
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
          availableUsers={allUsers || []}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-cyan-50 via-pink-50 to-orange-50 p-8 relative overflow-hidden">
        {/* Enhanced Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-300 via-orange-300 to-yellow-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-200 via-blue-200 to-indigo-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-green-300 to-emerald-300 rounded-full opacity-25 animate-pulse" style={{animationDelay: '3s'}}></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-red-300 to-pink-300 rounded-full opacity-25 animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="mb-12">
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500 via-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl mb-6 transform hover:scale-110 transition-transform duration-300 hover:shadow-3xl">
                <span className="text-6xl text-white filter drop-shadow-lg">💬</span>
              </div>
              
              {/* Enhanced Animated Rings */}
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full opacity-25 animate-ping"></div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-pink-400 via-orange-400 to-yellow-400 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>
            
            <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4 font-sans drop-shadow-sm">
              Welcome to Chat App
            </h1>
            <p className="text-xl text-gray-600 mb-8 font-sans max-w-2xl mx-auto">
              Connect with friends and family in real-time with our beautiful, modern chat experience
            </p>
          </div>

          {/* Enhanced Connection Status Card */}
          <div className="bg-gradient-to-br from-white/90 via-cyan-50/80 to-indigo-50/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-cyan-200/30 mb-12 max-w-md mx-auto hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className={`w-4 h-4 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-orange-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
              <span className="text-lg font-semibold text-gray-700">
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                 'Disconnected'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {connectionStatus === 'connected' ? 'Ready to chat!' : 
               connectionStatus === 'connecting' ? 'Establishing connection...' :
               connectionStatus === 'reconnecting' ? 'Attempting to reconnect...' :
               'Connection lost. Trying to reconnect...'}
            </p>
            
            {/* Connection Animation */}
            {connectionStatus === 'connected' ? (
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            ) : connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Connection Details */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Socket.IO Status: {connectionStatus}</p>
              <p>Server: localhost:3006</p>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 gap-8 mb-12 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-purple-300/50">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">{allUsers?.length || 0}</div>
              <div className="text-sm text-gray-700 font-medium">Available Users</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-50/90 via-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-200/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:border-blue-300/50">
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">{messages.length}</div>
              <div className="text-sm text-gray-700 font-medium">Total Messages</div>
            </div>
          </div>

          {/* Enhanced Getting Started Guide */}
          <div className="bg-gradient-to-r from-indigo-50 via-cyan-50 to-pink-50 rounded-3xl p-8 border border-indigo-200/50 shadow-xl max-w-3xl mx-auto hover:shadow-2xl transition-all duration-300">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
              <span className="mr-3">💡</span>
              Getting Started
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">1</span>
                  <span className="text-sm text-gray-700">Select a user from the left panel to start chatting</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-pink-500 via-orange-500 to-yellow-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">2</span>
                  <span className="text-sm text-gray-700">Use "Delete for Everyone" to remove messages from both sides</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-yellow-500 via-green-500 to-emerald-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">3</span>
                  <span className="text-sm text-gray-700">Use "Delete for Me" to hide messages only from your view</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">4</span>
                  <span className="text-sm text-gray-700">Reply to specific messages using the 💬 button</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">5</span>
                  <span className="text-sm text-gray-700">Forward messages to other users using the 📤 button</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-sm rounded-full flex items-center justify-center font-bold shadow-lg">6</span>
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-cyan-50 via-pink-50 to-orange-50 relative overflow-hidden">
        {/* Enhanced Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-300 via-orange-300 to-yellow-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-green-300 to-emerald-300 rounded-full opacity-25 animate-pulse" style={{animationDelay: '3s'}}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6 transform hover:scale-110 transition-transform duration-300">
              <span className="text-4xl text-white filter drop-shadow-lg">💬</span>
            </div>
            
            {/* Enhanced Animated Rings */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full opacity-25 animate-ping"></div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-pink-400 via-orange-400 to-yellow-400 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4 font-sans drop-shadow-sm">
            Loading Chat App...
          </h2>
          <p className="text-gray-600 font-medium">Please wait while we connect you</p>
          
          {/* Enhanced Loading Animation */}
          <div className="flex justify-center mt-8 space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-bounce shadow-lg"></div>
            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-orange-50 via-yellow-50 to-green-50 relative overflow-hidden">
        {/* Enhanced Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-300 via-orange-300 to-yellow-300 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-300 via-green-300 to-emerald-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-pink-300 to-rose-300 rounded-full opacity-25 animate-pulse" style={{animationDelay: '3s'}}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 via-orange-500 via-yellow-500 to-green-500 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-6 transform hover:scale-110 transition-transform duration-300">
              <span className="text-4xl text-white filter drop-shadow-lg">🔐</span>
            </div>
            
            {/* Enhanced Animated Rings */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 rounded-full opacity-25 animate-ping"></div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 via-green-400 to-emerald-400 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-orange-600 via-yellow-600 to-green-600 bg-clip-text text-transparent mb-4 font-sans drop-shadow-sm">
            Authentication Required
          </h2>
          <p className="text-gray-600 font-medium mb-8">Please log in to continue</p>
          
          {/* Enhanced Action Buttons */}
          <div className="flex space-x-4 justify-center">
            <a 
              href="/login"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium border border-white/20 hover:border-white/40"
            >
              🔐 Login
            </a>
            <a 
              href="/signup"
              className="px-6 py-3 bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 text-white rounded-2xl hover:from-pink-600 hover:via-orange-600 hover:to-yellow-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium border border-white/20 hover:border-white/40"
            >
              ✨ Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-cyan-50 via-pink-50 to-orange-50">
      {/* Enhanced Status Bar */}
      <div className={`px-6 py-3 text-sm font-medium text-center backdrop-blur-sm transition-all duration-300 ${
        isConnected 
          ? 'bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-800 border-b border-emerald-200/50 shadow-sm' 
          : 'bg-gradient-to-r from-red-100 via-pink-100 to-rose-100 text-red-800 border-b border-red-200/50 shadow-sm'
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

      {/* Enhanced Multiple Login Info */}
      <div className="fixed top-20 right-4 z-40 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm border border-white/20 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center space-x-2">
          <span>💡</span>
          <span>Multiple logins supported</span>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="fixed top-32 right-4 z-40 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs border border-white/20 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="break-words">{error}</span>
          </div>
        </div>
      )}

      {/* Enhanced Delete Connections Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white via-cyan-50/50 to-indigo-50/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-cyan-200/30">
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