import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This route is just a placeholder for WebSocket connections
  // The actual WebSocket handling is done by the custom server setup

  return new NextResponse('WebSocket endpoint - use WebSocket protocol to connect', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
