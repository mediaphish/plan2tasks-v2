// Minimal test endpoint
export const config = { runtime: 'edge' };

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'vary': 'Origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-requested-with, accept',
    'access-control-allow-credentials': 'true',
    'access-control-max-age': '600'
  };
}

export default async function handler(req) {
  const method = req.method || 'GET';
  
  console.log("Test endpoint called:", { method, url: req.url });

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: "Test endpoint working",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 
      'content-type': 'application/json',
      ...corsHeaders(req)
    }
  });
}
