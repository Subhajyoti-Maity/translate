import React from 'react';

interface MessageContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onCancel: () => void;
  canDeleteForEveryone: boolean;
  isDeleting: boolean;
  messageText: string;
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  isVisible,
  position,
  onDeleteForMe,
  onDeleteForEveryone,
  onCancel,
  canDeleteForEveryone,
  isDeleting,
  messageText
}) => {
  console.log('🎭 MessageContextMenu render:', {
    isVisible,
    canDeleteForEveryone,
    isDeleting,
    messageText: messageText?.substring(0, 30)
  });
  
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-20" />
      
      {/* Context Menu */}
      <div 
        className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 min-w-[280px] max-w-[320px] overflow-hidden"
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 200)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="text-red-500 text-xl">🗑️</span>
            <span className="text-lg text-gray-800 font-semibold">Delete message?</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {canDeleteForEveryone ? 'This action cannot be undone' : 'This will only hide the message from your view'}
          </p>
        </div>

        {/* Message Preview */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-600 font-medium mb-2">Message preview:</p>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm text-gray-700 line-clamp-3">
              "{messageText}"
            </p>
          </div>
        </div>

                  {/* Action Buttons */}
          <div className="p-3 space-y-2">
            {canDeleteForEveryone ? (
              <button
                onClick={onDeleteForEveryone}
                disabled={isDeleting}
                className="w-full text-sm bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                title="Delete from everyone's view (like WhatsApp)"
              >
                {isDeleting ? (
                  <span className="animate-spin text-lg">⏳</span>
                ) : (
                  <>
                    <span className="text-lg">🌍</span>
                    <span>Delete for everyone</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">
                🔒 Only message sender can delete for everyone
              </div>
            )}

          <button
            onClick={onDeleteForMe}
            disabled={isDeleting}
            className="w-full text-sm bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
            title="Delete only from your view"
          >
            {isDeleting ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <>
                <span className="text-lg">👁️</span>
                <span>Delete for me</span>
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="w-full text-sm bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageContextMenu;
