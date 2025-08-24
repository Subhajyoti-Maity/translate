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
        relative px-2 py-1 rounded-full text-sm transition-all duration-200 cursor-pointer
        ${isActive 
          ? 'bg-blue-100 text-blue-600 border border-blue-300 shadow-sm' 
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
        }
        ${isHovered ? 'scale-110' : 'scale-100'}
        ${isActive && isHovered ? 'shadow-md' : ''}
      `}
      title={`${reaction} ${count > 0 ? `(${count})` : ''}`}
    >
      <span className="text-lg">{reaction}</span>
      {count > 0 && (
        <span className={`
          ml-1 text-xs font-medium px-1 py-0.5 rounded-full
          ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-700'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
};

export default ReactionButton;
