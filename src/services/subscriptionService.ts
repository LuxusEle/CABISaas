import { supabase } from './supabaseClient';
import type { SubscriptionPlan, UserSubscription } from '../types';

// 2Checkout Configuration
// Replace these with your actual 2Checkout credentials
const TWOCHECKOUT_MERCHANT_CODE = 'YOUR_MERCHANT_CODE';
const TWOCHECKOUT_SECRET_KEY = 'YOUR_SECRET_KEY';
const TWOCHECKOUT_SELLER_ID = 'YOUR_SELLER_ID';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'Basic features for hobbyists',
    features: [
      'Up to 3 projects',
      'Basic cabinet presets',
      'Standard BOM export',
      'Community support'
    ],
    maxProjects: 3,
    twocheckoutProductId: null
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    description: 'Professional features for small shops',
    features: [
      'Unlimited projects',
      'Custom cabinet library',
      'Advanced cut optimization',
      'PDF export with branding',
      'Email support',
      'Material management'
    ],
    maxProjects: -1, // unlimited
    twocheckoutProductId: 'PRO_PLAN_PRODUCT_ID'
  }
];

export const subscriptionService = {
  // Get available subscription plans
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  },

  // Get current user's subscription
  async getUserSubscription(): Promise<UserSubscription | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();

    if (error) {
      // If no subscription found, create free tier subscription
      if (error.code === 'PGRST116') {
        return this.createFreeSubscription(userData.user.id);
      }
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  },

  // Create free tier subscription for new users
  async createFreeSubscription(userId: string): Promise<UserSubscription> {
    const subscription = {
      user_id: userId,
      plan_id: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years
      cancel_at_period_end: false
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) {
      console.error('Error creating free subscription:', error);
      throw error;
    }

    return data;
  },

  // Initialize 2Checkout payment
  async initiatePayment(planId: string): Promise<{ token: string; url: string } | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan || plan.id === 'free') return null;

    // Call your backend API to create 2Checkout order
    const { data, error } = await supabase.functions.invoke('create-2checkout-order', {
      body: {
        planId: plan.id,
        userId: userData.user.id,
        email: userData.user.email,
        productId: plan.twocheckoutProductId,
        price: plan.price
      }
    });

    if (error) {
      console.error('Error creating 2Checkout order:', error);
      return null;
    }

    return data;
  },

  // Cancel subscription
  async cancelSubscription(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.user.id);

    if (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }

    return true;
  },

  // Resume cancelled subscription
  async resumeSubscription(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.user.id);

    if (error) {
      console.error('Error resuming subscription:', error);
      return false;
    }

    return true;
  },

  // Check if user can create a new project
  async canCreateProject(): Promise<boolean> {
    const subscription = await this.getUserSubscription();
    if (!subscription) return false;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id);
    if (!plan) return false;

    if (plan.maxProjects === -1) return true; // unlimited

    // Count user's projects
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id);

    return (count || 0) < plan.maxProjects;
  },

  // Get current plan details
  async getCurrentPlan(): Promise<SubscriptionPlan | null> {
    const subscription = await this.getUserSubscription();
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id) || null;
  }
};
