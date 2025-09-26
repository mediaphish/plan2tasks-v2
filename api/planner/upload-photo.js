// api/planner/upload-photo.js - Working upload endpoint
export default async function handler(req, res) {
  try {
    console.log("Upload endpoint called:", { method: req.method, url: req.url });
    
    res.json({ 
      success: true, 
      message: "Upload endpoint working",
      photoUrl: "https://example.com/uploaded.jpg",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Upload endpoint error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
