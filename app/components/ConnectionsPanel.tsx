'use client';

import { useState, useEffect } from 'react';
import { User } from '../../types';

interface ConnectionsPanelProps {
  onUserSelect: (user: User) => void;
  currentUserId: string;
  selectedUserId?: string;
}

export default function ConnectionsPanel({ onUserSelect, currentUserId, selectedUserId }: ConnectionsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUserId}`);
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Failed to search users:', error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentUserId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getLastMessagePreview = (user: User) => {
    // This would typically come from the last message in the conversation
    // For now, we'll show a placeholder
    return "Hello! How are you doing?";
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connections</h1>
        <p className="text-sm text-gray-500">Your chat conversations</p>
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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 && searchQuery.trim() && !isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>No users found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : users.length === 0 && !searchQuery.trim() ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>Search for users to start chatting</p>
            <p className="text-sm">Type a name or email above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => onUserSelect(user)}
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  selectedUserId === user.id
                    ? 'bg-blue-50 border-r-2 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {user.username}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {user.lastSeen ? formatTime(user.lastSeen) : 'Now'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">
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
              <span className="text-sm text-gray-500">Searching...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
