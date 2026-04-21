
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Home, Layers, Calculator, Zap, ArrowLeft, ArrowRight, Trash2, Plus, Box, DoorOpen, Wand2, Moon, Sun, Table2, FileSpreadsheet, X, Pencil, Save, List, Settings, Printer, Download, Scissors, LayoutDashboard, DollarSign, Map, LogOut, Menu, Wrench, CreditCard, ChevronDown, ChevronUp, FileText, Ruler, Book, Upload, Image as ImageIcon, Shield, FileCode, Check, Settings2, RotateCcw } from 'lucide-react';
import { Screen, Project, Zone, ZoneId, PresetType, CabinetType, CabinetUnit, Obstacle, AutoFillOptions, SheetType } from './types';
import { createNewProject, generateProjectBOM, autoFillZone, exportToExcel, resolveCollisions, resolveLocalCollisions, calculateProjectCost, exportProjectToConstructionJSON, buildProjectConstructionData, getIntersectingCabinets, ensureProjectSettings } from './services/bomService';
import { generateRubyLayout } from './services/layoutSolver';
import { exportAllSheetsToDXFZip, exportSingleSheetToDXF, exportAllDrillingToZip } from './services/dxfExportService';
import { generateQuotationPDF } from './services/pdfService';
import { optimizeCuts } from './services/nestingService';
import { authService } from './services/authService';
import { expenseTemplateService, ExpenseTemplate } from './services/expenseTemplateService';
import { sheetTypeService } from './services/sheetTypeService';
import { supabase } from './services/supabaseClient';
import type { User } from '@supabase/supabase-js';

// Components
import { Button } from './components/Button';
import { NumberInput } from './components/NumberInput';
import { WallVisualizer } from './components/WallVisualizer';
import { CutPlanVisualizer } from './components/CutPlanVisualizer';
import { CabinetViewer } from './components/3d';
import { KitchenPlanCanvas } from './components/KitchenPlanCanvas';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { customCabinetService } from './services/customCabinetService';
import { projectService } from './services/projectService';
import { SheetTypeManager } from './components/SheetTypeManager';
import { CabinetEditModal } from './components/CabinetEditModal';
import { SingleCabinetEditorModal } from './components/SingleCabinetEditorModal';
import { WallSetupCard } from './components/WallSetupCard';
import { WallEditModal } from './components/WallEditModal';
import { MaterialSelector } from './components/MaterialSelector';
import { MaterialAllocationPanel } from './components/MaterialAllocationPanel';
import { PricingPage } from './components/PricingPage';
import { HelpButton } from './components/HelpButton';
import { DocsPage } from './components/DocsPage';
import { CabinetSpanSlider } from './components/CabinetSpanSlider';
import { PolicyModal } from './components/PolicyModal';
import { logoService } from './services/logoService';
import TermsPage from './pages/TermsPage';
import { CabinetTestingPage } from './components/CabinetTestingPage';
import { TestingSettings } from './components/CabinetTestingUtils';

// --- PRINT TITLE BLOCK ---
const TitleBlock = ({ project, pageTitle }: { project: Project, pageTitle: string }) => (
  <div className="hidden print:flex fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white h-16 text-xs font-sans items-stretch z-50">
    <div className="w-1/4 border-r-2 border-black p-2 flex flex-col justify-between">
      <div className="font-black text-xl tracking-tighter leading-none italic uppercase truncate">{project.company || 'COMPANY'}</div>
      <div className="text-[8px] leading-tight text-slate-500 uppercase tracking-widest font-bold">Construction Document / Automated BOM</div>
    </div>
    <div className="flex-1 grid grid-cols-4 border-r-2 border-black">
      <div className="border-r border-black p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Project Name</label>
        <div className="font-bold text-sm uppercase truncate">{project.name}</div>
      </div>
      <div className="border-r border-black p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Drawing Name</label>
        <div className="font-bold text-sm uppercase truncate">{pageTitle}</div>
      </div>
      <div className="border-r border-black p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Date</label>
        <div className="font-bold text-sm">{new Date().toLocaleDateString()}</div>
      </div>
      <div className="p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Scale</label>
        <div className="font-bold text-sm">AS NOTED</div>
      </div>
    </div>
  </div>
);

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
          setProject(prev => ({
            ...prev,
            settings: { ...prev.settings, logoUrl: savedLogo }
          }));
        }
      }

      setAuthLoading(false);
      // If user is logged in and we're on landing page, go to dashboard
      const isPublicPath = ['/', '/docs', '/terms'].includes(location.pathname);
      if (user && isPublicPath && location.pathname === '/') {
        navigate('/dashboard');
      }
    };
    checkAuth();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

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
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, isDirty]);

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
    // Skip auto-save if we're on Home screen or if project is just the initial blank one or already saving
    if (screen === Screen.LANDING || !project.id || project.id.length < 20 || isSaving) return;

    const timer = setTimeout(() => {
      handleSaveProject(project);
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [project, screen, isSaving]);

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
        // Only update local state if the ID changed (new project promoted to DB)
        if (fixedData.id !== projectToSave.id) {
          setProject(fixedData);
        }
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
      const savedProj = await handleSaveProject(newProj);
      if (savedProj) {
        lastSavedProjectRef.current = JSON.stringify(savedProj);
        setProject(savedProj);
        navigate('/setup');
      }
    });
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const renderContent = () => {
    // Check authentication for protected screens
    const protectedScreens = [Screen.DASHBOARD, Screen.PROJECT_SETUP, Screen.WALL_EDITOR, Screen.BOM_REPORT];
    if (!user && protectedScreens.includes(screen)) {
      // Redirect to landing page if not authenticated
      return (
        <LandingPage
          onGetStarted={() => openAuthModal('signup')}
          onSignIn={() => openAuthModal('login')}
          isDark={isDark}
          setIsDark={setIsDark}
        />
      );
    }

    switch (screen) {
      case Screen.LANDING:
        return (
          <LandingPage
            onGetStarted={() => openAuthModal('signup')}
            onSignIn={() => openAuthModal('login')}
            isDark={isDark}
            setIsDark={setIsDark}
          />
        );
      case Screen.DASHBOARD:
        return (
          <ScreenHome
            onNewProject={handleStartProject}
            onLoadProject={(p) => {
              setProject(p);
              navigate('/walls?view=iso');
            }}
            logoUrl={project.settings.logoUrl}
          />
        );
      case Screen.PROJECT_SETUP: return <ScreenProjectSetup project={project} setProject={setProject} onSave={() => handleSaveProject(project)} onSaveProject={handleSaveProject} isDark={isDark} />;
      case Screen.WALL_EDITOR: return <ScreenWallEditor 
        project={project} 
        setProject={setProject} 
        setScreen={setScreen} 
        isDark={isDark} 
        isDirty={isDirty}
        setIsDirty={setIsDirty}
        isSaving={isSaving}
        onSave={() => handleSaveProject(project)} 
      />;
      case Screen.BOM_REPORT: return <ScreenBOMReport project={project} setProject={setProject} />;
      case Screen.PRICING: return <PricingPage onSignIn={() => openAuthModal('login')} onGetStarted={() => openAuthModal('signup')} isDark={isDark} setIsDark={setIsDark} />;
      case Screen.DOCS: return <DocsPage onSignIn={() => openAuthModal('login')} onGetStarted={() => openAuthModal('signup')} isDark={isDark} setIsDark={setIsDark} />;
      case Screen.TERMS: return <TermsPage onSignIn={() => openAuthModal('login')} onGetStarted={() => openAuthModal('signup')} isDark={isDark} setIsDark={setIsDark} />;
      default: return <LandingPage onGetStarted={() => openAuthModal('signup')} onSignIn={() => openAuthModal('login')} isDark={isDark} setIsDark={setIsDark} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col font-sans transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
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

      <div className="flex-1 flex overflow-hidden md:pb-0 pb-16">
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
              <NavButton active={location.pathname === '/testing'} path="/testing" icon={<Wrench size={24} />} label="Testing" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
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
                />
              </ProtectedRoute>
            } />
            <Route path="/setup" element={
              <ProtectedRoute user={user} loading={authLoading}>
                <ScreenProjectSetup project={project} setProject={setProject} onSave={() => handleSaveProject(project)} onSaveProject={handleSaveProject} isDark={isDark} />
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
                  setIsDirty={setIsDirty}
                  isSaving={isSaving}
                  onSave={() => handleSaveProject(project)} 
                />
              </ProtectedRoute>
            } />
            <Route path="/bom" element={
              <ProtectedRoute user={user} loading={authLoading}>
                <ScreenBOMReport project={project} setProject={setProject} />
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

      {/* MOBILE NAV */}
      {location.pathname !== '/' && location.pathname !== '/terms' && location.pathname !== '/testing' && (
        <div className="md:hidden h-16 mobile-nav bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around z-[100] shrink-0 print:hidden safe-area-bottom" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
          <MobileNavButton active={location.pathname === '/dashboard'} path="/dashboard" icon={<Home size={20} />} label="Home" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/setup'} path="/setup" icon={<Settings size={20} />} label="Setup" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/walls'} path="/walls?view=iso" icon={<Box size={20} />} label="Editor" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/bom'} path="/bom" icon={<Table2 size={20} />} label="BOM" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/testing'} path="/testing" icon={<Wrench size={20} />} label="Test" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
          <MobileNavButton active={location.pathname === '/docs'} path="/docs" icon={<Book size={20} />} label="Docs" isDirty={isDirty} onSave={() => handleSaveProject(project)} />
        </div>
      )}

      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
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

// --- SCREENS ---

