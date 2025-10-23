// /api/billing/create-subscription.js
import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe price IDs from your Stripe dashboard
const PRICE_IDS = {
  'starter-monthly': 'price_1SLQSTRylwiLTngtgqjry3CU', // $9.99/month
  'professional-monthly': 'price_1SLQSvRylwiLTngtLsgS057g', // $24.99/month
  'business-monthly': 'price_1SLQTKRylwiLTngtuQSZGvmY' // $49.99/month
};

const PLAN_TIERS = {
  'starter-monthly': { tier: 'starter', limit: 10 },
  'professional-monthly': { tier: 'professional', limit: 50 },
  'business-monthly': { tier: 'business', limit: 100 }
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
    const stripeSubscription = await stripe.subscriptions.create({
      customer: subscription.stripe_customer_id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });

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
      clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret
    });

  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
}
