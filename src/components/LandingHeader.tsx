import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, Sun, Moon, Menu, X, FileText, Shield } from 'lucide-react';

interface LandingHeaderProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onSignIn,
  onGetStarted,
  isDark,
  setIsDark
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      // Navigate to home with hash
      navigate('/#' + id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Handle hash scrolling after navigation
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Small delay to ensure component is rendered
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          // Clear hash after scroll
          window.history.replaceState(null, '', '/');
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname, location.hash]);

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'About', id: 'about' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/landing.png"
              alt="CabEngine Logo"
              className="h-8 sm:h-10 w-auto object-contain dark:invert-0 invert"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm font-medium"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/docs"
              className="text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm font-medium flex items-center gap-1"
            >
              Docs
            </Link>
            <Link
              to="/terms"
              className="text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm font-medium flex items-center gap-1"
            >
              Terms
            </Link>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-base font-medium min-h-[48px]"
              >
                {link.label}
              </button>
            ))}
            <Link
              to="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-base font-medium min-h-[48px] flex items-center gap-2"
            >
              <FileText size={18} />
              Docs
            </Link>
            <Link
              to="/terms"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-base font-medium min-h-[48px] flex items-center gap-2"
            >
              <Shield size={18} />
              Terms
            </Link>
            <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-2 space-y-2">
              <button
                onClick={() => { onSignIn(); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-base font-medium min-h-[48px]"
              >
                Sign In
              </button>
              <button
                onClick={() => { onGetStarted(); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-base font-bold min-h-[48px] text-center"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
