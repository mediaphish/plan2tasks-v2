// api/planner/upload-photo.js - Generate signed URL for direct upload
import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { plannerEmail, fileName } = req.body;
    
    if (!plannerEmail || !fileName) {
      return res.status(400).json({ error: "Missing plannerEmail or fileName" });
    }

    // Generate unique filename
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${plannerEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${uuidv4()}.${fileExtension}`;

    // Create signed URL for direct upload
    const { data, error } = await supabaseAdmin.storage
      .from('planner-photos')
      .createSignedUploadUrl(uniqueFileName, {
        expiresIn: 3600 // 1 hour
      });

    if (error) {
      console.error("Error creating signed URL:", error);
      return res.status(500).json({ error: "Failed to create upload URL" });
    }

    res.json({
      success: true,
      uploadUrl: data.signedUrl,
      path: uniqueFileName,
      expiresIn: 3600
    });

  } catch (e) {
    console.error("Upload URL generation error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
