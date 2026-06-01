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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    // Only set loading if we actually have a user to check for
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
          // Database update is now handled securely by the Edge Function (Webhook)
          console.log('Payment success received. Waiting for webhook sync...');
          
          // Wait 1 second for user to see Paddle success screen, then auto-close
          setTimeout(() => {
            closePaddleCheckout();
            setShowSuccessModal(true);
            setIsProcessing(false);
          }, 1000);
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
      
      {/* Launch Promo Overlay */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500" />
        <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 max-w-xl w-full text-center border-4 border-orange-500/30 animate-in zoom-in-95 duration-500 overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/40 rotate-3 animate-pulse">
            <Sparkles size={48} className="text-white" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter uppercase italic">
            It's <span className="text-orange-600">Free</span> Now!
          </h2>
          
          <div className="space-y-4 mb-10">
            <p className="text-xl font-bold text-slate-700 dark:text-slate-200">
              Enjoy full Pro features for free during our launch phase.
            </p>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic">
              No subscription needed. No credit cards. Just start building your dream kitchen today.
            </p>
          </div>
          
          <div className="space-y-4 relative z-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10 flex items-center justify-center gap-3 group text-lg uppercase tracking-widest"
            >
              Start Building Now
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
            
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Limited Time Launch Offer
            </p>
          </div>
        </div>
      </div>

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
            <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/10 border-2 border-orange-500/20 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Sparkles className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    You are a Pro Member
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Status: <span className="capitalize font-semibold text-green-600 dark:text-green-400">{currentSubscription?.status}</span>
                    {currentSubscription?.cancel_at_period_end && ' (Cancels at period end)'}
                  </p>
                </div>
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
                    ? 'border-orange-500 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                    }`}
                >
                  {/* Popular Badge */}
                  {plan.id === 'pro' && (
                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-lg ${plan.id === 'free' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-100 dark:bg-amber-900/30'
                        }`}>
                        <Icon size={24} className={
                          plan.id === 'free' ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-700 dark:text-orange-400'
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
                            : 'bg-orange-600 text-white hover:bg-orange-700'
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
              className="text-orange-600 hover:text-orange-700 font-semibold"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
