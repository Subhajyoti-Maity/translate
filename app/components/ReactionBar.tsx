'use client';

import React, { useState, useEffect } from 'react';

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
  
  const [localReactions, setLocalReactions] = useState<Record<string, string>>(currentReactions);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [customEmojiLabel, setCustomEmojiLabel] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Default emojis - Extended list matching server validation
  const [reactions, setReactions] = useState([
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '😊', label: 'Smile' },
    { emoji: '😮', label: 'Surprised' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '😡', label: 'Angry' },
    { emoji: '🎉', label: 'Celebrate' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '💯', label: '100' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '🙏', label: 'Pray' },
    { emoji: '🤔', label: 'Thinking' },
    { emoji: '😴', label: 'Sleepy' },
    { emoji: '🤮', label: 'Sick' },
    { emoji: '💪', label: 'Strong' },
    { emoji: '🎯', label: 'Target' },
    { emoji: '🚀', label: 'Rocket' },
    { emoji: '⭐', label: 'Star' },
    { emoji: '💎', label: 'Diamond' }
  ]);

  // Load custom emojis from localStorage
  useEffect(() => {
    const savedReactions = localStorage.getItem('customReactions');
    if (savedReactions) {
      try {
        const parsed = JSON.parse(savedReactions);
        // Ensure no duplicate emojis when loading from localStorage
        const uniqueReactions = parsed.filter((reaction: any, index: number, self: any[]) => 
          index === self.findIndex((r: any) => r.emoji === reaction.emoji)
        );
        setReactions(uniqueReactions);
        console.log('📱 Loaded custom reactions from localStorage:', uniqueReactions);
      } catch (error) {
        console.error('Error loading custom reactions:', error);
        console.log('📱 Falling back to default reactions due to error');
      }
    } else {
      console.log('📱 No saved reactions found, using defaults');
    }
  }, []);

  // Save reactions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customReactions', JSON.stringify(reactions));
    console.log('💾 Saved reactions to localStorage:', reactions);
  }, [reactions]);

  // Update local reactions when props change
  useEffect(() => {
    console.log('🎭 ReactionBar: currentReactions updated:', currentReactions);
    console.log('🎭 ReactionBar: currentReactions type:', typeof currentReactions);
    console.log('🎭 ReactionBar: currentReactions keys:', Object.keys(currentReactions || {}));
    setLocalReactions(currentReactions);
  }, [currentReactions]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Close expanded reactions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // No longer needed as we don't have an expand state
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); // Empty dependency array as we don't have an expand state

  const isUserReaction = (reaction: string) => {
    if (!localReactions || typeof localReactions !== 'object') return false;
    return localReactions[userId] === reaction;
  };

  const handleReactionToggle = (reaction: string) => {
    console.log('🎭 ReactionBar: handleReactionToggle called with:', { messageId, reaction, userId });
    console.log('🎭 ReactionBar: reaction type:', typeof reaction, 'value:', reaction);
    console.log('🎭 ReactionBar: messageId type:', typeof messageId, 'value:', messageId);
    
    // Validate messageId
    if (!messageId || messageId === 'undefined' || messageId === 'null') {
      console.error('❌ ReactionBar: Invalid messageId for reaction:', messageId);
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

  // Add custom emoji
  const handleAddCustomEmoji = () => {
    if (customEmoji.trim() && customEmojiLabel.trim()) {
      const newReaction = {
        emoji: customEmoji.trim(),
        label: customEmojiLabel.trim()
      };
      
      // Check if emoji already exists
      const exists = reactions.some(r => r.emoji === newReaction.emoji);
      if (!exists) {
        // Ensure we don't exceed a reasonable limit to prevent performance issues
        if (reactions.length >= 20) {
          alert('Maximum of 20 custom emojis allowed!');
          return;
        }
        
        const updatedReactions = [...reactions, newReaction];
        setReactions(updatedReactions);
        setCustomEmoji('');
        setCustomEmojiLabel('');
        setShowCustomEmojiInput(false);
        setSuccessMessage(`Emoji "${newReaction.emoji}" added!`);
        console.log('✅ Added custom emoji:', newReaction);
      } else {
        alert('This emoji already exists!');
      }
    }
  };

  // Remove emoji
  const handleRemoveEmoji = (emojiToRemove: string) => {
    console.log('🗑️ Attempting to remove emoji:', emojiToRemove);
    
    // Don't allow removing if it's the last emoji
    if (reactions.length <= 1) {
      alert('You must have at least one emoji!');
      return;
    }
    
    // Safety check: ensure emojiToRemove is valid
    if (!emojiToRemove || typeof emojiToRemove !== 'string') {
      console.error('❌ Invalid emoji to remove:', emojiToRemove);
      return;
    }
    
    const updatedReactions = reactions.filter(r => r.emoji !== emojiToRemove);
    
    // Ensure we still have unique reactions after removal
    const uniqueUpdatedReactions = updatedReactions.filter((reaction, index, self) => 
      index === self.findIndex((r) => r.emoji === reaction.emoji)
    );
    
    setReactions(uniqueUpdatedReactions);
    setSuccessMessage(`Emoji "${emojiToRemove}" removed!`);
    console.log('✅ Removed emoji:', emojiToRemove, 'New count:', uniqueUpdatedReactions.length);
  };

  // Reset to default emojis
  const handleResetToDefault = () => {
    console.log('🔄 Resetting to default emojis');
    const defaultReactions = [
      { emoji: '👍', label: 'Like' },
      { emoji: '❤️', label: 'Love' },
      { emoji: '😂', label: 'Laugh' },
      { emoji: '😊', label: 'Smile' },
      { emoji: '😮', label: 'Surprised' },
      { emoji: '😢', label: 'Sad' },
      { emoji: '😡', label: 'Angry' },
      { emoji: '🎉', label: 'Celebrate' },
      { emoji: '🔥', label: 'Fire' },
      { emoji: '💯', label: '100' },
      { emoji: '👏', label: 'Clap' },
      { emoji: '🙏', label: 'Pray' },
      { emoji: '🤔', label: 'Thinking' },
      { emoji: '😴', label: 'Sleepy' },
      { emoji: '🤮', label: 'Sick' },
      { emoji: '💪', label: 'Strong' },
      { emoji: '🎯', label: 'Target' },
      { emoji: '🚀', label: 'Rocket' },
      { emoji: '⭐', label: 'Star' },
      { emoji: '💎', label: 'Diamond' }
    ];
    // Ensure default reactions are always unique
    const uniqueDefaultReactions = defaultReactions.filter((reaction, index, self) => 
      index === self.findIndex((r) => r.emoji === reaction.emoji)
    );
    setReactions(uniqueDefaultReactions);
    localStorage.removeItem('customReactions');
    setSuccessMessage('Emojis reset to default!');
    console.log('✅ Reset to default emojis completed');
  };

  return (
    <div className="relative">
      {/* All emojis visible with management - No more hidden emojis */}
      <div className="flex items-center space-x-2 mb-3 flex-wrap gap-2">
        {reactions
          .filter(({ emoji }) => emoji && typeof emoji === 'string' && emoji.length > 0) // Filter out invalid emojis
          .map(({ emoji, label }, index) => {
            // Additional safety check: ensure emoji is valid
            if (!emoji || typeof emoji !== 'string' || emoji.length === 0) {
              console.error('❌ ReactionBar: Invalid emoji in reactions array:', emoji);
              return null;
            }
            
            return (
              <div key={`reaction-${emoji}-${index}`} className="relative group">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionToggle(emoji);
                }}
                className={`
                  px-3 py-2 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md
                  ${isUserReaction(emoji) 
                    ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 border border-blue-200' 
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 hover:from-gray-100 hover:to-gray-200 border border-gray-200 hover:border-gray-300'
                  }
                `}
                title={`${label} - Click to react`}
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-xs ml-1 opacity-80">{label}</span>
              </button>
              
              {/* Remove button - always visible for easy management */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🗑️ Remove button clicked for emoji:', emoji);
                  handleRemoveEmoji(emoji);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-80 hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-md flex items-center justify-center font-bold"
                title={`Remove ${label}`}
              >
                ×
              </button>
            </div>
          );
        })}
        
        {/* Add new emoji button - always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCustomEmojiInput(!showCustomEmojiInput);
          }}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-200 hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
          title="Add new emoji"
        >
          <span className="text-lg">➕</span>
          <span className="text-xs ml-1">Add</span>
        </button>
        
        {/* Reset button - always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleResetToDefault();
          }}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white border border-gray-200 hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
          title="Reset to default emojis"
        >
          <span className="text-lg">🔄</span>
          <span className="text-xs ml-1">Reset</span>
        </button>
        
        {/* Helpful hint */}
        <div className="text-xs text-gray-400 ml-2">
          {reactions.length} emoji{reactions.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Custom Emoji Input - Show below emojis */}
      {showCustomEmojiInput && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">Add Custom Emoji</div>
          
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              placeholder="Enter emoji (e.g., 🚀)"
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={2}
            />
            <input
              type="text"
              placeholder="Label (e.g., Rocket)"
              value={customEmojiLabel}
              onChange={(e) => setCustomEmojiLabel(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={20}
            />
          </div>
          
          {/* Quick Emoji Picker */}
          <div className="text-xs text-gray-600 mb-2">Quick pick:</div>
          <div className="grid grid-cols-8 gap-1 mb-2">
            {['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉', '🔥', '💯', '👏', '🙏', '🤔', '😴', '🤮', '💪', '🎯', '🚀', '⭐', '💎', '🌟', '🎨', '🎭', '🎪']
              .filter(emoji => emoji && typeof emoji === 'string' && emoji.length > 0)
              .slice(0, 24)
              .map((emoji, index) => (
                <button
                  key={`quick-emoji-${emoji}-${index}`}
                  onClick={() => {
                    setCustomEmoji(emoji);
                    console.log('🎯 Quick picked emoji:', emoji);
                  }}
                  className="w-8 h-8 text-lg hover:bg-gray-200 rounded transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                  title={`Use ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
          </div>
          
          <button
            onClick={() => {
              console.log('➕ Add button clicked with:', { emoji: customEmoji, label: customEmojiLabel });
              handleAddCustomEmoji();
            }}
            disabled={!customEmoji.trim() || !customEmojiLabel.trim()}
            className={`w-full px-3 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
              customEmoji.trim() && customEmojiLabel.trim()
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Add Custom Emoji
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm text-center">
          {successMessage}
        </div>
      )}

      {/* Current reactions display */}
      {Object.keys(localReactions).length > 0 && (
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50">
          <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center">
            <span className="mr-2">🎭</span>
            Reactions ({Object.keys(localReactions).length})
          </div>
          
          {/* Group reactions by emoji and show count with user info */}
          {Object.entries(
            Object.values(localReactions)
              .filter(reaction => reaction && typeof reaction === 'string' && reaction.length > 0)
              .reduce((acc, reaction) => {
                acc[reaction] = (acc[reaction] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
          ).map(([reaction, count], index) => (
            <div
              key={`reaction-display-${reaction}-${index}`}
              className="inline-flex items-center px-3 py-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-full text-sm font-medium border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 mr-2 mb-2"
              title={`${reaction} (${count} reaction${count > 1 ? 's' : ''})`}
            >
              <span className="mr-2 text-lg">{reaction}</span>
              <span className="text-blue-500 font-bold bg-blue-100/60 px-2 py-1 rounded-full text-xs">{count}</span>
            </div>
          ))}
          
          {/* Show individual user reactions */}
          <div className="mt-2 text-xs text-blue-600">
            {Object.entries(localReactions).map(([userId, reaction], index) => (
              <span key={`user-reaction-${userId}-${index}`} className="inline-block mr-2 mb-1">
                <span className="text-sm">{reaction}</span>
                <span className="text-blue-500 opacity-75">•</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
