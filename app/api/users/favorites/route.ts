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

    // For now, return an empty array since we haven't implemented favorites in the database yet
    // In a real app, you would have a separate Favorites collection or add a favorites field to User
    return NextResponse.json({ favorites: [] });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { favoriteUserId } = await request.json();

    if (!favoriteUserId) {
      return NextResponse.json(
        { error: 'Favorite user ID is required' },
        { status: 400 }
      );
    }

    // Check if the favorite user exists
    const favoriteUser = await User.findById(favoriteUserId);
    if (!favoriteUser) {
      return NextResponse.json(
        { error: 'Favorite user not found' },
        { status: 404 }
      );
    }

    // For now, just return success since we haven't implemented favorites in the database yet
    // In a real app, you would add the favorite to a Favorites collection or update the User model
    return NextResponse.json({ 
      message: 'User added to favorites successfully' 
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const favoriteUserId = searchParams.get('favoriteUserId');

    if (!favoriteUserId) {
      return NextResponse.json(
        { error: 'Favorite user ID is required' },
        { status: 400 }
      );
    }

    // For now, just return success since we haven't implemented favorites in the database yet
    // In a real app, you would remove the favorite from a Favorites collection or update the User model
    return NextResponse.json({ 
      message: 'User removed from favorites successfully' 
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
