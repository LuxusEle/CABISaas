
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Home, Layers, Calculator, Zap, ArrowLeft, ArrowRight, Trash2, Plus, Box, DoorOpen, Wand2, Moon, Sun, Table2, FileSpreadsheet, X, Pencil, Save, List, Settings, Printer, Download, Scissors, LayoutDashboard, DollarSign, Map, LogOut, Menu, Wrench, CreditCard, ChevronDown, ChevronUp, FileText, Ruler, Book, Upload, Image as ImageIcon, Shield, FileCode } from 'lucide-react';
import { Screen, Project, Zone, ZoneId, PresetType, CabinetType, CabinetUnit, Obstacle, AutoFillOptions } from './types';
import { createNewProject, generateProjectBOM, autoFillZone, exportToExcel, resolveCollisions, calculateProjectCost, exportProjectToConstructionJSON, buildProjectConstructionData, getIntersectingCabinets } from './services/bomService';
import { exportAllSheetsToDXFZip, exportSingleSheetToDXF, exportAllDrillingToZip } from './services/dxfExportService';
import { generateInvoicePDF } from './services/pdfService';
import { optimizeCuts } from './services/nestingService';
import { authService } from './services/authService';
import { expenseTemplateService, ExpenseTemplate } from './services/expenseTemplateService';
import { supabase } from './services/supabaseClient';
import type { User } from '@supabase/supabase-js';

// Components
import { Button } from './components/Button';
import { NumberInput } from './components/NumberInput';
import { WallVisualizer } from './components/WallVisualizer';
import { CutPlanVisualizer } from './components/CutPlanVisualizer';
import { IsometricVisualizer } from './components/IsometricVisualizer';
import { CabinetViewer } from './components/3d';
import { KitchenPlanCanvas } from './components/KitchenPlanCanvas.tsx';
import { AuthModal } from './components/AuthModal';
import { CustomCabinetEditor } from './components/CustomCabinetEditor';
import { LandingPage } from './components/LandingPage';
import { customCabinetService } from './services/customCabinetService';
import { projectService } from './services/projectService';
import { SequentialBoxInput } from './components/SequentialBoxInput';
import { SheetTypeManager } from './components/SheetTypeManager';
import { MaterialSelector } from './components/MaterialSelector';
import { MaterialAllocationPanel } from './components/MaterialAllocationPanel';
import { PricingPage } from './components/PricingPage';
import { HelpButton } from './components/HelpButton';
import { DocsPage } from './components/DocsPage';
import { PolicyModal } from './components/PolicyModal';
import { logoService } from './services/logoService';

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

