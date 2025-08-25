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
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Chat Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-6 shadow-sm">
        <div className="flex items-center">
          <div className="relative group">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>
            
            {/* Animated Ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-pulse"></div>
            
            {/* Online Status Indicator */}
            <div className={`absolute -bottom-2 -right-2 w-5 h-5 rounded-full border-3 border-white shadow-lg transition-all duration-300 ${
              selectedUser.isOnline 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse' 
                : 'bg-gradient-to-r from-gray-400 to-gray-500'
            }`}>
              {selectedUser.isOnline && (
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
              )}
            </div>
          </div>
          
          <div className="ml-4 flex-1">
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {selectedUser.username}
            </h2>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`text-sm px-3 py-1 rounded-full font-medium transition-all duration-200 ${
                selectedUser.isOnline 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
              }`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  selectedUser.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`}></span>
                {selectedUser.isOnline ? 'Online' : 'Offline'}
                {/* Real-time indicator */}
                <span className="ml-2 text-xs opacity-75">🔄</span>
              </span>
              
              {/* Last Activity */}
              {selectedUser.lastActivity && (
                <span className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-full border border-gray-200/50">
                  Last seen: {new Date(selectedUser.lastActivity).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 rounded-xl hover:from-blue-200 hover:to-purple-200 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              📞
            </button>
            <button className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              📹
            </button>
            <button className="p-2 bg-gradient-to-r from-pink-100 to-red-100 text-pink-600 rounded-xl hover:from-pink-200 hover:to-red-200 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md">
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-white/20">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Start a conversation!</h3>
            <p className="text-gray-500 max-w-md">
              Send a message to {selectedUser.username} to begin chatting. Your messages will appear here.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId === user.id;
                          const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  {/* Avatar for other user's messages */}
                  {!isOwnMessage && showAvatar && (
                    <div className="flex items-end space-x-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md">
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{selectedUser.username}</span>
                    </div>
                  )}
                  
                  <div className={`relative ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 transform hover:scale-105 ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-blue-200/50'
                          : 'bg-white text-gray-900 shadow-gray-200/50 border border-gray-100'
                      }`}
                    >
                      {/* Message Text */}
                      <div className="text-sm leading-relaxed">
                        {message.text}
                      </div>
                      
                      {/* Message Actions */}
                      <div className={`flex items-center justify-between mt-2 pt-2 ${
                        isOwnMessage ? 'border-t border-white/20' : 'border-t border-gray-100'
                      }`}>
                        <span className={`text-xs ${
                          isOwnMessage ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </span>
                        
                        {/* Message Status for own messages */}
                        {isOwnMessage && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-white/80">✓✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Reactions */}
                    {message.id && message.id !== 'undefined' && message.id !== 'null' && (
                      <div className="mt-3">
                        <ReactionBar
                          messageId={message.id}
                          userId={user.id}
                          currentReactions={message.reactions || {}}
                          onReactionToggle={handleReactionToggle}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 p-6 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Type a message to ${selectedUser.username}...`}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 focus:shadow-lg bg-white/80 backdrop-blur-sm"
            />
            
            {/* Input Actions */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
              <button type="button" className="p-1 text-gray-400 hover:text-purple-500 transition-colors duration-200">
                😊
              </button>
              <button type="button" className="p-1 text-gray-400 hover:text-purple-500 transition-colors duration-200">
                📎
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
          >
            {newMessage.trim() ? '💬 Send' : 'Send'}
          </button>
        </form>
        
        {/* Typing Indicator */}
        <div className="mt-3 text-center">
          <div className="inline-flex items-center space-x-1 text-xs text-gray-500 bg-white/60 px-3 py-1 rounded-full border border-gray-200/50">
            <span>💬</span>
            <span>Chat powered by real-time technology</span>
          </div>
        </div>
      </div>
    </div>
  );
}
