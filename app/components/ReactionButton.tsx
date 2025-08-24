'use client';

import React, { useState } from 'react';

interface ReactionButtonProps {
  reaction: string;
  messageId: string;
  userId: string;
  isActive: boolean;
  count: number;
  onReactionToggle: (messageId: string, reaction: string, userId: string) => void;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({
  reaction,
  messageId,
  userId,
  isActive,
  count,
  onReactionToggle
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🎭 ReactionButton: handleClick called with props:', { reaction, messageId, userId });
    console.log('🎭 ReactionButton: reaction type:', typeof reaction, 'value:', reaction);
    console.log('🎭 ReactionButton: messageId type:', typeof messageId, 'value:', messageId);
    // Fix: Pass parameters in correct order: messageId, reaction, userId
    onReactionToggle(messageId, reaction, userId);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative px-3 py-2 rounded-xl text-sm transition-all duration-300 cursor-pointer transform hover:scale-110 group
        ${isActive 
          ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 border border-blue-200 shadow-md hover:shadow-lg' 
          : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200 hover:from-gray-100 hover:to-gray-200 hover:border-gray-300 hover:shadow-md'
        }
        ${isHovered ? 'scale-110' : 'scale-100'}
        ${isActive && isHovered ? 'shadow-lg' : ''}
      `}
      title={`${reaction} ${count > 0 ? `(${count})` : ''}`}
    >
      {/* Background glow effect for active state */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-200 to-purple-200 opacity-20 animate-pulse"></div>
      )}
      
      <div className="relative z-10 flex items-center space-x-2">
        <span className={`text-lg transition-transform duration-200 ${isHovered ? 'scale-110' : 'scale-100'}`}>
          {reaction}
        </span>
        {count > 0 && (
          <span className={`
            text-xs font-semibold px-2 py-1 rounded-full transition-all duration-200
            ${isActive 
              ? 'bg-gradient-to-r from-blue-200 to-purple-200 text-blue-700 border border-blue-300 shadow-sm' 
              : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 border border-gray-400 shadow-sm'
            }
          `}>
            {count}
          </span>
        )}
      </div>
      
      {/* Hover effect ring */}
      {isHovered && (
        <div className={`absolute inset-0 rounded-xl border-2 border-dashed transition-all duration-300 ${
          isActive ? 'border-blue-300' : 'border-gray-300'
        }`}></div>
      )}
    </button>
  );
};

export default ReactionButton;
