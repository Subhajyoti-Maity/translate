'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ReactionSenderProps {
  onSendReaction: (reaction: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

const ReactionSender: React.FC<ReactionSenderProps> = ({
  onSendReaction,
  isVisible,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const modalRef = useRef<HTMLDivElement>(null);

  // Comprehensive reaction categories
  const reactionCategories = {
    all: [
      { emoji: '👍', label: 'Thumbs Up', keywords: ['like', 'good', 'ok', 'thumbs'] },
      { emoji: '❤️', label: 'Heart', keywords: ['love', 'heart', 'red', 'pink'] },
      { emoji: '😂', label: 'Laugh', keywords: ['laugh', 'funny', 'joy', 'tears'] },
      { emoji: '😊', label: 'Smile', keywords: ['smile', 'happy', 'cute', 'blush'] },
      { emoji: '😮', label: 'Surprise', keywords: ['surprise', 'wow', 'omg', 'shock'] },
      { emoji: '😢', label: 'Sad', keywords: ['sad', 'cry', 'tears', 'unhappy'] },
      { emoji: '😡', label: 'Angry', keywords: ['angry', 'mad', 'furious', 'rage'] },
      { emoji: '🎉', label: 'Celebrate', keywords: ['celebrate', 'party', 'congrats', 'yay'] },
      { emoji: '🔥', label: 'Fire', keywords: ['fire', 'hot', 'lit', 'amazing'] },
      { emoji: '💯', label: '100', keywords: ['100', 'perfect', 'score', 'points'] },
      { emoji: '👏', label: 'Clap', keywords: ['clap', 'applause', 'good job', 'bravo'] },
      { emoji: '🙏', label: 'Pray', keywords: ['pray', 'please', 'thank you', 'bless'] },
      { emoji: '🤔', label: 'Thinking', keywords: ['think', 'hmm', 'curious', 'question'] },
      { emoji: '😴', label: 'Sleep', keywords: ['sleep', 'tired', 'zzz', 'boring'] },
      { emoji: '🤮', label: 'Sick', keywords: ['sick', 'vomit', 'disgust', 'ew'] },
      { emoji: '💪', label: 'Muscle', keywords: ['muscle', 'strong', 'power', 'flex'] },
      { emoji: '🎯', label: 'Target', keywords: ['target', 'goal', 'focus', 'aim'] },
      { emoji: '🚀', label: 'Rocket', keywords: ['rocket', 'launch', 'fast', 'speed'] },
      { emoji: '⭐', label: 'Star', keywords: ['star', 'favorite', 'best', 'awesome'] },
      { emoji: '💎', label: 'Diamond', keywords: ['diamond', 'precious', 'valuable', 'gem'] }
    ],
    emotions: [
      { emoji: '😊', label: 'Happy', keywords: ['happy', 'joy', 'smile', 'cheerful'] },
      { emoji: '😢', label: 'Sad', keywords: ['sad', 'cry', 'tears', 'unhappy'] },
      { emoji: '😡', label: 'Angry', keywords: ['angry', 'mad', 'furious', 'rage'] },
      { emoji: '😮', label: 'Surprise', keywords: ['surprise', 'wow', 'omg', 'shock'] },
      { emoji: '😴', label: 'Sleep', keywords: ['sleep', 'tired', 'zzz', 'boring'] },
      { emoji: '🤔', label: 'Thinking', keywords: ['think', 'hmm', 'curious', 'question'] }
    ],
    actions: [
      { emoji: '👍', label: 'Thumbs Up', keywords: ['like', 'good', 'ok', 'thumbs'] },
      { emoji: '👏', label: 'Clap', keywords: ['clap', 'applause', 'good job', 'bravo'] },
      { emoji: '🙏', label: 'Pray', keywords: ['pray', 'please', 'thank you', 'bless'] },
      { emoji: '💪', label: 'Muscle', keywords: ['muscle', 'strong', 'power', 'flex'] },
      { emoji: '🎯', label: 'Target', keywords: ['target', 'goal', 'focus', 'aim'] }
    ],
    objects: [
      { emoji: '❤️', label: 'Heart', keywords: ['love', 'heart', 'red', 'pink'] },
      { emoji: '🔥', label: 'Fire', keywords: ['fire', 'hot', 'lit', 'amazing'] },
      { emoji: '💯', label: '100', keywords: ['100', 'perfect', 'score', 'points'] },
      { emoji: '⭐', label: 'Star', keywords: ['star', 'favorite', 'best', 'awesome'] },
      { emoji: '💎', label: 'Diamond', keywords: ['diamond', 'precious', 'valuable', 'gem'] },
      { emoji: '🚀', label: 'Rocket', keywords: ['rocket', 'launch', 'fast', 'speed'] }
    ]
  };

  // Filter reactions based on search query and category
  const filteredReactions = reactionCategories[selectedCategory as keyof typeof reactionCategories]
    .filter(reaction => 
      reaction.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reaction.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Handle reaction selection
  const handleReactionSelect = (reaction: string) => {
    onSendReaction(reaction);
    onClose();
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Send Reaction</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search reactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex space-x-2">
            {Object.keys(reactionCategories).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Reactions Grid */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {filteredReactions.length > 0 ? (
            <div className="grid grid-cols-5 gap-3">
              {filteredReactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReactionSelect(reaction.emoji)}
                  className="p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-100 border border-gray-200 hover:border-purple-300 transition-all duration-200 transform hover:scale-110 hover:shadow-md group"
                  title={reaction.label}
                >
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-200">
                    {reaction.emoji}
                  </div>
                  <div className="text-xs mt-2 font-medium text-gray-600 group-hover:text-purple-600 transition-colors duration-200">
                    {reaction.label}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No reactions found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            💡 Tip: Use the search to find reactions quickly
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactionSender;
