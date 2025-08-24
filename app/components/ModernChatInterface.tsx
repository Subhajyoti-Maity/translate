'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Message } from '../../types';
import ReactionBar from './ReactionBar';

interface ModernChatInterfaceProps {
  user: User;
  selectedUser: User;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onDeleteMessage?: (messageId: string, deleteType: 'for-me' | 'for-everyone') => void;
  onReactionToggle?: (messageId: string, reaction: string, userId: string) => void;
  onForwardMessage?: (messageId: string, text: string, recipientId: string) => void;
  availableUsers?: Array<{ id: string; username: string; email: string }>;
}

export default function ModernChatInterface({ 
  user, 
  selectedUser, 
  messages, 
  onSendMessage, 
  onDeleteMessage,
  onReactionToggle,
  onForwardMessage,
  availableUsers = []
}: ModernChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showForwardModal, setShowForwardModal] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  
  // Debug logging removed for cleaner console
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to show notifications
  const showNotificationMessage = (type: 'success' | 'error', message: string) => {
    setShowNotification({ type, message });
    setTimeout(() => setShowNotification(null), 5000); // Auto-hide after 5 seconds
  };

  // Function to handle delete for everyone
  const handleDeleteForEveryone = (messageId: string) => {
    console.log('🌍 Delete for everyone button clicked for message:', messageId);
    console.log('🔍 Message details:', {
      messageId,
      onDeleteMessage: !!onDeleteMessage,
      user: user?.id,
      selectedUser: selectedUser?.id
    });
    
    if (!onDeleteMessage) {
      console.error('❌ onDeleteMessage function is not available!');
      showNotificationMessage('error', 'Delete function not available!');
      return;
    }
    
    setDeletingMessage(messageId);
    showNotificationMessage('success', 'Deleting message for everyone...');
    
    console.log('📞 Calling onDeleteMessage with:', messageId, 'for-everyone');
    onDeleteMessage(messageId, 'for-everyone');
    
    setShowDeleteConfirm(null);
    setDeletingMessage(null);
    
    // Show success message after a delay
    setTimeout(() => {
      showNotificationMessage('success', 'Message deleted for everyone successfully!');
    }, 1000);
  };

  // Function to handle delete for me
  const handleDeleteForMe = (messageId: string) => {
    console.log('👁️ Delete for me button clicked for message:', messageId);
    setDeletingMessage(messageId);
    
    // Show loading state
    showNotificationMessage('success', 'Deleting message for you...');
    
    // Call the delete function
    onDeleteMessage?.(messageId, 'for-me');
    setShowDeleteConfirm(null);
    
    // Show success message after a short delay
    setTimeout(() => {
      showNotificationMessage('success', 'Message deleted for you successfully!');
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset deleting state when messages change
  useEffect(() => {
    setDeletingMessage(null);
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleReactionToggle = (messageId: string, reaction: string, userId: string) => {
    if (onReactionToggle) {
      onReactionToggle(messageId, reaction, userId);
    }
  };

  const handleForwardMessage = () => {
    if (selectedRecipient && showForwardModal && onForwardMessage) {
      const messageToForward = messages.find(m => m.id === showForwardModal);
      if (messageToForward) {
        onForwardMessage(showForwardModal, messageToForward.text, selectedRecipient);
        setShowForwardModal(null);
        setSelectedRecipient('');
        showNotificationMessage('success', 'Message forwarded successfully!');
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (newMessage.trim()) {
          onSendMessage(newMessage.trim());
          setNewMessage('');
        }
      }
      
      // Escape to close delete confirmation
      if (e.key === 'Escape' && showDeleteConfirm) {
        setShowDeleteConfirm(null);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [newMessage, showDeleteConfirm, onSendMessage]);

  const formatTime = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(message => 
        message.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !message.deletedFor?.includes(user.id) &&
        !message.deletedForEveryone
      )
    : messages;

  const filteredMessageGroups = groupMessagesByDate(filteredMessages);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Success/Error Notification */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          showNotification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <span>{showNotification.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{showNotification.message}</span>
            <button
              onClick={() => setShowNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedUser.username}</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Online</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{messages.length} messages</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">User: {user.id}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">Selected: {selectedUser.id}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">Own messages: {messages.filter(m => m.sender === user.id).length}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">Received: {messages.filter(m => m.sender !== user.id).length}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Voice Call Button */}
            <button className="p-3 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all duration-200 hover:shadow-sm" title="Voice call">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            
            {/* Video Call Button */}
            <button className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:shadow-sm" title="Video call">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            
            {/* Settings Button */}
            <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200 hover:shadow-sm" title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-6">
        {/* Message Search Bar */}
        <div className="sticky top-0 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 z-10">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search messages..."
              className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
            {searchQuery.trim() && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Clear search"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="mt-2 text-xs text-gray-500">
              Found {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </div>
          )}
        </div>
        
        {Object.entries(filteredMessageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                <span className="text-sm text-gray-700 font-medium font-sans">{date}</span>
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {dateMessages.length} message{dateMessages.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {/* Messages for this date */}
            <div className="space-y-4">
              {dateMessages.map((message, index) => {
                const isOwnMessage = message.sender === user.id;
                // Ensure timestamp is a Date object and handle it safely
                const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
                // Use a combination of id, timestamp, and index for unique keys
                const uniqueKey = `${message.id}-${timestamp.getTime()}-${index}`;
                
                return (
                  <div
                    key={uniqueKey}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs sm:max-w-sm lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      {/* Avatar for received messages */}
                      {!isOwnMessage && (
                        <div className="flex items-end space-x-2 mb-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md">
                            {selectedUser.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                      
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md ${
                          message.deletedFor?.includes(user.id) || message.deletedForEveryone
                            ? 'bg-gray-100 text-gray-400 border border-gray-200'
                            : isOwnMessage
                            ? message.tempId 
                              ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white opacity-80'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Message Text */}
                        <div className="text-sm leading-relaxed font-sans">
                          {message.deletedFor && message.deletedFor.includes(user.id) ? (
                            <span className="italic text-gray-400 flex items-center space-x-2">
                              <span>🗑️</span>
                              <span>{isOwnMessage ? 'You deleted this message' : 'This message was deleted'}</span>
                            </span>
                          ) : message.deletedForEveryone ? (
                            <span className="italic text-gray-400 flex items-center space-x-2">
                              <span>🌍</span>
                              <span>This message was deleted</span>
                            </span>
                          ) : (
                            <>
                              {message.text}
                              {message.tempId && (
                                <span className="ml-2 text-xs opacity-70 flex items-center space-x-1">
                                  <span className="animate-pulse">⏳</span>
                                  <span>sending...</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Timestamp, Status, and Actions */}
                      <div className={`flex items-center space-x-2 mt-2 ${
                        isOwnMessage ? 'justify-end' : 'justify-start'
                      }`}>
                        <span className={`text-xs font-sans ${
                          message.deletedFor?.includes(user.id) || message.deletedForEveryone
                            ? 'text-gray-300'
                            : 'text-gray-400'
                        }`}>
                          <span title={`${formatDate(message.timestamp)} at ${formatTime(message.timestamp)}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </span>
                        
                        {/* Enhanced Status Indicators */}
                        {isOwnMessage && !message.deletedFor?.includes(user.id) && !message.deletedForEveryone && (
                          <div className="flex items-center space-x-2">
                            {/* Message Status */}
                            <div className="flex items-center space-x-1">
                              {message.tempId ? (
                                <div className="flex items-center space-x-1 text-blue-400">
                                  <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs">Sending</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-green-500">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs">Delivered</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Quick Reactions - Removed duplicate */}
                          </div>
                        )}
                        
                        {/* Delete Button - Enhanced styling */}
                        {!message.deletedFor?.includes(user.id) && !message.deletedForEveryone && (
                          <div className="flex items-center space-x-2">
                            {/* Reply Button */}
                            <button
                              onClick={() => {
                                setReplyToMessage(message);
                                console.log('💬 Reply to message:', message.id);
                              }}
                              className="text-xs text-blue-500 hover:text-blue-700 transition-all duration-200 p-2 rounded-lg border border-blue-200 hover:bg-blue-50 hover:shadow-sm"
                              title="Reply to this message"
                            >
                              💬
                            </button>
                            
                            {/* Context Menu Button */}
                            <button
                              onClick={() => {
                                // Toggle context menu for this message
                                console.log('📋 Context menu for message:', message.id);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                              title="More options"
                            >
                              ⋯
                            </button>
                            
                            {/* Forward Button */}
                            <button
                              onClick={() => {
                                console.log('📤 Forward message:', message.id);
                                if (onForwardMessage) {
                                  // Show forward modal
                                  setShowForwardModal(message.id);
                                } else {
                                  showNotificationMessage('error', 'Forward function not available!');
                                }
                              }}
                              className="text-xs text-green-500 hover:text-green-700 transition-all duration-200 p-2 rounded-lg border border-green-200 hover:bg-green-50 hover:shadow-sm"
                              title="Forward this message"
                            >
                              📤
                            </button>
                            
                            {/* Copy Button */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(message.text);
                                console.log('📋 Copied message to clipboard:', message.text);
                                // Show temporary success feedback
                                const button = event?.target as HTMLButtonElement;
                                if (button) {
                                  const originalText = button.innerHTML;
                                  button.innerHTML = '✅';
                                  button.className = 'text-xs text-green-600 p-2 rounded-lg border border-green-300 bg-green-50';
                                  setTimeout(() => {
                                    button.innerHTML = originalText;
                                    button.className = 'text-xs text-purple-500 hover:text-purple-700 transition-all duration-200 p-2 rounded-lg border border-purple-200 hover:bg-purple-50 hover:shadow-sm';
                                  }, 1000);
                                }
                              }}
                              className="text-xs text-purple-500 hover:text-purple-700 transition-all duration-200 p-2 rounded-lg border border-purple-200 hover:bg-purple-50 hover:shadow-sm"
                              title="Copy message text"
                            >
                              📋
                            </button>
                            
                            {/* Reactions Button */}
                            <div className="inline-block">
                              <ReactionBar
                                messageId={message.id}
                                userId={user.id}
                                currentReactions={message.reactions || {}}
                                onReactionToggle={handleReactionToggle}
                              />
                            </div>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                console.log('🗑️ DELETE BUTTON CLICKED!');
                                console.log('🗑️ Delete button clicked for message:', {
                                  messageId: message.id,
                                  isOwnMessage,
                                  sender: message.sender,
                                  receiver: message.receiver,
                                  currentUser: user?.id,
                                  onDeleteMessage: !!onDeleteMessage,
                                  messageText: message.text
                                });
                                setShowDeleteConfirm(message.id);
                              }}
                              className={`text-xs text-red-500 hover:text-red-700 transition-all duration-200 p-2 rounded-lg border font-medium hover:scale-105 ${
                                isOwnMessage 
                                  ? 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 hover:shadow-sm' 
                                  : 'bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-300 hover:shadow-sm'
                              }`}
                              title={isOwnMessage ? "Delete message (3 options)" : "Hide message (2 options)"}
                            >
                              {isOwnMessage ? '🗑️' : '👁️'}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete Confirmation */}
                      {showDeleteConfirm === message.id && (
                        <div className={`mt-2 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                          <div className="inline-flex flex-col space-y-2 bg-white border border-gray-200 rounded-lg px-4 py-3 min-w-[280px] shadow-lg">
                            <div className="text-center">
                              <span className="text-sm text-gray-800 font-medium">
                                {isOwnMessage ? 'Delete this message?' : 'Hide this message?'}
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {isOwnMessage ? (
                                // SENDER OPTIONS: 3 choices
                                <>
                                  <button
                                    onClick={() => {
                                      console.log('🌍 CONFIRMATION: Delete for everyone clicked for message:', showDeleteConfirm);
                                      handleDeleteForEveryone(showDeleteConfirm!);
                                    }}
                                    disabled={deletingMessage === message.id}
                                    className="w-full text-sm bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                    title="Delete from everyone's view (like WhatsApp)"
                                  >
                                    {deletingMessage === message.id ? (
                                      <span className="animate-spin">⏳</span>
                                    ) : (
                                      <>
                                        <span>🌍</span>
                                        <span>Delete for everyone</span>
                                      </>
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDeleteForMe(message.id)}
                                    disabled={deletingMessage === message.id}
                                    className="w-full text-sm bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                    title="Delete only from your view"
                                  >
                                    {deletingMessage === message.id ? (
                                      <span className="animate-spin">⏳</span>
                                    ) : (
                                      <>
                                        <span>👁️</span>
                                        <span>Delete for me</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              ) : (
                                // RECEIVER OPTIONS: 2 choices
                                <button
                                  onClick={() => handleDeleteForMe(message.id)}
                                  disabled={deletingMessage === message.id}
                                  className="w-full text-sm bg-orange-500 text-white px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                  title="Hide this message from your view"
                                >
                                  {deletingMessage === message.id ? (
                                    <span className="animate-spin">⏳</span>
                                  ) : (
                                    <>
                                      <span>👁️</span>
                                      <span>Delete for me</span>
                                    </>
                                  )}
                                </button>
                              )}
                              
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                disabled={deletingMessage === message.id}
                                className="w-full text-sm bg-gray-500 text-white px-4 py-2.5 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                              >
                                Cancel
                              </button>
                            </div>
                            
                            {/* Enhanced Help text */}
                            <div className="text-xs text-gray-500 text-center px-2 pt-2 border-t border-gray-100">
                              {isOwnMessage ? (
                                <>
                                  <p className="mb-1"><strong className="text-red-600">🌍 Delete for everyone:</strong> Removes message completely for all users (like WhatsApp)</p>
                                  <p><strong className="text-blue-600">👁️ Delete for me:</strong> Only you won't see it (receiver still can)</p>
                                </>
                              ) : (
                                <p><strong className="text-orange-600">👁️ Delete for me:</strong> Only you won't see this message (sender can still see it)</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl sm:text-6xl mb-4">💬</div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 font-sans">Start a conversation</h3>
            <p className="text-sm text-gray-500 font-sans">Send your first message to {selectedUser.username}</p>
          </div>
        )}
        
        {/* Search Results Empty State */}
        {searchQuery.trim() && filteredMessages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
            <p className="text-sm text-gray-500">
              No messages match "{searchQuery}" in this conversation
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 p-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-gray-500 font-sans">{selectedUser.username} is typing...</span>
          </div>
        )}
        
        {/* Keyboard Shortcuts Info */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-4 text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-full">
            <span>💡 Keyboard shortcuts:</span>
            <span className="bg-white px-2 py-1 rounded border">Ctrl+Enter</span>
            <span className="text-gray-500">Send message</span>
            <span className="bg-white px-2 py-1 rounded border">Esc</span>
            <span className="text-gray-500">Close dialogs</span>
          </div>
        </div>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shadow-sm">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-blue-600 font-medium">Replying to:</span>
                <span className="text-sm text-gray-700 truncate max-w-xs">
                  {replyToMessage.text.length > 50 
                    ? replyToMessage.text.substring(0, 50) + '...' 
                    : replyToMessage.text
                  }
                </span>
              </div>
              <button
                onClick={() => setReplyToMessage(null)}
                className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100"
                title="Cancel reply"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          {/* Emoji Button */}
          <button
            type="button"
            className="p-3 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition-all duration-200 hover:shadow-sm"
            title="Add emoji"
          >
            😊
          </button>
          
          {/* Attachment Button */}
          <button
            type="button"
            className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:shadow-sm"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Type a message to ${selectedUser.username}...`}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 font-sans text-sm transition-all duration-200 hover:bg-white focus:bg-white"
            />
            {newMessage.trim() && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {newMessage.length}/500
              </div>
            )}
          </div>
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-sans text-sm font-medium flex items-center space-x-2"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{selectedUser.username} is typing...</span>
          </div>
        )}
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
              <p className="text-sm font-medium">
                {messages.find(m => m.id === showForwardModal)?.text || ''}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowForwardModal(null);
                  setSelectedRecipient('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForwardMessage}
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
    </div>
  );
}
