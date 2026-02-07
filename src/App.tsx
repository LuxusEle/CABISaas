
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Home, Layers, Calculator, Zap, ArrowLeft, ArrowRight, Trash2, Plus, Box, DoorOpen, Wand2, Moon, Sun, Table2, FileSpreadsheet, X, Pencil, Save, List, Settings, Printer, Download, Scissors, LayoutDashboard, DollarSign, Map, LogOut, Menu } from 'lucide-react';
import { Screen, Project, ZoneId, PresetType, CabinetType, CabinetUnit, Obstacle } from './types';
import { createNewProject, generateProjectBOM, autoFillZone, exportToExcel, resolveCollisions, calculateProjectCost, exportProjectToConstructionJSON, buildProjectConstructionData } from './services/bomService';
import { optimizeCuts } from './services/nestingService';
import { authService } from './services/authService';
import type { User } from '@supabase/supabase-js';

// Components
import { Button } from './components/Button';
import { NumberInput } from './components/NumberInput';
import { WallVisualizer } from './components/WallVisualizer';
import { CutPlanVisualizer } from './components/CutPlanVisualizer';
import { IsometricVisualizer } from './components/IsometricVisualizer';
import { KitchenPlanCanvas } from './components/KitchenPlanCanvas.tsx';
import { AuthModal } from './components/AuthModal';
import { CustomCabinetEditor } from './components/CustomCabinetEditor';
import { CustomCabinetLibrary } from './components/CustomCabinetLibrary';
import { LandingPage } from './components/LandingPage';
import { customCabinetService } from './services/customCabinetService';
import { projectService } from './services/projectService';
import { SequentialBoxInput } from './components/SequentialBoxInput';

// --- PRINT TITLE BLOCK ---
const TitleBlock = ({ project, pageTitle }: { project: Project, pageTitle: string }) => (
  <div className="hidden print:flex fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white h-32 text-xs font-sans items-stretch z-50">
    <div className="w-1/4 border-r-2 border-black p-4 flex flex-col justify-between">
      <div className="font-black text-3xl tracking-tighter leading-none italic uppercase">LUXUS<span className="text-slate-400">DESIGN</span></div>
      <div className="text-[8px] leading-tight text-slate-500 uppercase tracking-widest font-bold">Construction Document / Automated BOM</div>
    </div>
    <div className="flex-1 grid grid-cols-4 border-r-2 border-black">
      <div className="border-r border-black p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Client / Project</label>
        <div className="font-bold text-lg uppercase truncate">{project.company}</div>
      </div>
      <div className="border-r border-black p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Drawing Name</label>
        <div className="font-bold text-lg uppercase truncate">{pageTitle}</div>
      </div>
      <div className="border-r border-black p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Date</label>
        <div className="font-bold text-lg">{new Date().toLocaleDateString()}</div>
      </div>
      <div className="p-2 flex flex-col justify-between">
        <label className="text-[6px] uppercase font-bold text-slate-400">Scale</label>
        <div className="font-bold text-lg">AS NOTED</div>
      </div>
    </div>
    <div className="w-24 bg-black text-white p-4 flex items-center justify-center">
      <div className="text-5xl font-black">6</div>
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
  const [authLoading, setAuthLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('app-theme') !== 'false'; } catch { return true; }
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await authService.getCurrentUser();
      setUser(user);
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
      const newProj = createNewProject();
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
          />
        );
      case Screen.PROJECT_SETUP: return <ScreenProjectSetup project={project} setProject={setProject} />;
      case Screen.WALL_EDITOR: return <ScreenWallEditor project={project} setProject={setProject} setScreen={setScreen} onSave={() => handleSaveProject(project)} />;
      case Screen.BOM_REPORT: return <ScreenBOMReport project={project} setProject={setProject} />;
      case Screen.TOOLS: return <ScreenPlanView project={project} />;
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

      <div className="flex-1 flex overflow-hidden">
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
        <div className="md:hidden h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around z-50 shrink-0 print:hidden safe-area-bottom">
          <MobileNavButton active={screen === Screen.DASHBOARD} onClick={() => setScreen(Screen.DASHBOARD)} icon={<Home size={20} />} label="Home" />
          <MobileNavButton active={screen === Screen.PROJECT_SETUP} onClick={() => setScreen(Screen.PROJECT_SETUP)} icon={<Settings size={20} />} label="Setup" />
          <MobileNavButton active={screen === Screen.WALL_EDITOR} onClick={() => setScreen(Screen.WALL_EDITOR)} icon={<Box size={20} />} label="Editor" />
          <MobileNavButton active={screen === Screen.BOM_REPORT} onClick={() => setScreen(Screen.BOM_REPORT)} icon={<Table2 size={20} />} label="BOM" />
          <MobileNavButton active={screen === Screen.TOOLS} onClick={() => setScreen(Screen.TOOLS)} icon={<Map size={20} />} label="Plan" />
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
        />
      )}

      {/* Loading State */}
      {authLoading && (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="font-black text-3xl mb-4">CAB<span className="text-amber-500">ENGINE</span></div>
            <div className="text-slate-400">Loading...</div>
          </div>
        </div>
      )}
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

