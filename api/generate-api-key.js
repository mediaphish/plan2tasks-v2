// api/generate-api-key.js
import { supabaseAdmin } from '../lib/supabase-admin.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' });
    }

    const { plannerEmail } = req.body;
    
    if (!plannerEmail) {
      return res.status(400).json({ error: 'plannerEmail required' });
    }

    // Generate a random API key
    const apiKey = 'p2t_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Hash the key
    const hashedKey = await bcrypt.hash(apiKey, 10);

    // Store in database
    const { error } = await supabaseAdmin
      .from('planner_api_keys')
      .insert({
        planner_email: plannerEmail,
        hashed_key: hashedKey,
        revoked: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Return the plain text key (only time it's shown)
    return res.status(200).json({ 
      apiKey,
      message: 'API key generated successfully. Save this key - it will not be shown again.'
    });

  } catch (error) {
    console.error('Generate API key error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
