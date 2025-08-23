// Configuration for the chat application
export const config = {
  // Socket server configuration
  socket: {
    // Use environment variable or fallback to default
    url: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3006',
    path: '/api/socket',
    transports: ['polling'] as const,
  },
  
  // Next.js app configuration
  app: {
    // Use environment variable or fallback to default
    port: process.env.NEXT_PUBLIC_APP_PORT || 3000,
  },
  
  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  }
};

// Helper function to get the current socket server URL
export function getSocketServerUrl(): string {
  // In development, try to detect the port dynamically
  if (typeof window !== 'undefined') {
    const currentPort = window.location.port;
    if (currentPort && currentPort !== '80' && currentPort !== '443') {
      // If we're on a different port, assume socket server is on 3006
      return `http://localhost:3006`;
    }
  }
  
  return config.socket.url;
}
