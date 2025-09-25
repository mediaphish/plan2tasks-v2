// api/planner/upload-photo-direct.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for FormData
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Direct photo upload request received");
    
    // Parse FormData using Node.js runtime
    const formData = await req.formData();
    const plannerEmail = formData.get('plannerEmail');
    const file = formData.get('file');
    
    console.log("FormData parsed:", { 
      plannerEmail, 
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
    });

    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file found in request" });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return res.status(400).json({ error: "File must be an image" });
    }

    // Extract file extension and generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFileName = `${plannerEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${crypto.randomUUID()}.${fileExtension}`;
    
    console.log("Uploading to Supabase Storage:", uniqueFileName);
    
    // Check if bucket exists, create if not
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === 'planner-photos');
      
      if (!bucketExists) {
        console.log("Creating planner-photos bucket...");
        const { error: createError } = await supabaseAdmin.storage.createBucket('planner-photos', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error("Failed to create bucket:", createError);
          console.log("Continuing with upload despite bucket creation error...");
        }
      }
    } catch (bucketError) {
      console.error("Bucket check failed:", bucketError);
    }
    
    // Convert file to buffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('planner-photos')
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage error:", error);
      return res.status(500).json({ error: `Storage upload failed: ${error.message}` });
    }

    console.log("File uploaded successfully:", data);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('planner-photos')
      .getPublicUrl(uniqueFileName);

    console.log("Upload successful:", publicUrlData.publicUrl);

    res.json({ 
      success: true, 
      photoUrl: publicUrlData.publicUrl,
      fileName: uniqueFileName
    });

  } catch (e) {
    console.error("Direct photo upload error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
}
