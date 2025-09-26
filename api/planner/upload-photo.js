// api/planner/upload-photo.js - Minimal test endpoint
export default async function handler(req, res) {
  console.log("Upload endpoint called:", { method: req.method, url: req.url });
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Body length:", req.headers['content-length']);
  
  res.json({ 
    success: true, 
    message: "Endpoint reached successfully",
    timestamp: new Date().toISOString()
  });
}
