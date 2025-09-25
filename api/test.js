// Minimal test endpoint - Node.js runtime to match working endpoints
export default async function handler(req, res) {
  try {
    console.log("Test endpoint called:", { method: req.method, url: req.url });
    
    res.json({ 
      success: true, 
      message: "Test endpoint working",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Test endpoint error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