// --- MAIN APP COMPONENT ---

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.LANDING);
  const [project, setProject] = useState<Project>(createNewProject());
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('app-theme') !== 'false'; } catch { return true; }
  });

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
      if (user && screen === Screen.LANDING) {
        setScreen(Screen.DASHBOARD);
      }
    };
    checkAuth();

    // Listen to auth changes
    const subscription = authService.onAuthStateChange((user) => {
      setUser(user);
      // If user logged out and not on landing page, redirect to landing
      if (!user && screen !== Screen.LANDING) {
        setScreen(Screen.LANDING);
      }
    });

    return () => subscription.unsubscribe();
  }, [screen]);

  // Function to require authentication before action
  const requireAuth = (action: () => void) => {
    if (!user) {
      setScreen(Screen.LANDING);
      setAuthModalMode('login');
      setShowAuthModal(true);
    } else {
      action();
    }
  };

  useEffect(() => {
    localStorage.setItem('app-theme', String(isDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Auto-save project to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cabengine-project', JSON.stringify(project));
    } catch (e) {
      console.warn('Failed to save project:', e);
    }
  }, [project]);

  const toggleTheme = () => setIsDark(!isDark);

  useEffect(() => {
    // Skip auto-save if we're on Home screen or if project is just the initial blank one
    if (screen === Screen.LANDING || !project.id || project.id.length < 20) return;

    const timer = setTimeout(() => {
      handleSaveProject(project);
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [project, screen]);

  const handleSaveProject = async (projectToSave: Project) => {
    const isNew = projectToSave.id.length < 20; // Simple check for uuid() vs DB UUID
    const { data, error } = isNew
      ? await projectService.createProject(projectToSave)
      : await projectService.updateProject(projectToSave.id, projectToSave);

    if (error) {
      console.error("Save error:", error);
      alert("Saving failed. Please try again.");
    } else if (data) {
      setProject(data);
      return data;
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
        setProject(savedProj);
        setScreen(Screen.PROJECT_SETUP);
      }
    });
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const renderContent = () => {
    // Check authentication for protected screens
    const protectedScreens = [Screen.DASHBOARD, Screen.PROJECT_SETUP, Screen.WALL_EDITOR, Screen.BOM_REPORT, Screen.TOOLS];
    if (!user && protectedScreens.includes(screen)) {
      // Redirect to landing page if not authenticated
      return (
        <LandingPage
          onGetStarted={() => openAuthModal('signup')}
          onSignIn={() => openAuthModal('login')}
        />
      );
    }

    switch (screen) {
      case Screen.LANDING:
        return (
          <LandingPage
            onGetStarted={() => openAuthModal('signup')}
            onSignIn={() => openAuthModal('login')}
          />
        );
      case Screen.DASHBOARD:
        return (
          <ScreenHome
            onNewProject={handleStartProject}
            onLoadProject={(p) => {
              setProject(p);
              setScreen(Screen.WALL_EDITOR);
            }}
            logoUrl={project.settings.logoUrl}
          />
        );
      case Screen.PROJECT_SETUP: return <ScreenProjectSetup project={project} setProject={setProject} />;
      case Screen.WALL_EDITOR: return <ScreenWallEditor project={project} setProject={setProject} setScreen={setScreen} onSave={() => handleSaveProject(project)} />;
      case Screen.BOM_REPORT: return <ScreenBOMReport project={project} setProject={setProject} />;
      case Screen.TOOLS: return <ScreenPlanView project={project} />;
      case Screen.PRICING: return <PricingPage />;
      case Screen.DOCS: return <DocsPage />;
      default: return <LandingPage onGetStarted={() => openAuthModal('signup')} onSignIn={() => openAuthModal('login')} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col font-sans transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* MOBILE HEADER */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40 print:hidden">
        <div className="font-black text-lg">CAB<span className="text-amber-500">ENGINE</span></div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuthModal(true)}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            title={user?.email || "Login"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden md:pb-0 pb-16">
        {/* DESKTOP SIDEBAR - Hidden on landing page */}
        {screen !== Screen.LANDING && (
          <aside className="hidden md:flex w-20 flex-col items-center py-6 bg-slate-900 border-r border-slate-800 shrink-0 z-50 print:hidden">
            <div className="mb-8 text-amber-500"><LayoutDashboard size={28} /></div>
            <nav className="flex flex-col gap-6 w-full px-2">
              <NavButton active={screen === Screen.DASHBOARD} onClick={() => setScreen(Screen.DASHBOARD)} icon={<Home size={24} />} label="Home" />
              <NavButton active={screen === Screen.PROJECT_SETUP} onClick={() => requireAuth(() => setScreen(Screen.PROJECT_SETUP))} icon={<Settings size={24} />} label="Setup" />
              <NavButton active={screen === Screen.WALL_EDITOR} onClick={() => requireAuth(() => setScreen(Screen.WALL_EDITOR))} icon={<Box size={24} />} label="Walls" />
              <NavButton active={screen === Screen.BOM_REPORT} onClick={() => requireAuth(() => setScreen(Screen.BOM_REPORT))} icon={<Table2 size={24} />} label="BOM" />
              <NavButton active={screen === Screen.TOOLS} onClick={() => requireAuth(() => setScreen(Screen.TOOLS))} icon={<Map size={24} />} label="Plan" />
              <NavButton active={screen === Screen.PRICING} onClick={() => requireAuth(() => setScreen(Screen.PRICING))} icon={<CreditCard size={24} />} label="Pricing" />
              <NavButton active={screen === Screen.DOCS} onClick={() => setScreen(Screen.DOCS)} icon={<Book size={24} />} label="Docs" />
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-3 rounded-xl bg-slate-800 text-amber-500 hover:bg-slate-700 transition-colors"
                  title={user.email}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                  title="Login"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </button>
              )}
              <button onClick={toggleTheme} className="p-3 rounded-xl bg-slate-800 text-amber-500 hover:bg-slate-700 transition-colors">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
            </div>
          </aside>
        )}

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
          {renderContent()}
        </main>
      </div>

      {/* MOBILE NAV */}
      {(screen !== Screen.LANDING && screen !== Screen.DASHBOARD) && (
        <div className="md:hidden h-16 mobile-nav bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around z-[100] shrink-0 print:hidden safe-area-bottom" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
          <MobileNavButton active={screen === Screen.DASHBOARD} onClick={() => setScreen(Screen.DASHBOARD)} icon={<Home size={20} />} label="Home" />
          <MobileNavButton active={screen === Screen.PROJECT_SETUP} onClick={() => setScreen(Screen.PROJECT_SETUP)} icon={<Settings size={20} />} label="Setup" />
          <MobileNavButton active={screen === Screen.WALL_EDITOR} onClick={() => setScreen(Screen.WALL_EDITOR)} icon={<Box size={20} />} label="Editor" />
          <MobileNavButton active={screen === Screen.BOM_REPORT} onClick={() => setScreen(Screen.BOM_REPORT)} icon={<Table2 size={20} />} label="BOM" />
          <MobileNavButton active={screen === Screen.TOOLS} onClick={() => setScreen(Screen.TOOLS)} icon={<Map size={20} />} label="Plan" />
          <MobileNavButton active={screen === Screen.DOCS} onClick={() => setScreen(Screen.DOCS)} icon={<Book size={20} />} label="Docs" />
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
            // After successful login/signup from landing page, go to dashboard
            if (screen === Screen.LANDING) {
              setScreen(Screen.DASHBOARD);
            }
          }}
          onLogout={() => {
            setShowAuthModal(false);
            setScreen(Screen.LANDING);
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

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-full ${active ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`} title={label}>{icon}</button>
);
const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 ${active ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}>{icon}<span className="text-[10px] font-bold">{label}</span></button>
);

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
        <div className="text-center space-y-2 flex-1">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">CAB<span className="text-amber-600 dark:text-amber-500">ENGINE</span></h1>
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-none print:shadow-none print:p-0">
            <KitchenPlanCanvas data={buildProjectConstructionData(project)} scalePxPerMeter={120} />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-4 print:border-black print:p-4 print:rounded-none print:break-before-page">
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest border-b-2 pb-2 print:border-b-4 print:border-black">Project BOM (Bill of Materials)</h3>
            <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {bomData.groups.map((group, i) => (
                <div key={i} className="border-2 border-slate-100 dark:border-slate-800 p-4 rounded-xl print:border-2 print:border-black print:rounded-none print:break-inside-avoid">
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

const ScreenProjectSetup = ({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>> }) => {
  // State to track which section is expanded - only one at a time
  const [expandedSection, setExpandedSection] = useState<'projectInfo' | 'sheetTypes' | 'accessories' | 'allocation' | null>('projectInfo');

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

  const toggleSection = (section: 'projectInfo' | 'sheetTypes' | 'accessories' | 'allocation') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Project Setup</h2>
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Company Logo"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            )}
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
                  <h4 className="text-slate-500 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                    <Ruler size={14} /> Dimensions & Nesting
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <NumberInput label="Base Height" value={project.settings.baseHeight} onChange={(v) => setProject({ ...project, settings: { ...project.settings, baseHeight: v } })} step={10} />
                    <NumberInput label="Sheet Length" value={project.settings.sheetLength} onChange={(v) => setProject({ ...project, settings: { ...project.settings, sheetLength: v } })} step={100} />
                    <NumberInput label="Sheet Width" value={project.settings.sheetWidth} onChange={(v) => setProject({ ...project, settings: { ...project.settings, sheetWidth: v } })} step={100} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Types Manager */}
          <SheetTypeManager
            currency={project.settings.currency || '$'}
            sheetTypesExpanded={expandedSection === 'sheetTypes'}
            accessoriesExpanded={expandedSection === 'accessories'}
            onToggleSheetTypes={() => toggleSection('sheetTypes')}
            onToggleAccessories={() => toggleSection('accessories')}
          />

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

const ScreenWallEditor = ({ project, setProject, setScreen, onSave }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>>, setScreen: (s: Screen) => void, onSave: () => void }) => {
  const [activeTab, setActiveTab] = useState<string>(project.zones[0]?.id || 'Wall A');
  const currentZoneIndex = project.zones.findIndex(z => z.id === activeTab);
  const currentZone = project.zones[currentZoneIndex];

  // Resizable bottom table panel
  const [tablePanelHeight, setTablePanelHeight] = useState<number>(280);
  const mainPanelRef = useRef<HTMLDivElement | null>(null);
  const tabsRowRef = useRef<HTMLDivElement | null>(null);
  const resizingRef = useRef(false);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customCabinets, setCustomCabinets] = useState<any[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileTableCollapsed, setMobileTableCollapsed] = useState(true);

  // Undo/Redo history
  const [history, setHistory] = useState<{ zones: typeof project.zones; timestamp: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ zones: typeof project.zones; timestamp: number }[]>([]);
  const maxHistorySize = 20;

  // Save state to history
  const saveToHistory = () => {
    setHistory(prev => {
      const newHistory = [{ zones: JSON.parse(JSON.stringify(project.zones)), timestamp: Date.now() }, ...prev].slice(0, maxHistorySize);
      return newHistory;
    });
    // Clear redo stack when new action occurs
    setRedoStack([]);
  };

  // Undo function
  const handleUndo = () => {
    if (history.length > 0) {
      const [lastState, ...remainingHistory] = history;
      // Save current state to redo stack
      setRedoStack(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), timestamp: Date.now() }, ...prev].slice(0, maxHistorySize));
      setProject(prev => ({ ...prev, zones: lastState.zones }));
      setHistory(remainingHistory);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (redoStack.length > 0) {
      const [nextState, ...remainingRedo] = redoStack;
      // Save current state to history
      setHistory(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), timestamp: Date.now() }, ...prev].slice(0, maxHistorySize));
      setProject(prev => ({ ...prev, zones: nextState.zones }));
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
  const [tempObstacle, setTempObstacle] = useState<Obstacle>({ id: '', type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 });
  const [presetFilter, setPresetFilter] = useState<'Base' | 'Wall' | 'Tall'>('Base');
  const [visualMode, setVisualMode] = useState<'elevation' | 'iso'>('elevation');

  const updateZone = (newZoneOrTransform: Zone | ((z: Zone) => Zone), skipHistory = false) => {
    if (!skipHistory) {
      saveToHistory();
    }
    setProject(prev => {
      const newZones = [...prev.zones];
      const idx = newZones.findIndex(z => z.id === activeTab);
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

  // AUTO FILL & CLEAR
  const [autoFillOpts, setAutoFillOpts] = useState<AutoFillOptions>({
    includeSink: true,
    includeCooker: true,
    includeTall: false,
    includeWallCabinets: true,
    preferDrawers: false
  });

  const handleAutoFill = () => {
    setModalMode('autofill_options');
  };

  const executeAutoFill = () => {
    const requiredWidth =
      (autoFillOpts.includeSink ? 900 : 0) +
      (autoFillOpts.includeCooker ? 900 : 0) +
      (autoFillOpts.includeTall ? 600 : 0);

    if (requiredWidth > currentZone.totalLength) {
      if (!window.confirm(`Required space (${requiredWidth}mm) exceeds wall length (${currentZone.totalLength}mm). Continue anyway?`)) return;
    }

    updateZone(z => autoFillZone(z, project.settings, z.id, autoFillOpts));
    setModalMode('none');
  };

  // Smart gap fill - uses standard cabinet sizes
  const handleFillGaps = () => {
    updateZone(z => autoFillZone(z, project.settings, z.id, {
      includeSink: false,
      includeCooker: false,
      includeTall: z.cabinets.some(c => c.type === CabinetType.TALL),
      includeWallCabinets: z.cabinets.some(c => c.type === CabinetType.WALL),
      preferDrawers: false
    }));
  };

  const clearZone = () => { if (window.confirm(`Clear ${currentZone.id}?`)) updateZone({ ...currentZone, obstacles: [], cabinets: [] }); };

  const addZone = () => {
    const name = prompt("Enter Zone Name (e.g., Island, Pantry):");
    if (name) {
      if (project.zones.some(z => z.id === name)) {
        alert("Zone name must be unique");
        return;
      }
      const newZone = { id: name, active: true, totalLength: 3000, wallHeight: 2400, obstacles: [], cabinets: [] };
      const nextZones = [...project.zones, newZone];
      setProject({ ...project, zones: nextZones });
      setActiveTab(name);
    }
  };

  const deleteZone = (id: string) => {
    if (project.zones.length <= 1) return;
    if (window.confirm(`Delete ${id}?`)) {
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
      return { ...z, cabinets: cabs };
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
  const handleSequentialAdd = (newCabinets: CabinetUnit[]) => {
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
    });
  };

  const openAdd = (type: 'cabinet' | 'obstacle') => {
    if (type === 'cabinet') {
      setTempCabinet({ id: Math.random().toString(), preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 });
      setPresetFilter('Base');
      setModalMode('add_cabinet');
    }
    else { setTempObstacle({ id: Math.random().toString(), type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 }); setModalMode('add_obstacle'); }
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
          items.push({ ...tempCabinet, id: Math.random().toString(), isAutoFilled: false });
        } else {
          const idx = items.findIndex(c => c.id === tempCabinet.id);
          if (idx !== -1) items[idx] = { ...tempCabinet, isAutoFilled: false };
          else items.push({ ...tempCabinet, id: Math.random().toString(), isAutoFilled: false });
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

          {/* Sequential Builder */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Sequential Builder</h3>
            <SequentialBoxInput
              zone={{
                id: currentZone.id,
                totalLength: currentZone.totalLength,
                cabinets: currentZone.cabinets,
                obstacles: currentZone.obstacles
              }}
              onAddCabinets={(newCabinets) => {
                handleSequentialAdd(newCabinets);
                setMobileSidebarOpen(false);
              }}
            />
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
        {/* Desktop SIDEBAR */}
        <div className="hidden md:flex flex-col w-[280px] lg:w-[300px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full min-h-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <NumberInput label="Wall Length" value={currentZone.totalLength} onChange={(e) => updateZone(z => ({ ...z, totalLength: e }))} step={100} />
              <NumberInput label="Wall Height" value={currentZone.wallHeight} onChange={(e) => updateZone(z => ({ ...z, wallHeight: e }))} step={100} />
            </div>
          </div>
          <div className="p-4 space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zones</span>
              <button onClick={addZone} className="text-xs font-bold text-amber-500 hover:underline min-h-[32px] px-2">+ Add</button>
            </div>
            {project.zones.map(z => (
              <div key={z.id} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer min-h-[48px] ${activeTab === z.id ? 'bg-amber-50 dark:bg-slate-800 text-amber-600 border border-amber-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} onClick={() => setActiveTab(z.id)}>
                <span className="font-medium">{z.id}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteZone(z.id); }} className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 min-w-[40px] min-h-[40px] flex items-center justify-center">
                  <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 space-y-2 border-t border-slate-200 dark:border-slate-800">
            <Button size="md" variant="secondary" className="w-full text-sm min-h-[48px]" onClick={handleAutoFill}><Wand2 size={16} className="mr-2" /> Auto Fill</Button>
            <Button size="md" variant="secondary" className="w-full text-sm min-h-[48px]" onClick={handleFillGaps}><Box size={16} className="mr-2" /> Fill Gaps</Button>
            <Button size="md" variant="secondary" className="w-full text-sm min-h-[48px]" onClick={clearZone}><Trash2 size={16} className="mr-2" /> Clear Zone</Button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button size="lg" onClick={() => openAdd('obstacle')} variant="outline" className="text-xs flex-col h-20 min-h-[80px]"><DoorOpen size={20} />+ Obstacle</Button>
              <Button size="lg" onClick={() => openAdd('cabinet')} variant="primary" className="text-xs flex-col h-20 min-h-[80px]"><Box size={20} />+ Cabinet</Button>
            </div>
          </div>
          {/* Sequential Box Builder */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <SequentialBoxInput
              zone={{
                id: currentZone.id,
                totalLength: currentZone.totalLength,
                cabinets: currentZone.cabinets,
                obstacles: currentZone.obstacles
              }}
              onAddCabinets={handleSequentialAdd}
            />
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Button size="lg" variant="primary" className="w-full font-black min-h-[48px]" onClick={() => setScreen(Screen.BOM_REPORT)}>CALCULATE BOM</Button>
          </div>
        </div>

        {/* VISUALIZER */}
        <div
          ref={mainPanelRef}
          className="flex-1 min-w-0 relative min-h-0 flex flex-col"
        >
          {/* Desktop: Grid layout with resizable table */}
          <div className="hidden md:grid flex-1 min-h-0" style={{ gridTemplateRows: `auto 1fr ${tablePanelHeight}px` }}>
            {/* Tabs Row with Controls */}
            <div ref={tabsRowRef} className="flex items-center justify-between px-2 pt-2 gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900 shrink-0 border-b dark:border-slate-800">
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
                <button
                  onClick={addZone}
                  className="px-4 py-2 text-sm font-bold rounded-t-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors min-h-[44px]"
                >
                  +
                </button>
              </div>

              {/* Center: View Controls */}
              <div className="flex items-center gap-2">
                <Button size="xs" variant="secondary" onClick={onSave} className="bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px]">
                  <Save size={14} className="mr-1.5" /> Save
                </Button>
                <div className="w-px h-6 bg-slate-400 dark:bg-slate-600" />
                <Button size="xs" variant={visualMode === 'elevation' ? 'primary' : 'secondary'} onClick={() => setVisualMode('elevation')} className={`${visualMode === 'elevation' ? 'shadow-md' : 'shadow-sm hover:shadow'} border transition-all min-h-[36px]`}>Elevation</Button>
                <Button size="xs" variant={visualMode === 'iso' ? 'primary' : 'secondary'} onClick={() => setVisualMode('iso')} className={`${visualMode === 'iso' ? 'shadow-md' : 'shadow-sm hover:shadow'} border transition-all min-h-[36px]`}>3D ISO</Button>
              </div>

              {/* Right: Undo/Redo */}
              <div className="flex items-center gap-2">
                <Button size="xs" variant="secondary" onClick={handleUndo} disabled={!canUndo} className={`bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] ${!canUndo ? 'opacity-50' : ''}`}>
                  <ArrowLeft size={14} />
                </Button>
                <Button size="xs" variant="secondary" onClick={handleRedo} disabled={!canRedo} className={`bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] ${!canRedo ? 'opacity-50' : ''}`}>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="min-h-[240px] bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-10 transition-all min-h-0">
              {visualMode === 'elevation' ? (
                <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} onDragEnd={handleDragEnd} onSwapCabinets={handleSwapCabinets} />
              ) : (
                <CabinetViewer project={project} showHardware={true} />
              )}
            </div>

            {/* Table */}
            <div className="min-h-0 bg-white dark:bg-slate-950 overflow-hidden flex flex-col">
              <div
                onMouseDown={startResize}
                onTouchStart={startResize}
                className="h-10 shrink-0 flex items-center justify-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 text-sm font-bold uppercase tracking-wider cursor-row-resize select-none"
                title="Drag to resize"
              >
                Drag to resize
              </div>

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
                      {[...currentZone.obstacles, ...currentZone.cabinets].map((item, i) => {
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
                <Button size="xs" variant="secondary" onClick={onSave} className="bg-white hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-sm hover:shadow hover:border-amber-300 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-amber-600 transition-all min-h-[36px] px-2">
                  <Save size={14} />
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
                <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} onDragEnd={handleDragEnd} onSwapCabinets={handleSwapCabinets} />
              ) : (
                <CabinetViewer project={project} showHardware={true} />
              )}
            </div>

            {/* Mobile Action Buttons - Below Canvas */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 z-30">
              <div className="grid grid-cols-5 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setMobileSidebarOpen(true)} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Menu size={18} /><span>Menu</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={handleAutoFill} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Wand2 size={18} /><span>Auto</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={handleFillGaps} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Box size={18} /><span>Fill</span>
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
                <span>{mobileTableCollapsed ? `Show Items (${currentZone.cabinets.length + currentZone.obstacles.length})` : 'Hide Items'}</span>
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
              {modalMode === 'autofill_options' ? (
                <div className="space-y-6 py-2">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                      <span>Available Space</span>
                      <span>{currentZone.totalLength}mm</span>
                    </div>
                    <div className="h-2 bg-amber-200 dark:bg-amber-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((autoFillOpts.includeSink ? 900 : 0) + (autoFillOpts.includeCooker ? 900 : 0) + (autoFillOpts.includeTall ? 600 : 0)) / currentZone.totalLength * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 italic">Configure intelligent layout options. This will preserve your manual cabinets but replace auto-filled ones.</p>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <input type="checkbox" checked={autoFillOpts.includeSink} onChange={e => setAutoFillOpts({ ...autoFillOpts, includeSink: e.target.checked })} className="w-5 h-5 accent-amber-500" />
                      <div>
                        <div className="font-bold text-sm">Include Sink</div>
                        <div className="text-xs text-slate-400">Placed under a window if available</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <input type="checkbox" checked={autoFillOpts.includeCooker} onChange={e => setAutoFillOpts({ ...autoFillOpts, includeCooker: e.target.checked })} className="w-5 h-5 accent-amber-500" />
                      <div>
                        <div className="font-bold text-sm">Include Cooker & Hood</div>
                        <div className="text-xs text-slate-400">3-Drawer unit with aligned wall hood</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <input type="checkbox" checked={autoFillOpts.includeTall} onChange={e => setAutoFillOpts({ ...autoFillOpts, includeTall: e.target.checked })} className="w-5 h-5 accent-amber-500" />
                      <div>
                        <div className="font-bold text-sm">Include Tall Units</div>
                        <div className="text-xs text-slate-400">Utility / Pantry storage</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <input type="checkbox" checked={autoFillOpts.includeWallCabinets} onChange={e => setAutoFillOpts({ ...autoFillOpts, includeWallCabinets: e.target.checked })} className="w-5 h-5 accent-amber-500" />
                      <div>
                        <div className="font-bold text-sm">Include Wall Cabinets</div>
                        <div className="text-xs text-slate-400">Upper storage units</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <input type="checkbox" checked={autoFillOpts.preferDrawers} onChange={e => setAutoFillOpts({ ...autoFillOpts, preferDrawers: e.target.checked })} className="w-5 h-5 accent-amber-500" />
                      <div>
                        <div className="font-bold text-sm">Prefer Drawers</div>
                        <div className="text-xs text-slate-400">Use drawer banks instead of door units</div>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4">
                    <Button variant="primary" size="xl" className="w-full font-black text-lg min-h-[64px]" onClick={executeAutoFill}>
                      GENERATE LAYOUT
                    </Button>
                  </div>
                </div>
              ) : modalMode.includes('cabinet') ? (
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

                  {/* Customize Button */}
                  <button
                    onClick={() => setShowCustomEditor(true)}
                    className="w-full py-3 sm:py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <Wand2 size={18} />
                    <span className="text-sm sm:text-base">Customize This Cabinet</span>
                  </button>

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

      {/* Custom Cabinet Editor Modal */}
      {showCustomEditor && (
        <CustomCabinetEditor
          basePreset={tempCabinet.preset}
          baseType={presetFilter as 'Base' | 'Wall' | 'Tall'}
          initialName={tempCabinet.customPresetId ? customCabinets.find(c => c.id === tempCabinet.customPresetId)?.name : ''}
          initialDescription={tempCabinet.customPresetId ? customCabinets.find(c => c.id === tempCabinet.customPresetId)?.description : ''}
          initialConfig={tempCabinet.customConfig}
          onClose={() => setShowCustomEditor(false)}
          onSave={async () => {
            setShowCustomEditor(false);
            // Reload custom cabinets
            const { data } = await customCabinetService.getCustomPresets();
            if (data) setCustomCabinets(data);
          }}
        />
      )}
    </div>
  );
};

const ScreenBOMReport = ({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>> }) => {
  // Use more specific dependencies to prevent unnecessary recalculations
  const data = useMemo(() => generateProjectBOM(project), [project.id, project.zones, project.settings]);
  const [activeView, setActiveView] = useState<'list' | 'cutplan' | 'wallplan' | 'invoice'>('list');
  const cutPlan = useMemo(() => optimizeCuts(data.groups.flatMap(g => g.items), project.settings), [data.groups, project.settings.sheetLength, project.settings.sheetWidth, project.settings.kerf]);
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
  const totalDoors = useMemo(() => {
    let doors = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        // Count doors: base door cabinets have 1 or 2 doors depending on width
        if (cab.preset === PresetType.BASE_DOOR) {
          doors += cab.width > 400 ? 2 : 1;
        }
        // Wall cabinets also have doors
        if (cab.type === CabinetType.WALL && cab.preset !== PresetType.OPEN_BOX) {
          doors += cab.width > 400 ? 2 : 1;
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

  // Get hinge cost from accessories
  const hingeAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('hinge') ||
    acc.name.toLowerCase().includes('soft-close')
  );
  const hingeUnitCost = hingeAccessory?.default_amount || 5.00;
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
  const handleUnitCost = handleAccessory?.default_amount || 8.00;
  const handleTotalCost = handleQuantity * handleUnitCost;

  // Calculate Drawer Slide quantity (pairs) = number of drawers
  const drawerSlideQuantity = totalDrawers;
  const drawerSlideAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('drawer slide') ||
    acc.name.toLowerCase().includes('slide')
  );
  const drawerSlideUnitCost = drawerSlideAccessory?.default_amount || 15.00;
  const drawerSlideTotalCost = drawerSlideQuantity * drawerSlideUnitCost;

  // Calculate total hardware cost from all individual items
  const otherAccessoriesCost = accessories
    .filter(acc =>
      !acc.name.toLowerCase().includes('hinge') &&
      !acc.name.toLowerCase().includes('handle') &&
      !acc.name.toLowerCase().includes('knob') &&
      !acc.name.toLowerCase().includes('drawer slide') &&
      !acc.name.toLowerCase().includes('slide')
    )
    .reduce((sum, acc) => sum + acc.default_amount, 0);

  const totalHardwareCost = hingeTotalCost + handleTotalCost + drawerSlideTotalCost + otherAccessoriesCost;

  // Calculate base costs with proper hardware total
  const baseCosts = useMemo(() => calculateProjectCost(data, cutPlan, project.settings, totalHardwareCost), [data, cutPlan, project.settings.costs, totalHardwareCost]);

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
    return Object.entries(summary).map(([mat, data]) => ({
      material: mat,
      sheets: data.sheets,
      waste: Math.round(data.waste / data.sheets),
      dims: `${project.settings.sheetLength} x ${project.settings.sheetWidth}`
    }));
  }, [cutPlan, project.settings]);

  // Calculate Invoice Specifications with Filters
  const invoiceSpecifications = useMemo(() => {
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

  const handlePrintInvoice = () => {
    generateInvoicePDF(project, invoiceSpecifications, costs, currency, {
      companyAddress: ['Katuwawala Road', 'Borelesgamuwa', 'Western Province', 'Sri Lanka'],
      phone: '0777163564',
      email: 'luxuselemente@gmail.com',
      bankName: 'Seylan Bank',
      accountNumber: '021 013 279 542 001'
    });
  };

  // Calculate invoice data
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const invoiceNumber = `QT-${Date.now().toString().slice(-6)}`;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full overflow-hidden">
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0 print:hidden">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start overflow-x-auto w-full">
          {['list', 'cutplan', 'wallplan', 'invoice'].map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v as any)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-md capitalize whitespace-nowrap min-h-[40px] ${activeView === v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
            >
              {v === 'list' ? 'Material List' : v === 'cutplan' ? 'Cut Plan' : v === 'wallplan' ? 'Wall Plans' : 'Invoice Review'}
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
          <Button variant={activeView === 'invoice' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveView('invoice')} className="flex-1 sm:flex-none min-h-[40px] text-xs sm:text-sm">
            <CreditCard size={16} className="mr-1 sm:mr-2" /> Invoice
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 bg-white dark:bg-slate-950 print:p-4 print:pb-24 print:overflow-visible h-full">
        {/* BOM CONTENT */}
        <div className={activeView !== 'invoice' ? 'block' : 'hidden print:block'}>
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{project.company || "Cabinet Project"}</h1>
              <p className="text-slate-500 text-sm sm:text-base">Project: {project.name}</p>
            </div>
            {project.settings.logoUrl && <img src={project.settings.logoUrl} alt="Logo" className="h-10 sm:h-12 object-contain max-w-[120px]" />}
          </div>

          {/* COSTING CARD (Print Safe) */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl print:bg-white print:text-black print:border-2 print:border-black print:break-inside-avoid shadow-xl print:shadow-none">
            <h3 className="text-amber-600 dark:text-amber-500 font-bold mb-3 sm:mb-4 flex items-center gap-2 print:text-black text-base sm:text-lg"><DollarSign size={18} /> Cost Estimate</h3>
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Material</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.materialCost.toFixed(2)}</div></div>
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Hardware</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.hardwareCost.toFixed(2)}</div></div>
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Labor</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.laborCost.toFixed(2)}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 print:border-black">
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Total</div>
                <div className="text-xl sm:text-2xl font-bold">{currency}{baseCosts.subtotal.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-amber-600 dark:text-amber-500 text-xs uppercase print:text-black">Sub Total ({project.settings.costs.marginPercent}% margin)</div>
                <div className="text-2xl sm:text-3xl font-black">{currency}{costs.totalPrice.toFixed(2)}</div>
              </div>
            </div>
            {/* Edit Cost Settings (Simple) */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 sm:gap-4 print:hidden">
              <div className="flex items-center gap-2"><span className="text-xs text-slate-500 dark:text-slate-400">Sheet:</span><input type="number" className="bg-slate-100 dark:bg-slate-800 w-16 sm:w-20 rounded px-2 py-1 text-sm text-slate-900 dark:text-white" value={project.settings.costs.pricePerSheet} onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, pricePerSheet: Number(e.target.value) } } })} /></div>
              <div className="flex items-center gap-2"><span className="text-xs text-slate-500 dark:text-slate-400">Labor:</span><input type="number" className="bg-slate-100 dark:bg-slate-800 w-16 sm:w-20 rounded px-2 py-1 text-sm text-slate-900 dark:text-white" value={project.settings.costs.laborRatePerHour} onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborRatePerHour: Number(e.target.value) } } })} /></div>
              <div className="flex items-center gap-2"><span className="text-xs text-slate-500 dark:text-slate-400">Margin (%):</span><input type="number" className="bg-slate-100 dark:bg-slate-800 w-16 sm:w-20 rounded px-2 py-1 text-sm text-slate-900 dark:text-white" value={project.settings.costs.marginPercent} onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: Number(e.target.value) } } })} /></div>
            </div>
          </div>

          {/* MATERIAL SUMMARY TABLE (Always Visible in List/Cut Plan) */}
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
                    <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{currency}{(m.sheets * project.settings.costs.pricePerSheet).toFixed(2)}</td>
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
                {accessories
                  .filter(acc =>
                    !acc.name.toLowerCase().includes('hinge') &&
                    !acc.name.toLowerCase().includes('handle') &&
                    !acc.name.toLowerCase().includes('knob') &&
                    !acc.name.toLowerCase().includes('drawer slide') &&
                    !acc.name.toLowerCase().includes('slide')
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
            {/* Screen view - vertical stack */}
            <div className="space-y-6 sm:space-y-8 print:hidden">{cutPlan.sheets.map((sheet, i) => (
              <div key={i} className="relative">
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
            <h2 className="text-2xl sm:text-4xl font-black uppercase mb-4 sm:mb-8 tracking-tighter print:hidden">III. Wall Elevations</h2>
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
                        <WallVisualizer zone={zone} height={project.settings.tallHeight + 200} hideArrows={true} />
                      </div>
                    </div>
                  </div>

                  {/* SCREEN VIEW: Original layout */}
                  <div className="border-4 sm:border-8 border-black p-3 sm:p-4 bg-white flex flex-col print:hidden">
                    <h3 className="text-base sm:text-xl font-black uppercase mb-2 sm:mb-3 border-b-2 border-black pb-1 tracking-widest">{zone.id}</h3>
                    <div className="h-[260px] sm:h-[380px] mb-4 border-2 border-slate-100 bg-slate-50 print:bg-white print:border-black shrink-0 overflow-hidden">
                      <WallVisualizer zone={zone} height={project.settings.tallHeight + 100} hideArrows={true} />
                    </div>
                    {/* Legend Table */}
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unit Schedule</h4>
                      <table className="w-full text-[9px] text-left uppercase font-bold border-collapse">
                        <thead>
                          <tr className="border-b-2 border-black text-slate-500">
                            <th className="pb-1">POS</th>
                            <th className="pb-1">Description</th>
                            <th className="pb-1 text-right">Width</th>
                            <th className="pb-1 text-right">Type</th>
                            <th className="pb-1 text-right">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/10">
                          {zone.cabinets.sort((a, b) => (a.label || '').localeCompare(b.label || '')).map((cab, idx) => (
                            <tr key={idx}>
                              <td className="py-2 text-amber-600 font-black italic text-xs">{cab.label}</td>
                              <td className="py-2 font-black tracking-tight">{cab.preset}</td>
                              <td className="py-2 text-right font-mono">{cab.width}mm</td>
                              <td className="py-2 text-right text-[7px] opacity-60">{cab.type}</td>
                              <td className="py-2 text-right">1</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* INVOICE PREVIEW */}
        {activeView === 'invoice' && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-black animate-in fade-in slide-in-from-bottom-4 duration-500 print:shadow-none print:border-0 print:m-0 print:bg-white print:text-black">
            {/* Invoice Header (Matching PDF Layout) */}
            <div className="bg-slate-800 dark:bg-black text-white p-8 sm:p-12 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-6 print:bg-slate-800 print:text-white">
              <div>
                <h1 className="text-4xl sm:text-5xl font-light tracking-[0.2em] uppercase mb-2">Invoice</h1>
                <p className="text-slate-400 text-xs tracking-widest uppercase">Quotation / Bill of Quantities</p>
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
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Invoice#</span>
                    <span className="font-bold text-slate-800">{invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-xs">
                    <span className="text-slate-400 uppercase font-bold tracking-widest">Invoice Date</span>
                    <span className="text-slate-800">{invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
                          {invoiceSpecifications.map((spec, idx) => (
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
                <Button variant="primary" size="lg" onClick={handlePrintInvoice} className="gap-3 px-12 py-6 rounded-full shadow-2xl shadow-amber-500/20 hover:scale-105 transition-transform">
                  <Download size={24} /> Download Invoice PDF
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
