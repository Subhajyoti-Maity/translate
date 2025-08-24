'use client';

import React, { useState, useEffect } from 'react';
import ReactionButton from './ReactionButton';

interface ReactionBarProps {
  messageId: string;
  userId: string;
  currentReactions: Record<string, string>;
  onReactionToggle: (messageId: string, reaction: string, userId: string) => void;
}

const ReactionBar: React.FC<ReactionBarProps> = ({
  messageId,
  userId,
  currentReactions,
  onReactionToggle
}) => {
  console.log('🎭 ReactionBar: Component rendered with props:', { messageId, userId, currentReactions });
  console.log('🎭 ReactionBar: messageId type:', typeof messageId, 'value:', messageId);
  console.log('🎭 ReactionBar: userId type:', typeof userId, 'value:', userId);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [localReactions, setLocalReactions] = useState<Record<string, string>>(currentReactions);

  // Update local reactions when props change
  useEffect(() => {
    setLocalReactions(currentReactions);
  }, [currentReactions]);

  const reactions = [
    { emoji: '👍', label: 'Thumbs Up' },
    { emoji: '❤️', label: 'Heart' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '😊', label: 'Smile' },
    { emoji: '😮', label: 'Surprise' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '😡', label: 'Angry' },
    { emoji: '🎉', label: 'Celebrate' }
  ];

  const getReactionCount = (reaction: string) => {
    if (!localReactions || typeof localReactions !== 'object') return 0;
    return Object.values(localReactions).filter(r => r === reaction).length;
  };

  const isUserReaction = (reaction: string) => {
    if (!localReactions || typeof localReactions !== 'object') return false;
    return localReactions[userId] === reaction;
  };

  const handleReactionToggle = (reaction: string) => {
    console.log('🎭 ReactionBar: handleReactionToggle called with:', { messageId, reaction, userId });
    console.log('🎭 ReactionBar: reaction type:', typeof reaction, 'value:', reaction);
    console.log('🎭 ReactionBar: messageId type:', typeof messageId, 'value:', messageId);
    
    // Validate reaction is a valid emoji
    const validReactions = ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉'];
    if (!validReactions.includes(reaction)) {
      console.error('❌ ReactionBar: Invalid reaction emoji:', reaction);
      console.error('❌ ReactionBar: Expected emoji, got:', reaction);
      return;
    }
    
    // Optimistically update local state
    const newReactions = { ...localReactions };
    if (isUserReaction(reaction)) {
      delete newReactions[userId];
    } else {
      newReactions[userId] = reaction;
    }
    setLocalReactions(newReactions);
    
    // Call the parent handler with correct parameter order
    console.log('🎭 ReactionBar: Calling onReactionToggle with:', { messageId, reaction, userId });
    onReactionToggle(messageId, reaction, userId);
  };

  // Create a wrapper function that matches ReactionButton's expected interface
  const handleReactionButtonToggle = (messageId: string, reaction: string, userId: string) => {
    console.log('🎭 ReactionBar: handleReactionButtonToggle called with:', { messageId, reaction, userId });
    // Validate reaction is a valid emoji
    const validReactions = ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉'];
    if (!validReactions.includes(reaction)) {
      console.error('❌ ReactionBar: Invalid reaction emoji:', reaction);
      console.error('❌ ReactionBar: Expected emoji, got:', reaction);
      return;
    }
    
    // Optimistically update local state
    const newReactions = { ...localReactions };
    if (isUserReaction(reaction)) {
      delete newReactions[userId];
    } else {
      newReactions[userId] = reaction;
    }
    setLocalReactions(newReactions);
    
    // Call the parent handler with correct parameter order
    console.log('🎭 ReactionBar: Calling onReactionToggle with:', { messageId, reaction, userId });
    onReactionToggle(messageId, reaction, userId);
  };

  // Close expanded reactions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  return (
    <div className="relative">
      {/* Quick reaction buttons */}
      <div className="flex items-center space-x-1 mb-2">
        {reactions.slice(0, 4).map(({ emoji, label }) => {
          // Safety check: ensure emoji is valid
          if (!emoji || typeof emoji !== 'string' || emoji.length === 0) {
            console.error('❌ ReactionBar: Invalid emoji in reactions array:', emoji);
            return null;
          }
          
          return (
            <ReactionButton
              key={emoji}
              reaction={emoji}
              messageId={messageId}
              userId={userId}
              isActive={isUserReaction(emoji)}
              count={getReactionCount(emoji)}
              onReactionToggle={handleReactionButtonToggle}
            />
          );
        })}
        
        {/* Expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm">+</span>
        </button>
      </div>

      {/* Expanded reactions */}
      {isExpanded && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="grid grid-cols-4 gap-2">
            {reactions.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionToggle(emoji);
                  setIsExpanded(false);
                }}
                className={`
                  p-2 rounded-lg text-center transition-all duration-200 hover:scale-110
                  ${isUserReaction(emoji) 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }
                `}
                title={label}
              >
                <div className="text-xl">{emoji}</div>
                <div className="text-xs mt-1">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current reactions display */}
      {Object.keys(localReactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {/* Group reactions by emoji and show count */}
          {Object.entries(
            Object.values(localReactions).reduce((acc, reaction) => {
              acc[reaction] = (acc[reaction] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([reaction, count]) => (
            <span
              key={reaction}
              className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs"
              title={`${reaction} (${count} reaction${count > 1 ? 's' : ''})`}
            >
              <span className="mr-1">{reaction}</span>
              <span className="text-blue-500 font-medium">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
