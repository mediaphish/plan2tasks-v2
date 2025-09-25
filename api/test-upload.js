// Simple test endpoint to verify API routing works
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
  const url = new URL(req.url);
  const method = req.method || 'GET';

  console.log("Test endpoint called:", { method, url: req.url });

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (method === 'POST') {
    let body = {};
    try { 
      // For FormData, we need to handle it differently
      const formData = await req.formData();
      body = { 
        hasFormData: true, 
        plannerEmail: formData.get('plannerEmail'),
        hasFile: formData.has('file'),
        fileName: formData.get('file')?.name
      };
    } catch (e) {
      console.log("FormData parsing error:", e);
      body = { error: "Could not parse FormData" };
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "API routing is working",
      method,
      url: req.url,
      formData: body
    }), { status: 200, headers: jsonHeaders(req) });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: "API routing is working",
    method,
    url: req.url
  }), { status: 200, headers: jsonHeaders(req) });
}
