'use client';

import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'favorites', icon: '❤️', label: 'Favorites' },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
          L
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col space-y-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-600 shadow-md'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:shadow-sm'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Bottom Spacer */}
      <div className="flex-1" />
    </div>
  );
}
