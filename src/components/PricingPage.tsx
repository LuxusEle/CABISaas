import React, { useState, useEffect } from 'react';
import { subscriptionService, SUBSCRIPTION_PLANS } from '../services/subscriptionService';
import type { UserSubscription, SubscriptionPlan } from '../types';
import { Check, X, CreditCard, Sparkles, User } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setIsLoading(true);
    const subscription = await subscriptionService.getUserSubscription();
    setCurrentSubscription(subscription);
    setIsLoading(false);
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;
    
    setSelectedPlan(planId);
    setIsProcessing(true);

    try {
      const result = await subscriptionService.initiatePayment(planId);
      if (result && result.url) {
        // Redirect to 2Checkout payment page
        window.location.href = result.url;
      } else {
        alert('Failed to initialize payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.')) {
      const success = await subscriptionService.cancelSubscription();
      if (success) {
        alert('Your subscription has been cancelled.');
        loadSubscription();
      } else {
        alert('Failed to cancel subscription. Please try again.');
      }
    }
  };

  const handleResume = async () => {
    const success = await subscriptionService.resumeSubscription();
    if (success) {
      alert('Your subscription has been resumed.');
      loadSubscription();
    } else {
      alert('Failed to resume subscription. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const currentPlanId = currentSubscription?.plan_id || 'free';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start with our free plan and upgrade as you grow. All plans include core features.
          </p>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && currentSubscription.plan_id !== 'free' && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-400">
                  Current Plan: {SUBSCRIPTION_PLANS.find(p => p.id === currentPlanId)?.name}
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Status: {currentSubscription.status}
                  {currentSubscription.cancel_at_period_end && ' (Cancels at period end)'}
                </p>
              </div>
              {currentSubscription.cancel_at_period_end ? (
                <button
                  onClick={handleResume}
                  className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600"
                >
                  Resume Subscription
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;
            const Icon = plan.id === 'free' ? User : Sparkles;

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-2 overflow-hidden ${
                  isCurrentPlan
                    ? 'border-amber-500 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Popular Badge */}
                {plan.id === 'pro' && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${
                      plan.id === 'free' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      <Icon size={24} className={
                        plan.id === 'free' ? 'text-slate-600 dark:text-slate-400' : 'text-amber-600 dark:text-amber-400'
                      } />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      ${plan.price}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      /{plan.interval}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {plan.description}
                  </p>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan || isProcessing || plan.id === 'free'}
                    className={`w-full py-3 px-4 rounded-lg font-bold transition-all ${
                      isCurrentPlan
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : plan.id === 'free'
                        ? 'bg-slate-200 text-slate-600 cursor-default'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                  >
                    {isProcessing && selectedPlan === plan.id
                      ? 'Processing...'
                      : isCurrentPlan
                      ? 'Current Plan'
                      : plan.id === 'free'
                      ? 'Free Forever'
                      : 'Subscribe'}
                  </button>

                  {/* Features */}
                  <div className="mt-8 space-y-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      Features
                    </p>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations for free plan */}
                  {plan.id === 'free' && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                        Limitations
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <X size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-500 text-sm">
                            Limited to {plan.maxProjects} projects
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <X size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-500 text-sm">
                            No BOM export
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <X size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-500 text-sm">
                            No custom cabinet library
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <X size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-500 dark:text-slate-500 text-sm">
                            No PDF branding
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Questions about our plans?
          </p>
          <a
            href="mailto:support@cabengine.com"
            className="text-amber-500 hover:text-amber-600 font-semibold"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};
