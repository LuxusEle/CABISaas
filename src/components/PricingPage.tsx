import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { subscriptionService, SUBSCRIPTION_PLANS } from '../services/subscriptionService';
import type { UserSubscription } from '../types';
import { Check, X, Sparkles, User, Loader2, PartyPopper } from 'lucide-react';
import { LandingHeader } from './LandingHeader';
import { useNavigate } from 'react-router-dom';

interface PricingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark
}) => {
  const navigate = useNavigate();
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setIsLoading(true);
    const subscription = await subscriptionService.getUserSubscription();
    setCurrentSubscription(subscription);
    setIsLoading(false);
  };

  const handlePaddleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    setSelectedPlan(planId);
    setSubscriptionError(null);
    setIsProcessing(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        onSignIn();
        return;
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan || !plan.paddlePriceId) throw new Error('Invalid plan');

      const { openPaddleCheckout, closePaddleCheckout } = await import('../services/paddle');

      openPaddleCheckout({
        priceId: plan.paddlePriceId,
        userId: userData.user.id,
        userEmail: userData.user.email,
        onSuccess: async (data) => {
          try {
            await subscriptionService.handlePaddleSuccess(userData.user!.id, plan.id, data);
            
            // Wait 3 seconds for user to see Paddle success screen, then auto-close
            setTimeout(() => {
              closePaddleCheckout();
              setShowSuccessModal(true);
              setIsProcessing(false);
            }, 1000);
          } catch (err: any) {
            console.error('Success handler error:', err);
            setSubscriptionError('Payment was successful, but we failed to update your account automatically. Please contact support.');
            setIsProcessing(false);
          }
        },
        onClose: () => {
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      console.error('Paddle error:', error);
      setSubscriptionError(error.message || 'An error occurred with Paddle.');
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.')) {
      const success = await subscriptionService.cancelSubscription();
      if (success) {
        loadSubscription();
      }
    }
  };

  const handleResume = async () => {
    const success = await subscriptionService.resumeSubscription();
    if (success) {
      loadSubscription();
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const currentPlanId = currentSubscription?.plan_id || 'free';
  const isPro = currentSubscription?.plan_id === 'pro' && currentSubscription?.status === 'active';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative">
      <LandingHeader
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        isDark={isDark}
        setIsDark={setIsDark}
      />
      
      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30 animate-bounce">
              <PartyPopper size={40} className="text-white" />
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              Welcome to Pro!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your subscription is now active. You've unlocked unlimited projects, custom libraries, and advanced features.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleCloseSuccessModal}
                className="w-full py-4 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Let's Build Something
              </button>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Sparkles size={14} className="text-amber-500" />
              <span>Pro features enabled globally</span>
            </div>
          </div>
        </div>
      )}

      <div className="py-12 px-4 pt-14 sm:pt-16">
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
          {isPro && (
            <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-400">
                    Current Plan: {SUBSCRIPTION_PLANS.find(p => p.id === currentPlanId)?.name}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Status: {currentSubscription?.status}
                    {currentSubscription?.cancel_at_period_end && ' (Cancels at period end)'}
                  </p>
                </div>
                {currentSubscription?.cancel_at_period_end ? (
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

          {subscriptionError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{subscriptionError}</p>
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
                  className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-2 overflow-hidden ${isCurrentPlan && plan.id !== 'free'
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
                      <div className={`p-3 rounded-lg ${plan.id === 'free' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-amber-100 dark:bg-amber-900/30'
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
                    <div className="space-y-3">
                      <button
                        onClick={() => handlePaddleSubscribe(plan.id)}
                        disabled={isCurrentPlan || isProcessing || plan.id === 'free'}
                        className={`w-full py-3 px-4 rounded-lg font-bold transition-all ${isCurrentPlan && plan.id !== 'free'
                          ? 'bg-green-100 text-green-600 cursor-not-allowed'
                          : plan.id === 'free'
                            ? 'bg-slate-200 text-slate-600 cursor-default'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                          }`}
                      >
                        {isCurrentPlan && plan.id !== 'free'
                          ? 'Current Plan'
                          : plan.id === 'free'
                            ? 'Free Forever'
                            : isProcessing && selectedPlan === plan.id
                              ? (
                                <div className="flex items-center justify-center gap-2">
                                  <Loader2 className="animate-spin" size={20} />
                                  Processing...
                                </div>
                              )
                              : 'Subscribe'}
                      </button>
                      
                      {plan.id !== 'free' && !isCurrentPlan && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                          Secure payment via Paddle. Cancel anytime.
                        </p>
                      )}
                    </div>

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
    </div>
  );
};