const ScreenHome = ({ onNewProject, onLoadProject }: { onNewProject: () => void, onLoadProject: (p: Project) => void }) => {
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
      <div className="text-center space-y-2 mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">CAB<span className="text-amber-600 dark:text-amber-500">ENGINE</span></h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm sm:text-base">Professional Cabinet Engineering Suite</p>
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

const ScreenPlanView = ({ project }: { project: Project }) => (
  <div className="flex flex-col h-full w-full overflow-hidden">
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Plan View</h2>
        <KitchenPlanCanvas data={buildProjectConstructionData(project)} scalePxPerMeter={120} />
      </div>
    </div>
  </div>
);

const ScreenProjectSetup = ({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>> }) => (
  <div className="flex flex-col h-full w-full overflow-hidden">
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 sm:mb-4">Project Setup</h2>

        <section className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2">Project Info</h3>
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
              <label className="text-xs font-bold text-slate-400">Logo URL (Optional)</label>
              <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white text-sm sm:text-base min-h-[48px]" value={project.settings.logoUrl || ''} onChange={e => setProject({ ...project, settings: { ...project.settings, logoUrl: e.target.value } })} placeholder="https://..." />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 sm:space-y-6">
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2 sm:mb-4">Dimensions & Nesting</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <NumberInput label="Base Height" value={project.settings.baseHeight} onChange={(v) => setProject({ ...project, settings: { ...project.settings, baseHeight: v } })} step={10} />
            <NumberInput label="Sheet Length" value={project.settings.sheetLength} onChange={(v) => setProject({ ...project, settings: { ...project.settings, sheetLength: v } })} step={100} />
            <NumberInput label="Sheet Width" value={project.settings.sheetWidth} onChange={(v) => setProject({ ...project, settings: { ...project.settings, sheetWidth: v } })} step={100} />
          </div>
        </section>
      </div>
    </div>
  </div>
);

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
  const [modalMode, setModalMode] = useState<'none' | 'add_obstacle' | 'add_cabinet' | 'edit_obstacle' | 'edit_cabinet'>('none');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [tempCabinet, setTempCabinet] = useState<CabinetUnit>({ id: '', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 });
  const [tempObstacle, setTempObstacle] = useState<Obstacle>({ id: '', type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 });
  const [presetFilter, setPresetFilter] = useState<'Base' | 'Wall' | 'Tall'>('Base');
  const [visualMode, setVisualMode] = useState<'elevation' | 'iso'>('elevation');

  const updateZone = (newZone: typeof currentZone, skipHistory = false) => {
    if (!skipHistory) {
      saveToHistory();
    }
    const newZones = [...project.zones];
    newZones[currentZoneIndex] = newZone;
    setProject({ ...project, zones: newZones });
  };

  const handleDragEnd = () => updateZone(resolveCollisions(currentZone)); // Shove on drop

  // AUTO FILL & CLEAR
  const handleAutoFill = () => {
    const msg = "APPLY INTELLIGENT HAFALE LAYOUT?\n\n- Sinks will be centered under windows\n- Sequential numbering (B01, W01) will be reset\n- Storage -> Wash -> Prep -> Cook flow will be applied\n\nContinue?";
    if (window.confirm(msg)) {
      updateZone(autoFillZone(currentZone, project.settings, currentZone.id));
    }
  };

  // Smart gap fill - uses standard cabinet sizes, no tiny boxes
  // This function fills gaps ONLY for cabinet types that already exist in the zone
  const fillGaps = () => {
    // Keep all existing cabinets to avoid destroying the user's plan
    const existingCabinets = [...currentZone.cabinets];

    // Determine which cabinet types already exist in this zone
    const existingTypes = new Set(existingCabinets.map(c => c.type));

    // If no cabinets exist yet, default to filling BASE cabinets only
    if (existingTypes.size === 0) {
      existingTypes.add(CabinetType.BASE);
    }

    // Standard cabinet widths we can use (prioritize larger)
    const standardWidths = [900, 600, 450, 400, 300, 150];
    const MIN_BOX_SIZE = 100; // Minimum 100mm

    const newBoxes: CabinetUnit[] = [];

    // Get preset type based on cabinet type and width
    const getPresetForType = (cabinetType: CabinetType, width: number): PresetType => {
      if (cabinetType === CabinetType.WALL) {
        return width < 350 ? PresetType.OPEN_BOX : PresetType.WALL_STD;
      } else if (cabinetType === CabinetType.TALL) {
        return width < 350 ? PresetType.OPEN_BOX : PresetType.TALL_UTILITY;
      } else {
        return width < 350 ? PresetType.OPEN_BOX : PresetType.BASE_DOOR;
      }
    };

    // Get obstacles that block this specific cabinet type
    const getBlockingObstacles = (cabinetType: CabinetType) => {
      return currentZone.obstacles.filter(obs => {
        // Doors and columns ALWAYS block all cabinet types (full height blockers)
        if (obs.type === 'door' || obs.type === 'column') return true;

        // Windows: check sill height to determine which cabinet types are blocked
        if (obs.type === 'window') {
          const sillHeight = obs.sillHeight ?? 900; // default sill at 900mm
          // TALL cabinets are blocked by any window (they span full height)
          if (cabinetType === CabinetType.TALL) return true;
          // WALL cabinets blocked if window is in the wall cabinet zone (typically 1400mm to 2100mm)
          if (cabinetType === CabinetType.WALL) return sillHeight < 2100;
          // BASE cabinets only blocked if sill is very low (below counter height ~850mm)
          if (cabinetType === CabinetType.BASE) return sillHeight < 300;
        }

        // Pipes block all cabinet types (be safe)
        if (obs.type === 'pipe') return true;

        return false;
      });
    };

    // Helper function to fill gaps for a specific cabinet type
    const fillGapsForType = (cabinetType: CabinetType) => {
      // Skip if this cabinet type doesn't exist in the zone
      if (!existingTypes.has(cabinetType)) return;

      // For this cabinet type, only consider same-type cabinets + BLOCKING obstacles
      const sameTypeCabinets = existingCabinets.filter(c => c.type === cabinetType);
      const blockingObstacles = getBlockingObstacles(cabinetType);

      // Get occupied spaces for this cabinet type
      const occupiedSpaces = [
        ...sameTypeCabinets.map(c => ({ fromLeft: c.fromLeft, width: c.width })),
        ...blockingObstacles.map(o => ({ fromLeft: o.fromLeft, width: o.width }))
      ].sort((a, b) => a.fromLeft - b.fromLeft);

      // Find gaps and fill them for this type
      let lastEnd = 0;
      for (const space of occupiedSpaces) {
        const gapStart = lastEnd;
        const gapEnd = space.fromLeft;
        const gapWidth = gapEnd - gapStart;

        if (gapWidth >= MIN_BOX_SIZE) {
          let remainingWidth = gapWidth;
          let currentPos = gapStart;

          while (remainingWidth >= MIN_BOX_SIZE) {
            let bestSize = standardWidths.find(sw => sw <= remainingWidth) || (remainingWidth >= MIN_BOX_SIZE ? remainingWidth : 0);
            if (bestSize === 0) break;

            newBoxes.push({
              id: Math.random().toString(),
              preset: getPresetForType(cabinetType, bestSize),
              type: cabinetType,
              width: bestSize,
              qty: 1,
              fromLeft: currentPos,
              isAutoFilled: true
            });
            currentPos += bestSize;
            remainingWidth -= bestSize;
          }
        }
        lastEnd = Math.max(lastEnd, space.fromLeft + space.width);
      }

      // Fill end gap for this type (from last occupied to wall end)
      const endGap = currentZone.totalLength - lastEnd;
      if (endGap >= MIN_BOX_SIZE) {
        let remainingWidth = endGap;
        let currentPos = lastEnd;
        while (remainingWidth >= MIN_BOX_SIZE) {
          let bestSize = standardWidths.find(sw => sw <= remainingWidth) || (remainingWidth >= MIN_BOX_SIZE ? remainingWidth : 0);
          if (bestSize === 0) break;
          newBoxes.push({
            id: Math.random().toString(),
            preset: getPresetForType(cabinetType, bestSize),
            type: cabinetType,
            width: bestSize,
            qty: 1,
            fromLeft: currentPos,
            isAutoFilled: true
          });
          currentPos += bestSize;
          remainingWidth -= bestSize;
        }
      }
    };

    // Fill gaps ONLY for cabinet types that already exist in the zone
    fillGapsForType(CabinetType.BASE);
    fillGapsForType(CabinetType.WALL);
    fillGapsForType(CabinetType.TALL);

    // Combine and sort ALL cabinets
    const allCabs = [...existingCabinets, ...newBoxes].sort((a, b) => a.fromLeft - b.fromLeft);

    // Reset sequential numbering for ALL cabinets in this zone to ensure they are unique (B01, B02, etc.)
    let bIdx = 1, wIdx = 1, tIdx = 1;
    const numbered = allCabs.map(c => {
      let label = '';
      if (c.type === CabinetType.BASE) label = `B${String(bIdx++).padStart(2, '0')}`;
      else if (c.type === CabinetType.WALL) label = `W${String(wIdx++).padStart(2, '0')}`;
      else label = `T${String(tIdx++).padStart(2, '0')}`;
      return { ...c, label };
    });

    updateZone({ ...currentZone, cabinets: numbered });
  };

  const clearZone = () => { if (window.confirm(`Clear ${currentZone.id}?`)) updateZone({ ...currentZone, obstacles: [], cabinets: [] }); };

  const addZone = () => {
    const name = prompt("Enter Zone Name (e.g., Island, Pantry):");
    if (name) {
      if (project.zones.some(z => z.id === name)) {
        alert("Zone name must be unique");
        return;
      }
      const newZone = { id: name, active: true, totalLength: 3000, obstacles: [], cabinets: [] };
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
  const handleCabinetMove = (idx: number, x: number) => { const cabs = [...currentZone.cabinets]; cabs[idx].fromLeft = x; updateZone({ ...currentZone, cabinets: cabs }); };
  const handleObstacleMove = (idx: number, x: number) => { const obs = [...currentZone.obstacles]; obs[idx].fromLeft = x; updateZone({ ...currentZone, obstacles: obs }); };

  // Handler for sequential box input - adds cabinets and re-labels
  const handleSequentialAdd = (newCabinets: CabinetUnit[]) => {
    const allCabs = [...currentZone.cabinets, ...newCabinets].sort((a, b) => a.fromLeft - b.fromLeft);
    // Re-number all cabinets
    let bIdx = 1, wIdx = 1, tIdx = 1;
    const numbered = allCabs.map(c => {
      let label = '';
      if (c.type === CabinetType.BASE) label = `B${String(bIdx++).padStart(2, '0')}`;
      else if (c.type === CabinetType.WALL) label = `W${String(wIdx++).padStart(2, '0')}`;
      else label = `T${String(tIdx++).padStart(2, '0')}`;
      return { ...c, label };
    });
    updateZone(resolveCollisions({ ...currentZone, cabinets: numbered }));
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
      const items = [...currentZone.cabinets];
      modalMode === 'add_cabinet' ? items.push({ ...tempCabinet, id: Math.random().toString() }) : items[editIndex] = tempCabinet;
      updateZone(resolveCollisions({ ...currentZone, cabinets: items }));
    } else {
      const items = [...currentZone.obstacles];
      modalMode === 'add_obstacle' ? items.push({ ...tempObstacle, id: Math.random().toString() }) : items[editIndex] = tempObstacle;
      updateZone({ ...currentZone, obstacles: items });
    }
    setModalMode('none');
  };
  const deleteItem = () => {
    if (modalMode.includes('cabinet')) { const items = [...currentZone.cabinets]; items.splice(editIndex, 1); updateZone({ ...currentZone, cabinets: items }); }
    else { const items = [...currentZone.obstacles]; items.splice(editIndex, 1); updateZone({ ...currentZone, obstacles: items }); }
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
            <NumberInput label="Wall Length" value={currentZone.totalLength} onChange={(e) => updateZone({ ...currentZone, totalLength: e })} step={100} />
          </div>
          
          {/* Clear Zone */}
          <Button size="lg" variant="danger" className="w-full min-h-[56px] font-bold" onClick={() => { clearZone(); setMobileSidebarOpen(false); }}>
            <Trash2 size={20} className="mr-2" /> Clear Zone
          </Button>
          
          {/* Calculate BOM */}
          <Button size="xl" variant="primary" className="w-full font-black min-h-[64px] text-xl mb-4" onClick={() => { setMobileSidebarOpen(false); setScreen(Screen.BOM_REPORT); }}>
            CALCULATE BOM
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop SIDEBAR */}
        <div className="hidden md:flex flex-col w-[280px] lg:w-[300px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full min-h-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <NumberInput label="Wall Length" value={currentZone.totalLength} onChange={(e) => updateZone({ ...currentZone, totalLength: e })} step={100} />
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
            <Button size="md" variant="secondary" className="w-full text-sm min-h-[48px]" onClick={fillGaps}><Box size={16} className="mr-2" /> Fill Gaps</Button>
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
                <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} onDragEnd={handleDragEnd} />
              ) : (
                <IsometricVisualizer project={project} />
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
          <div className="md:hidden flex flex-col h-full">
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
                <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} onDragEnd={handleDragEnd} />
              ) : (
                <IsometricVisualizer project={project} />
              )}
            </div>

            {/* Mobile Action Buttons - Below Canvas */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2">
              <div className="grid grid-cols-4 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setMobileSidebarOpen(true)} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
                  <Menu size={18} /><span>Menu</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={handleAutoFill} className="min-h-[52px] text-xs flex flex-col items-center justify-center gap-0.5">
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
            <div className={`shrink-0 bg-white dark:bg-slate-950 overflow-hidden flex flex-col transition-all duration-300 ${mobileTableCollapsed ? 'h-10' : 'flex-1 min-h-0'}`}>
              <button
                onClick={() => setMobileTableCollapsed(!mobileTableCollapsed)}
                className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase tracking-wider"
              >
                <span>{mobileTableCollapsed ? `Show Items (${currentZone.cabinets.length + currentZone.obstacles.length})` : 'Hide Items'}</span>
                <span className="transform transition-transform">{mobileTableCollapsed ? '▲' : '▼'}</span>
              </button>

              {!mobileTableCollapsed && (
                <div className="flex-1 min-h-0 overflow-auto">
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

                  {/* Customize Button */}
                  <button
                    onClick={() => setShowCustomEditor(true)}
                    className="w-full py-3 sm:py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <Wand2 size={18} />
                    <span className="text-sm sm:text-base">Customize This Cabinet</span>
                  </button>

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
  const [activeView, setActiveView] = useState<'list' | 'cutplan' | 'wallplan'>('list');
  const cutPlan = useMemo(() => optimizeCuts(data.groups.flatMap(g => g.items), project.settings), [data.groups, project.settings.sheetLength, project.settings.sheetWidth, project.settings.kerf]);
  const costs = useMemo(() => calculateProjectCost(data, cutPlan, project.settings), [data, cutPlan, project.settings.costs]);
  const currency = project.settings.currency || '$';

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

  const handlePrint = () => setTimeout(() => window.print(), 100);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full overflow-hidden">
      <TitleBlock project={project} pageTitle={activeView === 'list' ? 'Material BOM' : activeView === 'cutplan' ? 'Cut Patterns' : 'Elevations'} />

      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0 print:hidden">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start overflow-x-auto w-full">
          {['list', 'cutplan', 'wallplan'].map((v) => (
            <button 
              key={v} 
              onClick={() => setActiveView(v as any)} 
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-md capitalize whitespace-nowrap min-h-[40px] ${activeView === v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
            >
              {v === 'list' ? 'Material List' : v === 'cutplan' ? 'Cut Plan' : 'Wall Plans'}
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 bg-white dark:bg-slate-950 print:p-0 print:overflow-visible h-full">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 sm:pb-6 print:block flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{project.company || "Cabinet Project"}</h1>
            <p className="text-slate-500 text-sm sm:text-base">Project: {project.name}</p>
          </div>
          {project.settings.logoUrl && <img src={project.settings.logoUrl} alt="Logo" className="h-10 sm:h-12 object-contain max-w-[120px]" />}
        </div>

        {/* COSTING CARD (Print Safe) */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl print:bg-white print:text-black print:border-2 print:border-black print:break-inside-avoid shadow-xl print:shadow-none">
          <h3 className="text-amber-500 font-bold mb-3 sm:mb-4 flex items-center gap-2 print:text-black text-base sm:text-lg"><DollarSign size={18} /> Cost Estimate</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            <div><div className="text-slate-400 text-xs uppercase print:text-black">Material</div><div className="text-lg sm:text-xl font-bold">{currency}{costs.materialCost.toFixed(2)}</div></div>
            <div><div className="text-slate-400 text-xs uppercase print:text-black">Hardware</div><div className="text-lg sm:text-xl font-bold">{currency}{costs.hardwareCost.toFixed(2)}</div></div>
            <div><div className="text-slate-400 text-xs uppercase print:text-black">Labor</div><div className="text-lg sm:text-xl font-bold">{currency}{costs.laborCost.toFixed(2)}</div></div>
            <div><div className="text-amber-500 text-xs uppercase print:text-black">Total</div><div className="text-2xl sm:text-3xl font-black">{currency}{costs.totalPrice.toFixed(2)}</div></div>
          </div>
          {/* Edit Cost Settings (Simple) */}
          <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-3 sm:gap-4 print:hidden">
            <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Sheet:</span><input type="number" className="bg-slate-800 w-16 sm:w-20 rounded px-2 py-1 text-sm text-white" value={project.settings.costs.pricePerSheet} onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, pricePerSheet: Number(e.target.value) } } })} /></div>
            <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Labor:</span><input type="number" className="bg-slate-800 w-16 sm:w-20 rounded px-2 py-1 text-sm text-white" value={project.settings.costs.laborRatePerHour} onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborRatePerHour: Number(e.target.value) } } })} /></div>
          </div>
        </div>

        {/* MATERIAL SUMMARY TABLE (Always Visible in List/Cut Plan) */}
        <div className="break-inside-avoid overflow-x-auto">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2"><Layers size={18} /> Material Sheets</h3>
          <table className="w-full min-w-[400px] text-xs sm:text-sm text-left border-collapse border border-slate-200 dark:border-slate-700 print:border-black">
            <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200">
              <tr>
                <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">Material</th>
                <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">Size</th>
                <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">Qty</th>
                <th className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">Waste</th>
              </tr>
            </thead>
            <tbody>
              {materialSummary.map((m) => (
                <tr key={m.material}>
                  <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">{m.material}</td>
                  <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">{m.dims}</td>
                  <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-base sm:text-lg">{m.sheets}</td>
                  <td className="p-2 sm:p-3 border border-slate-200 dark:border-slate-700 print:border-black">{m.waste}%</td>
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
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 print:mt-4 flex items-center gap-2"><Scissors size={18} /> Cut Optimization</h3>
          <div className="space-y-6 sm:space-y-8">{cutPlan.sheets.map((sheet, i) => <CutPlanVisualizer key={i} sheet={sheet} index={i} settings={project.settings} />)}</div>
        </div>

        {/* WALL PLAN VIEW */}
        <div className={activeView === 'wallplan' ? 'block' : 'hidden print:block print:break-before-page'}>
          <h2 className="text-2xl sm:text-4xl font-black uppercase mb-4 sm:mb-8 tracking-tighter">III. Wall Elevations</h2>
          <div className="space-y-8 sm:space-y-12">
            {project.zones.filter(z => z.active).map((zone) => (
              <div key={zone.id} className="break-inside-avoid border-4 sm:border-8 border-black p-4 sm:p-8 bg-white">
                <h3 className="text-lg sm:text-2xl font-black uppercase mb-3 sm:mb-4 border-b-2 sm:border-b-4 border-black pb-2 tracking-widest">{zone.id}</h3>
                <div className="h-[300px] sm:h-[400px] mb-4 sm:mb-8 border-2 border-slate-100 bg-slate-50 print:bg-white print:border-black">
                  <WallVisualizer zone={zone} height={project.settings.tallHeight + 200} />
                </div>
                {/* Legend Table */}
                <table className="w-full text-[10px] text-left uppercase font-bold">
                  <thead><tr className="border-b-2 border-black"><th className="pb-1 text-slate-400">POS</th><th className="pb-1">Description</th><th className="pb-1 text-right">Width</th><th className="pb-1 text-right">Qty</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {zone.cabinets.map((cab, idx) => (
                      <tr key={idx}><td className="py-2 text-slate-400 font-black italic">{cab.label}</td><td className="py-2 font-black tracking-tight">{cab.preset}</td><td className="py-2 text-right font-black">{cab.width}mm</td><td className="py-2 text-right">1</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
