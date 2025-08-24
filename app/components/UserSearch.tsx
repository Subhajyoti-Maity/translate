'use client';

import { useState, useEffect } from 'react';
import { User } from '../../types';

interface UserSearchProps {
  onUserSelect: (user: User) => void;
  currentUserId: string;
}

export default function UserSearch({ onUserSelect, currentUserId }: UserSearchProps) {
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 && searchQuery.trim() && !isLoading ? (
          <div className="p-4 text-center text-gray-500">
            No users found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{user.username}</h3>

                  </div>
                  <div className="text-xs text-gray-400">
                    {user.lastSeen ? (
                      new Date(user.lastSeen).toLocaleDateString()
                    ) : (
                      'New user'
                    )}
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
