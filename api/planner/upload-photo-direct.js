// api/planner/upload-photo-direct.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for manual multipart handling
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Direct photo upload request received");
    
    // Read the raw request body
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });

    const body = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';
    
    console.log("Request details:", { 
      contentType, 
      bodyLength: body.length,
      hasMultipart: contentType.includes('multipart/form-data')
    });

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: "Content-Type must be multipart/form-data" });
    }

    // Parse multipart data
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: "Invalid multipart data - no boundary" });
    }

    const bodyString = body.toString('binary');
    console.log("Body string length:", bodyString.length);
    
    // Extract plannerEmail from form data
    const plannerEmailMatch = bodyString.match(/name="plannerEmail"\r?\n\r?\n([^\r\n]+)/);
    const plannerEmail = plannerEmailMatch ? plannerEmailMatch[1] : null;
    
    console.log("Extracted plannerEmail:", plannerEmail);
    
    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail in form data" });
    }

    // Extract file data from form data
    const fileMatch = bodyString.match(/name="file"; filename="([^"]+)"\r?\nContent-Type: ([^\r\n]+)\r?\n\r?\n([\s\S]+?)(?=\r?\n--|$)/);
    if (!fileMatch) {
      console.log("No file found in request body");
      return res.status(400).json({ error: "No file found in request" });
    }

    const fileName = fileMatch[1];
    const fileType = fileMatch[2];
    const fileData = fileMatch[3];

    console.log("File details:", { fileName, fileType, dataLength: fileData.length });

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
