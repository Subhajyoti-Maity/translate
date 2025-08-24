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
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 font-sans">Connections</h1>
        <p className="text-sm text-gray-500 font-sans">Find and connect with users</p>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Searching...</span>
            </div>
          </div>
        ) : uniqueUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-sans">No users found</p>
            <p className="text-sm font-sans">Try a different search term</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {uniqueUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 transition-all duration-200 ${
                  selectedUserId === user.id
                    ? 'bg-blue-50 border-r-2 border-blue-500'
                    : 'hover:bg-gray-50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar with Status */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(user)} rounded-full border-2 border-white`}></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate font-sans">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-sans">
                          {user.email}
                        </p>
                      </div>
                      
                      {/* Favorite Toggle */}
                      <button
                        onClick={() => toggleFavorite(user.id)}
                        className={`text-xl transition-colors duration-200 ${
                          favorites.has(user.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                        }`}
                        title={favorites.has(user.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {favorites.has(user.id) ? '❤️' : '🤍'}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400 font-sans">
                        {getStatusText(user)}
                      </span>

                    </div>
                    
                    {/* Last Activity */}
                    {user.lastActivity && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-400 font-sans">
                          Last seen: {formatLastActivity(user)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => onUserSelect(user)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Start Chat
                  </button>
                  <button className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
