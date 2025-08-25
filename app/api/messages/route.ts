import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId1 = searchParams.get('userId1');
    const userId2 = searchParams.get('userId2');

    if (!userId1 || !userId2) {
      return NextResponse.json(
        { error: 'Both user IDs are required' },
        { status: 400 }
      );
    }

    // Get messages between two users, excluding messages that are:
    // 1. Deleted for everyone, OR
    // 2. Deleted for the requesting user (userId1)
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ],
      $and: [
        { deletedForEveryone: { $ne: true } }, // Not deleted for everyone
        {
          $or: [
            { deletedFor: { $exists: false } }, // No deletedFor array
            { deletedFor: { $nin: [userId1] } } // userId1 not in deletedFor array
          ]
        }
      ]
    })
    .populate('senderId', 'username')
    .populate('receiverId', 'username')
    .sort({ timestamp: 1 })
    .limit(100);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
