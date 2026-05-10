import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Home, Box, Moon, Sun, Table2, Settings, LayoutDashboard, Wrench, CreditCard, Book, ChevronLeft, Save, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Screen, Project } from './types';
import { GlobalProjectProgress } from './components/GlobalProjectProgress';
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
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { track } from '@vercel/analytics';


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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
        if (isNew) {
          track('project_created', { name: projectToSave.name });
        }
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
      // Fetch user's saved profile to use for the new project
      let profileData: any = null;
      if (user) {
        const { profileService } = await import('./services/profileService');
        profileData = await profileService.getProfile(user.id);
      }

      const newProj = createNewProject(profileData?.logo_url || undefined);
      if (profileData) {
        newProj.company = profileData.company_name || newProj.company;
      }

      // Just set state and navigate - do NOT save to database yet
      // This ensures isDirty is false because project matches lastSavedProjectRef
      lastSavedProjectRef.current = JSON.stringify(newProj);
      setProject(newProj);
      setIsDirty(false);
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
          <motion.aside
            initial={false}
            animate={{ width: isSidebarExpanded ? 240 : 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden md:flex flex-col items-center py-6 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-50 print:hidden overflow-hidden"
          >
            <div className={`w-full px-4 mb-8 flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'}`}>
              {isSidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-black text-lg tracking-tighter italic"
                >
                  CAB<span className="text-amber-500">ENGINE</span>
                </motion.div>
              )}
              <button
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-all shadow-sm"
              >
                {isSidebarExpanded ? <ChevronLeft size={20} /> : <LayoutDashboard size={24} className="text-amber-500" />}
              </button>
            </div>

            <nav className="flex flex-col gap-3 w-full px-3">
              <NavButton active={location.pathname === '/dashboard'} path="/dashboard" icon={<Home size={22} />} label="Dashboard" isDirty={isDirty} isExpanded={isSidebarExpanded} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/setup'} path="/setup" icon={<Settings size={22} />} label="Project Setup" isDirty={isDirty} isExpanded={isSidebarExpanded} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/walls'} path="/walls?view=iso" icon={<Box size={22} />} label="3D Design Studio" isDirty={isDirty} isExpanded={isSidebarExpanded} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/bom'} path="/bom" icon={<Table2 size={22} />} label="Reports & BOM" isDirty={isDirty} isExpanded={isSidebarExpanded} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/pricing'} path="/pricing" icon={<CreditCard size={22} />} label="Subscription" isDirty={isDirty} isExpanded={isSidebarExpanded} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
              <NavButton active={location.pathname === '/docs'} path="/docs" icon={<Book size={22} />} label="Documentation" isDirty={isDirty} isExpanded={isSidebarExpanded} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
            </nav>
            <div className="mt-auto flex flex-col gap-2 w-full px-3">
              {user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className={`flex items-center gap-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all w-full ${!isSidebarExpanded ? 'justify-center' : ''}`}
                  title={user.email || ''}
                >
                  <div className="shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  {isSidebarExpanded && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold truncate">
                      {user.email?.split('@')[0]}
                    </motion.span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className={`flex items-center gap-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all w-full ${!isSidebarExpanded ? 'justify-center' : ''}`}
                  title="Login"
                >
                  <div className="shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  {isSidebarExpanded && <span className="text-xs font-bold">Login</span>}
                </button>
              )}
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all w-full ${!isSidebarExpanded ? 'justify-center' : ''}`}
              >
                <div className="shrink-0">
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                {isSidebarExpanded && <span className="text-xs font-bold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>
            </div>
          </motion.aside>
        )}

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
          {/* Project Command Center - Only visible in project screens */}
          {['/setup', '/walls', '/bom'].includes(location.pathname) && project.id.length > 20 && (
            <div className="h-20 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-40 print:hidden transition-all duration-500">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.1em] leading-none">
                    {project.name || 'Untitled Kitchen'}
                  </h1>
                </div>
                <p className="text-[10px] font-bold text-slate-400 italic uppercase tracking-widest pl-4">
                  {project.company || 'Standard Config'}
                </p>
              </div>

              <GlobalProjectProgress
                project={project}
                onNavigate={(screen) => {
                  const pathMap: Record<string, string> = {
                    [Screen.PROJECT_SETUP]: '/setup',
                    [Screen.WALL_EDITOR]: '/walls?view=iso',
                    [Screen.BOM_REPORT]: '/bom'
                  };
                  navigate(pathMap[screen] || '/dashboard');
                }}
                isDark={isDark}
              />

              <div className="flex items-center gap-4">
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />
                <button
                  onClick={() => handleSaveProject(project)}
                  disabled={!isDirty || isSaving}
                  className={`
                    px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                    ${isDirty
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60 cursor-default'
                    }
                  `}
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving
                    </>
                  ) : isDirty ? (
                    <>
                      <Save size={14} />
                      Sync Project
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      All Synced
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
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
          <MobileNavButton active={location.pathname === '/dashboard'} path="/dashboard" icon={<Home size={20} />} label="Home" isDirty={isDirty} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/setup'} path="/setup" icon={<Settings size={20} />} label="Setup" isDirty={isDirty} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/walls'} path="/walls?view=iso" icon={<Box size={20} />} label="Editor" isDirty={isDirty} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/bom'} path="/bom" icon={<Table2 size={20} />} label="BOM" isDirty={isDirty} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/docs'} path="/docs" icon={<Book size={20} />} label="Docs" isDirty={isDirty} canDiscard={project.id.length < 20} onSave={() => handleSaveProject(project)} />
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

      {/* Help Button - Available on all screens */}
      <HelpButton />

      {/* Vercel Analytics & Speed Insights */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label, path, isDirty, canDiscard, isExpanded, onSave }: any) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (isDirty && !canDiscard) {
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
      className={`flex items-center gap-4 p-3 rounded-xl transition-all w-full relative group ${active
          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        } ${!isExpanded ? 'justify-center' : ''}`}
      title={!isExpanded ? label : ''}
    >
      <div className={`shrink-0 transition-transform duration-300 ${!isExpanded ? 'group-hover:scale-110' : ''}`}>
        {icon}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-bold truncate whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {active && !isExpanded && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
        />
      )}
    </button>
  );
};

const MobileNavButton = ({ active, onClick, icon, label, path, isDirty, canDiscard, onSave }: any) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (isDirty && !canDiscard) {
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
