// api/planner/upload-photo.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for multer
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Use multer middleware to parse form data
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
    const plannerEmail = req.body.plannerEmail;
    const file = req.file;
    
    console.log("Photo upload request:", { plannerEmail, fileName: file?.name, hasFile: !!file });
    
    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail" });
    }

    if (!file) {
      return res.status(400).json({ error: "Missing file" });
    }

    // Extract file extension and generate unique filename
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const uniqueFileName = `${plannerEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${uuidv4()}.${fileExtension}`;
    
    // Use file buffer directly
    const buffer = file.buffer;
    
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
          // Don't throw error, try to upload anyway
          console.log("Continuing with upload despite bucket creation error...");
        }
      }
    } catch (bucketError) {
      console.error("Bucket check failed:", bucketError);
      // Continue with upload attempt
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
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw new Error(`Storage upload failed: ${error.message}`);
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
      console.error("Photo upload error:", e);
      res.status(500).json({ error: e.message || "Server error" });
    }
  });
}
