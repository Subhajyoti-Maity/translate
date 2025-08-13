export interface User {
  id: string;
  username: string;
  email: string;
  preferredLanguage: string;
  createdAt: string;
  lastSeen?: string;
}

export interface Message {
  id: string;
  tempId?: string; // For temporary messages before server confirmation
  sender: string;
  receiver: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface UserSearchResponse {
  users: User[];
}

export interface MessagesResponse {
  messages: Message[];
}
