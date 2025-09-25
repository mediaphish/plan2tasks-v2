// api/planner/profile.js
import { supabaseAdmin } from "../../lib/supabase-admin.js";

export default async function handler(req, res) {
  try {
    const plannerEmail = req.query.plannerEmail || req.body.plannerEmail;
    
    console.log("Planner profile API called:", { method: req.method, plannerEmail });
    
    if (!plannerEmail) {
      return res.status(400).json({ error: "Missing plannerEmail" });
    }

    if (req.method === "GET") {
      // Get planner profile
      console.log("Getting profile for:", plannerEmail);
      const { data, error } = await supabaseAdmin
        .from("planner_profiles")
        .select("*")
        .eq("planner_email", plannerEmail.toLowerCase())
        .single();

      console.log("Profile query result:", { data, error });

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
        console.error("Profile GET error:", error);
        throw error;
      }

      res.json({ profile: data || null });
    } 
    else if (req.method === "POST") {
      // Create or update planner profile
      console.log("Saving profile data:", req.body);
      
      const { 
        planner_name, 
        company_name, 
        business_description, 
        phone, 
        website_url,
        linkedin_url,
        instagram_url,
        facebook_url,
        twitter_url,
        profile_photo_url
      } = req.body;

      const profileData = {
        planner_email: plannerEmail.toLowerCase(),
        planner_name: planner_name || null,
        company_name: company_name || null,
        business_description: business_description || null,
        phone: phone || null,
        website_url: website_url || null,
        linkedin_url: linkedin_url || null,
        instagram_url: instagram_url || null,
        facebook_url: facebook_url || null,
        twitter_url: twitter_url || null,
        profile_photo_url: profile_photo_url || null,
        updated_at: new Date().toISOString()
      };

      console.log("Profile data to save:", profileData);

      const { data, error } = await supabaseAdmin
        .from("planner_profiles")
        .upsert(profileData, { 
          onConflict: "planner_email",
          ignoreDuplicates: false 
        })
        .select()
        .single();

      console.log("Profile save result:", { data, error });

      if (error) {
        console.error("Profile save error:", error);
        throw error;
      }

      res.json({ profile: data });
    }
    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (e) {
    console.error("Planner profile API error:", e);
    res.status(500).json({ error: "Server error" });
  }
}
