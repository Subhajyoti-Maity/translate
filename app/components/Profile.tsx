'use client';

import { useState } from 'react';
import { User, ProfileUpdateData } from '../../types';

interface ProfileProps {
  user: User;
  onProfileUpdate?: (data: ProfileUpdateData) => void;
  onRefresh?: () => void;
}

export default function Profile({ user, onProfileUpdate }: ProfileProps) {
  console.log('👤 Profile component received user:', user);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ProfileUpdateData>({
    username: user.username,
    email: user.email,
    preferredLanguage: user.preferredLanguage
  });

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
      email: user.email,
      preferredLanguage: user.preferredLanguage
    });
    setIsEditing(false);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-sm text-gray-500">Your account information</p>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-6">
        <div className="text-center">
          {/* Profile Picture/Initial */}
          <div className="relative mx-auto mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {isEditing && (
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-blue-600 transition-colors shadow-lg">
                📷
              </button>
            )}
          </div>

          {/* User Details */}
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData({...editData, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Username"
                />
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email"
                />
                <select
                  value={editData.preferredLanguage}
                  onChange={(e) => setEditData({...editData, preferredLanguage: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-left space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Preferred Language
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {user.preferredLanguage === 'en' ? 'English' :
                     user.preferredLanguage === 'es' ? 'Spanish' :
                     user.preferredLanguage === 'fr' ? 'French' :
                     user.preferredLanguage === 'de' ? 'German' :
                     user.preferredLanguage === 'zh' ? 'Chinese' :
                     user.preferredLanguage === 'ja' ? 'Japanese' :
                     user.preferredLanguage}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Member Since
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Account Type
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Standard
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 space-y-2">
              {isEditing ? (
                <div className="flex space-x-2">
                  <button 
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => {
                      console.log('🔍 Current user data:', user);
                      console.log('🔍 LocalStorage user:', localStorage.getItem('user'));
                      console.log('🔍 LocalStorage token:', localStorage.getItem('token'));
                    }}
                    className="w-full px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400 transition-colors"
                  >
                    Debug User Data
                  </button>
                  <button 
                    onClick={() => {
                      if (onRefresh) {
                        onRefresh();
                      }
                    }}
                    className="w-full px-3 py-1 bg-yellow-300 text-yellow-700 rounded-lg text-sm hover:bg-yellow-400 transition-colors"
                  >
                    Refresh Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
