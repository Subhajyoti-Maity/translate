export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastSeen?: string;
  isFavorite?: boolean;
  isConnected?: boolean;
  status?: 'online' | 'offline' | 'away';
  isOnline?: boolean;
  lastActivity?: string;
  sessionId?: string;
  deviceInfo?: string;
}

export interface Session {
  sessionId: string;
  deviceInfo: string;
  lastActivity: string;
  createdAt: string;
}

export interface Message {
  id: string;
  tempId?: string; // For temporary messages before server confirmation
  sender: string;
  receiver: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  deletedFor?: string[]; // Array of user IDs for whom this message is deleted
  deletedForEveryone?: boolean; // Flag to indicate if message is deleted for everyone
  reactions?: Record<string, string>; // Add reactions field
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  sessionId?: string;
  deviceInfo?: string;
}

// Global window interface extension for delete timeout
declare global {
  interface Window {
    deleteTimeoutId: NodeJS.Timeout | null;
  }
}

export interface UserSearchResponse {
  users: User[];
}

export interface MessagesResponse {
  messages: Message[];
}

export interface FavoriteUser {
  userId: string;
  addedAt: string;
}

export interface Connection {
  userId: string;
  connectedAt: string;
  lastInteraction?: string;
}

export interface ProfileUpdateData {
  username?: string;
  email?: string;
}
