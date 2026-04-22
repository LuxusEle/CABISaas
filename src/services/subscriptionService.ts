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
    if (!userData.user) throw new Error('User not authenticated');

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan || !plan.paddlePriceId) throw new Error('Invalid plan or missing Paddle Price ID');

    const { openPaddleCheckout } = await import('./paddle');

    openPaddleCheckout({
      priceId: plan.paddlePriceId,
      userId: userData.user.id,
      userEmail: userData.user.email,
      onSuccess: async (data) => {
        await this.handlePaddleSuccess(userData.user!.id, plan.id, data);
        window.location.reload(); // Refresh to update UI
      }
    });
  },

  async handlePaddleSuccess(userId: string, planId: string, paddleData: any): Promise<void> {
    console.log('Paddle Success Callback Data:', paddleData);
    alert('Payment Successful! Processing your subscription update...');
    
    // Extracting data more broadly to cover different Paddle v2 event structures
    const paddleSubId = paddleData.subscription_id || 
                       paddleData.subscription?.id || 
                       paddleData.id || 
                       (paddleData.items?.[0]?.subscription_id);
    
    const paddleCustId = paddleData.customer_id || 
                        paddleData.customer?.id;

    if (!paddleSubId) {
      console.error('Could not find subscription ID in Paddle data:', paddleData);
      alert('Error: Could not find Subscription ID. Update aborted.');
      return;
    }

    const subscriptionData = {
      plan_id: planId,
      status: 'active',
      paddle_subscription_id: paddleSubId,
      paddle_customer_id: paddleCustId,
      current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Updating database for User:', userId);
    console.log('Update Data:', subscriptionData);

    const { data, error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Supabase Update Error:', error);
      alert(`Database Update FAILED\nUser: ${userId}\nError: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.warn('No rows were updated.');
      alert(`Database Update DONE but 0 rows affected.\nUser: ${userId}\nThis means no row exists for this User ID.`);
    } else {
      console.log('Database Update Success:', data);
      alert(`SUCCESS!\nUser: ${userId}\nNew Plan: ${planId}\nSub ID: ${paddleSubId}`);
    }
  },

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
