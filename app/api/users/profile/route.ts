import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user data (excluding sensitive information)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Profile retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Profile update request received');
    await connectDB();

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header found');
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token received, length:', token.length);
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!decoded || !decoded.userId) {
      console.log('❌ Invalid token or missing userId');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    console.log('👤 User ID from token:', userId);
    
    const updateData = await request.json();
    console.log('📝 Update data received:', updateData);

    // Validate update data
    const allowedFields = ['username', 'email', 'preferredLanguage'];
    const filteredData: any = {};
    
    console.log('🔍 Validating update data...');
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
        console.log(`   ✅ Field "${field}": ${updateData[field]}`);
      }
    }

    console.log('📋 Filtered data:', filteredData);

    if (Object.keys(filteredData).length === 0) {
      console.log('❌ No valid fields to update');
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Check if username or email already exists (if being updated)
    if (filteredData.username) {
      const existingUser = await User.findOne({ 
        username: filteredData.username, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    if (filteredData.email) {
      const existingUser = await User.findOne({ 
        email: filteredData.email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      filteredData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return updated user data (excluding sensitive information)
    const userResponse = {
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      preferredLanguage: updatedUser.preferredLanguage,
      createdAt: updatedUser.createdAt,
      lastSeen: updatedUser.lastSeen
    };

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: userResponse 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
