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
    paddlePriceId: null
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
    paddlePriceId: import.meta.env.VITE_PADDLE_PRO_PRICE_ID || null
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
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return this.createFreeSubscription(userData.user.id);
    }

    return data[0];
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
      if (error.code === '23505') { // Unique constraint violation
        // Row already exists, just fetch it
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();
        return existing;
      }
      console.error('Error creating free subscription:', error);
      throw error;
    }

    return data;
  },

  async initiatePaddleSubscription(planId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not logged in');

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan || !plan.paddlePriceId) throw new Error('Invalid plan or missing Paddle Price ID');

    const { openPaddleCheckout } = await import('./paddle');

    openPaddleCheckout({
      priceId: plan.paddlePriceId,
      userId: userData.user.id,
      userEmail: userData.user.email,
    });
  },

  async cancelSubscription(): Promise<boolean> {
    // In Paddle, we usually prefer directing users to the Customer Portal
    return this.manageSubscription();
  },

  async manageSubscription(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('paddle_customer_id')
      .eq('user_id', userData.user.id)
      .single();

    if (!sub?.paddle_customer_id) {
      alert('Could not find your customer record. Please contact support.');
      return false;
    }

    const { openPaddleCheckout } = await import('./paddle');
    
    openPaddleCheckout({
      customerId: sub.paddle_customer_id,
      userId: userData.user.id,
      // In Paddle v2, opening with a customer ID allows them to see their billing
      onClose: () => {
        window.location.reload();
      }
    });
    
    return true;
  },

  async resumeSubscription(): Promise<boolean> {
    return this.manageSubscription();
  },

  async canCreateProject(): Promise<boolean> {
    const isPro = await this.isPro();
    if (isPro) return true;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id);

    return (count || 0) < 3;
  },

  async isPro(): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', userData.user.id)
      .single();

    return sub?.plan_id === 'pro' && sub?.status === 'active';
  },

  async getCurrentPlan(): Promise<SubscriptionPlan | null> {
    const subscription = await this.getUserSubscription();
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_id) || null;
  }
};
