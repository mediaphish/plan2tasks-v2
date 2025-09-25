// Simple test endpoint to verify API routing works
export default async function handler(req, res) {
  console.log("Test endpoint called");
  res.json({ 
    success: true, 
    message: "API routing is working",
    method: req.method,
    url: req.url
  });
}
