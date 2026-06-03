import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Box, Ruler, Calculator, Check, Sparkles, Layers,
  FileText, Download, Users, Star, Monitor, Zap, Globe
} from 'lucide-react';
import { Button } from './Button';
import { LandingHeader } from './LandingHeader';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

const RevealSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, isDark, setIsDark }) => {
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('app-theme', String(isDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const heroFeatures = [
    {
      icon: <Monitor size={48} />,
      title: 'No Download Required',
      subtitle: '100% browser-based. Nothing to install.',
      border: 'rgba(34, 197, 94, 0.3)',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: <Zap size={48} />,
      title: 'No Payment Until You Earn',
      subtitle: 'Start free. Upgrade when your shop grows.',
      border: 'rgba(245, 158, 11, 0.3)',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: <Globe size={48} />,
      title: 'SketchUp & 3D Export',
      subtitle: 'Export models to your favorite 3D software.',
      border: 'rgba(59, 130, 246, 0.3)',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  const CyclingFeature = () => (
    <div className="relative w-full h-full">
      {heroFeatures.map((f, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center justify-center p-8"
        >
          <div
            className="animate-feature w-full h-full flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 shadow-2xl p-8"
            style={{ borderColor: f.border, animationDelay: `${i * 4}s` }}
          >
            <div className={`w-20 h-20 rounded-2xl ${f.iconBg} flex items-center justify-center`}>
              {f.icon}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center leading-tight">
              {f.title}
            </h3>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 text-center max-w-xs">
              {f.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(79, 70, 229, 0.15); }
          50% { box-shadow: 0 0 40px rgba(79, 70, 229, 0.3); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes featurePop {
          0% { opacity: 0; transform: scale(0.6); }
          4% { opacity: 1; transform: scale(1.1); }
          27% { opacity: 1; transform: scale(1.15); }
          33% { opacity: 0; transform: scale(0.6); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        .dark {
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
            50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.3); }
          }
        }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite; }
        .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
        .animate-feature { animation: featurePop 12s ease-in-out infinite both; }
        .text-gradient {
          background: linear-gradient(135deg, #4F46E5, #6366F1, #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dark .text-gradient {
          background: linear-gradient(135deg, #A855F7, #8B5CF6, #C084FC);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <LandingHeader
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      {/* Hero */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-subtle/30 via-transparent to-transparent dark:from-primary-light/10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-subtle dark:bg-primary-light border border-primary/10">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">Professional Cabinet Design Software</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight">
                <span className="text-slate-900 dark:text-white">Design Kitchens.</span>
                <br />
                <span className="text-gradient">Build Cabinets.</span>
                <br />
                <span className="text-slate-900 dark:text-white">Grow Your Shop.</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                Professional-grade 3D kitchen design with instant BOM generation, 
                cut optimization, and manufacturing exports — all in your browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 text-lg group"
                >
                  Get Started Free
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onSignIn}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all border border-slate-200 dark:border-slate-700 text-lg"
                >
                  Sign In
                </button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-950 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Trusted by <span className="font-semibold text-slate-700 dark:text-slate-200">200+</span> cabinet makers
                  </p>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:flex flex-col gap-6">
              <div className="relative h-[320px]">
                <CyclingFeature />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[4/3]">
                <img
                  src="/kitchen_hero.png"
                  alt="Cabinetrix Pro 3D Kitchen Design"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '3D', label: 'Real-Time Visualization', desc: 'interactive 3D preview' },
              { value: 'BOM', label: 'Auto-Generated Reports', desc: 'materials & cut lists' },
              { value: 'DXF', label: 'CNC-Ready Exports', desc: 'drilling & cutting files' },
              { value: 'PDF', label: 'Professional Quotes', desc: 'branded quotations' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-primary mb-1">{stat.value}</div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{stat.label}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <RevealSection>
        <section id="features" className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                <span className="text-slate-900 dark:text-white">Everything You Need, </span>
                <span className="text-gradient">Nothing You Don't</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">
                Purpose-built for professional cabinet makers and workshop operators
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: <Box size={28} />,
                  title: '3D Design Studio',
                  description: 'Drag-and-drop cabinet placement on multiple walls with real-time 3D preview. Support for base, wall, tall, corner, and specialty cabinets.',
                  features: ['Real-time 3D rendering', 'Multi-wall layouts', 'Obstacle integration'],
                },
                {
                  icon: <Calculator size={28} />,
                  title: 'Instant BOM Engine',
                  description: 'Automatic bill of materials with exact panel dimensions, hardware counts, and cost calculations. No manual takeoffs.',
                  features: ['Panel dimensioning', 'Hardware counts', 'Cost estimation'],
                },
                {
                  icon: <Layers size={28} />,
                  title: 'Manufacturing Exports',
                  description: 'Export CNC-ready DXF files with drilling patterns, Excel spreadsheets, SketchUp models, and optimized cut plans for your workshop.',
                  features: ['DXF cutting files', 'SketchUp & 3D export', 'Drilling patterns', 'Cut optimization'],
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary-subtle dark:bg-primary-light flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check size={14} className="text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* How It Works */}
      <RevealSection>
        <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50/80 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                <span className="text-slate-900 dark:text-white">From Design to </span>
                <span className="text-gradient">Manufacturing</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">
                Four simple steps from concept to production
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  title: 'Set Up',
                  description: 'Define your walls, materials, and preferences in minutes.',
                  icon: <Ruler size={24} />,
                },
                {
                  step: '02',
                  title: 'Design',
                  description: 'Place cabinets with drag-and-drop. Preview in real-time 3D.',
                  icon: <Box size={24} />,
                },
                {
                  step: '03',
                  title: 'Review',
                  description: 'BOM, cut plans, and cost estimates generated instantly.',
                  icon: <FileText size={24} />,
                },
                {
                  step: '04',
                  title: 'Export',
                  description: 'Download DXF, Excel, PDF — ready for the workshop.',
                  icon: <Download size={24} />,
                },
              ].map((step, i) => (
                <div key={i} className="relative text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-primary-subtle dark:bg-primary-light flex items-center justify-center text-primary mx-auto mb-6 group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <div className="absolute top-8 left-[calc(50%+40px)] hidden md:block w-[calc(100%-80px)] h-[2px] bg-slate-200 dark:bg-slate-700">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-xs font-black text-primary uppercase tracking-widest">{step.step}</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Pricing */}
      <RevealSection>
        <section id="pricing" className="py-16 sm:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                <span className="text-slate-900 dark:text-white">Simple </span>
                <span className="text-gradient">Pricing</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400">
                Start free — no credit card required. Pay only when you're earning.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 mb-6">
                  <Users size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Free</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Perfect for getting started — no payment required, no risk
                </p>
                <button
                  onClick={onGetStarted}
                  className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all border border-slate-200 dark:border-slate-700 mb-8"
                >
                  Get Started Free
                </button>
                <ul className="space-y-3">
                  {[
                    'Up to 3 projects',
                    'Basic cabinet presets',
                    '3D visualization',
                    'Browser-based — no download',
                    'On-screen reports',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary shadow-xl shadow-primary/10">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  POPULAR
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-subtle dark:bg-primary-light flex items-center justify-center text-primary mb-6">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pro</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$29</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  For professionals and growing workshops
                </p>
                <button
                  onClick={onGetStarted}
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-lg shadow-primary/20 mb-8"
                >
                  Start Pro Trial
                </button>
                <ul className="space-y-3">
                  {[
                    'Unlimited projects',
                    'Custom cabinet library',
                    'BOM & PDF export',
                    'DXF & CNC export',
                    'Advanced cut optimization',
                    'Full cloud-based platform',
                    'Priority email support',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* Contact */}
      <RevealSection>
        <section id="contact" className="py-16 sm:py-24 bg-slate-50/80 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                <span className="text-slate-900 dark:text-white">Get In </span>
                <span className="text-gradient">Touch</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Have questions? We're here to help.
              </p>
            </div>
            <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6">Contact Info</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</p>
                    <a href="mailto:support@cabinetrixpro.com" className="text-sm font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors">
                      support@cabinetrixpro.com
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Response Time</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Within 24-48 business hours</p>
                  </div>
                </div>
              </div>
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6">Software Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Platform</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Cabinetrix Pro</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Cloud-based SaaS — browser only</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* CTA */}
      <RevealSection>
        <section className="py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary-light dark:via-primary/5 dark:to-primary-light" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-5xl font-black mb-6 leading-tight">
              <span className="text-slate-900 dark:text-white">Ready to Transform </span>
              <span className="text-gradient">Your Workflow?</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-xl mx-auto">
              Join 200+ cabinet makers using Cabinetrix Pro to design faster, build smarter.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 text-xl group"
            >
              Get Started Free
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </RevealSection>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm">
                C
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300">Cabinetrix Pro</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/docs" className="text-sm text-slate-400 hover:text-primary transition-colors">Docs</Link>
              <Link to="/terms" className="text-sm text-slate-400 hover:text-primary transition-colors">Terms</Link>
              <Link to="/pricing" className="text-sm text-slate-400 hover:text-primary transition-colors">Pricing</Link>
            </div>
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Cabinetrix Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
