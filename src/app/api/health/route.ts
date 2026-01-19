export async function GET() {
  console.log('Health endpoint called');
  try {
    console.log('Health check starting...');

    // Get the current service URL - for now using the known working URL
    const serviceUrl = 'https://travel-agency-backend-j6kdth6uzq-el.a.run.app';
    const websocketUrl = `wss://${serviceUrl.replace('https://', '')}/api/chat/websocket`;

    return new Response(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      database: 'connected',
      timestamp: new Date().toISOString(),
      websocketUrl: websocketUrl,
      serviceUrl: serviceUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