const ScreenHome = ({ onNewProject, onLoadProject, logoUrl }: { onNewProject: () => void, onLoadProject: (p: Project) => void, logoUrl?: string }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await projectService.getProjects();
      if (data) setProjects(data);
      setLoading(false);
    };
    loadProjects();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center justify-start max-w-6xl mx-auto w-full overflow-y-auto p-4 sm:p-6">
      <div className="w-full flex justify-between items-start mb-6 sm:mb-8">
        <div className="text-center space-y-2 flex-1 flex flex-col items-center">
          <img src="/landing.png" alt="CabEngine Logo" className="h-10 sm:h-16 md:h-20 w-auto object-contain mb-2 dark:invert-0 invert" />
          <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm sm:text-base">Professional Cabinet Engineering Suite</p>
        </div>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Company Logo"
            className="h-10 sm:h-12 w-auto object-contain ml-4"
          />
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-8 w-full items-start">
        {/* Main Action Side */}
        <div className="md:col-span-1 space-y-3 sm:space-y-4">
          <Button variant="primary" size="xl" onClick={onNewProject} leftIcon={<Layers size={24} />} className="w-full py-8 sm:py-12 text-lg sm:text-xl shadow-xl shadow-amber-500/20 flex-col gap-2 min-h-[120px]">
            <span>Start New Project</span>
          </Button>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Button variant="secondary" size="lg" className="h-24 sm:h-28 flex-col gap-2 min-h-[96px]"><Calculator size={24} className="text-amber-600" /><span className="text-sm">Quick Parts</span></Button>
            <Button variant="secondary" size="lg" className="h-24 sm:h-28 flex-col gap-2 min-h-[96px]"><Zap size={24} className="text-amber-600" /><span className="text-sm">Area Calc</span></Button>
          </div>
        </div>

        {/* Project List Side */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px] sm:min-h-[400px]">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <List className="text-amber-500 w-5 h-5" /> Recent Projects
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-slate-400 gap-4">
              <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-sm">Fetching your designs...</p>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => onLoadProject(p)}
                  className="flex flex-col text-left p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group min-h-[80px]"
                >
                  <div className="font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate mb-1 text-sm sm:text-base">{p.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Edited {new Date().toLocaleDateString()}</div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{p.zones.reduce((acc, z) => acc + z.cabinets.length, 0)} Cabinets</div>
                    <div className="text-amber-600 dark:text-amber-500"><Box size={14} /></div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Layers size={24} />
              </div>
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1 text-base">No Projects Yet</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Start your first cabinet design by clicking the button.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ScreenPlanView = ({ project }: { project: Project }) => {
  const bomData = useMemo(() => generateProjectBOM(project), [project.id, project.zones, project.settings]);
  const handlePrint = () => setTimeout(() => window.print(), 100);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <TitleBlock project={project} pageTitle="Shop Filing Document - Plan View" />

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 print:hidden">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Technical Plan View</h2>
        <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer size={16} />}>Print Shop Filing Doc (A4)</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950 print:bg-white print:p-0">
        <div className="max-w-6xl mx-auto space-y-8 print:space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-none print:shadow-none print:p-0">
            <KitchenPlanCanvas data={buildProjectConstructionData(project)} scalePxPerMeter={120} />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-4 print:border-black print:p-4 print:rounded-none print:break-before-page">
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest border-b-2 pb-2 print:border-b-4 print:border-black">Project BOM (Bill of Materials)</h3>
            <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {bomData.groups.map((group, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-xl print:border-2 print:border-black print:rounded-none print:break-inside-avoid">
                  <div className="font-bold text-amber-600 mb-2 text-sm uppercase">{group.cabinetName}</div>
                  <table className="w-full text-xs italic">
                    <tbody>
                      {group.items.map((item, j) => (
                        <tr key={j} className="border-b dark:border-slate-800 print:border-black/10">
                          <td className="py-1">{item.name}</td>
                          <td className="py-1 text-right font-mono opacity-60">{item.length}x{item.width}</td>
                          <td className="py-1 text-right font-bold">x{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t-2 border-slate-100 dark:border-slate-800 print:border-t-4 print:border-black">
              <h4 className="font-black uppercase mb-4 text-slate-400 print:text-black">Hardware Summary</h4>
              <div className="flex flex-wrap gap-4">
                {Object.entries(bomData.hardwareSummary).map(([name, qty]) => (
                  <div key={name} className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg print:border print:border-black">
                    <span className="text-xs font-bold mr-2 uppercase opacity-60">{name}</span>
                    <span className="font-black text-amber-600 print:text-black">{qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScreenProjectSetup = ({ project, setProject, onSave, onSaveProject, isDark }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>>, onSave: () => void, onSaveProject?: (p: Project) => Promise<any>, isDark: boolean }) => {
  const navigate = useNavigate();
  // State to track which section is expanded - only one at a time
  const [expandedSection, setExpandedSection] = useState<'projectInfo' | 'sheetTypes' | 'accessories' | 'allocation' | 'costs' | null>('projectInfo');

  // Cabinet Edit Modal
  const [showCabinetModal, setShowCabinetModal] = useState(false);
  const [editingCabinetType, setEditingCabinetType] = useState<'base' | 'wall' | 'tall'>('base');

  // Wall Edit Modal
  const [showWallModal, setShowWallModal] = useState(false);

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(project.settings.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's previous logo on mount
  useEffect(() => {
    const loadUserLogo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !project.settings.logoUrl) {
        const savedLogo = await logoService.getUserLogo(user.id);
        if (savedLogo) {
          setLogoPreview(savedLogo);
          setProject(prev => ({
            ...prev,
            settings: { ...prev.settings, logoUrl: savedLogo }
          }));
        }
      }
    };
    loadUserLogo();
  }, []);

  // Handle logo file upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploadingLogo(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to upload a logo');
        return;
      }

      const result = await logoService.uploadLogo(file, user.id);
      if (result) {
        setLogoPreview(result.url);
        setProject(prev => ({
          ...prev,
          settings: { ...prev.settings, logoUrl: result.url }
        }));
      } else {
        alert('Failed to upload logo. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setProject(prev => ({
      ...prev,
      settings: { ...prev.settings, logoUrl: undefined }
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSection = (section: 'projectInfo' | 'sheetTypes' | 'accessories' | 'allocation' | 'costs') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Project Setup</h2>
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              )}
              <Button variant="primary" size="sm" onClick={onSave} className="min-h-[40px]">
                <Save size={16} className="mr-2" /> Save
              </Button>
            </div>
          </div>

          {/* Project Info & Dimensions - Combined Collapsible Menu */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Header - Always visible */}
            <div
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => toggleSection('projectInfo')}
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <FileText className="text-teal-500" /> Project Info & Dimensions
              </h3>
              <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${expandedSection === 'projectInfo' ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Content - Collapsible with animation */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'projectInfo' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 pt-0 space-y-6">
                {/* Project Info Section */}
                <div className="space-y-4">
                  <h4 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Project Info</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Project Name</label>
                      <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white text-sm sm:text-base min-h-[48px]" value={project.name} onChange={e => setProject({ ...project, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Company Name</label>
                      <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white text-sm sm:text-base min-h-[48px]" value={project.company} onChange={e => setProject({ ...project, company: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Currency Symbol</label>
                      <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white text-sm sm:text-base min-h-[48px]" value={project.settings.currency} onChange={e => setProject({ ...project, settings: { ...project.settings, currency: e.target.value } })} placeholder="$" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Company Logo</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            className={`flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            {isUploadingLogo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700 dark:border-slate-200" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                              </>
                            )}
                          </label>
                          <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF (max 5MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dimensions & Nesting Section */}
                <div className="space-y-4">
                  <WallSetupCard 
                    project={project}
                    onClick={() => setShowWallModal(true)}
                  />


                  {/* Additional Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 mt-4">
                    <NumberInput label="Kerf (mm)" value={project.settings.kerf} onChange={(v) => setProject({ ...project, settings: { ...project.settings, kerf: v } })} step={1} />
                    <NumberInput label="Counter Thickness (mm)" value={project.settings.counterThickness} onChange={(v) => setProject({ ...project, settings: { ...project.settings, counterThickness: v } })} step={5} />
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Wall Edit Modal */}
          <WallEditModal
            isOpen={showWallModal}
            onClose={() => setShowWallModal(false)}
            project={project}
            isDark={isDark}
            onSave={(newZones) => {
              const updatedProject = { ...project, zones: newZones };
              const result = generateRubyLayout(updatedProject);
              setProject(result.project);
              if (onSaveProject) {
                onSaveProject(result.project).then(() => navigate('/walls?view=iso'));
              } else {
                navigate('/walls?view=iso');
              }
            }}
          />

          {/* Cabinet Edit Modal */}
          <CabinetEditModal
            isOpen={showCabinetModal}
            onClose={() => setShowCabinetModal(false)}
            cabinetType={editingCabinetType}
            settings={project.settings}
            isDark={isDark}
            onSave={(newSettings) => {
              setProject({ ...project, settings: newSettings });
            }}
          />

          {/* Sheet Types Manager */}
          <SheetTypeManager
            currency={project.settings.currency || '$'}
            sheetTypesExpanded={expandedSection === 'sheetTypes'}
            accessoriesExpanded={expandedSection === 'accessories'}
            onToggleSheetTypes={() => toggleSection('sheetTypes')}
            onToggleAccessories={() => toggleSection('accessories')}
          />

          {/* Cost Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => toggleSection('costs')}
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <DollarSign className="text-green-500" /> Cost Settings
              </h3>
              <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${expandedSection === 'costs' ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'costs' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Labor Cost (LKR)</label>
                    <input
                      type="number"
                      value={project.settings.costs?.laborCost ?? 0}
                      onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborCost: Number(e.target.value) } } })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Transport Cost (LKR)</label>
                    <input
                      type="number"
                      value={project.settings.costs?.transportCost ?? 0}
                      onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, transportCost: Number(e.target.value) } } })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Profit Margin (%)</label>
                    <input
                      type="number"
                      value={project.settings.costs?.marginPercent ?? 50}
                      onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: Number(e.target.value) } } })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Material Allocation */}
          <MaterialAllocationPanel
            settings={project.settings}
            onUpdate={(settings) => setProject({ ...project, settings: { ...project.settings, ...settings } })}
            isExpanded={expandedSection === 'allocation'}
            onToggle={() => toggleSection('allocation')}
          />
        </div>
      </div>
    </div>
  );
};

const ScreenWallEditor = ({ project, setProject, setScreen, onSave, isDark, isDirty, setIsDirty, isSaving }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>>, setScreen: (s: Screen) => void, onSave: () => Promise<any>, isDark: boolean, isDirty: boolean, setIsDirty: (d: boolean) => void, isSaving: boolean }) => {
  const [activeTab, setActiveTab] = useState<string>(project.zones[0]?.id || 'Wall A');
  
  // Keep activeTab in sync if the current one is deleted or project changes
  useEffect(() => {
    if (!project.zones.some(z => z.id === activeTab)) {
      if (project.zones.length > 0) {
        setActiveTab(project.zones[0].id);
      }
    }
  }, [project.zones, activeTab]);

  const currentZoneIndex = project.zones.findIndex(z => z.id === activeTab);
  const currentZone = project.zones[currentZoneIndex] || project.zones[0];

  if (!currentZone) {
    return <div className="p-8 text-center text-slate-500">Initializing editor...</div>;
  }

  // Resizable bottom table panel
  const [tablePanelHeight, setTablePanelHeight] = useState<number>(280);
  const mainPanelRef = useRef<HTMLDivElement | null>(null);
  const tabsRowRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [showAdvancedCabinetEditor, setShowAdvancedCabinetEditor] = useState(false);
  const [customCabinets, setCustomCabinets] = useState<any[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileTableCollapsed, setMobileTableCollapsed] = useState(true);
  const [initialZoneCabinetsBackup, setInitialZoneCabinetsBackup] = useState<CabinetUnit[] | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<{ zones: typeof project.zones; activeTab: string; timestamp: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ zones: typeof project.zones; activeTab: string; timestamp: number }[]>([]);
  const maxHistorySize = 20;

  const [selectedCabinet, setSelectedCabinet] = useState<{ zoneId: string, index: number } | null>(null);

  // Save state to history
  const saveToHistory = () => {
    setHistory(prev => {
      const newHistory = [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev].slice(0, maxHistorySize);
      return newHistory;
    });
    // Clear redo stack when new action occurs
    setRedoStack([]);
  };

  useEffect(() => {
    if (selectedCabinet) {
      const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
      if (zone) {
        setInitialZoneCabinetsBackup(JSON.parse(JSON.stringify(zone.cabinets)));
      }
    } else {
      setInitialZoneCabinetsBackup(null);
    }
  }, [selectedCabinet?.index, selectedCabinet?.zoneId]);

  // Undo function
  const handleUndo = () => {
    if (history.length > 0) {
      const [lastState, ...remainingHistory] = history;
      // Save current state to redo stack
      setRedoStack(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev].slice(0, maxHistorySize));
      setProject(prev => ({ ...prev, zones: lastState.zones }));
      setActiveTab(lastState.activeTab);
      setHistory(remainingHistory);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (redoStack.length > 0) {
      const [nextState, ...remainingRedo] = redoStack;
      // Save current state to history
      setHistory(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev].slice(0, maxHistorySize));
      setProject(prev => ({ ...prev, zones: nextState.zones }));
      setActiveTab(nextState.activeTab);
      setRedoStack(remainingRedo);
    }
  };

  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;

  // Load custom cabinets
  useEffect(() => {
    const loadCustomCabinets = async () => {
      const { data } = await customCabinetService.getCustomPresets();
      if (data) setCustomCabinets(data);
    };
    loadCustomCabinets();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!resizingRef.current) return;
      const start = dragStartRef.current;
      if (!start) return;

      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? start.startY : (e as MouseEvent).clientY;
      const delta = clientY - start.startY;
      // Dragging UP should increase table height (split line moves up)
      const next = start.startHeight - delta;

      const panelH = mainPanelRef.current?.clientHeight ?? window.innerHeight;
      const tabsH = tabsRowRef.current?.clientHeight ?? 0;
      const available = Math.max(0, panelH - tabsH);

      const MIN_TABLE = 160;
      const MIN_VISUAL = 240;
      const maxTable = Math.max(MIN_TABLE, available - MIN_VISUAL);
      const clamped = Math.max(MIN_TABLE, Math.min(maxTable, next));
      setTablePanelHeight(clamped);
    };

    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      dragStartRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: true } as any);
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as React.MouseEvent).clientY;
    resizingRef.current = true;
    dragStartRef.current = { startY: clientY, startHeight: tablePanelHeight };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Editor State
  const [modalMode, setModalMode] = useState<'none' | 'add_obstacle' | 'add_cabinet' | 'edit_obstacle' | 'edit_cabinet' | 'autofill_options'>('none');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [tempCabinet, setTempCabinet] = useState<CabinetUnit>({ id: '', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 });
  const [tempObstacle, setTempObstacle] = useState<Obstacle>({ id: '', type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 } as any);
  const [presetFilter, setPresetFilter] = useState<'Base' | 'Wall' | 'Tall'>('Base');
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'iso' ? 'iso' : 'elevation';
  const [visualMode, setVisualMode] = useState<'elevation' | 'iso'>(initialView);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [draggingCabinet, setDraggingCabinet] = useState<CabinetUnit | null>(null);

  const handleDropCabinet = (zoneId: string, fromLeft: number, cabinet: CabinetUnit, targetWidth?: number) => {
    const targetId = zoneId || activeTab || project.zones[0]?.id;
    if (!targetId) return;

    // Switch to the zone if it's not active
    if (targetId !== activeTab) {
      setActiveTab(targetId);
    }
    
    const { icon, ...cabinetData } = cabinet as any;
    const newCabinet: CabinetUnit = {
      ...cabinetData as CabinetUnit,
      id: Math.random().toString(),
      fromLeft,
      width: targetWidth || cabinet.width,
      label: '' 
    };
    
    handleSequentialAdd([newCabinet], targetId);
    setDraggingCabinet(null);
  };

  useEffect(() => {
    if (draggingCabinet) {
      const handleGlobalUp = () => {
        // We delay slightly to allow the onPointerUp on the wall to fire first if it's over the wall
        setTimeout(() => setDraggingCabinet(null), 10);
      };
      window.addEventListener('pointerup', handleGlobalUp);
      return () => window.removeEventListener('pointerup', handleGlobalUp);
    }
  }, [draggingCabinet]);

  // Sync visual mode with URL if needed
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'iso' && visualMode !== 'iso') {
      setVisualMode('iso');
    } else if (viewParam === 'elevation' && visualMode !== 'elevation') {
      setVisualMode('elevation');
    }
  }, [searchParams]);

  const updateZone = (newZoneOrTransform: Zone | ((z: Zone) => Zone), skipHistory = false, targetZoneId?: string) => {
    if (!skipHistory) {
      saveToHistory();
    }
    const zoneIdToUpdate = targetZoneId || activeTab || project.zones[0]?.id;
    if (!zoneIdToUpdate) return;
    
    setProject(prev => {
      const newZones = [...prev.zones];
      const idx = newZones.findIndex(z => z.id === zoneIdToUpdate);
      if (idx !== -1) {
        const currentZone = newZones[idx];
        const newZone = typeof newZoneOrTransform === 'function'
          ? newZoneOrTransform(currentZone)
          : newZoneOrTransform;
        newZones[idx] = newZone;
      }
      return { ...prev, zones: newZones };
    });
  };

  const handleDragEnd = () => updateZone(z => resolveCollisions(z)); // Shove on drop

  const handleAutoFill = () => {
    saveToHistory();
    const result = generateRubyLayout(project);
    setProject(result.project);
  };

  const clearZone = () => { if (window.confirm(`Clear ${currentZone.id}?`)) updateZone({ ...currentZone, obstacles: [], cabinets: [] }); };

  const addZone = () => {
    const name = prompt("Enter Zone Name (e.g., Island, Pantry):");
    if (name) {
      if (project.zones.some(z => z.id === name)) {
        alert("Zone name must be unique");
        return;
      }
      saveToHistory();
      const newZone = { id: name, active: true, totalLength: 3000, wallHeight: 2400, obstacles: [], cabinets: [] };
      const nextZones = [...project.zones, newZone];
      setProject({ ...project, zones: nextZones });
      setActiveTab(name);
    }
  };

  const deleteZone = (id: string) => {
    if (project.zones.length <= 1) return;
    if (window.confirm(`Delete ${id}?`)) {
      saveToHistory();
      const newZones = project.zones.filter(z => z.id !== id);
      setProject({ ...project, zones: newZones });
      setActiveTab(newZones[0].id);
    }
  };

  // Moves
  const handleCabinetMove = (idx: number, x: number) => {
    updateZone(z => {
      const cabs = [...z.cabinets];
      cabs[idx] = { ...cabs[idx], fromLeft: x };
      return resolveLocalCollisions({ ...z, cabinets: cabs }, idx, project.settings);
    });
  };
  const handleObstacleMove = (idx: number, x: number) => {
    updateZone(z => {
      const obs = [...z.obstacles];
      obs[idx] = { ...obs[idx], fromLeft: x };
      return { ...z, obstacles: obs };
    });
  };

  // Swap two cabinets by exchanging their positions
  const handleSwapCabinets = (index1: number, index2: number) => {
    updateZone(z => {
      const cabs = z.cabinets.map(c => ({ ...c }));
      const cab1 = cabs[index1];
      const cab2 = cabs[index2];

      if (!cab1 || !cab2) return z;

      const x1 = cab1.fromLeft;
      const x2 = cab2.fromLeft;

      // Simply exchange positions and let resolveCollisions handle the shoving
      cab1.fromLeft = x2;
      cab2.fromLeft = x1;

      return { ...z, cabinets: cabs };
    });
  };

  // Handler for sequential box input - adds cabinets and re-labels
  const handleSequentialAdd = (newCabinets: CabinetUnit[], targetZoneId?: string) => {
    updateZone(z => {
      const allCabs = [...z.cabinets, ...newCabinets].sort((a, b) => a.fromLeft - b.fromLeft);
      // Re-number all cabinets
      let bIdx = 1, wIdx = 1, tIdx = 1;
      const numbered = allCabs.map(c => {
        let label = '';
        if (c.type === CabinetType.BASE) label = `B${String(bIdx++).padStart(2, '0')}`;
        else if (c.type === CabinetType.WALL) label = `W${String(wIdx++).padStart(2, '0')}`;
        else label = `T${String(tIdx++).padStart(2, '0')}`;
        return { ...c, label };
      });
      return resolveCollisions({ ...z, cabinets: numbered });
    }, false, targetZoneId);
  };

  const openAdd = (type: 'cabinet' | 'obstacle') => {
    if (type === 'cabinet') {
      setTempCabinet({ id: Math.random().toString(), preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 });
      setPresetFilter('Base');
      setModalMode('add_cabinet');
    }
    else { setTempObstacle({ id: Math.random().toString(), type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 } as any); setModalMode('add_obstacle'); }
  };
  const openEdit = (type: 'cabinet' | 'obstacle', idx: number) => {
    setEditIndex(idx);
    if (type === 'cabinet') {
      const cab = currentZone.cabinets[idx];
      setTempCabinet({ ...cab });
      if (cab.type === CabinetType.WALL) setPresetFilter('Wall');
      else if (cab.type === CabinetType.TALL) setPresetFilter('Tall');
      else setPresetFilter('Base');
      setModalMode('edit_cabinet');
    }
    else { setTempObstacle({ ...currentZone.obstacles[idx] }); setModalMode('edit_obstacle'); }
  };

  const updateAdvancedSetting = (key: string, value: any) => {
    if (!tempCabinet) return;
    setTempCabinet(prev => {
      const advanced = prev.advancedSettings || {};
      return {
        ...prev,
        advancedSettings: {
          ...advanced,
          [key]: value
        }
      };
    });
  };

  const handleCabinetSelect = (zoneId: string, index: number) => {
    setSelectedCabinet({ zoneId, index });
    // Switch tab if needed
    if (zoneId !== activeTab) setActiveTab(zoneId);

    // Sync to tempCabinet for advanced editors
    const zone = project.zones.find(z => z.id === zoneId);
    if (zone && zone.cabinets[index]) {
      setTempCabinet({ ...zone.cabinets[index] });
      setEditIndex(index);
    }
  };

  const updateSelectedCabinet = (updates: Partial<CabinetUnit>) => {
    if (!selectedCabinet) return;
    updateZone(z => {
      const cabs = [...z.cabinets];
      const cab = { ...cabs[selectedCabinet.index], ...updates };
      
      // Update temp cabinet so advanced editor is in sync
      setTempCabinet(cab);

      // If width changed, we need to ensure it fits and shoves others
      cabs[selectedCabinet.index] = cab;
      return resolveLocalCollisions({ ...z, cabinets: cabs }, selectedCabinet.index, project.settings);
    }, false, selectedCabinet.zoneId);
  };

  const updateSelectedAdvancedSetting = (updates: Partial<TestingSettings>) => {
    if (!selectedCabinet) return;
    updateZone(z => {
      const cabs = [...z.cabinets];
      const cab = cabs[selectedCabinet.index];
      const advanced = cab.advancedSettings || {};
      const newCab = {
        ...cab,
        advancedSettings: { ...advanced, ...updates }
      };
      
      // Update temp cabinet so advanced editor is in sync
      setTempCabinet(newCab);

      cabs[selectedCabinet.index] = newCab;
      return resolveCollisions({ ...z, cabinets: cabs });
    }, false, selectedCabinet.zoneId);
  };

  const saveItem = () => {
    if (modalMode.includes('cabinet')) {
      const intersecting = getIntersectingCabinets(currentZone, tempCabinet);
      const shouldDelete = intersecting.length > 0 && window.confirm(`Overlap detected with ${intersecting.length} item(s). Delete them and fill remaining gaps?`);

      updateZone(z => {
        let items = [...z.cabinets];
        if (shouldDelete) {
          items = items.filter(c => !intersecting.some(i => i.id === c.id));
        }

        if (modalMode === 'add_cabinet') {
          // Add mode: Use current tempCabinet (it should have a unique ID already from openAdd)
          items.push({ ...tempCabinet, isAutoFilled: false });
        } else {
          // Edit mode: Find the original cabinet by ID, or fallback to the editIndex
          let targetIdx = items.findIndex(c => c.id === tempCabinet.id);
          
          // If ID not found (could happen if layout regenerated), fallback to stored index
          if (targetIdx === -1 && editIndex !== -1 && editIndex < items.length) {
            targetIdx = editIndex;
          }

          if (targetIdx !== -1) {
            items[targetIdx] = { ...tempCabinet, isAutoFilled: false };
          } else {
            // Last resort: if we can't find it at all, add it as new
            items.push({ ...tempCabinet, id: tempCabinet.id || Math.random().toString(), isAutoFilled: false });
          }
        }

        if (shouldDelete) {
          const zoneWithNew = { ...z, cabinets: items };
          return autoFillZone(zoneWithNew, project.settings, z.id, {
            includeSink: false,
            includeCooker: false,
            includeTall: z.cabinets.some(c => c.type === CabinetType.TALL),
            includeWallCabinets: z.cabinets.some(c => c.type === CabinetType.WALL),
            preferDrawers: false
          });
        } else {
          return resolveCollisions({ ...z, cabinets: items });
        }
      });
    } else {
      updateZone(z => {
        const items = [...z.obstacles];
        modalMode === 'add_obstacle' ? items.push({ ...tempObstacle, id: Math.random().toString() }) : items[editIndex] = tempObstacle;
        return { ...z, obstacles: items };
      });
    }
    setModalMode('none');
  };
  const deleteItem = () => {
    if (modalMode.includes('cabinet')) {
      updateZone(z => {
        const items = [...z.cabinets];
        items.splice(editIndex, 1);
        return { ...z, cabinets: items };
      });
    } else {
      updateZone(z => {
        const items = [...z.obstacles];
        items.splice(editIndex, 1);
        return { ...z, obstacles: items };
      });
    }
    setModalMode('none');
  };

  if (!currentZone) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Mobile Bottom Sheet Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Mobile Bottom Sheet - Menu Only */}
      <div
        className={`fixed md:hidden left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl z-50 transform transition-transform duration-300 ease-out shadow-2xl ${mobileSidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          maxHeight: 'calc(70vh - env(safe-area-inset-bottom))'
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-lg text-slate-900 dark:text-white">Menu</span>
          <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 140px)' }}>
          {/* Wall Length */}
          <div>
            <NumberInput label="Wall Length" value={currentZone.totalLength} onChange={(e) => updateZone(z => ({ ...z, totalLength: e }))} step={100} />
          </div>
          {/* Wall Height */}
          <div>
            <NumberInput label="Wall Height" value={currentZone.wallHeight} onChange={(e) => updateZone(z => ({ ...z, wallHeight: e }))} step={100} />
          </div>

          {/* Calculate BOM */}
          <Button size="xl" variant="primary" className="w-full font-black min-h-[64px] text-xl mb-4" onClick={() => { setMobileSidebarOpen(false); setScreen(Screen.BOM_REPORT); }}>
            CALCULATE BOM
          </Button>

          {/* Clear Zone */}
          <Button size="lg" variant="danger" className="w-full min-h-[56px] font-bold" onClick={() => { clearZone(); setMobileSidebarOpen(false); }}>
            <Trash2 size={20} className="mr-2" /> Clear Zone
          </Button>

        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* VISUALIZER */}
        <div
          ref={mainPanelRef}
          className="flex-1 min-w-0 relative min-h-0 flex flex-col"
        >
          {/* Desktop: Grid layout with resizable table */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs Row with Controls */}
            <div ref={tabsRowRef} className="flex items-center justify-between px-2 py-2 gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900 shrink-0 border-b dark:border-slate-800">
              {/* Left: Zone Tabs */}
              <div className="flex items-center gap-1">
                {project.zones.map(z => (
                  <button
                    key={z.id}
                    onClick={() => setActiveTab(z.id)}
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap min-h-[44px] ${activeTab === z.id ? 'bg-white dark:bg-slate-950 text-amber-500 shadow-sm border-t-2 border-amber-500' : 'text-slate-500 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300'}`}
                  >
                    {z.id}
                  </button>
                ))}
              </div>

              {/* Center: View Controls */}
              <div className="flex items-center gap-2">
                <Button 
                  size="xs" 
                  variant={isDirty ? "primary" : "secondary"} 
                  onClick={() => onSave()}
                  disabled={isSaving || !isDirty}
                  className={`min-h-[36px] transition-all duration-300 ${
                    isDirty 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Save size={14} className={`mr-1.5 ${isSaving ? 'animate-spin' : isDirty ? 'animate-pulse' : ''}`} /> 
                  {isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
                </Button>
                <div className="w-px h-6 bg-slate-400 dark:bg-slate-600 md:block hidden" />
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                   <button 
                     onClick={() => setVisualMode('elevation')}
                     className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${visualMode === 'elevation' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >Elevation</button>
                   <button 
                     onClick={() => setVisualMode('iso')}
                     className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${visualMode === 'iso' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >3D ISO</button>
                </div>
                <div className="w-px h-6 bg-slate-400 dark:bg-slate-600 md:block hidden" />
                <Button 
                  size="xs" 
                  variant={isTableVisible ? 'primary' : 'secondary'} 
                  onClick={() => setIsTableVisible(!isTableVisible)}
                  className="min-h-[36px]"
                  leftIcon={<Table2 size={14} />}
                >
                  {isTableVisible ? 'Hide Parts' : 'Show Parts'}
                </Button>
              </div>

              {/* Right: Undo/Redo */}
              <div className="flex items-center gap-2 lg:flex hidden">
                <Button size="xs" variant="secondary" onClick={handleUndo} disabled={!canUndo} className={`bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] ${!canUndo ? 'opacity-50' : ''}`}>
                  <ArrowLeft size={14} />
                </Button>
                <Button size="xs" variant="secondary" onClick={handleRedo} disabled={!canRedo} className={`bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] ${!canRedo ? 'opacity-50' : ''}`}>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0 flex flex-col">
              {/* Canvas */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-900 relative z-10 transition-all min-h-0 flex overflow-hidden">
                
                <div className="flex-1 relative">
                  {visualMode === 'elevation' ? (
                    <WallVisualizer 
                      zone={currentZone} 
                      height={currentZone.wallHeight || 2400} 
                      settings={project.settings} 
                      onCabinetClick={(i) => handleCabinetSelect(currentZone.id, i)} 
                      onObstacleClick={(i) => openEdit('obstacle', i)} 
                      onCabinetMove={handleCabinetMove} 
                      onObstacleMove={handleObstacleMove} 
                      onDragEnd={handleDragEnd} 
                      onSwapCabinets={handleSwapCabinets} 
                    />
                  ) : (
                    <CabinetViewer 
                      project={project} 
                      showHardware={true} 
                      lightTheme={!isDark}
                      draggedCabinet={draggingCabinet}
                      onDropCabinet={handleDropCabinet}
                      selectedCabinet={selectedCabinet}
                      onCabinetSelect={handleCabinetSelect}
                      activeWallId={activeTab} 
                      onSettingsUpdate={(settings) => setProject(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }))}
                    />
                  )}
                </div>
              </div>

              {/* Table */}
              {isTableVisible && (
                <div className="h-1/3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl z-20">
                  <div className="flex-1 min-h-0 overflow-auto">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px] text-left text-sm">
                        <thead className="bg-slate-100 dark:bg-amber-950/40 text-slate-500 dark:text-amber-500 font-bold text-xs uppercase sticky top-0 z-20 border-b dark:border-amber-500/30">
                          <tr>
                            <th className="p-3 whitespace-nowrap">#</th>
                            <th className="p-3 whitespace-nowrap">Type</th>
                            <th className="p-3 whitespace-nowrap">Item</th>
                            <th className="p-3 text-right whitespace-nowrap">Width</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-amber-900/20">
                          {currentZone && [...currentZone.obstacles, ...currentZone.cabinets].map((item, i) => {
                            const isCab = 'preset' in item;
                            return (
                              <tr
                                key={item.id}
                                onClick={() => openEdit(isCab ? 'cabinet' : 'obstacle', isCab ? i - currentZone.obstacles.length : i)}
                                className="hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors"
                              >
                                <td className="p-3 text-slate-400 font-mono whitespace-nowrap">{isCab ? (item as CabinetUnit).label : i + 1}</td>
                                <td className="p-3 text-amber-600 font-bold whitespace-nowrap">{isCab ? (item as CabinetUnit).type : 'Obstacle'}</td>
                                <td className="p-3 font-medium dark:text-amber-100">
                                  <span className="truncate inline-block">{isCab ? (item as CabinetUnit).preset : (item as Obstacle).type}</span>
                                  <span className="text-slate-400 dark:text-amber-500/50 text-xs ml-2 whitespace-nowrap">@{item.fromLeft}mm</span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold dark:text-white whitespace-nowrap">{item.width}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Stack layout */}
          <div className="md:hidden flex flex-col h-full pb-16">
            {/* Tabs Row with Controls */}
            <div className="flex items-center justify-between px-2 pt-2 gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900 shrink-0 border-b dark:border-slate-800">
              {/* Left: Zone Tabs */}
              <div className="flex items-center gap-1">
                {project.zones.map(z => (
                  <button
                    key={z.id}
                    onClick={() => setActiveTab(z.id)}
                    className={`px-3 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap min-h-[44px] ${activeTab === z.id ? 'bg-white dark:bg-slate-950 text-amber-500 shadow-sm border-t-2 border-amber-500' : 'text-slate-500 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300'}`}
                  >
                    {z.id}
                  </button>
                ))}
                <button
                  onClick={addZone}
                  className="px-3 py-2 text-sm font-bold rounded-t-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors min-h-[44px]"
                >
                  +
                </button>
              </div>

              {/* Right: View Controls and Undo/Redo */}
              <div className="flex items-center gap-1">
                <Button 
                  size="xs" 
                  variant={isDirty ? "primary" : "secondary"} 
                  onClick={() => onSave()}
                  disabled={isSaving || !isDirty}
                  className={`min-h-[36px] px-2 transition-all duration-300 ${
                    isDirty 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Save size={14} className={isSaving ? 'animate-spin' : isDirty ? 'animate-pulse' : ''} />
                </Button>
                <Button size="xs" variant={visualMode === 'elevation' ? 'primary' : 'secondary'} onClick={() => setVisualMode('elevation')} className={`${visualMode === 'elevation' ? 'shadow-md' : 'shadow-sm hover:shadow'} border transition-all min-h-[36px] px-2 text-xs`}>Elv</Button>
                <Button size="xs" variant={visualMode === 'iso' ? 'primary' : 'secondary'} onClick={() => setVisualMode('iso')} className={`${visualMode === 'iso' ? 'shadow-md' : 'shadow-sm hover:shadow'} border transition-all min-h-[36px] px-2 text-xs`}>3D</Button>
                <div className="w-px h-5 bg-slate-400 dark:bg-slate-600 mx-1" />
                <Button size="xs" variant="secondary" onClick={handleUndo} disabled={!canUndo} className={`bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] px-2 ${!canUndo ? 'opacity-50' : ''}`}>
                  <ArrowLeft size={14} />
                </Button>
                <Button size="xs" variant="secondary" onClick={handleRedo} disabled={!canRedo} className={`bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] px-2 ${!canRedo ? 'opacity-50' : ''}`}>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 min-h-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative">
              {visualMode === 'elevation' ? (
                <WallVisualizer zone={currentZone} height={currentZone.wallHeight || 2400} settings={project.settings} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} onDragEnd={handleDragEnd} onSwapCabinets={handleSwapCabinets} />
              ) : (
                <CabinetViewer 
                  project={project} 
                  showHardware={true} 
                  lightTheme={!isDark}
                  draggedCabinet={draggingCabinet}
                  onDropCabinet={handleDropCabinet}
                  onCabinetClick={(zoneId, cIdx) => { 
                    setActiveTab(zoneId); 
                    openEdit("cabinet", cIdx); 
                  }} 
                  onWallClick={(wallId) => { 
                    setActiveTab(wallId); 
                    setVisualMode("elevation"); 
                  }} 
                  activeWallId={activeTab} 
                  onSettingsUpdate={(settings) => setProject(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }))}
                />
              )}
            </div>

            {/* Mobile Action Buttons - Below Canvas */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 z-30">
              <div className="grid grid-cols-5 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setMobileSidebarOpen(true)} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Menu size={18} /><span>Menu</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  saveToHistory();
                  const result = generateRubyLayout(project);
                  setProject(result.project);
                }} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Wand2 size={18} /><span>Auto</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAdd('obstacle')} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <DoorOpen size={18} /><span>Obs</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAdd('cabinet')} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Box size={18} /><span>Cab</span>
                </Button>
              </div>
            </div>

            {/* Collapsible Table */}
            <div className={`shrink-0 bg-white dark:bg-slate-950 overflow-hidden flex flex-col z-20 ${mobileTableCollapsed ? 'h-10' : 'h-[200px]'}`}>
              <button
                onClick={() => setMobileTableCollapsed(!mobileTableCollapsed)}
                className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase tracking-wider"
              >
                <span>{mobileTableCollapsed ? `Show Items (${(currentZone?.cabinets.length || 0) + (currentZone?.obstacles.length || 0)})` : 'Hide Items'}</span>
                <span className="transform transition-transform">{mobileTableCollapsed ? '▲' : '▼'}</span>
              </button>

              {!mobileTableCollapsed && (
                <div className="flex-1 overflow-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px] text-left text-sm">
                      <thead className="bg-slate-100 dark:bg-amber-950/40 text-slate-500 dark:text-amber-500 font-bold text-xs uppercase sticky top-0 z-20 border-b dark:border-amber-500/30">
                        <tr>
                          <th className="p-2 whitespace-nowrap">#</th>
                          <th className="p-2 whitespace-nowrap">Type</th>
                          <th className="p-2 whitespace-nowrap">Item</th>
                          <th className="p-2 text-right whitespace-nowrap">W</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-amber-900/20">
                        {[...currentZone.obstacles, ...currentZone.cabinets].map((item, i) => {
                          const isCab = 'preset' in item;
                          return (
                            <tr
                              key={item.id}
                              onClick={() => openEdit(isCab ? 'cabinet' : 'obstacle', isCab ? i - currentZone.obstacles.length : i)}
                              className="hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors"
                            >
                              <td className="p-2 text-slate-400 font-mono whitespace-nowrap">{isCab ? (item as CabinetUnit).label : i + 1}</td>
                              <td className="p-2 text-amber-600 font-bold whitespace-nowrap text-xs">{isCab ? (item as CabinetUnit).type : 'Obs'}</td>
                              <td className="p-2 font-medium dark:text-amber-100 text-xs">
                                <span className="truncate max-w-[100px] inline-block">{isCab ? (item as CabinetUnit).preset : (item as Obstacle).type}</span>
                              </td>
                              <td className="p-2 text-right font-mono font-bold dark:text-white whitespace-nowrap text-xs">{item.width}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar: Presets or Selected Cabinet Editor */}
        <div className="hidden md:flex w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col overflow-hidden shrink-0">
          {selectedCabinet ? (
            <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Edit Cabinet</h3>
                <button 
                  onClick={() => setSelectedCabinet(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
                const cab = zone?.cabinets[selectedCabinet.index];
                if (!cab) return null;

                const isCabinetChanged = initialZoneCabinetsBackup && (
                  JSON.stringify(zone.cabinets) !== JSON.stringify(initialZoneCabinetsBackup)
                );

                const handleResetCabinet = () => {
                  if (initialZoneCabinetsBackup && selectedCabinet) {
                    const originalCabinets = JSON.parse(JSON.stringify(initialZoneCabinetsBackup));
                    updateZone(z => ({ ...z, cabinets: originalCabinets }), false, selectedCabinet.zoneId);
                    
                    // Sync temp cabinet for editors
                    const cab = originalCabinets[selectedCabinet.index];
                    if (cab) setTempCabinet(JSON.parse(JSON.stringify(cab)));
                  }
                };

                return (
                  <div className="space-y-5">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Active Unit</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{cab.label || 'Cabinet'} - {cab.preset}</p>
                    </div>

                    {/* Width */}
                    <CabinetSpanSlider 
                      totalLength={zone.totalLength}
                      fromLeft={cab.fromLeft}
                      width={cab.width}
                      onChange={(updates) => updateSelectedCabinet(updates)}
                      onDragEnd={handleDragEnd}
                    />

                    {/* ---------------- SECTION-BASED EDITING ---------------- */}
                    {cab.type === CabinetType.TALL ? (
                      <div className="space-y-4 mt-2">
                        {/* --- UPPER SECTION --- */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Upper Section</h4>
                          
                          {/* Upper Section Height */}
                          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Upper Height</span>
                              <span className="text-xs font-mono text-amber-500 font-bold">{(cab.advancedSettings?.tallUpperSectionHeight ?? 300).toFixed(0)}mm</span>
                            </div>
                            <input 
                              type="range" 
                              min="100" 
                              max="1500" 
                              step="10"
                              value={cab.advancedSettings?.tallUpperSectionHeight ?? 300}
                              onChange={(e) => updateSelectedAdvancedSetting({ tallUpperSectionHeight: parseInt(e.target.value) })}
                              className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Upper Doors */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Upper Doors</span>
                            <input 
                              type="checkbox" 
                              checked={cab.advancedSettings?.showDoors ?? true}
                              onChange={(e) => updateSelectedAdvancedSetting({ showDoors: e.target.checked })}
                              className="w-4 h-4 accent-amber-500"
                            />
                          </div>

                          {/* Upper Shelves */}
                          <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Upper Shelves</span>
                              <input 
                                type="checkbox" 
                                checked={cab.advancedSettings?.showShelves ?? true}
                                onChange={(e) => updateSelectedAdvancedSetting({ showShelves: e.target.checked })}
                                className="w-4 h-4 accent-amber-500"
                              />
                            </div>
                            {(cab.advancedSettings?.showShelves ?? true) && (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numShelves: Math.max(0, (cab.advancedSettings?.numShelves ?? 2) - 1) })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >-</button>
                                <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numShelves ?? 2}</span>
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numShelves: (cab.advancedSettings?.numShelves ?? 2) + 1 })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >+</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* --- LOWER SECTION --- */}
                        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lower Section</h4>
                          
                          {/* Lower Section Height */}
                          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Section Height</span>
                              <span className="text-xs font-mono text-amber-500 font-bold">{(cab.advancedSettings?.tallLowerSectionHeight ?? 800).toFixed(0)}mm</span>
                            </div>
                            <input 
                              type="range" 
                              min="200" 
                              max="1500" 
                              step="10"
                              value={cab.advancedSettings?.tallLowerSectionHeight ?? 800}
                              onChange={(e) => updateSelectedAdvancedSetting({ tallLowerSectionHeight: parseInt(e.target.value) })}
                              className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Lower Doors */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lower Doors</span>
                            <input 
                              type="checkbox" 
                              checked={cab.advancedSettings?.showLowerDoors ?? true}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updates: Partial<TestingSettings> = { showLowerDoors: checked };
                                if (checked) updates.showDrawers = false;
                                updateSelectedAdvancedSetting(updates);
                              }}
                              className="w-4 h-4 accent-amber-500"
                            />
                          </div>

                          {/* Lower Shelves */}
                          <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lower Shelves</span>
                              <input 
                                type="checkbox" 
                                checked={cab.advancedSettings?.showLowerShelves ?? false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updates: Partial<TestingSettings> = { showLowerShelves: checked };
                                  if (checked) updates.showDrawers = false;
                                  updateSelectedAdvancedSetting(updates);
                                }}
                                className="w-4 h-4 accent-amber-500"
                              />
                            </div>
                            {(cab.advancedSettings?.showLowerShelves ?? false) && (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numLowerShelves: Math.max(0, (cab.advancedSettings?.numLowerShelves ?? 0) - 1) })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >-</button>
                                <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numLowerShelves ?? 0}</span>
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numLowerShelves: (cab.advancedSettings?.numLowerShelves ?? 0) + 1 })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >+</button>
                              </div>
                            )}
                          </div>

                          {/* Lower Drawers */}
                          <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lower Drawers</span>
                              <input 
                                type="checkbox" 
                                checked={cab.advancedSettings?.showDrawers ?? false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updates: Partial<TestingSettings> = { showDrawers: checked };
                                  if (checked) {
                                    updates.showLowerDoors = false;
                                    updates.showLowerShelves = false;
                                  }
                                  updateSelectedAdvancedSetting(updates);
                                }}
                                className="w-4 h-4 accent-amber-500"
                              />
                            </div>
                            {(cab.advancedSettings?.showDrawers ?? false) && (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numDrawers: Math.max(0, (cab.advancedSettings?.numDrawers ?? 3) - 1) })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >-</button>
                                <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numDrawers ?? 3}</span>
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numDrawers: (cab.advancedSettings?.numDrawers ?? 3) + 1 })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STANDARD VIEW (Base / Wall) */
                      <div className="space-y-4">
                        {/* Doors Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Doors</span>
                          <input 
                            type="checkbox" 
                            checked={cab.advancedSettings?.showDoors ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updates: Partial<TestingSettings> = { showDoors: checked };
                              if (checked) updates.showDrawers = false;
                              updateSelectedAdvancedSetting(updates);
                            }}
                            className="w-4 h-4 accent-amber-500"
                          />
                        </div>

                        {/* Shelves */}
                        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Shelves</span>
                            <input 
                              type="checkbox" 
                              checked={cab.advancedSettings?.showShelves ?? true}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updates: Partial<TestingSettings> = { showShelves: checked };
                                if (checked) updates.showDrawers = false;
                                updateSelectedAdvancedSetting(updates);
                              }}
                              className="w-4 h-4 accent-amber-500"
                            />
                          </div>
                          {(cab.advancedSettings?.showShelves ?? true) && (
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => updateSelectedAdvancedSetting({ numShelves: Math.max(0, (cab.advancedSettings?.numShelves ?? 2) - 1) })}
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                              >-</button>
                              <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numShelves ?? 2}</span>
                              <button 
                                onClick={() => updateSelectedAdvancedSetting({ numShelves: (cab.advancedSettings?.numShelves ?? 2) + 1 })}
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                              >+</button>
                            </div>
                          )}
                        </div>

                        {/* Drawers (Base only) */}
                        {cab.type === CabinetType.BASE && (
                          <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Drawers</span>
                              <input 
                                type="checkbox" 
                                checked={cab.advancedSettings?.showDrawers ?? false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const updates: Partial<TestingSettings> = { showDrawers: checked };
                                  if (checked) {
                                    updates.showDoors = false;
                                    updates.showShelves = false;
                                  }
                                  updateSelectedAdvancedSetting(updates);
                                }}
                                className="w-4 h-4 accent-amber-500"
                              />
                            </div>
                            {(cab.advancedSettings?.showDrawers ?? false) && (
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numDrawers: Math.max(0, (cab.advancedSettings?.numDrawers ?? 3) - 1) })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >-</button>
                                <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numDrawers ?? 3}</span>
                                <button 
                                  onClick={() => updateSelectedAdvancedSetting({ numDrawers: (cab.advancedSettings?.numDrawers ?? 3) + 1 })}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >+</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-2">
                      <button 
                        onClick={() => setShowAdvancedCabinetEditor(true)}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                      >
                        <Settings2 size={14} /> Advanced 3D Editor
                      </button>
                    </div>

                    {isCabinetChanged && (
                      <button 
                        onClick={handleResetCabinet}
                        className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={14} /> Reset Changes
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        updateZone(z => {
                          const cabs = z.cabinets.filter((_, i) => i !== selectedCabinet.index);
                          return resolveCollisions({ ...z, cabinets: cabs });
                        }, false, selectedCabinet.zoneId);
                        setSelectedCabinet(null);
                      }}
                      className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-rose-500/20"
                    >
                      Delete Cabinet
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Presets</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[
                  { type: CabinetType.BASE, preset: PresetType.BASE_DOOR, label: 'Base Cabinet', icon: <Box size={24} /> },
                  { type: CabinetType.WALL, preset: PresetType.WALL_STD, label: 'Wall Cabinet', icon: <Layers size={24} /> },
                  { type: CabinetType.TALL, preset: PresetType.TALL_UTILITY, label: 'Tall Cabinet', icon: <Layers size={24} className="rotate-90" /> },
                  { type: CabinetType.BASE, preset: PresetType.SINK_UNIT, label: 'Sink Unit', icon: <Box size={24} className="text-blue-500" /> },
                ].map((proto, i) => (
                  <div 
                    key={i}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      const { icon, ...protoData } = proto;
                      setDraggingCabinet({ ...protoData, id: 'proto', width: 600, qty: 1, fromLeft: 0 } as any);
                    }}
                    className="group bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-lg transition-all flex items-center gap-3 select-none active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-amber-500 border dark:border-slate-700 shadow-sm transition-colors">
                      {proto.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{proto.label}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">{proto.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-10 border border-slate-200 dark:border-slate-800 max-h-[85vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg sm:text-xl dark:text-white capitalize">{modalMode.replace('_', ' ')}</h3>
              <button onClick={() => setModalMode('none')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {modalMode.includes('cabinet') ? (
                <>
                  {/* PRESET FILTER TABS */}
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {['Base', 'Wall', 'Tall'].map(f => (
                      <button
                        key={f}
                        onClick={() => setPresetFilter(f as any)}
                        className={`flex-1 py-2 sm:py-1.5 text-sm sm:text-xs font-bold rounded-md transition-all min-h-[44px] sm:min-h-[36px] ${presetFilter === f ? 'bg-white dark:bg-slate-600 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* CUSTOM CABINETS + PRESET GRID */}
                  <div className="space-y-2">
                    {/* Custom Cabinets for this type */}
                    {customCabinets
                      .filter(c => c.base_type === presetFilter)
                      .map(custom => (
                        <button
                          key={custom.id}
                          onClick={() => setTempCabinet({
                            ...tempCabinet,
                            customPresetId: custom.id,
                            customConfig: {
                              num_shelves: custom.num_shelves,
                              num_drawers: custom.num_drawers,
                              num_doors: custom.num_doors,
                              hinges: custom.hinges,
                              slides: custom.slides,
                              handles: custom.handles,
                            },
                            type: presetFilter === 'Wall' ? CabinetType.WALL : presetFilter === 'Tall' ? CabinetType.TALL : CabinetType.BASE,
                          })}
                          className={`w-full p-3 sm:p-2 rounded-lg border transition-all min-h-[56px] ${tempCabinet.customPresetId === custom.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-500' : 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Wand2 size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                              <span className="font-semibold text-sm text-slate-800 dark:text-white">{custom.name}</span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex gap-2 flex-wrap justify-end">
                              <span>Shelf {custom.num_shelves}</span>
                              <span>Drawer {custom.num_drawers}</span>
                              <span>Door {custom.num_doors}</span>
                            </div>
                          </div>
                        </button>
                      ))}

                    {/* Standard Presets */}
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] sm:max-h-[160px] overflow-y-auto">
                      {Object.values(PresetType)
                        .filter(p => {
                          if (presetFilter === 'Base') return p.includes('Base') || p.includes('Sink') || p.includes('Filler') || p.includes('Corner');
                          if (presetFilter === 'Wall') return p.includes('Wall');
                          return p.includes('Tall');
                        })
                        .map(t => (
                          <button
                            key={t}
                            onClick={() => setTempCabinet({ ...tempCabinet, preset: t, type: presetFilter === 'Wall' ? CabinetType.WALL : presetFilter === 'Tall' ? CabinetType.TALL : CabinetType.BASE, customPresetId: undefined, customConfig: undefined })}
                            className={`p-3 sm:p-2 text-xs sm:text-[10px] font-bold rounded-lg border text-left transition-all min-h-[48px] sm:min-h-[40px] flex items-center ${tempCabinet.preset === t && !tempCabinet.customPresetId ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300'}`}
                          >
                            {t}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAdvancedCabinetEditor(true)}
                      className="w-full py-3 sm:py-2 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 min-h-[48px]"
                    >
                      <Settings2 size={18} />
                      <span className="text-sm sm:text-base">Advanced 3D Editor</span>
                    </button>
                  </div>

                  {/* Material Selection */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-400 mb-2 block">Materials</label>
                    <MaterialSelector
                      materials={tempCabinet.materials}
                      onChange={(materials) => setTempCabinet({ ...tempCabinet, materials })}
                      currency={project.settings.currency || '$'}
                    />
                  </div>

                  <NumberInput label="Width" value={tempCabinet.width} onChange={v => setTempCabinet({ ...tempCabinet, width: v })} step={50} />
                  <NumberInput label="Position (Left)" value={tempCabinet.fromLeft} onChange={v => setTempCabinet({ ...tempCabinet, fromLeft: v })} step={50} />
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <NumberInput 
                      label="Shelves" 
                      value={tempCabinet.advancedSettings?.numShelves ?? 0} 
                      onChange={v => {
                        updateAdvancedSetting('numShelves', v);
                        updateAdvancedSetting('showShelves', v > 0);
                      }} 
                      min={0}
                      max={10}
                    />
                    <NumberInput 
                      label="Quantity" 
                      value={tempCabinet.qty || 1} 
                      onChange={v => setTempCabinet({ ...tempCabinet, qty: Math.max(1, v) })} 
                      min={1}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-400 mb-1.5 block">Type</label>
                    <select
                      className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-lg dark:text-white min-h-[48px]"
                      value={tempObstacle.type}
                      onChange={e => setTempObstacle({ ...tempObstacle, type: e.target.value as any })}
                    >
                      {['door', 'window', 'column', 'pipe'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <NumberInput label="Width" value={tempObstacle.width} onChange={v => setTempObstacle({ ...tempObstacle, width: v })} step={50} />
                  <NumberInput label="Position (Left)" value={tempObstacle.fromLeft} onChange={v => setTempObstacle({ ...tempObstacle, fromLeft: v })} step={50} />

                  {/* Window-specific fields */}
                  {tempObstacle.type === 'window' && (
                    <>
                      <NumberInput
                        label="Window Height"
                        value={tempObstacle.height || 1200}
                        onChange={v => setTempObstacle({ ...tempObstacle, height: v })}
                        step={50}
                        min={300}
                        max={1800}
                      />
                      <NumberInput
                        label="Sill Height (from floor)"
                        value={tempObstacle.sillHeight || 900}
                        onChange={v => setTempObstacle({ ...tempObstacle, sillHeight: v })}
                        step={50}
                        min={300}
                        max={2000}
                      />
                      <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                        <strong>Tip:</strong> Typical window sill height is 900-1200mm from floor.
                        Standard window height is 1200-1500mm.
                      </div>
                    </>
                  )}

                  {/* Door-specific fields */}
                  {tempObstacle.type === 'door' && (
                    <NumberInput
                      label="Door Height"
                      value={tempObstacle.height || 2100}
                      onChange={v => setTempObstacle({ ...tempObstacle, height: v })}
                      step={50}
                      min={1800}
                      max={2400}
                    />
                  )}

                  {/* Column/Pipe height */}
                  {(tempObstacle.type === 'column' || tempObstacle.type === 'pipe') && (
                    <NumberInput
                      label="Height"
                      value={tempObstacle.height || 2100}
                      onChange={v => setTempObstacle({ ...tempObstacle, height: v })}
                      step={50}
                      min={300}
                      max={3000}
                    />
                  )}

                  {/* Depth control for columns and pipes only */}
                  {(tempObstacle.type === 'column' || tempObstacle.type === 'pipe') && (
                    <NumberInput
                      label="Depth"
                      value={tempObstacle.depth || 150}
                      onChange={v => setTempObstacle({ ...tempObstacle, depth: v })}
                      step={25}
                      min={50}
                      max={300}
                    />
                  )}
                </>
              )}
              <div className="flex gap-2 pt-4 pb-2">
                {modalMode.includes('edit') && <Button variant="danger" onClick={deleteItem} className="flex-1 min-h-[48px]">Delete</Button>}
                <Button variant="primary" onClick={saveItem} className="flex-[2] min-h-[48px]">Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Advanced 3D Cabinet Editor */}
      <SingleCabinetEditorModal
        isOpen={showAdvancedCabinetEditor}
        onClose={() => setShowAdvancedCabinetEditor(false)}
        cabinet={tempCabinet}
        globalSettings={project.settings}
        isDark={isDark}
        onSave={(newCab) => {
          updateSelectedCabinet(newCab);
          setShowAdvancedCabinetEditor(false);
        }}
      />

    </div>
  );
};

const ScreenBOMReport = ({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>> }) => {
  // Use more specific dependencies to prevent unnecessary recalculations
  const data = useMemo(() => generateProjectBOM(project), [project.id, project.zones, project.settings]);
  const [activeView, setActiveView] = useState<'list' | 'cutplan' | 'wallplan' | 'quotation'>('list');

  // Load sheet types from database for pricing and nesting
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  useEffect(() => {
    const loadSheetTypes = async () => {
      const types = await sheetTypeService.getSheetTypes();
      setSheetTypes(types);
    };
    loadSheetTypes();
  }, []);

  const cutPlan = useMemo(() => optimizeCuts(data.groups.flatMap(g => g.items), project.settings, sheetTypes), [data.groups, sheetTypes, project.settings.kerf]);
  const currency = project.settings.currency || '$';

  // Load accessories from database
  const [accessories, setAccessories] = useState<ExpenseTemplate[]>([]);
  useEffect(() => {
    const loadAccessories = async () => {
      const templates = await expenseTemplateService.getTemplates();
      setAccessories(templates);
    };
    loadAccessories();
  }, []);


  // Calculate total doors for hinge calculation
  // Ruby CBX door threshold: < 599.5mm = single door, >= 600mm = double doors
  const RUBY_DOOR_THRESHOLD = 599.5;
  const totalDoors = useMemo(() => {
    let doors = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        // Count doors: base door cabinets have 1 or 2 doors depending on width
        if (cab.preset === PresetType.BASE_DOOR) {
          doors += cab.width >= RUBY_DOOR_THRESHOLD ? 2 : 1;
        }
        // Wall cabinets also have doors
        if (cab.type === CabinetType.WALL && cab.preset !== PresetType.OPEN_BOX) {
          doors += cab.width >= RUBY_DOOR_THRESHOLD ? 2 : 1;
        }
        // Tall cabinets
        if (cab.type === CabinetType.TALL) {
          doors += 1;
        }
      });
    });
    return doors;
  }, [project.zones]);

  // Calculate hinge quantity (2 per door)
  const hingeQuantity = totalDoors * 2;

  // Calculate installation nails (6 per hinge)
  const totalNails = hingeQuantity * 6;

  // Calculate adjustable legs (4 per BASE or TALL cabinet)
  const totalLegs = useMemo(() => {
    let legs = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        if (cab.type === CabinetType.BASE || cab.type === CabinetType.TALL) {
          legs += 4;
        }
      });
    });
    return legs;
  }, [project.zones]);

  // Calculate wall hangers (1 per WALL cabinet)
  const totalHangers = useMemo(() => {
    let hangers = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        if (cab.type === CabinetType.WALL) {
          hangers += 1;
        }
      });
    });
    return hangers;
  }, [project.zones]);

  // Get hinge cost from accessories
  const hingeAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('hinge') ||
    acc.name.toLowerCase().includes('soft-close')
  );
  const hingeUnitCost = hingeAccessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
  const hingeTotalCost = hingeQuantity * hingeUnitCost;

  // Calculate total drawers (from drawer cabinets)
  const totalDrawers = useMemo(() => {
    let drawers = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        // Base drawer cabinets have 3 drawers
        if (cab.preset === PresetType.BASE_DRAWER_3) {
          drawers += 3;
        }
      });
    });
    return drawers;
  }, [project.zones]);

  // Calculate Handle/Knob quantity (doors + drawers)
  const handleQuantity = totalDoors + totalDrawers;
  const handleAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('handle') ||
    acc.name.toLowerCase().includes('knob')
  );
  const handleUnitCost = handleAccessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
  const handleTotalCost = handleQuantity * handleUnitCost;

  // Calculate Drawer Slide quantity (pairs) = number of drawers
  const drawerSlideQuantity = totalDrawers;
  const drawerSlideAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('drawer slide') ||
    acc.name.toLowerCase().includes('slide')
  );
  const drawerSlideUnitCost = drawerSlideAccessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
  const drawerSlideTotalCost = drawerSlideQuantity * drawerSlideUnitCost;

  // Calculate total hardware cost from all individual items (only those actually used in project)
  const otherAccessoriesCost = useMemo(() => {
    return Object.entries(data.hardwareSummary)
      .filter(([name]) => {
        const lower = name.toLowerCase();
        // Skip items already calculated separately with special logic
        return !lower.includes('hinge') && 
               !lower.includes('handle') && 
               !lower.includes('knob') && 
               !lower.includes('slide');
      })
      .reduce((sum, [name, qty]) => {
        // Find best match in accessories list
        const accessory = accessories.find(acc => 
          acc.name.toLowerCase() === name.toLowerCase() ||
          acc.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(acc.name.toLowerCase())
        );
        
        const unitCost = accessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
        return sum + (qty * unitCost);
      }, 0);
  }, [data.hardwareSummary, accessories, project.settings.costs.pricePerHardwareUnit]);

  const totalHardwareCost = hingeTotalCost + handleTotalCost + drawerSlideTotalCost + otherAccessoriesCost;

  // Calculate base costs with proper hardware total
  const baseCosts = useMemo(() => calculateProjectCost(data, cutPlan, project.settings, totalHardwareCost, sheetTypes), [data, cutPlan, project.settings.costs, totalHardwareCost, sheetTypes]);

  // Use base costs directly (no additional expenses)
  const costs = baseCosts;

  // Calculate Sheet Summary for Table
  const materialSummary = useMemo(() => {
    const summary: Record<string, { sheets: number, waste: number, area: number }> = {};
    cutPlan.sheets.forEach(s => {
      if (!summary[s.material]) summary[s.material] = { sheets: 0, waste: 0, area: s.width * s.length };
      summary[s.material].sheets++;
      summary[s.material].waste += s.waste;
    });

    // Helper to find price for a material from database
    const findSheetPrice = (materialName: string): number => {
      const matched = sheetTypes.find(st =>
        materialName.toLowerCase().includes(st.name.toLowerCase()) ||
        st.name.toLowerCase().includes(materialName.toLowerCase())
      );
      if (matched && matched.price_per_sheet > 0) {
        return matched.price_per_sheet;
      }
      return project.settings.costs?.pricePerSheet ?? 85.00;
    };

    return Object.entries(summary).map(([mat, data]) => {
      const matched = sheetTypes.find(st => 
        mat.toLowerCase().includes(st.name.toLowerCase()) || 
        st.name.toLowerCase().includes(mat.toLowerCase())
      );
      return {
        material: mat,
        sheets: data.sheets,
        waste: Math.round(data.waste / data.sheets),
        dims: (matched && matched.length && matched.width) 
          ? `${matched.length} x ${matched.width}` 
          : '1220 x 2440',
        cost: data.sheets * findSheetPrice(mat)
      };
    });
  }, [cutPlan, project.settings, sheetTypes]);

  // Calculate Quotation Specifications with Filters
  const quotationSpecifications = useMemo(() => {
    const specs: string[] = [];

    // 1. Materials
    materialSummary.forEach(m => {
      specs.push(`Carcass & Face material: ${m.material}`);
    });

    // 2. Hardware/Accessories from BOM table logic
    const hardwareItems = [
      { name: 'Soft-Close Hinges', qty: hingeQuantity },
      { name: `Handle/Knob`, qty: handleQuantity },
      { name: `Drawer Slide (Pair)`, qty: drawerSlideQuantity },
      ...accessories.filter(acc =>
        !acc.name.toLowerCase().includes('hinge') &&
        !acc.name.toLowerCase().includes('handle') &&
        !acc.name.toLowerCase().includes('knob') &&
        !acc.name.toLowerCase().includes('drawer slide') &&
        !acc.name.toLowerCase().includes('slide')
      ).map(acc => ({ name: acc.name, qty: 1 }))
    ];

    // Apply USER Exclusions
    const exclusions = ['wall hanger', 'installation nail', 'transport', 'soft-close hinges'];

    hardwareItems.forEach(item => {
      const isExcluded = exclusions.some(ex => item.name.toLowerCase().includes(ex));
      if (!isExcluded && item.qty > 0) {
        specs.push(`${item.name}${item.qty > 1 ? ` (${item.qty})` : ''}`);
      }
    });

    return specs;
  }, [materialSummary, hingeQuantity, handleQuantity, drawerSlideQuantity, accessories]);

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  const handlePrintQuotation = () => {
    generateQuotationPDF(project, quotationSpecifications, costs, currency, {
      companyAddress: ['Katuwawala Road', 'Borelesgamuwa', 'Western Province', 'Sri Lanka'],
      phone: '0777163564',
      email: 'luxuselemente@gmail.com',
      bankName: 'Seylan Bank',
      accountNumber: '021 013 279 542 001'
    });
  };

  // Calculate quotation data
  const quotationDate = new Date();
  const dueDate = new Date(quotationDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const quotationNumber = `QT-${Date.now().toString().slice(-6)}`;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full overflow-hidden">
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0 print:hidden">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start overflow-x-auto w-full">
          {['list', 'cutplan', 'wallplan', 'quotation'].map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v as any)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-md capitalize whitespace-nowrap min-h-[40px] ${activeView === v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
            >
              {v === 'list' ? 'Material List' : v === 'cutplan' ? 'Cut Plan' : v === 'wallplan' ? 'Wall Plans' : (project.settings.quotationStatus === 'invoice' ? 'Invoice Review' : 'Quotation Review')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
            <Printer size={16} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">Print / PDF</span><span className="sm:hidden">Print</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportProjectToConstructionJSON(project)} className="flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
            <Download size={16} className="mr-1 sm:mr-2" /> <span className="hidden sm:inline">JSON</span><span className="sm:hidden">JSON</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => exportToExcel(data.groups, cutPlan, project)} className="flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
            <FileSpreadsheet size={16} className="mr-1 sm:mr-2" /> Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {
            const allCabinets = project.zones.flatMap(z => z.cabinets);
            exportAllDrillingToZip(allCabinets, project.settings, project.name);
          }} className="flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
            <Wrench size={16} className="mr-1 sm:mr-2" /> Drilling DXF
          </Button>
          <Button variant={activeView === 'quotation' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveView('quotation')} className="flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
            <CreditCard size={16} className="mr-1 sm:mr-2" /> {project.settings.quotationStatus === 'invoice' ? 'Invoice' : 'Quotation'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 bg-white dark:bg-slate-950 print:p-4 print:pb-24 print:overflow-visible h-full">
        {/* BOM CONTENT */}
        <div className={`${activeView !== 'quotation' ? 'flex' : 'hidden print:flex'} flex-col gap-10 sm:gap-14`}>

          {/* COSTING CARD - Only show in List view */}
          {activeView === 'list' && (
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl print:bg-white print:text-black print:border-2 print:border-black print:break-inside-avoid shadow-xl print:shadow-none">
              <h3 className="text-amber-600 dark:text-amber-500 font-bold mb-3 sm:mb-4 flex items-center gap-2 print:text-black text-base sm:text-lg"><DollarSign size={18} /> Cost Estimate</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Material</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.materialCost.toFixed(2)}</div></div>
                <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Hardware</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.hardwareCost.toFixed(2)}</div></div>
                <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Labor</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.laborCost.toFixed(2)}</div></div>
                <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Transport</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.transportCost.toFixed(2)}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 print:border-black">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Total</div>
                  <div className="text-xl sm:text-2xl font-bold">{currency}{baseCosts.subtotal.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-600 dark:text-amber-500 text-xs uppercase print:text-black">Sub Total ({(project.settings.costs?.marginPercent ?? 50)}% margin)</div>
                  <div className="text-2xl sm:text-3xl font-black">{currency}{costs.totalPrice.toFixed(2)}</div>
                </div>
              </div>

            </div>
          )}

          {/* MATERIAL SUMMARY TABLE - Only show in List view */}
          {activeView === 'list' && (
            <div className="break-inside-avoid overflow-x-auto">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2"><Layers size={18} /> Materials & Hardware</h3>
              <table className="w-full min-w-[400px] text-xs sm:text-sm text-left border-collapse border border-slate-200 dark:border-slate-700 print:border-black">
                <thead className="bg-slate-100 dark:bg-slate-800 print:!bg-slate-200 print:!text-black">
                  <tr>
                    <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:text-black">Material</th>
                    <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:text-black">Size</th>
                    <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:text-black">Qty</th>
                    <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:text-black">Cost</th>
                    <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:text-black print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {materialSummary.map((m) => (
                    <tr key={m.material}>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">{m.material}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">{m.dims}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{m.sheets}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{m.cost.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  ))}
                  {/* Soft-Close Hinges - calculated: 2 per door */}
                  {hingeQuantity > 0 && (
                    <tr>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">Soft-Close Hinges (2 per door)</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{hingeQuantity}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{hingeTotalCost.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  )}
                  {/* Handle/Knob - calculated: doors + drawers */}
                  {handleQuantity > 0 && (
                    <tr>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">Handle/Knob ({totalDoors} doors + {totalDrawers} drawers)</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{handleQuantity}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{handleTotalCost.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  )}
                  {/* Drawer Slide (Pair) - calculated: number of drawers */}
                  {drawerSlideQuantity > 0 && (
                    <tr>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">Drawer Slide (Pair) ({totalDrawers} drawers)</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{drawerSlideQuantity}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{drawerSlideTotalCost.toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  )}
                  {/* Adjustable Leg - calculated: 4 per BASE/TALL cabinet */}
                  {totalLegs > 0 && (
                    <tr>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">Adjustable Leg</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{totalLegs}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{(totalLegs * (accessories.find(a => a.name.toLowerCase().includes('adjustable leg'))?.default_amount || 2)).toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  )}
                  {/* Wall Hanger - calculated: 1 per WALL cabinet */}
                  {totalHangers > 0 && (
                    <tr>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">Wall Hanger (Pair)</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{totalHangers}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{(totalHangers * (accessories.find(a => a.name.toLowerCase().includes('wall hanger'))?.default_amount || 6)).toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  )}
                  {/* Installation Nail - calculated: 6 per hinge */}
                  {totalNails > 0 && (
                    <tr>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">Installation Nail</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{totalNails}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{(totalNails * (accessories.find(a => a.name.toLowerCase().includes('installation nail'))?.default_amount || 0.10)).toFixed(2)}</td>
                      <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                    </tr>
                  )}
                  {accessories
                    .filter(acc =>
                      !acc.name.toLowerCase().includes('hinge') &&
                      !acc.name.toLowerCase().includes('handle') &&
                      !acc.name.toLowerCase().includes('knob') &&
                      !acc.name.toLowerCase().includes('drawer slide') &&
                      !acc.name.toLowerCase().includes('slide') &&
                      !acc.name.toLowerCase().includes('adjustable leg') &&
                      !acc.name.toLowerCase().includes('wall hanger') &&
                      !acc.name.toLowerCase().includes('installation nail')
                    )
                    .map((acc) => (
                      <tr key={acc.id}>
                        <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">{acc.name}</td>
                        <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">-</td>
                        <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">1</td>
                        <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{acc.default_amount.toFixed(2)}</td>
                        <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black print:hidden">-</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LIST VIEW */}
          <div className={activeView === 'list' ? 'block' : 'hidden print:block'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 print:grid-cols-2 print:gap-4">
              {data.groups.map((group, i) => (
                <div key={i} className="border-2 sm:border-4 border-black p-3 sm:p-4 bg-white break-inside-avoid">
                  <div className="flex items-end gap-2 mb-3 sm:mb-4 border-b-2 border-black pb-1">
                    <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-tighter">POS {i + 1}</span>
                    <div className="font-black uppercase text-xs sm:text-sm truncate">{group.cabinetName}</div>
                  </div>
                  <table className="w-full text-[10px] sm:text-[11px] font-medium italic">
                    <tbody>
                      {group.items.map((item, j) => (
                        <tr key={j} className="border-b border-slate-100 dark:border-amber-900/20">
                          <td className="py-1 text-slate-900 font-bold">{item.name}</td>
                          <td className="py-1 text-right text-slate-500 font-mono text-[8px] sm:text-[9px]">{item.length}x{item.width}</td>
                          <td className="py-1 pr-1 text-right font-black text-black">x{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* CUT PLAN VIEW */}
          <div className={activeView === 'cutplan' ? 'block' : 'hidden print:block print:break-before-page'}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-4 print:hidden">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Scissors size={18} /> Cut Optimization</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportAllSheetsToDXFZip(cutPlan.sheets, project.settings, project.name)}
                className="min-h-[40px]"
              >
                <FileCode size={16} className="mr-2" /> Export All DXF (ZIP)
              </Button>
            </div>
            {/* Screen view - grid layout */}
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{cutPlan.sheets.map((sheet, i) => (
                <div key={i} className="relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <CutPlanVisualizer sheet={sheet} index={i} settings={project.settings} />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportSingleSheetToDXF(sheet, project.settings, i, project.name)}
                    className="absolute top-2 right-2 print:hidden"
                  >
                    <FileCode size={14} className="mr-1" /> DXF
                  </Button>
                </div>
              ))}</div>
            </div>
            {/* Print view - 2 per page in landscape */}
            <div className="hidden print:block">
              {Array.from({ length: Math.ceil(cutPlan.sheets.length / 2) }).map((_, pageIndex) => (
                <div key={pageIndex} className="print:break-before-page print:break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Scissors size={18} /> Cut Optimization - Sheets {(pageIndex * 2) + 1}-{Math.min((pageIndex * 2) + 2, cutPlan.sheets.length)}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {cutPlan.sheets.slice(pageIndex * 2, pageIndex * 2 + 2).map((sheet, i) => (
                      <CutPlanVisualizer key={pageIndex * 2 + i} sheet={sheet} index={pageIndex * 2 + i} settings={project.settings} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WALL PLAN VIEW */}
          <div className={activeView === 'wallplan' ? 'block' : 'hidden print:block print:break-before-page'}>
            <div className="max-w-4xl mx-auto">
              <div className="space-y-12 print:space-y-0">
                {project.zones.filter(z => z.active).map((zone, zoneIndex) => (
                  <div key={zone.id} className={`${zoneIndex > 0 ? 'print:break-before-page' : ''}`}>
                    {/* PRINT VIEW: Table first, then visualization */}
                    <div className="hidden print:block">
                      {/* Page 1: Unit Schedule Table */}
                      <div className="border-4 border-black p-4 bg-white min-h-[calc(100vh-80px)]">
                        <h3 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2 tracking-widest">{zone.id} - Unit Schedule</h3>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Unit Schedule</h4>
                          <table className="w-full text-sm text-left uppercase font-bold border-collapse">
                            <thead>
                              <tr className="border-b-2 border-black text-slate-500">
                                <th className="pb-2">POS</th>
                                <th className="pb-2">Description</th>
                                <th className="pb-2 text-right">Width</th>
                                <th className="pb-2 text-right">Type</th>
                                <th className="pb-2 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/10">
                              {zone.cabinets.sort((a, b) => (a.label || '').localeCompare(b.label || '')).map((cab, idx) => (
                                <tr key={idx}>
                                  <td className="py-3 text-amber-600 font-black italic">{cab.label}</td>
                                  <td className="py-3 font-black tracking-tight">{cab.preset}</td>
                                  <td className="py-3 text-right font-mono">{cab.width}mm</td>
                                  <td className="py-3 text-right text-xs opacity-60">{cab.type}</td>
                                  <td className="py-3 text-right">1</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Page 2: Wall Visualization - full page, no title */}
                      <div className="bg-white w-full h-[calc(100vh-80px)] flex flex-col items-center justify-start">
                        <div className="w-full flex items-center justify-center pt-8" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                          <WallVisualizer zone={zone} height={zone.wallHeight || 2400} settings={project.settings} hideArrows={true} />
                        </div>
                      </div>
                    </div>

                    {/* SCREEN VIEW: Kitchen Plan Canvas - Same as Plan Page */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-none print:shadow-none print:p-0">
                      <KitchenPlanCanvas data={buildProjectConstructionData(project)} scalePxPerMeter={120} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QUOTATION PREVIEW */}
        {activeView === 'quotation' && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-black animate-in fade-in slide-in-from-bottom-4 duration-500 print:shadow-none print:border-0 print:m-0 print:bg-white print:text-black">
            {/* Quotation Header (Matching PDF Layout) */}
            <div className="bg-slate-800 dark:bg-black text-white p-8 sm:p-12 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-6 print:bg-slate-800 print:text-white">
              <div>
                <h1 className="text-4xl sm:text-5xl font-light tracking-[0.2em] uppercase mb-2">{project.settings.quotationStatus === 'invoice' ? 'Invoice' : 'Quotation'}</h1>
                <p className="text-slate-400 text-xs tracking-widest uppercase">{project.settings.quotationStatus === 'invoice' ? 'Invoice / Bill' : 'Quotation / Bill of Quantities'}</p>
              </div>
              <div className="text-center sm:text-right">
                <div className="font-black text-lg uppercase mb-1 tracking-tight">{project.company || "Company Name"}</div>
                <div className="text-[10px] sm:text-xs space-y-1 opacity-70 uppercase tracking-wide">
                  <div>Katuwawala Road, Borelesgamuwa,</div>
                  <div>Western Province, Sri Lanka</div>
                  <div className="font-bold text-amber-500">0777163564 | luxuselemente@gmail.com</div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-12 space-y-12 bg-white text-slate-900">
              {/* Total Banner */}
              <div className="bg-slate-50 p-6 flex justify-end items-end gap-12 border-b border-slate-100 rounded-lg">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1 text-right">Total Amount</div>
                  <div className="text-4xl font-black tracking-tighter text-slate-900">{formatCurrency(costs.totalPrice)}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Bill To</div>
                  <div className="text-2xl font-black uppercase tracking-tight text-slate-800">{project.name || "Customer Name"}</div>
                  {project.company && <div className="text-slate-500 font-bold uppercase text-xs mt-1">{project.company}</div>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between sm:justify-end gap-6 text-xs">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Quotation#</span>
                    <span className="font-bold text-slate-800">{quotationNumber}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-xs">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Quotation Date</span>
                    <span className="text-slate-800">{quotationDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-xs">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Due Date</span>
                    <span className="text-slate-800">{dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-bold italic tracking-widest">
                      <th className="pb-4 text-left w-12">#</th>
                      <th className="pb-4 text-left">Item & Description</th>
                      <th className="pb-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="border-t border-slate-200 divide-y divide-slate-100">
                    <tr>
                      <td className="py-6 align-top font-bold text-slate-400">01</td>
                      <td className="py-6 align-top">
                        <div className="font-black text-slate-800 uppercase tracking-tight mb-2">{(project.name || 'Cabinet Project') + ' Specifications'}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-slate-500 font-medium">
                          {quotationSpecifications.map((spec, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-amber-500">{(idx + 1).toString().padStart(2, '0')}.</span>
                              <span>{spec}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-6 align-top text-right font-black text-slate-900 text-lg">{formatCurrency(costs.totalPrice)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Note */}
              <div className="bg-amber-50/50 p-4 border-l-4 border-amber-200 text-[10px] text-amber-800 rounded-r-lg font-medium">
                <span className="font-black uppercase mr-2">Note:</span>
                Sink, tap, cooker, and hood to be provided by the customer unless mentioned above.
              </div>

              {/* Summary & Bank Info */}
              <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-12 items-end">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-medium italic">Looking forward for your business.</div>
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <div className="text-slate-900 font-black uppercase text-xs tracking-[0.2em] border-b border-slate-200 pb-2">{project.company || 'COMPANY'}</div>
                      <div className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <div className="flex justify-between"><span className="text-slate-400">Bank Name</span> <span className="text-slate-700">Seylan Bank</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Account</span> <span className="text-slate-700">021 013 279 542 001</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Sub Total</span>
                      <span className="font-bold text-slate-700">{formatCurrency(costs.totalPrice)}</span>
                    </div>
                    <div className="h-px bg-slate-100 w-full"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-900 font-black uppercase tracking-[0.2em] text-sm">Grand Total</span>
                      <div className="text-right">
                        <span className="text-3xl font-black text-slate-900">{formatCurrency(costs.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Section in Preview */}
              <div className="pt-12 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Terms & Conditions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[8px] leading-relaxed text-slate-400 uppercase font-bold">
                  <div>1. Advance of 85% required to commence project.</div>
                  <div>2. Project starts after duly signed documents received.</div>
                  <div>3. 30 days allocated for production from final clarification.</div>
                  <div>4. Client must provide uninterrupted site access.</div>
                  <div>5. Material and design are final after production starts.</div>
                  <div>6. Full payment for accessories required to start.</div>
                  <div>7. Production completed upon full payment.</div>
                  <div>8. Linear foot fixing charges apply if assembly by Infinity.</div>
                </div>
              </div>

              {/* Actions Box */}
              <div className="pt-12 flex flex-col items-center gap-4 print:hidden border-t border-slate-100">
                {project.settings.quotationStatus !== 'invoice' ? (
                  <Button variant="secondary" size="lg" onClick={async () => { const updated = { ...project, settings: { ...project.settings, quotationStatus: 'invoice' as const, quotationApprovedDate: new Date().toISOString() } }; setProject(updated); await projectService.updateProject(project.id, updated); }} className="gap-3 px-12 py-6 rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Check size={24} /> Mark as Approved (Convert to Invoice)
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 font-bold">
                    <Check size={20} /> Invoice Approved on {new Date(project.settings.quotationApprovedDate || '').toLocaleDateString('en-GB')}
                  </div>
                )}
                <Button variant="primary" size="lg" onClick={handlePrintQuotation} className="gap-3 px-12 py-6 rounded-full shadow-2xl shadow-amber-500/20 hover:scale-105 transition-transform">
                  <Download size={24} /> {project.settings.quotationStatus === 'invoice' ? 'Download Invoice PDF' : 'Download Quotation PDF'}
                </Button>
                <button onClick={() => setActiveView('list')} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest">Back to Report</button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800 text-center text-[8px] text-slate-400 uppercase font-black tracking-[0.5em]">
              Generated by CABENGINE
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
