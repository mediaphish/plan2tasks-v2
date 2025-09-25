// api/planner/upload-photo.js - Base64 upload to Supabase Storage
import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { plannerEmail, imageData, fileName } = req.body;
    
    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail" });
    }

    if (!imageData || !fileName) {
      return res.status(400).json({ error: "Missing imageData or fileName" });
    }

    // Extract file extension and generate unique filename
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${plannerEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${uuidv4()}.${fileExtension}`;
    
    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Check if bucket exists, create if not
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === 'planner-photos');
      
      if (!bucketExists) {
        const { error: createError } = await supabaseAdmin.storage.createBucket('planner-photos', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error("Failed to create bucket:", createError);
        }
      }
    } catch (bucketError) {
      console.error("Bucket check failed:", bucketError);
    }
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('planner-photos')
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage error:", error);
      throw new Error(`Storage upload failed: ${error.message}`);
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

  } catch (e) {
    console.error("Photo upload error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
