'use client';

import { useState, useEffect } from 'react';
import { User, ProfileUpdateData, Session } from '../../types';

interface ProfileProps {
  user: User;
  onProfileUpdate?: (data: ProfileUpdateData) => void;
  onRefresh?: () => void;
}

export default function Profile({ user, onProfileUpdate, onRefresh }: ProfileProps) {
  console.log('👤 Profile component received user:', user);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ProfileUpdateData>({
    username: user.username,
    email: user.email
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoadingSessions(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found for session management');
          setSessions([]);
          return;
        }

        const response = await fetch(`/api/users/sessions?userId=${user.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        } else {
          const error = await response.json();
          console.error('Failed to fetch sessions:', error);
          // Don't show alert, just log the error and set empty sessions
          setSessions([]);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        // Don't show alert, just log the error and set empty sessions
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    if (user?.id) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      console.log('🔄 Updating profile with data:', editData);

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });

      console.log('📡 Profile update response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Profile update successful:', result);
        
        if (onProfileUpdate) {
          onProfileUpdate(editData);
        }
        setIsEditing(false);
        console.log('Profile updated successfully');
      } else {
        const error = await response.json();
        console.error('❌ Failed to update profile:', error);
        
        // Show more specific error message
        const errorMessage = error.error || 'Unknown error occurred';
        alert(`Failed to update profile: ${errorMessage}`);
      }
    } catch (error) {
      console.error('💥 Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditData({
      username: user.username,
      email: user.email
    });
    setIsEditing(false);
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(`/api/users/sessions?userId=${user.id}&sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove session from local state
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        console.log('Session terminated successfully');
      } else {
        const error = await response.json();
        console.error('Failed to terminate session:', error);
        // Don't show alert, just log the error
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      // Don't show alert, just log the error
    }
  };

  return (
    <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200/50 flex flex-col shadow-xl">
      {/* Header */}
      <div className="p-8 border-b border-gray-200/50 bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">👤</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-sm text-gray-500 font-medium">Your account information</p>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="text-center">
          {/* Profile Picture/Initial */}
          <div className="relative mx-auto mb-8 group">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-2xl group-hover:shadow-3xl transition-all duration-300 transform group-hover:scale-105">
              {user.username.charAt(0).toUpperCase()}
            </div>
            
            {/* Animated Ring */}
            <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
            
            {isEditing && (
              <button className="absolute -bottom-3 -right-3 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-110 shadow-lg hover:shadow-xl">
                📷
              </button>
            )}
          </div>

          {/* User Details */}
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({...editData, username: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    placeholder="Username"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">👤</span>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                    placeholder="Email"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">📧</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {user.username}
                </h2>
                <p className="text-lg text-gray-600 font-medium">{user.email}</p>
              </div>
            )}

            {/* Profile Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50">
              <div className="text-left space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Member Since
                    </label>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📅</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </label>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Active
                      </span>
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">✅</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200/50">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Account Type
                    </label>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                        Standard
                      </span>
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">👑</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 space-y-3">
              {isEditing ? (
                <div className="flex space-x-3">
                  <button 
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                  >
                    💾 Save Changes
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                  >
                    ❌ Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                  >
                    ✏️ Edit Profile
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        console.log('🔍 Current user data:', user);
                        console.log('🔍 LocalStorage user:', localStorage.getItem('user'));
                        console.log('🔍 LocalStorage token:', localStorage.getItem('token'));
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 rounded-xl text-sm hover:from-gray-400 hover:to-gray-500 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md font-medium"
                    >
                      🐛 Debug
                    </button>
                    <button 
                      onClick={() => {
                        if (onRefresh) {
                          onRefresh();
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-300 to-orange-400 text-yellow-800 rounded-xl text-sm hover:from-yellow-400 hover:to-orange-500 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md font-medium"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🔐</span>
                Active Sessions
              </h3>
              
              {loadingSessions ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading sessions...</p>
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session, index) => (
                    <div key={session.sessionId} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {session.deviceInfo}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Last active: {new Date(session.lastActivity).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Session ID: {session.sessionId.substring(0, 8)}...
                          </p>
                        </div>
                        <button
                          onClick={() => handleTerminateSession(session.sessionId)}
                          className="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                        >
                          🚫 Terminate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No active sessions found</p>
                </div>
              )}
              
              <div className="mt-4 text-xs text-gray-400 text-center">
                You can be logged in from multiple devices simultaneously
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
