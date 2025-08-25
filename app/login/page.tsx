'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Login attempt started for:', usernameOrEmail);
      console.log('🔍 Current localStorage before login:', {
        token: !!localStorage.getItem('token'),
        user: !!localStorage.getItem('user')
      });
      
      // Clear any existing error state
      setError('');
      
      // Validate input with specific messages
      if (!usernameOrEmail.trim() && !password.trim()) {
        setError('Please enter both username/email and password');
        return;
      }
      if (!usernameOrEmail.trim()) {
        setError('Please enter your username or email');
        return;
      }
      if (!password.trim()) {
        setError('Please enter your password');
        return;
      }
      
      console.log('🔍 Sending login request...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await response.json();
      console.log('🔍 Login response:', { status: response.status, ok: response.ok, data });

      if (!response.ok) {
        console.error('❌ Login failed:', data.error);
        
        // Handle specific error messages
        let errorMessage = 'Login failed';
        if (data.error) {
          switch (data.error) {
            case 'Username or email not found':
              errorMessage = 'Username or email not found';
              break;
            case 'Wrong password':
              errorMessage = 'Wrong password';
              break;
            case 'Username/Email and password are required':
              errorMessage = 'Please enter both username/email and password';
              break;
            default:
              errorMessage = data.error;
          }
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Login successful, storing data...');
      
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('🔍 localStorage after login:', {
        token: !!localStorage.getItem('token'),
        user: !!localStorage.getItem('user')
      });

      // Clear form
      setUsernameOrEmail('');
      setPassword('');
      setError('');
      
      console.log('🔄 Redirecting to chat...');
      // Redirect to chat
      router.push('/');
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('❌ Setting error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl transform hover:scale-110 transition-transform duration-300">
            <span className="text-3xl text-white">💬</span>
          </div>
          
          {/* Animated Rings */}
          <div className="absolute inset-0 h-16 w-16 mx-auto bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-2xl opacity-20 animate-ping"></div>
          <div className="absolute inset-0 h-16 w-16 mx-auto bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 rounded-2xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
          
          <h2 className="mt-8 text-center text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Sign in to Chat App
          </h2>
          <p className="mt-3 text-center text-lg text-gray-600">
            Or{' '}
            <Link
              href="/signup"
              className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="usernameOrEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                autoComplete="username"
                required
                value={usernameOrEmail}
                onChange={(e) => {
                  setUsernameOrEmail(e.target.value);
                  if (error) setError(''); // Clear error when user starts typing
                }}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:z-10 text-sm transition-all duration-200 hover:border-gray-400 focus:shadow-lg"
                placeholder="Enter your username or email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(''); // Clear error when user starts typing
                  }}
                  className="appearance-none relative block w-full px-4 py-3 pr-12 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:z-10 text-sm transition-all duration-200 hover:border-gray-400 focus:shadow-lg"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm text-center">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">
                  {error.includes('password') ? '🔒' : 
                   error.includes('not found') ? '👤' : '⚠️'}
                </span>
                <span className="font-medium">{error}</span>
              </div>
              {error.includes('password') && (
                <p className="text-xs text-red-500 mt-1">Please check your password and try again</p>
              )}
              {error.includes('not found') && (
                <p className="text-xs text-red-500 mt-1">Please check your username/email and try again</p>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
        
        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Welcome back! Connect with friends and family in real-time
          </p>
        </div>
      </div>
    </div>
  );
}
