'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { io, Socket } from 'socket.io-client';

interface ConnectionsProps {
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
  currentUserId: string;
  socket: Socket | null;
  users: User[];
}

export default function Connections({ onUserSelect, selectedUserId, currentUserId, socket, users }: ConnectionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local users when prop changes
  useEffect(() => {
    console.log('🔄 Connections: users prop changed:', users.map(u => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
    setLocalUsers(users);
  }, [users]);



  // Initialize socket event listeners when socket is available
  useEffect(() => {
    if (socket && currentUserId) {
      console.log('🔌 Setting up socket event listeners in Connections component');
      console.log('🔌 Current users prop:', users.map(u => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
      
      // Request current online status of all users
      socket.emit('get-online-status');
      console.log('🔌 Emitted get-online-status from Connections');
      
      // Listen for online status updates
      socket.on('online-status-updated', (data: { userStatuses: User[] }) => {
        console.log('👥 Connections received online-status-updated:', data.userStatuses.map(u => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
        
        // Filter out current user and remove duplicates
        const otherUsers = data.userStatuses.filter(u => u.id !== currentUserId);
        const uniqueUsers = otherUsers.filter((user, index, self) =>
          index === self.findIndex(u => u.id === user.id)
        );
        
        setLocalUsers(uniqueUsers);
        console.log('👥 Connections updated localUsers to:', uniqueUsers.map(u => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
      });
      
      // Listen for individual user status changes
      socket.on('user-status-changed', (data: { userId: string; status: string; lastActivity: string }) => {
        console.log('👤 Connections received user-status-changed:', data);
        setLocalUsers(prevUsers => {
          const updatedUsers = prevUsers.map(user =>
            user.id === data.userId
              ? { ...user, status: data.status as 'online' | 'offline' | 'away', lastActivity: data.lastActivity }
              : user
          );
          
          // Remove duplicates after status update
          const uniqueUsers = updatedUsers.filter((user, index, self) =>
            index === self.findIndex(u => u.id === user.id)
          );
          
          console.log('🔄 Updated local users after status change:', uniqueUsers.map(u => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
          return uniqueUsers;
        });
      });
      
      // Cleanup function
      return () => {
        socket.off('online-status-updated');
        socket.off('user-status-changed');
      };
    }
  }, [socket, currentUserId, users]);

  // Send periodic activity updates
  useEffect(() => {
    if (socket && currentUserId) {
      const interval = setInterval(() => {
        socket.emit('user-activity', currentUserId);
      }, 30000); // Send activity update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [socket, currentUserId]);

  // Filter users based on search query (excluding current user)
  const filteredUsers = localUsers.filter(user => 
    user.id !== currentUserId && (
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Ensure no duplicates in the final display
  const uniqueUsers = filteredUsers.filter((user, index, self) => 
    index === self.findIndex(u => u.id === user.id)
  );

  // Debug logging for rendering
  useEffect(() => {
    console.log('🎨 Connections rendering with users:', uniqueUsers.map(u => `${u.username}: ${u.status} (isOnline: ${u.isOnline})`));
  }, [uniqueUsers]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any pending timeout and fetch immediately
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (currentUserId) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${searchQuery}&userId=${currentUserId}`);
        const data = await response.json();
        if (data.users) {
          // setUsers(data.users); // This line is removed as users are now passed as props
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleFavorite = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const isFavorite = favorites.has(userId);
      
      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(`/api/users/favorites?favoriteUserId=${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setFavorites(prev => {
            const newFavorites = new Set(prev);
            newFavorites.delete(userId);
            return newFavorites;
          });
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/users/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ favoriteUserId: userId })
        });

        if (response.ok) {
          setFavorites(prev => {
            const newFavorites = new Set(prev);
            newFavorites.add(userId);
            return newFavorites;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const getStatusColor = (user: User) => {
    if (user.status === 'online') return 'bg-green-500';
    if (user.status === 'away') return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = (user: User) => {
    if (user.status === 'online') return 'Online';
    if (user.status === 'away') return 'Away';
    return 'Offline';
  };

  const formatLastActivity = (user: User) => {
    if (!user.lastActivity) return '';
    
    const lastActivity = new Date(user.lastActivity);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Debug info - moved to useEffect to avoid JSX rendering issues */}
      
      {/* Header */}
      <div className="p-8 border-b border-gray-200/50 bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">🔗</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent font-sans">
              Connections
            </h1>
            <p className="text-sm text-gray-500 font-sans mt-1">Find and connect with amazing people</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex space-x-4 mt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>{uniqueUsers.filter(u => u.status === 'online').length} Online</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>{uniqueUsers.filter(u => u.status === 'offline').length} Offline</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-6 border-b border-gray-200/50 bg-white">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <div className="w-5 h-5 text-gray-400">
              🔍
            </div>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for users..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-all duration-200"
          />
          <button
            onClick={handleSearch}
            className="absolute inset-y-0 right-0 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-r-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
          >
            Search
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-pink-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <span className="text-sm font-medium">Searching for amazing people...</span>
            </div>
          </div>
        ) : uniqueUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🔍</span>
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
              </div>
              <div>
                <p className="font-semibold text-gray-600 mb-1">No users found</p>
                <p className="text-sm text-gray-400">Try a different search term or check back later</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {uniqueUsers.map((user, index) => (
              <div
                key={user.id}
                className={`group relative p-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedUserId === user.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg'
                    : 'bg-white hover:bg-gray-50 hover:shadow-lg border border-gray-100'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-gray-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center space-x-4">
                    {/* Avatar with Status */}
                    <div className="flex-shrink-0 relative group/avatar">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover/avatar:shadow-xl transition-all duration-300 transform group-hover/avatar:scale-110">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Animated Ring */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover/avatar:opacity-20 transition-opacity duration-300 animate-pulse"></div>
                      
                      {/* Status Indicator */}
                      <div className={`absolute -bottom-2 -right-2 w-5 h-5 ${getStatusColor(user)} rounded-full border-3 border-white shadow-lg transition-all duration-300 ${
                        user.status === 'online' ? 'animate-pulse' : ''
                      }`}>
                        {user.status === 'online' && (
                          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate font-sans group-hover:text-purple-600 transition-colors duration-200">
                            {user.username}
                          </h3>
                          <p className="text-sm text-gray-500 truncate font-sans mb-2">
                            {user.email}
                          </p>
                          
                          {/* Status and Activity */}
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 ${getStatusColor(user)} rounded-full ${user.status === 'online' ? 'animate-pulse' : ''}`}></div>
                              <span className="text-xs font-medium text-gray-600">
                                {getStatusText(user)}
                              </span>
                            </div>
                            
                            {user.lastActivity && (
                              <span className="text-xs text-gray-400 font-sans">
                                Last seen: {formatLastActivity(user)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Favorite Toggle */}
                        <button
                          onClick={() => toggleFavorite(user.id)}
                          className={`text-2xl transition-all duration-300 transform hover:scale-110 ${
                            favorites.has(user.id) 
                              ? 'text-red-500 hover:text-red-600' 
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                          title={favorites.has(user.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {favorites.has(user.id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={() => onUserSelect(user)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      💬 Start Chat
                    </button>
                    <button className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 transform hover:scale-105">
                      👤 View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
