'use client';

import { useState, useEffect } from 'react';
import { User } from '../../types';

interface FavoritesProps {
  currentUserId: string;
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
}

export default function Favorites({ currentUserId, onUserSelect, selectedUserId }: FavoritesProps) {
  const [favoriteUsers, setFavoriteUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch all users and use first few as favorites for demo
    // In a real app, you would have a separate favorites system
    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/users/search?q=&userId=${currentUserId}`);
        const data = await response.json();
        if (data.users) {
          // Use first 2 users as favorites for demo purposes
          const usersWithFavorites = data.users.slice(0, 2).map((user: any) => ({
            ...user,
            isFavorite: true
          }));
          setFavoriteUsers(usersWithFavorites);
        }
      } catch (error) {
        console.error('Failed to fetch users for favorites:', error);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  const removeFromFavorites = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`/api/users/favorites?favoriteUserId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFavoriteUsers(prev => prev.filter(user => user.id !== userId));
      } else {
        console.error('Failed to remove from favorites');
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

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

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 font-sans">Favorites</h1>
        <p className="text-sm text-gray-500 font-sans">Your favorite connections</p>
      </div>

      {/* Favorites List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Loading favorites...</span>
            </div>
          </div>
        ) : favoriteUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">❤️</div>
            <p className="font-sans">No favorites yet</p>
            <p className="text-sm font-sans">Mark users as favorites to see them here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {favoriteUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 transition-all duration-200 ${
                  selectedUserId === user.id
                    ? 'bg-blue-50 border-r-2 border-blue-500'
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
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate font-sans">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-sans">
                          {getLastMessagePreview(user)}
                        </p>
                      </div>
                      
                      {/* Remove from favorites button */}
                      <button
                        onClick={() => removeFromFavorites(user.id)}
                        className="text-red-400 hover:text-red-600 transition-colors duration-200 p-1"
                        title="Remove from favorites"
                      >
                        ❌
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400 font-sans">
                        {formatTime(user.createdAt)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Favorite
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
                    Chat
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
