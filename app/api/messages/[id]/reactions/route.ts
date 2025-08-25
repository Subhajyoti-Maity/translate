import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Message from '../../../../../models/Message';
import User from '../../../../../models/User';

// Add or remove reaction from a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, reaction, action } = await request.json();

    if (!userId || !reaction || !action) {
      return NextResponse.json(
        { error: 'User ID, reaction, and action are required' },
        { status: 400 }
      );
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "add" or "remove"' },
        { status: 400 }
      );
    }

    // Validate reaction emoji - Extended list matching frontend and server
    const validReactions = ['👍', '❤️', '😂', '😊', '😮', '😢', '😡', '🎉', '🔥', '💯', '👏', '🙏', '🤔', '😴', '🤮', '💪', '🎯', '🚀', '⭐', '💎'];
    if (!validReactions.includes(reaction)) {
      return NextResponse.json(
        { error: 'Invalid reaction emoji' },
        { status: 400 }
      );
    }

    await connectDB();

    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Use updateOne to avoid validation issues
    let updateOperation;
    if (action === 'add') {
      // Add reaction
      updateOperation = {
        $set: {
          [`reactions.${userId}`]: reaction
        }
      };
    } else if (action === 'remove') {
      // Remove reaction
      updateOperation = {
        $unset: {
          [`reactions.${userId}`]: 1
        }
      };
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      updateOperation,
      { new: true, runValidators: false }
    );

    if (!updatedMessage) {
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    // Get user info for the reaction
    const user = await User.findById(userId).select('username');
    const username = user ? user.username : 'Unknown User';

    // Convert reactions Map to object for response
    const reactions = updatedMessage.reactions ? Object.fromEntries(updatedMessage.reactions) : {};
    const reactionCount = updatedMessage.reactions ? updatedMessage.reactions.size : 0;

    return NextResponse.json({
      message: `Reaction ${action === 'add' ? 'added' : 'removed'} successfully`,
      reactions,
      reactionCount,
      userReaction: action === 'add' ? reaction : null,
      username: username
    });

  } catch (error) {
    console.error('❌ Error managing message reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const message = await Message.findById(id).select('reactions');
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get user details for each reaction
    const reactionsWithUsers = [];
    if (message.reactions && message.reactions.size > 0) {
      for (const [userId, reaction] of message.reactions.entries()) {
        const user = await User.findById(userId).select('username');
        reactionsWithUsers.push({
          userId,
          username: user ? user.username : 'Unknown User',
          reaction
        });
      }
    }

    return NextResponse.json({
      reactions: reactionsWithUsers,
      reactionCount: message.reactions ? message.reactions.size : 0
    });

  } catch (error) {
    console.error('❌ Error fetching message reactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
