// /api/billing/webhook.js
import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sig = req.headers['stripe-signature'];
    const body = req.body;

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0].price.id;
    
    // Map price ID to plan tier (using Live Stripe price IDs)
    const planTiers = {
      // Monthly plans (Live)
      'price_1SMB0YRrdy2mHmt7K7MpLqdu': { tier: 'starter', limit: 10 }, // Starter monthly
      'price_1SMB0bRrdy2mHmt7VfkArBWA': { tier: 'professional', limit: 50 }, // Professional monthly  
      'price_1SMB0eRrdy2mHmt7f6z6N03c': { tier: 'business', limit: 100 }, // Business monthly
      
      // Annual plans (Live)
      'price_1SMB0gRrdy2mHmt7xz6rri80': { tier: 'starter', limit: 10 }, // Starter annual
      'price_1SMB0iRrdy2mHmt70LGyqjVl': { tier: 'professional', limit: 50 }, // Professional annual
      'price_1SMB0kRrdy2mHmt7kr46r7d0': { tier: 'business', limit: 100 } // Business annual
    };

    const planInfo = planTiers[priceId] || { tier: 'free', limit: 1 };

    const { error } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({
        stripe_subscription_id: subscription.id,
        plan_tier: planInfo.tier,
        user_limit: planInfo.limit,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Database update error:', error);
    }
  } catch (error) {
    console.error('Subscription update error:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;

    const { error } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({
        stripe_subscription_id: null,
        plan_tier: 'free',
        user_limit: 1,
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Database update error:', error);
    }
  } catch (error) {
    console.error('Subscription deletion error:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;

    const { error } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Database update error:', error);
    }
  } catch (error) {
    console.error('Payment success error:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;

    const { error } = await supabaseAdmin
      .from('planner_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Database update error:', error);
    }
  } catch (error) {
    console.error('Payment failure error:', error);
  }
}