import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Message from '../../../../models/Message';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🗑️ Delete user request for ID:', id);
    
    // Connect to database
    await connectDB();
    
    // Validate user ID
    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    // Find the user to delete
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('👤 Deleting user:', {
      id: userToDelete._id,
      username: userToDelete.username,
      email: userToDelete.email
    });
    
    // Delete all messages where this user is sender or receiver
    const messagesDeleted = await Message.deleteMany({
      $or: [
        { sender: id },
        { receiver: id }
      ]
    });
    
    console.log('📨 Deleted messages:', messagesDeleted.deletedCount);
    
    // Delete the user
    const userDeleted = await User.findByIdAndDelete(id);
    
    if (!userDeleted) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }
    
    console.log('✅ User deleted successfully:', {
      id: userDeleted._id,
      username: userDeleted.username
    });
    
    return NextResponse.json({
      message: 'User and associated data deleted successfully',
      deletedUser: {
        id: userDeleted._id,
        username: userDeleted.username,
        email: userDeleted.email
      },
      deletedMessages: messagesDeleted.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
