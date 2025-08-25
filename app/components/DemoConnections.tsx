'use client';

import { useState, useEffect } from 'react';
import { User } from '../../types';

interface DemoConnectionsProps {
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
  currentUserId: string;
}

export default function DemoConnections({ onUserSelect, selectedUserId, currentUserId }: DemoConnectionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  // Fetch all users when component mounts
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`/api/users/search?q=&userId=${currentUserId}`);
      const data = await response.json();
      if (data.users) {
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch all users:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      // Real search functionality
      setIsLoading(true);
      const searchUsers = async () => {
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUserId}`);
          const data = await response.json();
          if (data.users) {
            setUsers(data.users);
          } else {
            setUsers([]);
          }
        } catch (error) {
          console.error('Search failed:', error);
          setUsers([]);
        } finally {
          setIsLoading(false);
        }
      };

      // Debounce search
      const debounceTimer = setTimeout(searchUsers, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setUsers([]);
      setIsLoading(false);
    }
  }, [searchQuery, currentUserId]);

  // Demo favorites (you can later implement real favorites from database)
  const favoriteUsers: User[] = allUsers?.slice(0, 2) || []; // First 2 users as favorites for demo

  const getLastMessagePreview = (user: User) => {
    // This would typically come from the last message in the conversation
    // For now, we'll show a placeholder
    return "Hello! How are you doing?";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };

  // Display users based on search or show all users
  const displayUsers = searchQuery.trim() ? users : allUsers || [];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 font-sans">Connections</h1>
        <p className="text-sm text-gray-500 font-sans">Your chat conversations</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 font-sans text-sm transition-all duration-200"
          />
        </div>
      </div>

      {/* Favorites Section */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 font-sans">Favorites</h3>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            {showFavorites ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showFavorites && (
          <div className="mt-3 space-y-2">
            {favoriteUsers.map((user) => (
              <div
                key={`fav-${user.id}`}
                onClick={() => onUserSelect(user)}
                className={`flex items-center space-x-3 p-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedUserId === user.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 hover:shadow-sm'
                }`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  ❤️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate font-sans">
                    {user.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() && users.length === 0 && !isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-sans">No users found</p>
            <p className="text-sm font-sans">Try a different search term</p>
          </div>
        ) : displayUsers.length === 0 && !searchQuery.trim() ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p className="font-sans">No users available</p>
            <p className="text-sm font-sans">Register more users to start chatting</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => onUserSelect(user)}
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  selectedUserId === user.id
                    ? 'bg-blue-50 border-r-2 border-blue-500 shadow-sm'
                    : 'hover:bg-gray-50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate font-sans">
                        {user.username}
                      </h3>
                      <span className="text-xs text-gray-400 font-sans">
                        {user.lastSeen ? formatTime(user.lastSeen) : 'Now'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1 font-sans">
                      {getLastMessagePreview(user)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="p-4 text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-500 font-sans">Searching...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
