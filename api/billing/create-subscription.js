// /api/billing/create-subscription.js
import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe price IDs from your Stripe dashboard
const PRICE_IDS = {
  // Monthly plans (Live)
  'starter-monthly': 'price_1SMB0YRrdy2mHmt7K7MpLqdu', // $9.99/month
  'professional-monthly': 'price_1SMB0bRrdy2mHmt7VfkArBWA', // $24.99/month
  'business-monthly': 'price_1SMB0eRrdy2mHmt7f6z6N03c', // $49.99/month
  
  // Annual plans (Live)
  'starter-annual': 'price_1SMB0gRrdy2mHmt7xz6rri80', // $99.99/year
  'professional-annual': 'price_1SMB0iRrdy2mHmt70LGyqjVl', // $249.99/year
  'business-annual': 'price_1SMB0kRrdy2mHmt7kr46r7d0' // $499.99/year
};

const PLAN_TIERS = {
  // Monthly plans
  'starter-monthly': { tier: 'starter', limit: 10 },
  'professional-monthly': { tier: 'professional', limit: 50 },
  'business-monthly': { tier: 'business', limit: 100 },
  
  // Annual plans
  'starter-annual': { tier: 'starter', limit: 10 },
  'professional-annual': { tier: 'professional', limit: 50 },
  'business-annual': { tier: 'business', limit: 100 }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plannerEmail, priceId } = req.body;

    if (!plannerEmail || !priceId) {
      return res.status(400).json({ error: 'Missing plannerEmail or priceId' });
    }

    // Validate priceId
    if (!PRICE_IDS[priceId]) {
      return res.status(400).json({ error: 'Invalid priceId' });
    }

    // Get customer ID
    const { data: subscription } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('planner_email', plannerEmail.toLowerCase())
      .single();

    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'Customer not found. Create customer first.' });
    }

    // Cancel existing subscription if any
    if (subscription.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } catch (error) {
        console.log('No existing subscription to cancel:', error.message);
      }
    }

    // Create new subscription
    let stripeSubscription;
    try {
      stripeSubscription = await stripe.subscriptions.create({
        customer: subscription.stripe_customer_id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      });
    } catch (stripeError) {
      console.error('Stripe subscription creation failed:', stripeError);
      return res.status(500).json({ error: 'Failed to create Stripe subscription' });
    }

    // Update database
    const planInfo = PLAN_TIERS[priceId];
    const { error } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({
        stripe_subscription_id: stripeSubscription.id,
        plan_tier: planInfo.tier,
        user_limit: planInfo.limit,
        status: 'active',
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('planner_email', plannerEmail.toLowerCase());

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.json({ 
      ok: true, 
      subscriptionId: stripeSubscription.id,
      checkoutUrl: stripeSubscription.latest_invoice.payment_intent.client_secret
    });

  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
}