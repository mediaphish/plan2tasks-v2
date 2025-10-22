// /api/billing/create-customer.js
import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plannerEmail } = req.body;

    if (!plannerEmail) {
      return res.status(400).json({ error: 'Missing plannerEmail' });
    }

    // Check if customer already exists
    const { data: existing } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('stripe_customer_id')
      .eq('planner_email', plannerEmail.toLowerCase())
      .single();

    if (existing?.stripe_customer_id) {
      return res.json({ 
        ok: true, 
        customerId: existing.stripe_customer_id,
        message: 'Customer already exists' 
      });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: plannerEmail,
      metadata: {
        planner_email: plannerEmail
      }
    });

    // Store customer ID in database
    const { error } = await supabaseAdmin
      .from('planner_subscriptions')
      .upsert({
        planner_email: plannerEmail.toLowerCase(),
        stripe_customer_id: customer.id,
        plan_tier: 'free',
        status: 'active',
        user_limit: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'planner_email'
      });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to store customer' });
    }

    return res.json({ 
      ok: true, 
      customerId: customer.id 
    });

  } catch (error) {
    console.error('Stripe customer creation error:', error);
    return res.status(500).json({ error: 'Failed to create customer' });
  }
}