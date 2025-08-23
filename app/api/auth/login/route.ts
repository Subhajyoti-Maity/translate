import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { usernameOrEmail, password } = await request.json();
    
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
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔒 Password validation:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        email: user.email,
        preferredLanguage: user.preferredLanguage
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for user:', user.username);

    // Remove password from response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt
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
