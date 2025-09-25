// Simple upload endpoint for testing
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

function jsonHeaders(req) {
  return { 'content-type': 'application/json', ...corsHeaders(req) };
}

export default async function handler(req) {
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: jsonHeaders(req)
    });
  }

  try {
    console.log("Simple upload test received");
    
    // Just return success without processing
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Upload endpoint is working",
      photoUrl: "https://example.com/test.jpg"
    }), { status: 200, headers: jsonHeaders(req) });

  } catch (e) {
    console.error("Simple upload error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500, headers: jsonHeaders(req)
    });
  }
}
