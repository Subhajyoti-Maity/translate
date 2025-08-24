'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Message } from '../../types';
import ReactionBar from './ReactionBar';

interface ChatInterfaceProps {
  user: User;
  selectedUser: User;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onReactionToggle?: (messageId: string, reaction: string, userId: string) => void;
}

export default function ChatInterface({ 
  user, 
  selectedUser, 
  messages, 
  onSendMessage,
  onReactionToggle 
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState('');
  const [currentReactions, setCurrentReactions] = useState<Record<string, Record<string, string>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleReactionToggle = (messageId: string, reaction: string, userId: string) => {
    if (onReactionToggle) {
      onReactionToggle(messageId, reaction, userId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>
            {/* Online Status Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              selectedUser.isOnline ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-gray-900">{selectedUser.username}</h2>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedUser.isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedUser.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender === user.id;

          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {/* Message Text */}
                  <div className="text-sm">
                    {message.text}
                  </div>
                </div>
                
                {/* Timestamp */}
                <div className={`text-xs text-gray-500 mt-1 ${
                  isOwnMessage ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(message.timestamp)}
                </div>

                {/* Reactions */}
                <div className="mt-2">
                  <ReactionBar
                    messageId={message.id}
                    userId={user.id}
                    currentReactions={message.reactions || {}}
                    onReactionToggle={handleReactionToggle}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Type a message...`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
