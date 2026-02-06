
import React, { useState, useMemo, useEffect } from 'react';
import { Home, Layers, Calculator, Zap, ArrowLeft, Trash2, Plus, Box, DoorOpen, Wand2, Moon, Sun, Table2, FileSpreadsheet, X, Pencil, Save, List, Settings, Printer, Download, Scissors, LayoutDashboard } from 'lucide-react';
import { Screen, Project, ZoneId, PresetType, CabinetType, CabinetUnit, Obstacle } from './types';
import { createNewProject, generateProjectBOM, autoFillZone, exportToCSV } from './services/bomService';
import { optimizeCuts } from './services/nestingService';

// Components
import { Button } from './components/Button';
import { NumberInput } from './components/NumberInput';
import { WallVisualizer } from './components/WallVisualizer';
import { CutPlanVisualizer } from './components/CutPlanVisualizer';

// --- MAIN APP COMPONENT ---

export default function App() {
  // --- GLOBAL STATE ---
  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [project, setProject] = useState<Project>(createNewProject());
  
  // Theme State (Persistent)
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('app-theme');
      return saved !== 'false'; // Default to true (Dark)
    } catch { return true; }
  });

  useEffect(() => {
    localStorage.setItem('app-theme', String(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // --- ACTIONS ---
  const handleStartProject = () => {
    setProject(createNewProject());
    setScreen(Screen.PROJECT_SETUP);
  };

  // --- RENDERERS ---
  const renderContent = () => {
    switch (screen) {
      case Screen.HOME:
        return <ScreenHome onNewProject={handleStartProject} />;
      case Screen.PROJECT_SETUP:
        return <ScreenProjectSetup project={project} setProject={setProject} />;
      case Screen.WALL_EDITOR:
        return <ScreenWallEditor project={project} setProject={setProject} />;
      case Screen.BOM_REPORT:
        return <ScreenBOMReport project={project} />;
      default:
        return <ScreenHome onNewProject={handleStartProject} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col font-sans transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* GLOBAL HEADER (Mobile Only - simplified) */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40 print:hidden">
         <div className="font-black text-lg">CAB<span className="text-amber-500">ENGINE</span></div>
         <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
         </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* DESKTOP SIDEBAR NAV */}
        <aside className="hidden md:flex w-20 flex-col items-center py-6 bg-slate-900 border-r border-slate-800 shrink-0 z-50 print:hidden">
          <div className="mb-8 text-amber-500"><LayoutDashboard size={28} /></div>
          
          <nav className="flex flex-col gap-6 w-full px-2">
             <NavButton active={screen === Screen.HOME} onClick={() => setScreen(Screen.HOME)} icon={<Home size={24} />} label="Home" />
             <NavButton active={screen === Screen.PROJECT_SETUP} onClick={() => setScreen(Screen.PROJECT_SETUP)} icon={<Settings size={24} />} label="Setup" />
             <NavButton active={screen === Screen.WALL_EDITOR} onClick={() => setScreen(Screen.WALL_EDITOR)} icon={<Box size={24} />} label="Walls" />
             <NavButton active={screen === Screen.BOM_REPORT} onClick={() => setScreen(Screen.BOM_REPORT)} icon={<Table2 size={24} />} label="BOM" />
          </nav>

          <div className="mt-auto">
             <button onClick={toggleTheme} className="p-3 rounded-xl bg-slate-800 text-amber-500 hover:bg-slate-700 transition-colors">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
           {renderContent()}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      {screen !== Screen.HOME && (
        <div className="md:hidden h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around z-50 shrink-0 print:hidden safe-area-bottom">
           <MobileNavButton active={screen === Screen.PROJECT_SETUP} onClick={() => setScreen(Screen.PROJECT_SETUP)} icon={<Settings size={20} />} label="Setup" />
           <MobileNavButton active={screen === Screen.WALL_EDITOR} onClick={() => setScreen(Screen.WALL_EDITOR)} icon={<Box size={20} />} label="Editor" />
           <MobileNavButton active={screen === Screen.BOM_REPORT} onClick={() => setScreen(Screen.BOM_REPORT)} icon={<Table2 size={20} />} label="BOM" />
        </div>
      )}

      {/* GLOBAL STYLES FOR PRINTING */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body, #root, #main-content, .overflow-y-auto, .overflow-hidden {
            position: relative;
            height: auto !important;
            overflow: visible !important;
            background-color: white !important;
            color: black !important;
            display: block !important;
          }
          .print\\:hidden, aside, .md\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-slate-300 { border-color: #cbd5e1 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// --- NAV HELPERS ---
const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-full ${active ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
    title={label}
  >
    {icon}
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-1 ${active ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400'}`}
  >
    {icon}
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);


// --- SCREENS ---

const ScreenHome = ({ onNewProject }: { onNewProject: () => void }) => (
  <div className="flex flex-col h-full p-6 space-y-8 bg-slate-50 dark:bg-slate-950 items-center justify-center max-w-4xl mx-auto w-full overflow-y-auto">
    <div className="text-center space-y-2 mb-8">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
        CAB<span className="text-amber-600 dark:text-amber-500">ENGINE</span>
      </h1>
      <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">Professional BOM Calculator</p>
    </div>
    <div className="w-full max-w-md space-y-4">
      <Button variant="primary" size="xl" onClick={onNewProject} leftIcon={<Layers size={28} />} className="w-full py-8 text-xl shadow-xl shadow-amber-500/20">
        Start New Project
      </Button>
      <div className="grid grid-cols-2 gap-4">
        <Button variant="secondary" size="lg" className="h-28 flex-col gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
          <Calculator size={28} className="text-amber-600 dark:text-amber-500" />
          <span>Quick Parts</span>
        </Button>
        <Button variant="secondary" size="lg" className="h-28 flex-col gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
          <Zap size={28} className="text-amber-600 dark:text-amber-500" />
          <span>Area Calc</span>
        </Button>
      </div>
    </div>
  </div>
);

const ScreenProjectSetup = ({ project, setProject }: { project: Project, setProject: (p: Project) => void }) => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Project Setup</h2>
          
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
             <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2">Project Info</h3>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400">Project Name</label>
                   <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" value={project.name} onChange={e => setProject({...project, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-400">Company Name</label>
                   <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" value={project.company} onChange={e => setProject({...project, company: e.target.value})} />
                </div>
             </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-4">Cabinet Dimensions (mm)</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <NumberInput label="Base Height" value={project.settings.baseHeight} onChange={(v) => setProject({...project, settings: {...project.settings, baseHeight: v}})} step={10} />
              <NumberInput label="Wall Cab Height" value={project.settings.wallHeight} onChange={(v) => setProject({...project, settings: {...project.settings, wallHeight: v}})} step={50} />
              <NumberInput label="Tall Cab Height" value={project.settings.tallHeight} onChange={(v) => setProject({...project, settings: {...project.settings, tallHeight: v}})} step={50} />
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 border-l-4 border-amber-500">
             <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2"><Scissors size={14}/> Sheet & Cut Settings</h3>
             <div className="grid md:grid-cols-3 gap-6">
                <NumberInput label="Sheet Length" value={project.settings.sheetLength} onChange={(v) => setProject({...project, settings: {...project.settings, sheetLength: v}})} step={100} suffix="mm" />
                <NumberInput label="Sheet Width" value={project.settings.sheetWidth} onChange={(v) => setProject({...project, settings: {...project.settings, sheetWidth: v}})} step={100} suffix="mm" />
                <NumberInput label="Saw Kerf" value={project.settings.kerf} onChange={(v) => setProject({...project, settings: {...project.settings, kerf: v}})} step={1} suffix="mm" min={0} max={20} />
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const ScreenWallEditor = ({ project, setProject }: { project: Project, setProject: (p: Project) => void }) => {
  const [activeTab, setActiveTab] = useState<string>(project.zones[0]?.id || 'Wall A');
  const currentZoneIndex = project.zones.findIndex(z => z.id === activeTab);
  const currentZone = project.zones[currentZoneIndex];

  // Editor State
  const [modalMode, setModalMode] = useState<'none' | 'add_obstacle' | 'add_cabinet' | 'edit_obstacle' | 'edit_cabinet'>('none');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [tempCabinet, setTempCabinet] = useState<CabinetUnit>({ id: '', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 });
  const [tempObstacle, setTempObstacle] = useState<Obstacle>({ id: '', type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 });

  // Update logic
  const updateZone = (newZone: typeof currentZone) => {
    const newZones = [...project.zones];
    newZones[currentZoneIndex] = newZone;
    setProject({ ...project, zones: newZones });
  };

  // Actions
  const handleAutoFill = () => updateZone(autoFillZone(currentZone));
  const clearZone = () => { if (window.confirm(`Clear ${currentZone.id}?`)) updateZone({ ...currentZone, obstacles: [], cabinets: [] }); };
  
  const addZone = () => {
    const name = prompt("Enter Zone Name (e.g., Island, Pantry):");
    if (name) {
       const newZone = { id: name, active: true, totalLength: 3000, obstacles: [], cabinets: [] };
       setProject({ ...project, zones: [...project.zones, newZone] });
       setActiveTab(name);
    }
  };

  const deleteZone = (id: string) => {
    if (project.zones.length <= 1) { alert("Cannot delete the last zone."); return; }
    if (window.confirm(`Delete ${id}?`)) {
       const newZones = project.zones.filter(z => z.id !== id);
       setProject({ ...project, zones: newZones });
       setActiveTab(newZones[0].id);
    }
  };

  // Moves
  const handleCabinetMove = (idx: number, x: number) => {
     const cabs = [...currentZone.cabinets]; cabs[idx].fromLeft = x; updateZone({...currentZone, cabinets: cabs});
  };
  const handleObstacleMove = (idx: number, x: number) => {
     const obs = [...currentZone.obstacles]; obs[idx].fromLeft = x; updateZone({...currentZone, obstacles: obs});
  };

  // Modals
  const openAdd = (type: 'cabinet'|'obstacle') => {
     if(type==='cabinet') { setTempCabinet({ id: Math.random().toString(), preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 }); setModalMode('add_cabinet'); }
     else { setTempObstacle({ id: Math.random().toString(), type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 }); setModalMode('add_obstacle'); }
  };
  const openEdit = (type: 'cabinet'|'obstacle', idx: number) => {
     setEditIndex(idx);
     if(type==='cabinet') { setTempCabinet({...currentZone.cabinets[idx]}); setModalMode('edit_cabinet'); }
     else { setTempObstacle({...currentZone.obstacles[idx]}); setModalMode('edit_obstacle'); }
  };
  
  const saveItem = () => {
    if (modalMode.includes('cabinet')) {
       const items = [...currentZone.cabinets];
       modalMode === 'add_cabinet' ? items.push({...tempCabinet, id: Math.random().toString()}) : items[editIndex] = tempCabinet;
       updateZone({...currentZone, cabinets: items});
    } else {
       const items = [...currentZone.obstacles];
       modalMode === 'add_obstacle' ? items.push({...tempObstacle, id: Math.random().toString()}) : items[editIndex] = tempObstacle;
       updateZone({...currentZone, obstacles: items});
    }
    setModalMode('none');
  };

  const deleteItem = () => {
     if (modalMode.includes('cabinet')) {
        const items = [...currentZone.cabinets]; items.splice(editIndex, 1); updateZone({...currentZone, cabinets: items});
     } else {
        const items = [...currentZone.obstacles]; items.splice(editIndex, 1); updateZone({...currentZone, obstacles: items});
     }
     setModalMode('none');
  };

  if (!currentZone) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR (Desktop) */}
        <div className="hidden md:flex flex-col w-[300px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-y-auto">
           <div className="p-4 border-b border-slate-200 dark:border-slate-800">
             <NumberInput label="Wall Length" value={currentZone.totalLength} onChange={(e) => updateZone({...currentZone, totalLength: e})} step={100} />
           </div>
           <div className="p-4 space-y-2 flex-1">
             <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">ZONES</span><button onClick={addZone} className="text-xs font-bold text-amber-500 hover:underline">+ ADD</button></div>
             {project.zones.map(z => (
               <div key={z.id} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${activeTab===z.id ? 'bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-500 font-bold border border-amber-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} onClick={() => setActiveTab(z.id)}>
                 <span>{z.id}</span>
                 {project.zones.length > 1 && <Trash2 size={14} className="hover:text-red-500" onClick={(e) => {e.stopPropagation(); deleteZone(z.id);}} />}
               </div>
             ))}
           </div>
           <div className="p-4 space-y-2 border-t border-slate-200 dark:border-slate-800">
              <Button size="md" variant="secondary" className="w-full text-xs" onClick={handleAutoFill}><Wand2 size={14} className="mr-2"/> Auto Fill</Button>
              <Button size="md" variant="secondary" className="w-full text-xs" onClick={clearZone}><Trash2 size={14} className="mr-2"/> Clear Zone</Button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                 <Button size="lg" onClick={() => openAdd('obstacle')} variant="outline" className="text-xs flex-col h-16"><DoorOpen size={18}/>+ Obstacle</Button>
                 <Button size="lg" onClick={() => openAdd('cabinet')} variant="primary" className="text-xs flex-col h-16"><Box size={18}/>+ Cabinet</Button>
              </div>
           </div>
        </div>

        {/* MAIN VISUALIZER */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
           {/* Mobile Tabs */}
           <div className="md:hidden flex px-2 pt-2 gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900 shrink-0">
             {project.zones.map(z => (
               <button key={z.id} onClick={() => setActiveTab(z.id)} className={`px-4 py-2 text-sm font-bold rounded-t-lg whitespace-nowrap ${activeTab===z.id ? 'bg-white dark:bg-slate-950 text-amber-500' : 'text-slate-500 bg-slate-200 dark:bg-slate-800'}`}>{z.id}</button>
             ))}
             <button onClick={addZone} className="px-4 py-2 text-sm font-bold rounded-t-lg bg-slate-200 dark:bg-slate-800 text-slate-500">+</button>
           </div>
           
           <div className="h-[250px] md:h-[400px] bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 relative z-0">
              <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} />
           </div>

           <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto pb-20 md:pb-0">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold text-xs uppercase sticky top-0">
                  <tr><th className="p-3">#</th><th className="p-3">Type</th><th className="p-3">Item</th><th className="p-3 text-right">Width</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...currentZone.obstacles, ...currentZone.cabinets].map((item, i) => {
                     const isCab = 'preset' in item;
                     return (
                       <tr key={item.id} onClick={() => openEdit(isCab?'cabinet':'obstacle', isCab ? i - currentZone.obstacles.length : i)} className="hover:bg-amber-50 dark:hover:bg-slate-900 cursor-pointer">
                          <td className="p-3 text-slate-400 font-mono">{i+1}</td>
                          <td className="p-3 text-amber-600 font-bold">{isCab ? (item as CabinetUnit).type : 'Obstacle'}</td>
                          <td className="p-3 font-medium dark:text-white">{isCab ? (item as CabinetUnit).preset : (item as Obstacle).type} <span className="text-slate-400 text-xs ml-2">@{item.fromLeft}mm</span></td>
                          <td className="p-3 text-right font-mono font-bold dark:text-white">{item.width}</td>
                       </tr>
                     )
                  })}
                </tbody>
             </table>
           </div>

           {/* Mobile Floating Action Button */}
           <div className="md:hidden absolute bottom-4 right-4 flex flex-col gap-3">
              <button onClick={() => openAdd('obstacle')} className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg"><DoorOpen size={20}/></button>
              <button onClick={() => openAdd('cabinet')} className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg"><Plus size={28}/></button>
           </div>
        </div>
      </div>

      {/* Editor Modal */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-xl dark:text-white capitalize">{modalMode.replace('_', ' ')}</h3><button onClick={() => setModalMode('none')}><X/></button></div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                 {modalMode.includes('cabinet') ? (
                   <>
                     <div><label className="text-xs font-bold text-slate-400">Preset</label><select className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-lg dark:text-white mt-1" value={tempCabinet.preset} onChange={e => {
                        const p = e.target.value as PresetType;
                        let type = CabinetType.BASE;
                        if(p.includes('Wall')) type = CabinetType.WALL;
                        if(p.includes('Tall')) type = CabinetType.TALL;
                        setTempCabinet({...tempCabinet, preset: p, type})
                     }}>{Object.values(PresetType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                     <NumberInput label="Width" value={tempCabinet.width} onChange={v => setTempCabinet({...tempCabinet, width: v})} step={50} />
                     <NumberInput label="Position (Left)" value={tempCabinet.fromLeft} onChange={v => setTempCabinet({...tempCabinet, fromLeft: v})} step={50} />
                   </>
                 ) : (
                   <>
                     <div><label className="text-xs font-bold text-slate-400">Type</label><select className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-lg dark:text-white mt-1" value={tempObstacle.type} onChange={e => setTempObstacle({...tempObstacle, type: e.target.value as any})}>{['door', 'window', 'column', 'pipe'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                     <NumberInput label="Width" value={tempObstacle.width} onChange={v => setTempObstacle({...tempObstacle, width: v})} step={50} />
                     <NumberInput label="Position (Left)" value={tempObstacle.fromLeft} onChange={v => setTempObstacle({...tempObstacle, fromLeft: v})} step={50} />
                     {tempObstacle.type === 'window' && <NumberInput label="Elevation" value={tempObstacle.elevation || 0} onChange={v => setTempObstacle({...tempObstacle, elevation: v})} step={50} />}
                   </>
                 )}
                 <div className="flex gap-2 pt-4">
                    {modalMode.includes('edit') && <Button variant="danger" onClick={deleteItem} className="flex-1">Delete</Button>}
                    <Button variant="primary" onClick={saveItem} className="flex-[2]">Save</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ScreenBOMReport = ({ project }: { project: Project }) => {
  const data = useMemo(() => generateProjectBOM(project), [project]);
  const [activeView, setActiveView] = useState<'list' | 'cutplan'>('list');
  const cutPlan = useMemo(() => optimizeCuts(data.groups.flatMap(g => g.items), project.settings), [data, project.settings]);

  const handlePrint = () => setTimeout(() => window.print(), 100);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full overflow-hidden">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4 shrink-0 print:hidden">
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
             <button onClick={() => setActiveView('list')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeView === 'list' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Material List</button>
             <button onClick={() => setActiveView('cutplan')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeView === 'cutplan' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Cut Plan</button>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <Button variant="secondary" size="md" onClick={handlePrint} className="flex-1 md:flex-none"><Printer size={18} className="mr-2"/> Print</Button>
             <Button variant="primary" size="md" onClick={() => exportToCSV(data.groups, project)} className="flex-1 md:flex-none"><Download size={18} className="mr-2"/> Export CSV</Button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-white dark:bg-slate-950 print:p-0 print:overflow-visible h-full">
         <div className="border-b border-slate-200 dark:border-slate-800 pb-6 print:block">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">{project.company || "Cabinet Project"}</h1>
            <p className="text-slate-500">Project: {project.name}</p>
         </div>
         
         <div className="grid grid-cols-3 gap-6 print:break-inside-avoid">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
               <div className="text-xs font-bold text-slate-400 uppercase">Total Area</div>
               <div className="text-2xl font-black text-amber-600">{data.totalArea} m²</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
               <div className="text-xs font-bold text-slate-400 uppercase">Sheets</div>
               <div className="text-2xl font-black text-slate-900 dark:text-white">{cutPlan.totalSheets}</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
               <div className="text-xs font-bold text-slate-400 uppercase">Waste</div>
               <div className="text-2xl font-black text-slate-900 dark:text-white">{cutPlan.totalWaste}%</div>
            </div>
         </div>

         {/* VIEW CONTENT */}
         <div className={activeView === 'list' ? 'block' : 'hidden print:block'}>
            <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {data.groups.map((group, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden break-inside-avoid print:border-slate-300">
                   <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 font-bold text-sm border-b border-slate-200 dark:border-slate-800">{group.cabinetName}</div>
                   <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {group.items.map((item, j) => (
                           <tr key={j}>
                              <td className="p-2 pl-4 text-slate-600 dark:text-slate-300">{item.name}</td>
                              <td className="p-2 text-right font-mono text-xs">{item.length} x {item.width}</td>
                              <td className="p-2 pr-4 text-right font-bold">x{item.qty}</td>
                           </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              ))}
            </div>
         </div>

         <div className={activeView === 'cutplan' ? 'block' : 'hidden print:block print:break-before-page'}>
             <h3 className="text-xl font-bold mb-4 print:mt-4">Optimization Diagrams</h3>
             <div className="space-y-8">
                {cutPlan.sheets.map((sheet, i) => (
                   <CutPlanVisualizer key={i} sheet={sheet} index={i} settings={project.settings} />
                ))}
             </div>
         </div>
      </div>
    </div>
  );
};
