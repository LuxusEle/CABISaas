import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Box, Ruler, Calculator, ChevronDown, Sun, Moon } from 'lucide-react';
import { Button } from './Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
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
      className={`inline-block transition-all duration-700 transform ${
        isVisible 
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
  const particles = Array.from({ length: 30 }, (_, i) => ({
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
    <div className="min-h-screen bg-white dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
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

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Box className="w-8 h-8 text-amber-500" />
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                CAB<span className="text-amber-500">ENGINE</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-6">
                <button 
                  onClick={() => scrollToSection('features')}
                  className="text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm font-medium"
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('cta')}
                  className="text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm font-medium"
                >
                  About
                </button>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <ParticleBackground />
        
        {/* Gradient orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
          style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)` }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"
          style={{ transform: `translate(${-scrollY * 0.1}px, ${-scrollY * 0.05}px)` }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-8 animate-slide-up">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Professional Cabinet Design Made Simple</span>
          </div>

          {/* Main heading with cycling animation */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <div className="text-slate-900 dark:text-white">Build Your</div>
            <div className="mt-2 text-gradient inline-block">
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

          {/* Subheading with typewriter effect */}
          <div className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 mb-4">
            <TypewriterText text="Design. Visualize. Build." delay={800} />
          </div>

          <p className="text-lg text-slate-600 dark:text-slate-500 max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '1s' }}>
            Professional-grade cabinet design software with instant 3D visualization, 
            automated cut lists, and material optimization.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '1.2s' }}>
            <Button 
              size="xl" 
              onClick={onGetStarted}
              className="w-full sm:w-auto animate-glow group"
              leftIcon={<ArrowRight className="group-hover:translate-x-1 transition-transform" />}
            >
              Get Started Free
            </Button>
            <Button 
              size="xl" 
              variant="secondary"
              onClick={onSignIn}
              className="w-full sm:w-auto"
            >
              Sign In
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16 animate-slide-up" style={{ animationDelay: '1.4s' }}>
            {[
              { value: '3D', label: 'Visualization' },
              { value: 'BOM', label: 'Auto Reports' },
              { value: 'Cut', label: 'Optimization' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-amber-500">{stat.value}</div>
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-slate-400 dark:text-slate-600" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 bg-slate-100 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              <span className="text-slate-900 dark:text-white">Everything You Need to </span>
              <span className="text-gradient">Build</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Professional tools designed for cabinet makers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Box className="w-8 h-8" />,
                title: 'Visual Design',
                description: 'Drag-and-drop cabinet placement with real-time 3D preview',
                color: 'amber',
              },
              {
                icon: <Ruler className="w-8 h-8" />,
                title: 'Precise Measurements',
                description: 'Accurate dimensions and automatic collision detection',
                color: 'orange',
              },
              {
                icon: <Calculator className="w-8 h-8" />,
                title: 'Material Lists',
                description: 'Instant BOM generation with optimized cut plans',
                color: 'yellow',
              },
            ].map((feature, i) => (
              <FloatingElement key={i} delay={i * 200}>
                <div className="group relative p-8 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-all duration-500 hover:transform hover:-translate-y-2 shadow-sm dark:shadow-none">
                  <div className={`w-14 h-14 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center text-${feature.color}-500 mb-6 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />
                </div>
              </FloatingElement>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="relative py-24 overflow-hidden bg-white dark:bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-600/20 dark:to-orange-600/20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">
            <span className="text-slate-900 dark:text-white">Ready to Start </span>
            <span className="text-gradient">Building?</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Join professional cabinet makers who trust CABENGINE for their projects
          </p>
          <Button 
            size="xl" 
            onClick={onGetStarted}
            className="animate-glow"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Box className="w-6 h-6 text-amber-500" />
              <span className="text-lg font-black text-slate-900 dark:text-white">
                CAB<span className="text-amber-500">ENGINE</span>
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-600 text-sm">
              Professional cabinet design software
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
