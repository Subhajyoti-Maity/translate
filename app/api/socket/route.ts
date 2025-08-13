import { NextRequest, NextResponse } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from '../../../lib/mongodb';
import Message from '../../../models/Message';
import User from '../../../models/User';

export interface NextApiResponseServerIO {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Socket.io endpoint' });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Socket.io endpoint' });
}
