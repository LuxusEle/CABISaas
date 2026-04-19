import { supabase } from './supabaseClient';
import type { SubscriptionPlan, UserSubscription } from '../types';

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
      'Community support'
    ],
    maxProjects: 3,
    twocheckoutProductId: null,
    paypalPlanId: null
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
    maxProjects: -1,
    twocheckoutProductId: null,
    paypalPlanId: 'P-PRO-29-MONTHLY'
  }
];

export const subscriptionService = {
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  },

  async getUserSubscription(): Promise<UserSubscription | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return this.createFreeSubscription(userData.user.id);
      }
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  },

  async createFreeSubscription(userId: string): Promise<UserSubscription> {
    const subscription = {
      user_id: userId,
      plan_id: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
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

  async initiatePayPalSubscription(planId: string): Promise<{ subscriptionId: string; approvalUrl: string } | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan || plan.id === 'free') return null;

    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-subscription', {
        body: { planId: plan.id }
      });

      if (error) {
        console.error('Error creating PayPal subscription:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('PayPal subscription error:', err);
      return null;
    }
  },

  async cancelSubscription(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('paypal_subscription_id')
      .eq('user_id', userData.user.id)
      .single();

    if (subscription?.paypal_subscription_id) {
      try {
        const { error } = await supabase.functions.invoke('cancel-paypal-subscription', {
          body: { subscriptionId: subscription.paypal_subscription_id }
        });
        
        if (error) {
          console.error('Error cancelling PayPal subscription:', error);
        }
      } catch (err) {
        console.error('Cancel subscription error:', err);
      }
    }

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

  async canCreateProject(): Promise<boolean> {
    const subscription = await this.getUserSubscription();
    if (!subscription) return false;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id);
    if (!plan) return false;

    if (plan.maxProjects === -1) return true;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id);

    return (count || 0) < plan.maxProjects;
  },

  async getCurrentPlan(): Promise<SubscriptionPlan | null> {
    const subscription = await this.getUserSubscription();
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id) || null;
  }
};
