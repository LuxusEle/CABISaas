import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Box, Ruler, Calculator, ChevronDown, Sun, Moon, Menu, X, User, Check, FileText, Shield } from 'lucide-react';
import { Button } from './Button';
import { LandingDocsModal } from './LandingDocsModal';
import { LandingHeader } from './LandingHeader';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

// Animated text component with typing effect
const TypewriterText: React.FC<{ text: string; delay?: number; className?: string }> = ({
  text,
  delay = 0,
  className = ''
}) => {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

// Word reveal animation component
const RevealWord: React.FC<{ text: string; delay?: number; className?: string }> = ({
  text,
  delay = 0,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <span
      className={`inline-block transition-all duration-700 transform ${isVisible
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-8'
        } ${className}`}
    >
      {text}
    </span>
  );
};

// Cycling text animation component
const CyclingText: React.FC<{
  phrases: string[];
  className?: string;
}> = ({
  phrases,
  className = ''
}) => {
    const [index, setIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
      // Clear any existing timeouts
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current = [];

      const currentPhrase = phrases[index];
      const charDelay = 2000 / currentPhrase.length; // 2000ms total typing time

      // Type each character
      for (let i = 0; i <= currentPhrase.length; i++) {
        const timeout = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, i));

          // When typing is complete
          if (i === currentPhrase.length) {
            // Hide cursor after a brief pause
            const cursorTimeout = setTimeout(() => {
              setShowCursor(false);
            }, 500);
            timeoutsRef.current.push(cursorTimeout);

            // Move to next phrase after total display time (3.5s total per phrase)
            const nextTimeout = setTimeout(() => {
              setIndex((prev) => (prev + 1) % phrases.length);
              setShowCursor(true);
            }, 3500);
            timeoutsRef.current.push(nextTimeout);
          }
        }, i * charDelay);

        timeoutsRef.current.push(timeout);
      }

      return () => {
        timeoutsRef.current.forEach(t => clearTimeout(t));
      };
    }, [index]); // Only re-run when index changes

    return (
      <span className={`inline-block whitespace-nowrap ${className}`}>
        {displayText}
        {showCursor && <span className="animate-pulse">|</span>}
      </span>
    );
  };

