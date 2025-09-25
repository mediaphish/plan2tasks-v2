// api/planner/upload-photo-direct.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Handle FormData parsing manually
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: "Content-Type must be multipart/form-data" });
    }

    // Parse FormData manually (simplified approach)
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: "Invalid multipart data" });
    }

    // For now, let's use a simpler approach - read the raw body and extract data
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });

    const body = Buffer.concat(chunks);
    const bodyString = body.toString('binary');
    
    // Extract plannerEmail from form data
    const plannerEmailMatch = bodyString.match(/name="plannerEmail"\r?\n\r?\n([^\r\n]+)/);
    const plannerEmail = plannerEmailMatch ? plannerEmailMatch[1] : null;
    
    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail" });
    }

    // Extract file data from form data
    const fileMatch = bodyString.match(/name="file"; filename="([^"]+)"\r?\nContent-Type: ([^\r\n]+)\r?\n\r?\n([\s\S]+?)(?=\r?\n--|$)/);
    if (!fileMatch) {
      return res.status(400).json({ error: "No file found in request" });
    }

    const fileName = fileMatch[1];
    const fileType = fileMatch[2];
    const fileData = fileMatch[3];

    console.log("Direct photo upload request:", { plannerEmail, fileName, fileType, dataLength: fileData.length });

    // Validate file type
    if (!fileType.startsWith('image/')) {
      return res.status(400).json({ error: "File must be an image" });
    }

    // Extract file extension and generate unique filename
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${plannerEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${uuidv4()}.${fileExtension}`;
    
    // Convert binary data to buffer
    const buffer = Buffer.from(fileData, 'binary');
    
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
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('planner-photos')
      .upload(uniqueFileName, buffer, {
        contentType: fileType,
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
