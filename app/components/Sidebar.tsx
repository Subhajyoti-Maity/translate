'use client';

import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userCount?: number;
  isOnline?: boolean;
}

export default function Sidebar({ activeTab, onTabChange, userCount = 0, isOnline }: SidebarProps) {
  const tabs = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'connections', icon: '🔗', label: 'Connections' },
    { id: 'favorites', icon: '❤️', label: 'Favorites' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 shadow-lg">
      {/* Logo */}
      <div className="mb-8 relative">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow duration-200">
          C
        </div>
        {/* Online Status Indicator */}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
          isOnline ? 'bg-green-400' : 'bg-gray-400'
        }`} title={isOnline ? 'Online' : 'Offline'}></div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col space-y-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-110'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:shadow-md hover:scale-105'
            }`}
            title={tab.label}
          >
            {tab.icon}
            
            {/* User count badge for connections tab */}
            {tab.id === 'connections' && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                {userCount || '--'}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Spacer */}
      <div className="flex-1" />
      
      {/* Version Info */}
      <div className="text-xs text-gray-400 text-center px-2">
        <div className="font-mono">v1.0</div>
        <div className="text-gray-300">Chat App</div>
      </div>
    </div>
  );
}
