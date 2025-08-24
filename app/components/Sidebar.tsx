'use client';

import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userCount?: number;
  isOnline?: boolean;
  onLogout?: () => void;
  onDeleteConnections?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, userCount = 0, isOnline, onLogout, onDeleteConnections }: SidebarProps) {
  const tabs = [
    { id: 'chat', icon: '💬', label: 'Chat', color: 'from-blue-500 to-blue-600' },
    { id: 'connections', icon: '🔗', label: 'Connections', color: 'from-purple-500 to-purple-600' },
    { id: 'favorites', icon: '❤️', label: 'Favorites', color: 'from-pink-500 to-pink-600' },
    { id: 'profile', icon: '👤', label: 'Profile', color: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="w-20 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200/50 flex flex-col items-center py-8 shadow-2xl backdrop-blur-sm">
      {/* Logo */}
      <div className="mb-10 relative group">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 group-hover:rotate-3">
          <span className="bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent font-black">
            C
          </span>
        </div>
        
        {/* Animated Ring */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
        
        {/* Online Status Indicator */}
        <div className={`absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-3 border-white shadow-lg transition-all duration-300 ${
          isOnline 
            ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse' 
            : 'bg-gradient-to-r from-gray-400 to-gray-500'
        }`} title={isOnline ? 'Online' : 'Offline'}>
          {isOnline && (
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col space-y-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 transform hover:scale-110 group ${
              activeTab === tab.id
                ? `bg-gradient-to-br ${tab.color} text-white shadow-xl scale-110 ring-4 ring-opacity-30 ring-current`
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/80 hover:shadow-lg hover:scale-105'
            }`}
            title={tab.label}
          >
            <span className="transition-transform duration-300 group-hover:scale-110">
              {tab.icon}
            </span>
            
            {/* User count badge for connections tab */}
            {tab.id === 'connections' && userCount > 0 && (
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-bounce">
                {userCount}
              </div>
            )}
            
            {/* Hover Effect */}
            {activeTab !== tab.id && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Spacer */}
      <div className="flex-1" />
      
      {/* Action Buttons - Positioned in middle */}
      {onLogout && onDeleteConnections && (
        <div className="mb-6 space-y-3">
          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-14 h-12 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl font-medium text-sm flex items-center justify-center group relative"
            title="Logout"
          >
            <span className="transition-transform duration-300 group-hover:scale-110">🚪</span>
            
            {/* Hover Effect Ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
          
          {/* Delete Connections Button */}
          <button
            onClick={onDeleteConnections}
            className="w-14 h-12 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl font-medium text-sm flex items-center justify-center group relative"
            title="Delete Connections"
          >
            <span className="transition-transform duration-300 group-hover:scale-110">🗑️</span>
            
            {/* Hover Effect Ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        </div>
      )}
      
      {/* Version Info */}
      <div className="text-center px-3 py-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl shadow-lg">
        <div className="text-xs font-bold text-gray-600 mb-1">v1.0</div>
        <div className="text-xs text-gray-500 font-medium">Chat App</div>
        <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto mt-2 rounded-full"></div>
      </div>
    </div>
  );
}
