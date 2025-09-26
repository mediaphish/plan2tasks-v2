// api/planner/upload-photo.js - Direct file upload to Supabase Storage
import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse FormData manually
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: "No boundary found in content-type" });
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const body = buffer.toString();
        
        // Parse FormData
        const parts = body.split(`--${boundary}`);
        let plannerEmail = '';
        let fileBuffer = null;
        let fileName = '';
        let contentType = '';

        for (const part of parts) {
          if (part.includes('name="plannerEmail"')) {
            const emailMatch = part.match(/name="plannerEmail"\r\n\r\n(.+?)\r\n/);
            if (emailMatch) plannerEmail = emailMatch[1];
          } else if (part.includes('name="file"')) {
            const fileMatch = part.match(/name="file"; filename="(.+?)"\r\nContent-Type: (.+?)\r\n\r\n(.+?)$/s);
            if (fileMatch) {
              fileName = fileMatch[1];
              contentType = fileMatch[2];
              const fileData = fileMatch[3];
              fileBuffer = Buffer.from(fileData, 'binary');
            }
          }
        }

        if (!plannerEmail || !fileBuffer) {
          return res.status(400).json({ error: "Missing plannerEmail or file" });
        }

        // Generate unique filename
        const fileExtension = fileName.split('.').pop() || 'jpg';
        const uniqueFileName = `${plannerEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${uuidv4()}.${fileExtension}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabaseAdmin.storage
          .from('planner-photos')
          .upload(uniqueFileName, fileBuffer, {
            contentType: contentType,
            upsert: true
          });

        if (error) {
          console.error("Supabase Storage error:", error);
          return res.status(500).json({ error: `Storage upload failed: ${error.message}` });
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('planner-photos')
          .getPublicUrl(uniqueFileName);

        res.json({ 
          success: true, 
          photoUrl: publicUrlData.publicUrl,
          fileName: uniqueFileName
        });

      } catch (parseError) {
        console.error("FormData parsing error:", parseError);
        res.status(500).json({ error: "Failed to parse FormData" });
      }
    });

  } catch (e) {
    console.error("Upload endpoint error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
