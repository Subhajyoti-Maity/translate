import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds');
    
    if (!userIds) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }
    
    const userIdArray = userIds.split(',');
    
    // Get users with their current online status
    const users = await User.find({
      _id: { $in: userIdArray }
    }).select('_id username email isOnline lastActivity');
    
    // Transform to include status
    const userStatuses = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isOnline: user.isOnline || false,
      lastActivity: user.lastActivity,
      status: user.isOnline ? 'online' : 'offline'
    }));
    
    return NextResponse.json({ 
      success: true, 
      userStatuses 
    });
  } catch (error) {
    console.error('Error fetching user statuses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user statuses' },
      { status: 500 }
    );
  }
}
