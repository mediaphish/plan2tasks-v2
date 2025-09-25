// Minimal test endpoint
export const config = { runtime: 'edge' };

export default async function handler(req) {
  console.log("Test endpoint called");
  return new Response(JSON.stringify({ 
    success: true, 
    message: "Test endpoint working",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
