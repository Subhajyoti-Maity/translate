import { NextRequest, NextResponse } from 'next/server';
// Import MongoDB connection and User model
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Search API called with params:', request.url);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const currentUserId = searchParams.get('userId');

    console.log('🔍 Search query:', query, 'Current user ID:', currentUserId);

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let users;
    
    if (!query.trim()) {
      // If no search query, fetch all users (excluding current user)
      console.log('🔍 Fetching all users (excluding current user)');
      users = await User.find({
        _id: { $ne: currentUserId }
      })
      .select('_id username email preferredLanguage lastSeen createdAt')
      .limit(20);
    } else {
      // Search users by username (excluding current user)
      console.log('🔍 Searching for users with query:', query);
      users = await User.find({
        _id: { $ne: currentUserId },
        username: { $regex: query, $options: 'i' }
      })
      .select('_id username email preferredLanguage lastSeen createdAt')
      .limit(10);
    }

    console.log('🔍 Found users:', users.length);

    // Transform the data to match the expected format
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    }));

    console.log('🔍 Returning transformed users:', transformedUsers.length);
    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('❌ User search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
