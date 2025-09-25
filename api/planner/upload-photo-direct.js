// api/planner/upload-photo-direct.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for manual FormData handling
  },
};

// Helper function to parse multipart/form-data manually
async function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return reject(new Error('Content-Type must be multipart/form-data'));
        }

        const boundary = contentType.split('boundary=')[1];
        if (!boundary) {
          return reject(new Error('Invalid multipart data - no boundary'));
        }

        const bodyString = buffer.toString('binary');
        
        // Extract plannerEmail
        const plannerEmailMatch = bodyString.match(/name="plannerEmail"\r?\n\r?\n([^\r\n]+)/);
        const plannerEmail = plannerEmailMatch ? plannerEmailMatch[1] : null;
        
        // Extract file data
        const fileMatch = bodyString.match(/name="file"; filename="([^"]+)"\r?\nContent-Type: ([^\r\n]+)\r?\n\r?\n([\s\S]+?)(?=\r?\n--|$)/);
        if (!fileMatch) {
          return reject(new Error('No file found in request'));
        }

        const fileName = fileMatch[1];
        const fileType = fileMatch[2];
        const fileData = fileMatch[3];

        resolve({
          plannerEmail,
          file: {
            originalname: fileName,
            mimetype: fileType,
            buffer: Buffer.from(fileData, 'binary')
          }
        });
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Direct photo upload request received");
    
    // Parse FormData manually
    const { plannerEmail, file } = await parseMultipartFormData(req);
    
    console.log("FormData parsed:", { 
      plannerEmail, 
      hasFile: !!file,
      fileName: file?.originalname,
      fileType: file?.mimetype,
      fileSize: file?.buffer?.length
    });

    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file found in request" });
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: "File must be an image" });
    }

    // Extract file extension and generate unique filename
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
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
    
    // Use file buffer directly from multer
    const buffer = file.buffer;
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('planner-photos')
      .upload(uniqueFileName, buffer, {
        contentType: file.mimetype,
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