// Floating animation component
const FloatingElement: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className = ''
}) => {
  return (
    <div
      className={`animate-float ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Particle background component
const ParticleBackground: React.FC = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 2 + Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-amber-500/20 animate-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  const [scrollY, setScrollY] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('app-theme') !== 'false'; } catch { return true; }
  });
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('app-theme', String(isDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white overflow-x-hidden relative">
      {/* Fixed Background Image - Desktop */}
      <div
        className="fixed inset-0 z-0 transition-all duration-1000 ease-out hidden md:block"
        style={{
          backgroundImage: isDark ? 'url("/landing-bg.jpeg")' : 'url("/landing-bg-light.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(1.15) translateY(${scrollY * 0.05}px)`
        }}
      />

      {/* Fixed Background Image - Mobile */}
      <div
        className="fixed inset-0 z-0 transition-all duration-1000 ease-out block md:hidden"
        style={{
          backgroundImage: isDark ? 'url("/landing-bg-mobile.jpeg")' : 'url("/landing-bg-light-mobile.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(1.15) translateY(${scrollY * 0.05}px)`
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes particle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.6), 0 0 60px rgba(245, 158, 11, 0.3); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-particle { animation: particle 4s ease-in-out infinite; }
        .animate-shimmer { 
          background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        .text-gradient {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%);
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

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-start md:items-center justify-center md:pt-14 sm:pt-16 overflow-hidden bg-transparent">
        {/* Layered Overlays Removed as requested */}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-start md:items-center justify-end min-h-screen pt-4 md:pt-12 pb-24 md:pb-40 w-full">
          <div className="w-full max-w-2xl text-center md:text-right flex flex-col items-center md:items-end md:mr-[15%] xl:mr-[-10%]">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-4 sm:mb-8 animate-slide-up">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-500" />
              <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">Professional Cabinet Design Made Simple</span>
            </div>

            {/* Subheading and description with mobile glassmohrphism background for readability */}
            <div className="bg-white/5 dark:bg-slate-900/5 backdrop-blur-xs rounded-2xl p-3 md:bg-transparent md:backdrop-blur-none md:p-0 md:rounded-none animate-slide-up w-full max-w-2xl md:ml-auto md:mr-0 mb-6 sm:mb-16 text-right">
              {/* Subheading with typewriter effect */}
              <div className="text-xl sm:text-2xl md:text-3xl text-slate-800 dark:text-slate-200 md:text-slate-600 md:dark:text-slate-400 mb-4 sm:mb-6 font-medium">
                <TypewriterText text="Design. Visualize. Build." delay={800} />
              </div>

              <p className="text-lg sm:text-xl md:text-2xl text-slate-800 dark:text-slate-300 md:text-slate-600 md:dark:text-slate-500 leading-relaxed" style={{ animationDelay: '1s' }}>
                Professional-grade cabinet design software with instant 3D visualization,
                automated cut lists, and material optimization.
              </p>
            </div>

            {/* Main heading with cycling animation - responsive text sizes */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-6 sm:mb-8 leading-tight md:leading-snug">
              <div className="text-slate-900 dark:text-white">Build Your</div>
              <div className="mt-1 sm:mt-2 text-gradient inline-block h-[1.2em]">
                <CyclingText
                  phrases={[
                    "Dream Kitchen",
                    "Perfect Cabinets",
                    "Custom Furniture",
                    "Dream Space"
                  ]}
                />
              </div>
            </h1>

            {/* CTA Buttons - full width on mobile */}
            <div className="flex flex-col sm:flex-row items-center md:justify-end justify-center gap-4 sm:gap-6 px-4 sm:px-0 animate-slide-up" style={{ animationDelay: '1.2s' }}>
              <Button
                size="xl"
                onClick={onGetStarted}
                className="w-full sm:w-auto animate-glow group min-h-[56px]"
                leftIcon={<ArrowRight className="group-hover:translate-x-1 transition-transform" />}
              >
                Get Started Free
              </Button>
              <Button
                size="xl"
                variant="secondary"
                onClick={onSignIn}
                className="w-full sm:w-auto min-h-[56px]"
              >
                Sign In
              </Button>
            </div>

            {/* Stats - better mobile layout */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg md:ml-auto md:mr-0 mt-12 sm:mt-16 animate-slide-up px-4 sm:px-0" style={{ animationDelay: '1.4s' }}>
              {[
                { value: '3D', label: 'Visualization' },
                { value: 'BOM', label: 'Auto Reports' },
                { value: 'Cut', label: 'Optimization' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-500">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-600" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-16 sm:py-24 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4">
              <span className="text-slate-900 dark:text-white">Everything You Need to </span>
              <span className="text-gradient">Build</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">Professional tools designed for cabinet makers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                icon: <Box className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: 'Visual Design',
                description: 'Drag-and-drop cabinet placement with real-time 3D preview',
                color: 'amber',
              },
              {
                icon: <Ruler className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: 'Precise Measurements',
                description: 'Accurate dimensions and automatic collision detection',
                color: 'orange',
              },
              {
                icon: <Calculator className="w-6 h-6 sm:w-8 sm:h-8" />,
                title: 'Material Lists',
                description: 'Instant BOM generation with optimized cut plans',
                color: 'yellow',
              },
            ].map((feature, i) => (
              <FloatingElement key={i} delay={i * 200}>
                <div className="group relative p-6 sm:p-8 rounded-xl sm:rounded-2xl bg-white/10 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 hover:border-amber-500/50 transition-all duration-500 hover:transform hover:-translate-y-2 shadow-sm dark:shadow-none">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center text-${feature.color}-500 mb-4 sm:mb-6 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">{feature.description}</p>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />
                </div>
              </FloatingElement>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-16 sm:py-24 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4">
              <span className="text-slate-900 dark:text-white">Simple </span>
              <span className="text-gradient">Pricing</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="relative bg-white/10 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                    <User className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Free</h3>
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-slate-500 dark:text-slate-400">/month</span>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-6">Perfect for hobbyists and small projects</p>

                <Button
                  size="lg"
                  onClick={onGetStarted}
                  variant="secondary"
                  className="w-full mb-6"
                >
                  Get Started Free
                </Button>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Up to 3 projects</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Basic cabinet presets</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">3D visualization</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <X size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-500 text-sm">No BOM export</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <X size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-500 text-sm">No custom cabinets</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative bg-white/10 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-amber-500 overflow-hidden transform md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pro</h3>
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$29</span>
                  <span className="text-slate-500 dark:text-slate-400">/month</span>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-6">For professionals and growing shops</p>

                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="w-full mb-6 bg-amber-500 hover:bg-amber-600"
                >
                  Start Pro Trial
                </Button>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm"><strong>Unlimited</strong> projects</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Custom cabinet library</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">BOM & PDF export</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Advanced cut optimization</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Email support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="relative py-16 sm:py-24 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-md overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4">
              <span className="text-slate-900 dark:text-white">Contact </span>
              <span className="text-gradient">Us</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
              Have questions about Protradee? We're here to help you get started.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Details Card */}
            <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 animate-slide-up">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-3">Platform Details</h3>
                  <div className="space-y-1">
                    <p className="text-slate-900 dark:text-white font-bold">Protradee</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Legal Name: ASANKE ABEYKOON JAYALATH RATHNAYAKE</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-3">Physical Address</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    98/16, NUWARA WEWA WATTA,<br />
                    JAFFNA ROAD,<br />
                    ANURADHAPURA,<br />
                    SRI LANKA
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Contact Card */}
            <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-3">Direct Contact</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                        <Menu className="w-4 h-4 text-amber-500 rotated-45" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                        <a href="tel:+94777246137" className="text-sm text-slate-900 dark:text-white font-bold hover:text-amber-500 transition-colors tracking-tight">
                          +94 777 246 137
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                        <FileText className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Email Support</p>
                        <div className="flex flex-col">
                          <a href="mailto:support@protradee.com" className="text-sm text-slate-900 dark:text-white font-bold hover:text-amber-500 transition-colors">
                            support@protradee.com
                          </a>
                          <a href="mailto:asanke1@gmail.com" className="text-sm text-slate-900 dark:text-white font-bold mt-1 hover:text-amber-500 transition-colors">
                            asanke1@gmail.com
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    We typically respond to all inquiries within 24-48 business hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="relative py-16 sm:py-24 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-orange-100/50 dark:from-amber-600/30 dark:to-orange-600/30" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6">
            <span className="text-slate-900 dark:text-white">Ready to Start </span>
            <span className="text-gradient">Building?</span>
          </h2>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 px-4 sm:px-0">
            Join professional cabinet makers who trust CABENGINE for their projects
          </p>
          <Button
            size="xl"
            onClick={onGetStarted}
            className="animate-glow w-full sm:w-auto min-h-[56px]"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-md border-t border-slate-200/20 dark:border-slate-800/50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/landing.png" alt="CabEngine Logo" className="h-6 sm:h-8 w-auto object-contain dark:invert-0 invert" />
            </div>
            <p className="text-slate-600 dark:text-slate-600 text-xs sm:text-sm text-center md:text-left">
              Professional cabinet design software
            </p>
          </div>
        </div>
      </footer>

      {/* Docs Modal */}
      <LandingDocsModal isOpen={docsModalOpen} onClose={() => setDocsModalOpen(false)} onGetStarted={onGetStarted} />
    </div>
  );
};
