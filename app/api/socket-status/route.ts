import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to connect to Socket.IO server to check if it's accessible
    const response = await fetch('http://localhost:3006/api/socket', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return NextResponse.json({
        status: 'connected',
        message: 'Socket.IO server is accessible',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Socket.IO server responded with error',
        statusCode: response.status,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Cannot connect to Socket.IO server',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
