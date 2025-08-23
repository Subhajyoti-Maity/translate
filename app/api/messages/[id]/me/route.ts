import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Message from '@/models/Message';

// Force recompile - Delete for me functionality
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify the token using JWT directly
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Validate message ID format
    if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: 'Invalid message ID format' }, { status: 400 });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is sender or receiver
    if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this message' }, { status: 403 });
    }

    // Add user to deletedFor array if not already there
    if (!message.deletedFor) {
      message.deletedFor = [];
    }
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Message deleted for current user' 
    });

  } catch (error) {
    console.error('Error deleting message for user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
