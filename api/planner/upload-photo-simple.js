// Simple upload endpoint for testing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Simple upload test received");
    
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
