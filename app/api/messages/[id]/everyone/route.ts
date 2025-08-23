import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Message from '@/models/Message';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let messageId: string = '';
  
  try {
    const { id } = await params;
    messageId = id;
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

    // Validate message ID format
    if (!messageId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: 'Invalid message ID format' }, { status: 400 });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      // Message might already be deleted by socket server
      console.log(`📝 Message ${messageId} not found - may already be deleted by socket server`);
      return NextResponse.json({ 
        success: true, 
        message: 'Message already deleted or not found',
        deletedMessageId: messageId,
        alreadyDeleted: true
      }, { status: 200 });
    }

    // Only sender can delete for everyone
    if (message.sender.toString() !== userId) {
      return NextResponse.json({ error: 'Only sender can delete message for everyone' }, { status: 403 });
    }

    // Check if message is already deleted for everyone
    if (message.deletedForEveryone) {
      console.log(`📝 Message ${messageId} already marked as deleted for everyone`);
      return NextResponse.json({ 
        success: true, 
        message: 'Message already deleted for everyone',
        deletedMessageId: messageId,
        alreadyDeleted: true
      }, { status: 200 });
    }

    // Mark message as deleted for everyone
    message.deletedForEveryone = true;
    await message.save();

    console.log(`✅ Message ${messageId} marked as deleted for everyone via API`);

    return NextResponse.json({ 
      success: true, 
      message: 'Message deleted for everyone',
      deletedMessageId: messageId
    });

  } catch (error: any) {
    console.error('Error deleting message for everyone:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // If it's a version error, the message was likely already deleted
    if (error.name === 'VersionError') {
      console.log(`📝 Version error for message ${messageId} - likely already deleted by socket server`);
      return NextResponse.json({ 
        success: true, 
        message: 'Message already deleted or modified',
        deletedMessageId: messageId,
        alreadyDeleted: true
      }, { status: 200 });
    }
    
    // If it's a CastError (invalid ObjectId), return 400
    if (error.name === 'CastError') {
      console.log(`📝 Cast error for message ${messageId} - invalid ObjectId format`);
      return NextResponse.json({ 
        error: 'Invalid message ID format' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
