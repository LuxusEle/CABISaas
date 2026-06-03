import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../services/supabaseClient';
import { subscriptionService, SUBSCRIPTION_PLANS } from '../services/subscriptionService';
import type { UserSubscription } from '../types';
import { mpgsService } from '../services/mpgsService';
import { MPGS_GATEWAY_URL } from '../services/mpgs';
import { Check, X, Sparkles, User, Loader2 } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCheckoutReturn, setIsCheckoutReturn] = useState(false);

  // Hosted Checkout return callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'complete') {
      const resultIndicator = params.get('resultIndicator')
      const sessionId = sessionStorage.getItem('hco_sessionId')
      const orderId = sessionStorage.getItem('hco_orderId')
      const planId = sessionStorage.getItem('hco_planId')
      const successIndicator = sessionStorage.getItem('hco_successIndicator')

      window.history.replaceState({}, '', window.location.pathname)

      const indicatorsMatch = resultIndicator === successIndicator
      if (!indicatorsMatch || !sessionId || !orderId || !planId) {
        setSubscriptionError('Payment verification failed. Please contact support.')
        return
      }

      setIsCheckoutReturn(true)

      mpgsService.completeCheckout(sessionId, orderId, planId)
        .then((result) => {
          setIsCheckoutReturn(false)
          ;['hco_sessionId', 'hco_orderId', 'hco_successIndicator', 'hco_planId'].forEach(k => sessionStorage.removeItem(k))
          setShowSuccessModal(true)
          loadSubscription()
        })
        .catch((err) => {
          setIsCheckoutReturn(false)
          setSubscriptionError(err.message || 'Failed to activate subscription')
        })
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsLoading(true);
    const subscription = await subscriptionService.getUserSubscription();
    setCurrentSubscription(subscription);
    setIsLoading(false);
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      onSignIn();
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;

    setIsProcessing(true);
    setSubscriptionError(null);

    try {
      const returnUrl = window.location.origin + window.location.pathname + '?checkout=complete'
      const result = await mpgsService.initiateCheckout(planId, plan.price, returnUrl)

      sessionStorage.setItem('hco_sessionId', result.sessionId)
      sessionStorage.setItem('hco_orderId', result.orderId)
      sessionStorage.setItem('hco_successIndicator', result.successIndicator)
      sessionStorage.setItem('hco_planId', planId)

      const existing = document.querySelector('script[src*="checkout.min.js"]')
      if (existing && window.Checkout) {
        window.Checkout.configure({ session: { id: result.sessionId } })
        window.Checkout.showPaymentPage()
        return
      }

      const script = document.createElement('script')
      script.src = `${MPGS_GATEWAY_URL}/static/checkout/checkout.min.js`
      script.onload = () => {
        window.Checkout.configure({ session: { id: result.sessionId } })
        window.Checkout.showPaymentPage()
      }
      script.onerror = () => {
        setIsProcessing(false)
        setSubscriptionError('Failed to load payment page. Please try again.')
      }
      document.head.appendChild(script)
    } catch (err: any) {
      setIsProcessing(false)
      setSubscriptionError(err.message || 'Failed to initiate payment')
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
    <>
      <Helmet>
        <title>Pricing - CabEngine Pro | 3D Cabinet Design Software</title>
        <meta name="description" content="Choose the right plan for your cabinet workshop. Free tier available. Pro plan at $29/month unlocks full reports, advanced layout overrides, and embeddable configurator APIs." />
      </Helmet>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative">
      <LandingHeader
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <div className="py-12 px-4 pt-14 sm:pt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Start with our free plan and upgrade as you grow. All plans include core features.
            </p>
          </div>

          {isPro && (
            <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-500/20 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
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
                  {plan.id === 'pro' && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}

                  <div className="p-8">
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

                    <div className="mb-4">
                      <span className="text-4xl font-black text-slate-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        /{plan.interval}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      {plan.description}
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={() => handleSubscribe(plan.id)}
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
                            : isProcessing
                              ? (
                                <div className="flex items-center justify-center gap-2">
                                  <Loader2 className="animate-spin" size={20} />
                                  Redirecting...
                                </div>
                              )
                              : 'Subscribe'}
                      </button>

                      {plan.id !== 'free' && !isCurrentPlan && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                          Secure payment via Mastercard Gateway. Cancel anytime.
                        </p>
                      )}
                    </div>

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

      {/* Processing Overlay for Checkout Return */}
      {isCheckoutReturn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
            <Loader2 className="animate-spin mx-auto mb-4" size={48} />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Processing Payment
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Please wait while we activate your subscription...
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome to Pro!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your subscription is now active. Start building unlimited projects.
            </p>
            <button
              onClick={handleCloseSuccessModal}
              className="w-full py-3 px-4 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
