import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Home, Box, Moon, Sun, Table2, Settings, LayoutDashboard, Wrench, CreditCard, Book } from 'lucide-react';
import { Screen, Project } from './types';
import { createNewProject, ensureProjectSettings } from './services/bomService';
import { authService } from './services/authService';
import { subscriptionService } from './services/subscriptionService';
import type { User } from '@supabase/supabase-js';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { projectService } from './services/projectService';
import { PricingPage } from './components/PricingPage';
import { HelpButton } from './components/HelpButton';
import { DocsPage } from './components/DocsPage';
import { PolicyModal } from './components/PolicyModal';
import { logoService } from './services/logoService';
import TermsPage from './pages/TermsPage';
import { CabinetTestingPage } from './components/CabinetTestingPage';
import ScreenWallEditor from './screens/ScreenWallEditor';
import ScreenHome from './screens/ScreenHome';
import ScreenProjectSetup from './screens/ScreenProjectSetup';
import ScreenBOMReport from './screens/ScreenBOMReport';


// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ user, loading, children }: { user: User | null, loading: boolean, children: React.ReactNode }) => {
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="font-black text-3xl mb-4">CAB<span className="text-amber-500">ENGINE</span></div>
          <div className="text-slate-400">Verifying session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to landing page but save the attempt location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('app-theme') !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    localStorage.setItem('app-theme', String(isDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const [screen, setScreen] = useState<Screen>(Screen.LANDING);
  const [project, setProject] = useState<Project>(createNewProject());
  const [user, setUser] = useState<User | null>(null);
  const [isUserPro, setIsUserPro] = useState(false);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        const pro = await subscriptionService.isPro();
        setIsUserPro(pro);
      } else {
        setIsUserPro(false);
      }
    };
    checkSubscription();
  }, [user]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedProjectRef = useRef<string>(JSON.stringify(project));

  // Automatically calculate isDirty based on project content comparison
  useEffect(() => {
    const currentStr = JSON.stringify(project);
    setIsDirty(currentStr !== lastSavedProjectRef.current);
  }, [project]);

  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication on mount and load saved logo
  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await authService.getCurrentUser();
      setUser(user);

      // If user is logged in, load their saved logo
      if (user) {
        const savedLogo = await logoService.getUserLogo(user.id);
        if (savedLogo) {
          setProject(prev => {
            const updated = {
              ...prev,
              settings: { ...prev.settings, logoUrl: savedLogo }
            };
            // Sync ref so it doesn't stay dirty
            lastSavedProjectRef.current = JSON.stringify(updated);
            return updated;
          });
        }
      }

      setAuthLoading(false);
    };
    checkAuth();

    // Listen to auth changes
    const subscription = authService.onAuthStateChange((user) => {
      setUser(user);
      // If user logged out and on a protected page, redirect to landing
      const protectedPaths = ['/dashboard', '/setup', '/walls', '/bom'];
      if (!user && protectedPaths.includes(location.pathname)) {
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect for navigation-related auth checks and beforeunload
  useEffect(() => {
    const isPublicPath = ['/', '/docs', '/terms'].includes(location.pathname);
    if (user && isPublicPath && location.pathname === '/') {
      navigate('/dashboard');
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, isDirty, user]);

  // Function to require authentication before action
  const requireAuth = (action: () => void) => {
    if (!user) {
      setAuthModalMode('login');
      setShowAuthModal(true);
    } else {
      action();
    }
  };

  // Auto-save project to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cabengine-project', JSON.stringify(project));
    } catch (e) {
      console.warn('Failed to save project:', e);
    }
  }, [project]);

  useEffect(() => {
    // Reset state-based screen when navigating to a URL-based route
    const routePaths = ['/dashboard', '/setup', '/walls', '/bom', '/docs', '/terms', '/pricing', '/'];
    if (routePaths.includes(location.pathname) && (screen as any) === Screen.PRICING) {
      setScreen(Screen.LANDING);
    }
  }, [location.pathname]);

  const toggleTheme = () => setIsDark(!isDark);

  useEffect(() => {
    // Skip auto-save if we're on Home screen, Setup screen, or if project is just the initial blank one or already saving
    const isSetupScreen = location.pathname === '/setup';
    if (screen === Screen.LANDING || isSetupScreen || !project.id || project.id.length < 20 || isSaving) return;

    const timer = setTimeout(() => {
      handleSaveProject(project);
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [project, screen, isSaving, location.pathname]);

  const handleSaveProject = async (projectToSave: Project) => {
    if (isSaving) return null;
    setIsSaving(true);
    console.log('Saving project...', projectToSave.name, projectToSave.id);
    
    const isNew = projectToSave.id.length < 20; // Simple check for uuid() vs DB UUID
    try {
      const { data, error } = isNew
        ? await projectService.createProject(projectToSave)
        : await projectService.updateProject(projectToSave.id, projectToSave);

      if (error) {
        console.error("Save error:", error);
        alert("Saving failed. Please try again.");
        return null;
      } else if (data) {
        console.log('Project saved successfully!', data.id);
        const fixedData = ensureProjectSettings(data);
        lastSavedProjectRef.current = JSON.stringify(fixedData);
        setIsDirty(false);
        // Always update local state with server data to ensure perfect sync (e.g. timestamps, normalized settings)
        setProject(fixedData);
        return fixedData;
      }
    } catch (err) {
      console.error('Unexpected save error:', err);
    } finally {
      setIsSaving(false);
    }
    return null;
  };

  const handleStartProject = () => {
    requireAuth(async () => {
      // Fetch user's saved logo to use for the new project
      let logoUrl: string | undefined;
      if (user) {
        logoUrl = await logoService.getUserLogo(user.id) || undefined;
      }
      const newProj = createNewProject(logoUrl);
      
      // Just set state and navigate - do NOT save to database yet
      lastSavedProjectRef.current = JSON.stringify(newProj);
      setProject(newProj);
      navigate('/setup?step=project');
    });
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col font-sans transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* MOBILE HEADER */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40 print:hidden">
        <img src="/landing.png" alt="CabEngine Logo" className="h-8 w-auto object-contain dark:invert-0 invert" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuthModal(true)}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            title={user?.email || "Login"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </button>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR - Hidden on landing page */}
        {(location.pathname !== '/' && location.pathname !== '/terms' && location.pathname !== '/testing' && (location.pathname !== '/docs' || user)) && (
          <aside className="hidden md:flex w-20 flex-col items-center py-6 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-50 print:hidden">
            <div className="mb-8 text-amber-500"><LayoutDashboard size={28} /></div>
            <nav className="flex flex-col gap-6 w-full px-2">
              <NavButton active={location.pathname === '/dashboard'} path="/dashboard" icon={<Home size={24} />} label="Home" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/setup'} path="/setup" icon={<Settings size={24} />} label="Setup" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/walls'} path="/walls?view=iso" icon={<Box size={24} />} label="Walls" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/bom'} path="/bom" icon={<Table2 size={24} />} label="BOM" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/pricing'} path="/pricing" icon={<CreditCard size={24} />} label="Pricing" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/docs'} path="/docs" icon={<Book size={24} />} label="Docs" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title={user.email}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Login"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </button>
              )}
              <button onClick={toggleTheme} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
          <Routes>
            <Route path="/" element={
              <LandingPage
                onGetStarted={() => openAuthModal('signup')}
                onSignIn={() => openAuthModal('login')}
                isDark={isDark}
                setIsDark={setIsDark}
              />
            } />
            <Route path="/terms" element={
              <TermsPage
                onSignIn={() => openAuthModal('login')}
                onGetStarted={() => openAuthModal('signup')}
                isDark={isDark}
                setIsDark={setIsDark}
              />
            } />
            <Route path="/docs" element={
              <DocsPage
                onSignIn={() => openAuthModal('login')}
                onGetStarted={() => openAuthModal('signup')}
                isDark={isDark}
                setIsDark={setIsDark}
              />
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute user={user} loading={authLoading}>
                <ScreenHome
                  onNewProject={handleStartProject}
                  onLoadProject={(p) => {
                    const fixed = ensureProjectSettings(p);
                    lastSavedProjectRef.current = JSON.stringify(fixed);
                    setProject(fixed);
                    navigate('/walls?view=iso');
                  }}
                  logoUrl={project.settings.logoUrl}
                  isUserPro={isUserPro}
                />
              </ProtectedRoute>
            } />
            <Route path="/setup" element={
              <ProtectedRoute user={user} loading={authLoading}>
                <ScreenProjectSetup project={project} setProject={setProject} onSave={() => handleSaveProject(project)} onSaveProject={handleSaveProject} isDark={isDark} isUserPro={isUserPro} />
              </ProtectedRoute>
            } />
            <Route path="/walls" element={
              <ProtectedRoute user={user} loading={authLoading}>
                <ScreenWallEditor 
                  project={project} 
                  setProject={setProject} 
                  setScreen={setScreen} 
                  isDark={isDark} 
                  isDirty={isDirty}
                  isSaving={isSaving}
                  onSave={() => handleSaveProject(project)} 
                  isUserPro={isUserPro}
                />
              </ProtectedRoute>
            } />
            <Route path="/bom" element={
              <ProtectedRoute user={user} loading={authLoading}>
                <ScreenBOMReport project={project} setProject={setProject} isUserPro={isUserPro} />
              </ProtectedRoute>
            } />
            <Route path="/pricing" element={
              <PricingPage
                onSignIn={() => openAuthModal('login')}
                onGetStarted={() => openAuthModal('signup')}
                isDark={isDark}
                setIsDark={setIsDark}
              />
            } />
            <Route path="/testing" element={
              <CabinetTestingPage isDark={isDark} />
            } />
            <Route path="*" element={
              <LandingPage
                onGetStarted={() => openAuthModal('signup')}
                onSignIn={() => openAuthModal('login')}
                isDark={isDark}
                setIsDark={setIsDark}
              />
            } />
          </Routes>
        </main>
      </div>

      {/* MOBILE NAV - NOW A FLEX SIBLING FOR DYNAMIC HEIGHT */}
      {location.pathname !== '/' && location.pathname !== '/terms' && location.pathname !== '/testing' && (
        <div className="md:hidden min-h-[4rem] h-auto mobile-nav bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around z-[100] shrink-0 print:hidden safe-area-bottom">
          <MobileNavButton active={location.pathname === '/dashboard'} path="/dashboard" icon={<Home size={20} />} label="Home" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/setup'} path="/setup" icon={<Settings size={20} />} label="Setup" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/walls'} path="/walls?view=iso" icon={<Box size={20} />} label="Editor" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/bom'} path="/bom" icon={<Table2 size={20} />} label="BOM" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/docs'} path="/docs" icon={<Book size={20} />} label="Docs" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #root, #main-content, .overflow-y-auto, .overflow-hidden {
            position: relative; height: auto !important; overflow: visible !important;
            background-color: white !important; color: black !important; display: block !important;
          }
          .print\\:hidden, aside, .md\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:flex { display: flex !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:bg-white { background-color: white !important; }
          /* Add back explicit page break utilities as they were needed for some browsers */
          .print\\:break-before-page { break-before: page !important; page-break-before: always !important; }
          .print\\:break-after-page { break-after: page !important; page-break-after: always !important; }
          .print\\:break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          user={user}
          initialMode={authModalMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            // After successful login/signup, go to dashboard
            if (location.pathname === '/') {
              navigate('/dashboard');
            }
          }}
          onLogout={() => {
            setShowAuthModal(false);
            navigate('/');
          }}
          onNavigateToPolicy={() => {
            setShowPolicyModal(true);
          }}
        />
      )}

      {/* Policy Modal */}
      <PolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />

      {/* Loading State */}
      {authLoading && (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="font-black text-3xl mb-4">CAB<span className="text-amber-500">ENGINE</span></div>
            <div className="text-slate-400">Loading...</div>
          </div>
        </div>
      )}

      {/* Help Button - Available on all screens except Editor */}
      {location.pathname !== '/walls' && <HelpButton />}
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label, path, isDirty, onSave }: any) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (isDirty) {
      const shouldSave = window.confirm('You have unsaved changes. Would you like to save before leaving?');
      if (shouldSave) {
        onSave().then(() => {
          if (path) navigate(path);
          if (onClick) onClick();
        });
        return;
      } else {
        const leaveAnyway = window.confirm('Discard changes and leave?');
        if (!leaveAnyway) return;
      }
    }
    if (path) navigate(path);
    if (onClick) onClick();
  };
  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-full ${active ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
      title={label}
    >
      {icon}
    </button>
  );
};

const MobileNavButton = ({ active, onClick, icon, label, path, isDirty, onSave }: any) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (isDirty) {
      const shouldSave = window.confirm('You have unsaved changes. Would you like to save before leaving?');
      if (shouldSave) {
        onSave().then(() => {
          if (path) navigate(path);
          if (onClick) onClick();
        });
        return;
      } else {
        const leaveAnyway = window.confirm('Discard changes and leave?');
        if (!leaveAnyway) return;
      }
    }
    if (path) navigate(path);
    if (onClick) onClick();
  };
  return (
    <button
      onClick={handleClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 ${active ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
};
