'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '../../types';

interface ConnectionsProps {
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
  currentUserId: string;
}

export default function Connections({ onUserSelect, selectedUserId, currentUserId }: ConnectionsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      if (currentUserId) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/users/search?q=${searchQuery}&userId=${currentUserId}`);
          const data = await response.json();
          if (data.users) {
            setUsers(data.users);
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }, 300); // 300ms debounce
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, currentUserId]);

  // Initial fetch when component mounts (only run once)
  useEffect(() => {
    if (currentUserId) {
      const initialFetch = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/users/search?q=&userId=${currentUserId}`);
          const data = await response.json();
          if (data.users) {
            setUsers(data.users);
          }
        } catch (error) {
          console.error('Failed to fetch users:', error);
        } finally {
          setIsLoading(false);
        }
      };
      initialFetch();
    }
  }, [currentUserId]); // Only depend on currentUserId, not fetchUsers

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
          setUsers(data.users);
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-400';
      case 'away':
        return 'bg-yellow-400';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-green-400';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'offline':
        return 'Offline';
      default:
        return 'Online';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
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
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-sans">No users found</p>
            <p className="text-sm font-sans">Try a different search term</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
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
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(user.status)} rounded-full border-2 border-white`}></div>
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
                        {getStatusText(user.status)}
                      </span>
                      <span className="text-xs text-gray-500 font-sans">
                        {user.preferredLanguage}
                      </span>
                    </div>
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
