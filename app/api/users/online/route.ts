import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get all online users
    const onlineUsers = await User.find({ isOnline: true })
      .select('id username email lastActivity')
      .sort({ lastActivity: -1 });
    
    return NextResponse.json({ 
      success: true, 
      onlineUsers,
      count: onlineUsers.length 
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch online users' },
      { status: 500 }
    );
  }
}
