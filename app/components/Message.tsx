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
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}>
          <div className="text-sm">{message.text}</div>
          <div className={`text-xs mt-1 ${
            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </div>
          
          {/* Message Actions */}
          <div className="flex items-center justify-between mt-2">
            {/* Forward Button */}
            <button
              onClick={openForwardModal}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isOwnMessage 
                  ? 'text-blue-100 hover:bg-blue-400' 
                  : 'text-gray-500 hover:bg-gray-300'
              }`}
              title="Forward message"
            >
              ↪️ Forward
            </button>
            
            {/* Reactions */}
            <div className="flex-1 ml-2">
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

      {/* Forward Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Forward Message</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Recipient
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Message to forward:</p>
              <p className="text-sm font-medium">{message.text}</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setSelectedRecipient('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForward}
                disabled={!selectedRecipient}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedRecipient
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Message;
