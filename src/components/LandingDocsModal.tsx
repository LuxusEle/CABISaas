import React from 'react';
import { X, FileText, Smartphone, Zap, Shield, TrendingUp, ArrowRight, Gift, Users, Rocket } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export const LandingDocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose, onGetStarted }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
          {/* Gradient Header */}
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    CabEngine <span className="text-amber-500">Pro</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Profit-Protection Engine</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Hero Statement */}
            <div className="text-center space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                The profit-protection engine for modern{' '}
                <span className="text-amber-500">cabinet manufacturers</span>
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                A precision-first measurement, BOM, and quoting engine built to eliminate cost overruns 
                and protect your profit margins.
              </p>
            </div>

            {/* Core Principle Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                  <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Built on One Simple Principle
                    </p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                      Accurate Measurements ={' '}
                      <span className="text-amber-500">Safe Profits</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Why CabEngine Pro?
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    icon: <FileText className="w-6 h-6" />,
                    title: 'Professional Quotes',
                    desc: 'Create polished quotes and invoices instantly',
                    color: 'blue'
                  },
                  {
                    icon: <Smartphone className="w-6 h-6" />,
                    title: 'Mobile Ready',
                    desc: 'Works seamlessly on any mobile device',
                    color: 'green'
                  },
                  {
                    icon: <TrendingUp className="w-6 h-6" />,
                    title: 'Instant Delivery',
                    desc: 'Convert and send documents in seconds',
                    color: 'amber'
                  }
                ].map((feature, idx) => (
                  <div 
                    key={idx}
                    className="group p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center text-${feature.color}-600 dark:text-${feature.color}-400 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h5 className="font-bold text-slate-900 dark:text-white mb-2">
                      {feature.title}
                    </h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Timeline */}
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Your Workflow
              </h4>
              <div className="relative">
                {/* Connection Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500 to-amber-500/20 -translate-y-1/2 hidden md:block" />
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { step: '01', label: 'Measure', active: true },
                    { step: '02', label: 'Calculate', active: true },
                    { step: '03', label: 'Validate', active: true },
                    { step: '04', label: 'Quote', active: true },
                    { step: '05', label: 'Invoice', active: true },
                    { step: '06', label: 'Close', active: false, highlight: true }
                  ].map((item, idx) => (
                    <div key={idx} className="relative flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mb-2 z-10 transition-all duration-300 ${
                        item.highlight 
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110' 
                          : item.active 
                            ? 'bg-slate-900 dark:bg-slate-700 text-white' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {item.step}
                      </div>
                      <span className={`text-sm font-medium ${
                        item.highlight 
                          ? 'text-amber-500' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing / Beta Invitation Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Join Our Beta Program
                </h4>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Free Beta Card */}
                <div className="group relative rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-[3px] animate-gradient-x hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-500 hover:-translate-y-2">
                  {/* Inner content */}
                  <div className="relative rounded-2xl bg-white dark:bg-slate-800 p-8 text-center h-full overflow-hidden">
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-all duration-500">
                        <Rocket className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                      </div>
                    <h5 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Free Beta Access</h5>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Join us for free and help us build the future of cabinet manufacturing
                    </p>
                    <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>All Pro features included</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>Unlimited projects</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>Priority support</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>Direct feedback channel</span>
                      </div>
                    </div>
                     <button 
                       onClick={() => { onClose(); onGetStarted(); }}
                       className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg hover:gap-4 transition-all duration-200"
                     >
                       <span>Join Free Beta</span>
                       <ArrowRight className="w-5 h-5" />
                     </button>
                   </div>
                 </div>
               </div>

                {/* Community Card */}
                <div className="flex flex-col justify-center p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                      <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-lg">Build Together</h5>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                    We're not just building software—we're building a community. Your feedback shapes the future of CabEngine Pro.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white">Shape the Product:</span>{' '}
                        Your suggestions directly influence our roadmap
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white">Early Access:</span>{' '}
                        Be the first to try new features
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white">Locked-in Pricing:</span>{' '}
                        Beta users get special rates when we launch
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center p-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">Limited spots available.</span>{' '}
                  Join now and let's build the ultimate cabinet management tool together!
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 dark:bg-slate-800 p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent" />
              <div className="relative">
                <p className="text-xl font-bold text-white mb-2">
                  Ready to protect your profits?
                </p>
                <p className="text-slate-400 mb-6">
                  Join our free beta and start creating professional quotes today
                </p>
                <button 
                  onClick={() => { onClose(); onGetStarted(); }}
                  className="flex items-center justify-center gap-2 text-amber-500 font-semibold hover:gap-4 transition-all duration-200"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingDocsModal;
