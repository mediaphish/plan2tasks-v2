// Simple upload endpoint for testing - Node.js runtime
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("Simple upload test received");
    console.log("Request headers:", req.headers);
    console.log("Request method:", req.method);
    console.log("Request url:", req.url);
    
    // Just return success without processing
    res.json({ 
      success: true, 
      message: "Upload endpoint is working",
      photoUrl: "https://example.com/test.jpg"
    });

  } catch (e) {
    console.error("Simple upload error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
