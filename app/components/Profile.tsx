'use client';

import { User } from '../../types';

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
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
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg">
            {user.username.charAt(0).toUpperCase()}
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-left space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Preferred Language
                  </label>
                  <p className="text-sm text-gray-900 mt-1">{user.preferredLanguage}</p>
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
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4">
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
