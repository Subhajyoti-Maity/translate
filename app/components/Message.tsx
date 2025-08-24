'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ReactionBar from './ReactionBar';

interface MessageProps {
  message: {
    _id: string;
    text: string;
    timestamp: string;
    senderId: string;
    receiverId: string;
    reactions?: Record<string, string>;
  };
  isOwnMessage: boolean;
  currentUserId: string;
  onReactionToggle: (messageId: string, reaction: string, userId: string) => void;
  onForwardMessage?: (messageId: string, text: string) => void;
  availableUsers?: Array<{ id: string; username: string; email: string }>;
}

const Message: React.FC<MessageProps> = ({ 
  message, 
  isOwnMessage, 
  currentUserId,
  onReactionToggle,
  onForwardMessage,
  availableUsers = []
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [currentReactions, setCurrentReactions] = useState<Record<string, string>>(
    message.reactions || {}
  );

  // Update reactions when they change
  useEffect(() => {
    if (message.reactions) {
      setCurrentReactions(message.reactions);
    }
  }, [message.reactions]);

  const handleReactionToggle = (reaction: string) => {
    onReactionToggle(message._id, reaction, currentUserId);
  };

  const handleForward = () => {
    if (selectedRecipient && onForwardMessage) {
      onForwardMessage(message._id, message.text);
      setShowForwardModal(false);
      setSelectedRecipient('');
    }
  };

  const openForwardModal = () => {
    setShowForwardModal(true);
  };

  return (
    <>
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-6 group`}>
        <div className={`max-w-xs lg:max-w-md relative ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {/* Avatar for other user's messages */}
          {!isOwnMessage && (
            <div className="flex items-end space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md">
                U
              </div>
              <span className="text-xs text-gray-500 font-medium">User</span>
            </div>
          )}
          
          <div className={`relative ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
            <div className={`
              px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105
              ${isOwnMessage 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-blue-200/50' 
                : 'bg-white text-gray-800 shadow-gray-200/50 border border-gray-100'
              }
            `}>
              {/* Message Text */}
              <div className="text-sm leading-relaxed">{message.text}</div>
              
              {/* Message Actions */}
              <div className={`flex items-center justify-between mt-3 pt-2 ${
                isOwnMessage ? 'border-t border-white/20' : 'border-t border-gray-100'
              }`}>
                <span className={`text-xs ${
                  isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {format(new Date(message.timestamp), 'HH:mm')}
                </span>
                
                {/* Message Status for own messages */}
                {isOwnMessage && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-blue-100">✓✓</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Message Actions Bar */}
            <div className="mt-3 flex items-center justify-between">
              {/* Forward Button */}
              <button
                onClick={openForwardModal}
                className={`text-xs px-3 py-1.5 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                  isOwnMessage 
                    ? 'text-blue-100 hover:bg-blue-400/20 hover:text-white' 
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                title="Forward message"
              >
                ↪️ Forward
              </button>
              
              {/* Reactions */}
              <div className="flex-1 ml-3">
                <ReactionBar
                  messageId={message._id}
                  userId={currentUserId}
                  currentReactions={currentReactions}
                  onReactionToggle={handleReactionToggle}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forward Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200/50 animate-in slide-in-from-bottom-4 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-white">📤</span>
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Forward Message
              </h3>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Recipient
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50">
              <p className="text-sm text-gray-600 mb-2 font-medium">Message to forward:</p>
              <p className="text-sm font-semibold text-gray-800 bg-white/60 px-3 py-2 rounded-lg border border-blue-200/30">
                {message.text}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setSelectedRecipient('');
                }}
                className="px-6 py-2.5 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleForward}
                disabled={!selectedRecipient}
                className={`px-6 py-2.5 rounded-xl transition-all duration-200 font-medium transform hover:scale-105 ${
                  selectedRecipient
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📤 Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Message;
