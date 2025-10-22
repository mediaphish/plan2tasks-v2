// /api/billing/portal.js
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

    // Get customer ID
    const { data: subscription } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('stripe_customer_id')
      .eq('planner_email', plannerEmail.toLowerCase())
      .single();

    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'Customer not found. Create customer first.' });
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.SITE_URL || 'https://plan2tasks.com'}/?view=settings&tab=billing`
    });

    return res.json({ 
      ok: true, 
      url: portalSession.url 
    });

  } catch (error) {
    console.error('Stripe portal creation error:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}