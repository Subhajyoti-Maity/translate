import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login API called');
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');
    
    // Parse request body
    const body = await request.json();
    console.log('📨 Request body received:', { 
      hasUsernameOrEmail: !!body.usernameOrEmail, 
      hasPassword: !!body.password,
      usernameOrEmail: body.usernameOrEmail,
      passwordLength: body.password?.length 
    });
    
    const { usernameOrEmail, password } = body;
    
    console.log('🔐 Login attempt:', { usernameOrEmail, passwordLength: password?.length });
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);

    // Validation
    if (!usernameOrEmail || !password) {
      console.log('❌ Missing credentials');
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by username or email
    console.log('🔍 Searching for user...');
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    });

    console.log('👤 User found:', !!user, user ? { id: user._id, username: user.username, email: user.email } : 'Not found');

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json(
        { error: 'Username or email not found' },
        { status: 401 }
      );
    }

    // Check password
    console.log('🔒 Validating password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔒 Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return NextResponse.json(
        { error: 'Wrong password' },
        { status: 401 }
      );
    }

    // Update last seen and add new session
    console.log('🕒 Updating last seen and adding session...');
    
    // Generate unique session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    const deviceInfo = request.headers.get('user-agent') || 'Unknown Device';
    
    // Add new session to user's active sessions
    if (!user.activeSessions) {
      user.activeSessions = [];
    }
    
    // Add new session
    user.activeSessions.push({
      sessionId: sessionId,
      deviceInfo: deviceInfo,
      lastActivity: new Date(),
      createdAt: new Date()
    });
    
    // Update last seen and online status
    user.lastSeen = new Date();
    user.isOnline = true;
    user.lastActivity = new Date();
    
    await user.save();
    console.log('✅ User session updated successfully');

    // Generate JWT token with session ID
    console.log('🔑 Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        email: user.email,
        sessionId: sessionId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for user:', user.username, 'with session:', sessionId);

    // Remove password from response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      sessionId: sessionId,
      deviceInfo: deviceInfo
    };

    return NextResponse.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('💥 Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
