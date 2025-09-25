// api/planner/upload-photo-direct.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";

export const config = { runtime: 'edge' };

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'vary': 'Origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-requested-with, accept',
    'access-control-allow-credentials': 'true',
    'access-control-max-age': '600'
  };
}

function jsonHeaders(req) {
  return { 'content-type': 'application/json', ...corsHeaders(req) };
}

export default async function handler(req) {
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: jsonHeaders(req)
    });
  }

  try {
    console.log("Direct photo upload request received");
    
    // Parse FormData using Edge Runtime
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
      return new Response(JSON.stringify({ error: "Missing plannerEmail" }), {
        status: 400, headers: jsonHeaders(req)
      });
    }

    if (!file) {
      return new Response(JSON.stringify({ error: "No file found in request" }), {
        status: 400, headers: jsonHeaders(req)
      });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: "File must be an image" }), {
        status: 400, headers: jsonHeaders(req)
      });
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
      return new Response(JSON.stringify({ error: `Storage upload failed: ${error.message}` }), {
        status: 500, headers: jsonHeaders(req)
      });
    }

    console.log("File uploaded successfully:", data);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('planner-photos')
      .getPublicUrl(uniqueFileName);

    console.log("Upload successful:", publicUrlData.publicUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      photoUrl: publicUrlData.publicUrl,
      fileName: uniqueFileName
    }), { status: 200, headers: jsonHeaders(req) });

  } catch (e) {
    console.error("Direct photo upload error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500, headers: jsonHeaders(req)
    });
  }
}
