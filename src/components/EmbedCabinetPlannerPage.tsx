import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, Code, Shield, Zap, ArrowRight, Smartphone } from 'lucide-react';
import { LandingHeader } from './LandingHeader';

interface EmbedCabinetPlannerPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const EmbedCabinetPlannerPage: React.FC<EmbedCabinetPlannerPageProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark
}) => {
  return (
    <>
      <Helmet>
        <title>Embeddable 3D Cabinet Configurator API | CabEngine Pro</title>
        <meta name="description" content="Embed a 3D kitchen cabinet configurator directly in your website. White-label cabinet design API with iframe integration. Let your customers design cabinets on your site." />
      </Helmet>
      <div className="bg-slate-50 dark:bg-slate-950">
        <LandingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} isDark={isDark} setIsDark={setIsDark} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16">
          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold mb-6">
              <Code size={16} /> Developer API
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              Add a 3D Cabinet Designer to Your Website in Minutes
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              Embed a fully functional 3D cabinet configurator via a simple iframe. 
              Your customers can design kitchens, generate cut lists, and request quotes 
              without leaving your site.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
              >
                Get API Access
              </button>
              <button
                onClick={onSignIn}
                className="px-8 py-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-lg transition-all"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Code size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Simple Iframe Embed</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Copy a single HTML snippet. Works with any website builder, CMS, or framework.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Shield size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Domain Whitelisting</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Lock your API key to approved domains. Prevent unauthorized embedding and token theft.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Zap size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Event-Driven API</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Listen for design changes, quote requests, and project saves via native postMessage events.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Smartphone size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Responsive & Mobile</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">The configurator adapts to any container size. Works on desktop, tablet, and mobile.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Check size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">White-Label Ready</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Remove all branding. Your logo, your colors, your domain. The configurator is yours.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <ArrowRight size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Quote & BOM Output</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Capture customer designs with instant quotes, cut lists, and material reports ready for production.</p>
            </div>
          </div>

          {/* Code Snippet */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-16">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Integration</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Add this snippet to any page. Replace <code className="text-amber-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">YOUR_PRODUCTION_API_KEY</code> with your key.
              </p>
              <pre className="bg-slate-950 dark:bg-black text-slate-200 rounded-xl p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm leading-relaxed">
                <code>{`<!-- Secure CabEngine Pro Iframe Integration -->
<div style="position:relative; width:100%; height:600px;">
  <iframe
    src="https://www.protradee.com/embed/setup?apiKey=YOUR_PRODUCTION_API_KEY&theme=light"
    style="width:100%; height:100%; border:none; border-radius:12px;"
    allow="accelerometer; gyroscope; vr;">
  </iframe>
</div>`}</code>
              </pre>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center mb-10">
              Who Uses the Embed Configurator
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">E-Commerce Stores</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Kitchen cabinet retailers let customers design before they buy, capturing leads and specs directly.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Builder Portals</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Home builders and remodelers offer a cabinet configurator on their project management platform.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Manufacturer Websites</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Cabinet makers provide a white-label design tool to their dealer network and direct customers.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Start Embedding the 3D Cabinet Planner
            </h2>
            <p className="text-amber-100 mb-8 max-w-2xl mx-auto">
              Get your API key and integration docs. Free tier available — no credit card required.
            </p>
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-white text-amber-700 rounded-xl font-bold text-lg hover:bg-amber-50 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
            >
              Get Started Free <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
