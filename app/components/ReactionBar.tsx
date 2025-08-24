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
      <div className="flex items-center space-x-2 mb-3">
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
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md group"
        >
          <span className="text-sm font-medium group-hover:text-purple-600 transition-colors duration-200">+</span>
        </button>
      </div>

      {/* Expanded reactions */}
      {isExpanded && (
        <div className="absolute bottom-full left-0 mb-3 p-4 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-2xl z-10 animate-in slide-in-from-bottom-2 duration-200">
          <div className="grid grid-cols-4 gap-3">
            {reactions.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionToggle(emoji);
                  setIsExpanded(false);
                }}
                className={`
                  p-3 rounded-xl text-center transition-all duration-200 hover:scale-110 transform group
                  ${isUserReaction(emoji) 
                    ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 border border-blue-200 shadow-md' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 hover:from-gray-100 hover:to-gray-200 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
                title={label}
              >
                <div className="text-2xl group-hover:scale-110 transition-transform duration-200">{emoji}</div>
                <div className="text-xs mt-2 font-medium opacity-80">{label}</div>
              </button>
            ))}
          </div>
          
          {/* Close button */}
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Current reactions display */}
      {Object.keys(localReactions).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {/* Group reactions by emoji and show count */}
          {Object.entries(
            Object.values(localReactions).reduce((acc, reaction) => {
              acc[reaction] = (acc[reaction] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([reaction, count]) => (
            <span
              key={reaction}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 rounded-full text-xs font-medium border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
              title={`${reaction} (${count} reaction${count > 1 ? 's' : ''})`}
            >
              <span className="mr-1.5 text-sm">{reaction}</span>
              <span className="text-blue-500 font-semibold bg-white/60 px-1.5 py-0.5 rounded-full text-xs">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
