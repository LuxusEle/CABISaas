
import React, { useState, useMemo, useEffect } from 'react';
import { Home, Layers, Calculator, Zap, ArrowLeft, Trash2, Plus, Box, DoorOpen, Wand2, Moon, Sun, Table2, FileSpreadsheet, X, Pencil, Save, List, Settings, Printer, Download, Scissors, LayoutDashboard, DollarSign, Map } from 'lucide-react';
import { Screen, Project, ZoneId, PresetType, CabinetType, CabinetUnit, Obstacle } from './types';
import { createNewProject, generateProjectBOM, autoFillZone, exportToExcel, resolveCollisions, calculateProjectCost } from './services/bomService';
import { optimizeCuts } from './services/nestingService';

// Components
import { Button } from './components/Button';
import { NumberInput } from './components/NumberInput';
import { WallVisualizer } from './components/WallVisualizer';
import { CutPlanVisualizer } from './components/CutPlanVisualizer';

// --- PRINT TITLE BLOCK ---
const TitleBlock = ({ project, pageTitle }: { project: Project, pageTitle: string }) => (
  <div className="hidden print:flex fixed bottom-0 left-0 right-0 border-t-2 border-black bg-white p-4 text-xs font-mono justify-between items-end z-50">
     <div className="border-r-2 border-black pr-6 mr-6 flex flex-col justify-end">
        <div className="font-black text-2xl tracking-tighter">CABENGINE<span className="text-slate-400">PRO</span></div>
     </div>
     <div className="flex-1 grid grid-cols-5 gap-6">
        <div>
           <div className="font-bold text-[8px] uppercase text-slate-400 mb-1">Project Name</div>
           <div className="font-bold text-sm truncate">{project.name}</div>
        </div>
        <div>
           <div className="font-bold text-[8px] uppercase text-slate-400 mb-1">Company/Client</div>
           <div className="font-bold text-sm truncate">{project.company}</div>
        </div>
        <div>
           <div className="font-bold text-[8px] uppercase text-slate-400 mb-1">Drawing View</div>
           <div className="font-bold text-sm truncate uppercase">{pageTitle}</div>
        </div>
         <div>
           <div className="font-bold text-[8px] uppercase text-slate-400 mb-1">Date</div>
           <div className="font-bold text-sm">{new Date().toLocaleDateString()}</div>
        </div>
         <div>
           <div className="font-bold text-[8px] uppercase text-slate-400 mb-1">Page</div>
           <div className="font-bold text-sm">Automated BOM</div>
        </div>
     </div>
  </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [project, setProject] = useState<Project>(createNewProject());
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('app-theme') !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    localStorage.setItem('app-theme', String(isDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleStartProject = () => {
    setProject(createNewProject());
    setScreen(Screen.PROJECT_SETUP);
  };

  const renderContent = () => {
    switch (screen) {
      case Screen.HOME: return <ScreenHome onNewProject={handleStartProject} />;
      case Screen.PROJECT_SETUP: return <ScreenProjectSetup project={project} setProject={setProject} />;
      case Screen.WALL_EDITOR: return <ScreenWallEditor project={project} setProject={setProject} setScreen={setScreen} />;
      case Screen.BOM_REPORT: return <ScreenBOMReport project={project} setProject={setProject} />;
      default: return <ScreenHome onNewProject={handleStartProject} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col font-sans transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* MOBILE HEADER */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-40 print:hidden">
         <div className="font-black text-lg">CAB<span className="text-amber-500">ENGINE</span></div>
         <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-20 flex-col items-center py-6 bg-slate-900 border-r border-slate-800 shrink-0 z-50 print:hidden">
          <div className="mb-8 text-amber-500"><LayoutDashboard size={28} /></div>
          <nav className="flex flex-col gap-6 w-full px-2">
             <NavButton active={screen === Screen.HOME} onClick={() => setScreen(Screen.HOME)} icon={<Home size={24} />} label="Home" />
             <NavButton active={screen === Screen.PROJECT_SETUP} onClick={() => setScreen(Screen.PROJECT_SETUP)} icon={<Settings size={24} />} label="Setup" />
             <NavButton active={screen === Screen.WALL_EDITOR} onClick={() => setScreen(Screen.WALL_EDITOR)} icon={<Box size={24} />} label="Walls" />
             <NavButton active={screen === Screen.BOM_REPORT} onClick={() => setScreen(Screen.BOM_REPORT)} icon={<Table2 size={24} />} label="BOM" />
          </nav>
          <div className="mt-auto">
             <button onClick={toggleTheme} className="p-3 rounded-xl bg-slate-800 text-amber-500 hover:bg-slate-700 transition-colors">{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
           {renderContent()}
        </main>
      </div>

      {/* MOBILE NAV */}
      {screen !== Screen.HOME && (
        <div className="md:hidden h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-stretch justify-around z-50 shrink-0 print:hidden safe-area-bottom">
           <MobileNavButton active={screen === Screen.PROJECT_SETUP} onClick={() => setScreen(Screen.PROJECT_SETUP)} icon={<Settings size={20} />} label="Setup" />
           <MobileNavButton active={screen === Screen.WALL_EDITOR} onClick={() => setScreen(Screen.WALL_EDITOR)} icon={<Box size={20} />} label="Editor" />
           <MobileNavButton active={screen === Screen.BOM_REPORT} onClick={() => setScreen(Screen.BOM_REPORT)} icon={<Table2 size={20} />} label="BOM" />
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

const ScreenHome = ({ onNewProject }: { onNewProject: () => void }) => (
  <div className="flex flex-col h-full p-6 space-y-8 bg-slate-50 dark:bg-slate-950 items-center justify-center max-w-4xl mx-auto w-full overflow-y-auto">
    <div className="text-center space-y-2 mb-8">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">CAB<span className="text-amber-600 dark:text-amber-500">ENGINE</span></h1>
    </div>
    <div className="w-full max-w-md space-y-4">
      <Button variant="primary" size="xl" onClick={onNewProject} leftIcon={<Layers size={28} />} className="w-full py-8 text-xl shadow-xl shadow-amber-500/20">Start New Project</Button>
      <div className="grid grid-cols-2 gap-4">
        <Button variant="secondary" size="lg" className="h-28 flex-col gap-2"><Calculator size={28} className="text-amber-600" /><span>Quick Parts</span></Button>
        <Button variant="secondary" size="lg" className="h-28 flex-col gap-2"><Zap size={28} className="text-amber-600" /><span>Area Calc</span></Button>
      </div>
    </div>
  </div>
);

const ScreenProjectSetup = ({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>> }) => (
  <div className="flex flex-col h-full w-full overflow-hidden">
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Project Setup</h2>
        
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
           <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-2">Project Info</h3>
           <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Project Name</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white" value={project.name} onChange={e => setProject({...project, name: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Company Name</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white" value={project.company} onChange={e => setProject({...project, company: e.target.value})} /></div>
           </div>
           <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Currency Symbol</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white" value={project.settings.currency} onChange={e => setProject({...project, settings: {...project.settings, currency: e.target.value}})} placeholder="$" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Logo URL (Optional)</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 dark:text-white" value={project.settings.logoUrl || ''} onChange={e => setProject({...project, settings: {...project.settings, logoUrl: e.target.value}})} placeholder="https://..." /></div>
           </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-4">Dimensions & Nesting</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <NumberInput label="Base Height" value={project.settings.baseHeight} onChange={(v) => setProject({...project, settings: {...project.settings, baseHeight: v}})} step={10} />
            <NumberInput label="Sheet Length" value={project.settings.sheetLength} onChange={(v) => setProject({...project, settings: {...project.settings, sheetLength: v}})} step={100} />
            <NumberInput label="Sheet Width" value={project.settings.sheetWidth} onChange={(v) => setProject({...project, settings: {...project.settings, sheetWidth: v}})} step={100} />
          </div>
        </section>
      </div>
    </div>
  </div>
);

const ScreenWallEditor = ({ project, setProject, setScreen }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>>, setScreen: (s: Screen) => void }) => {
  const [activeTab, setActiveTab] = useState<string>(project.zones[0]?.id || 'Wall A');
  const currentZoneIndex = project.zones.findIndex(z => z.id === activeTab);
  const currentZone = project.zones[currentZoneIndex];

  // Editor State
  const [modalMode, setModalMode] = useState<'none' | 'add_obstacle' | 'add_cabinet' | 'edit_obstacle' | 'edit_cabinet'>('none');
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [tempCabinet, setTempCabinet] = useState<CabinetUnit>({ id: '', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 });
  const [tempObstacle, setTempObstacle] = useState<Obstacle>({ id: '', type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 });
  const [presetFilter, setPresetFilter] = useState<'Base' | 'Wall' | 'Tall'>('Base');

  const updateZone = (newZone: typeof currentZone) => {
    const newZones = [...project.zones];
    newZones[currentZoneIndex] = newZone;
    setProject({ ...project, zones: newZones });
  };

  const handleDragEnd = () => updateZone(resolveCollisions(currentZone)); // Shove on drop

  // AUTO FILL & CLEAR
  const handleAutoFill = () => updateZone(autoFillZone(currentZone));
  const clearZone = () => { if (window.confirm(`Clear ${currentZone.id}?`)) updateZone({ ...currentZone, obstacles: [], cabinets: [] }); };

  const addZone = () => {
    const name = prompt("Enter Zone Name (e.g., Island, Pantry):");
    if (name) {
       const newZone = { id: name, active: true, totalLength: 3000, obstacles: [], cabinets: [] };
       setProject(prev => {
          const updated = { ...prev, zones: [...prev.zones, newZone] };
          setTimeout(() => setActiveTab(name), 10);
          return updated;
       });
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
  const handleCabinetMove = (idx: number, x: number) => { const cabs = [...currentZone.cabinets]; cabs[idx].fromLeft = x; updateZone({...currentZone, cabinets: cabs}); };
  const handleObstacleMove = (idx: number, x: number) => { const obs = [...currentZone.obstacles]; obs[idx].fromLeft = x; updateZone({...currentZone, obstacles: obs}); };

  const openAdd = (type: 'cabinet'|'obstacle') => {
     if(type==='cabinet') { 
         setTempCabinet({ id: Math.random().toString(), preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1, fromLeft: 0 }); 
         setPresetFilter('Base');
         setModalMode('add_cabinet'); 
     }
     else { setTempObstacle({ id: Math.random().toString(), type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 }); setModalMode('add_obstacle'); }
  };
  const openEdit = (type: 'cabinet'|'obstacle', idx: number) => {
     setEditIndex(idx);
     if(type==='cabinet') { 
         const cab = currentZone.cabinets[idx];
         setTempCabinet({...cab}); 
         if (cab.type === CabinetType.WALL) setPresetFilter('Wall');
         else if (cab.type === CabinetType.TALL) setPresetFilter('Tall');
         else setPresetFilter('Base');
         setModalMode('edit_cabinet'); 
     }
     else { setTempObstacle({...currentZone.obstacles[idx]}); setModalMode('edit_obstacle'); }
  };
  
  const saveItem = () => {
    if (modalMode.includes('cabinet')) {
       const items = [...currentZone.cabinets];
       modalMode === 'add_cabinet' ? items.push({...tempCabinet, id: Math.random().toString()}) : items[editIndex] = tempCabinet;
       updateZone(resolveCollisions({...currentZone, cabinets: items}));
    } else {
       const items = [...currentZone.obstacles];
       modalMode === 'add_obstacle' ? items.push({...tempObstacle, id: Math.random().toString()}) : items[editIndex] = tempObstacle;
       updateZone({...currentZone, obstacles: items});
    }
    setModalMode('none');
  };
  const deleteItem = () => {
     if (modalMode.includes('cabinet')) { const items = [...currentZone.cabinets]; items.splice(editIndex, 1); updateZone({...currentZone, cabinets: items}); } 
     else { const items = [...currentZone.obstacles]; items.splice(editIndex, 1); updateZone({...currentZone, obstacles: items}); }
     setModalMode('none');
  };

  if (!currentZone) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <div className="hidden md:flex flex-col w-[300px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-y-auto">
           <div className="p-4 border-b border-slate-200 dark:border-slate-800"><NumberInput label="Wall Length" value={currentZone.totalLength} onChange={(e) => updateZone({...currentZone, totalLength: e})} step={100} /></div>
           <div className="p-4 space-y-2 flex-1">
             <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400">ZONES</span><button onClick={addZone} className="text-xs font-bold text-amber-500 hover:underline">+ ADD</button></div>
             {project.zones.map(z => (
               <div key={z.id} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${activeTab===z.id ? 'bg-amber-50 dark:bg-slate-800 text-amber-600 border border-amber-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} onClick={() => setActiveTab(z.id)}><span>{z.id}</span><Trash2 size={14} className="hover:text-red-500" onClick={(e) => {e.stopPropagation(); deleteZone(z.id);}} /></div>
             ))}
           </div>
           <div className="p-4 space-y-2 border-t border-slate-200 dark:border-slate-800">
              <Button size="md" variant="secondary" className="w-full text-xs" onClick={handleAutoFill}><Wand2 size={14} className="mr-2"/> Auto Fill</Button>
              <Button size="md" variant="secondary" className="w-full text-xs" onClick={clearZone}><Trash2 size={14} className="mr-2"/> Clear Zone</Button>
              <div className="grid grid-cols-2 gap-2 mt-2"><Button size="lg" onClick={() => openAdd('obstacle')} variant="outline" className="text-xs flex-col h-16"><DoorOpen size={18}/>+ Obstacle</Button><Button size="lg" onClick={() => openAdd('cabinet')} variant="primary" className="text-xs flex-col h-16"><Box size={18}/>+ Cabinet</Button></div>
              <Button size="lg" variant="primary" className="w-full mt-4 font-black" onClick={() => setScreen(Screen.BOM_REPORT)}>CALCULATE BOM</Button>
           </div>
        </div>

        {/* VISUALIZER */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
           <div className="md:hidden flex px-2 pt-2 gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900 shrink-0">
             {project.zones.map(z => (<button key={z.id} onClick={() => setActiveTab(z.id)} className={`px-4 py-2 text-sm font-bold rounded-t-lg whitespace-nowrap ${activeTab===z.id ? 'bg-white dark:bg-slate-950 text-amber-500' : 'text-slate-500 bg-slate-200 dark:bg-slate-800'}`}>{z.id}</button>))}
             <button onClick={addZone} className="px-4 py-2 text-sm font-bold rounded-t-lg bg-slate-200 dark:bg-slate-800 text-slate-500">+</button>
           </div>
           
           <div className="h-[250px] md:h-[400px] bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 relative z-0">
              <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} onCabinetClick={(i) => openEdit('cabinet', i)} onObstacleClick={(i) => openEdit('obstacle', i)} onCabinetMove={handleCabinetMove} onObstacleMove={handleObstacleMove} onDragEnd={handleDragEnd} />
           </div>

           <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto pb-20 md:pb-0">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-amber-950/40 text-slate-500 dark:text-amber-500 font-bold text-xs uppercase sticky top-0 border-b dark:border-amber-500/30"><tr><th className="p-3">#</th><th className="p-3">Type</th><th className="p-3">Item</th><th className="p-3 text-right">Width</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-amber-900/20">
                  {[...currentZone.obstacles, ...currentZone.cabinets].map((item, i) => {
                     const isCab = 'preset' in item;
                     return (<tr key={item.id} onClick={() => openEdit(isCab?'cabinet':'obstacle', isCab ? i - currentZone.obstacles.length : i)} className="hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-colors"><td className="p-3 text-slate-400 font-mono">{i+1}</td><td className="p-3 text-amber-600 font-bold">{isCab ? (item as CabinetUnit).type : 'Obstacle'}</td><td className="p-3 font-medium dark:text-amber-100">{isCab ? (item as CabinetUnit).preset : (item as Obstacle).type} <span className="text-slate-400 dark:text-amber-500/50 text-xs ml-2">@{item.fromLeft}mm</span></td><td className="p-3 text-right font-mono font-bold dark:text-white">{item.width}</td></tr>)
                  })}
                </tbody>
             </table>
           </div>
        </div>
      </div>

      {/* MODAL */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-xl dark:text-white capitalize">{modalMode.replace('_', ' ')}</h3><button onClick={() => setModalMode('none')}><X/></button></div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                 {modalMode.includes('cabinet') ? (
                   <>
                     {/* PRESET FILTER TABS */}
                     <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-2">
                        {['Base', 'Wall', 'Tall'].map(f => (
                          <button key={f} onClick={() => setPresetFilter(f as any)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${presetFilter===f ? 'bg-white dark:bg-slate-600 shadow text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>{f}</button>
                        ))}
                     </div>
                     {/* PRESET GRID BUTTONS */}
                     <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto mb-4">
                        {Object.values(PresetType)
                          .filter(p => {
                             if(presetFilter==='Base') return p.includes('Base') || p.includes('Sink') || p.includes('Filler') || p.includes('Corner');
                             if(presetFilter==='Wall') return p.includes('Wall');
                             return p.includes('Tall');
                          })
                          .map(t => (
                             <button key={t} onClick={() => setTempCabinet({...tempCabinet, preset: t, type: presetFilter === 'Wall' ? CabinetType.WALL : presetFilter === 'Tall' ? CabinetType.TALL : CabinetType.BASE})}
                                className={`p-2 text-[10px] md:text-xs font-bold rounded-lg border text-left transition-all ${tempCabinet.preset === t ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300'}`}>
                                {t}
                             </button>
                        ))}
                     </div>
                     <NumberInput label="Width" value={tempCabinet.width} onChange={v => setTempCabinet({...tempCabinet, width: v})} step={50} />
                     <NumberInput label="Position (Left)" value={tempCabinet.fromLeft} onChange={v => setTempCabinet({...tempCabinet, fromLeft: v})} step={50} />
                   </>
                 ) : (
                   <><div><label className="text-xs font-bold text-slate-400">Type</label><select className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-lg dark:text-white mt-1" value={tempObstacle.type} onChange={e => setTempObstacle({...tempObstacle, type: e.target.value as any})}>{['door', 'window', 'column', 'pipe'].map(t => <option key={t} value={t}>{t}</option>)}</select></div><NumberInput label="Width" value={tempObstacle.width} onChange={v => setTempObstacle({...tempObstacle, width: v})} step={50} /><NumberInput label="Position (Left)" value={tempObstacle.fromLeft} onChange={v => setTempObstacle({...tempObstacle, fromLeft: v})} step={50} /></>
                 )}
                 <div className="flex gap-2 pt-4">{modalMode.includes('edit') && <Button variant="danger" onClick={deleteItem} className="flex-1">Delete</Button>}<Button variant="primary" onClick={saveItem} className="flex-[2]">Save</Button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ScreenBOMReport = ({ project, setProject }: { project: Project, setProject: React.Dispatch<React.SetStateAction<Project>> }) => {
  const data = useMemo(() => generateProjectBOM(project), [project]);
  const [activeView, setActiveView] = useState<'list' | 'cutplan' | 'wallplan'>('list');
  const cutPlan = useMemo(() => optimizeCuts(data.groups.flatMap(g => g.items), project.settings), [data, project.settings]);
  const costs = useMemo(() => calculateProjectCost(data, cutPlan, project.settings), [data, cutPlan, project.settings]);
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
      
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4 shrink-0 print:hidden">
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start overflow-x-auto">
             {['list', 'cutplan', 'wallplan'].map((v) => (
               <button key={v} onClick={() => setActiveView(v as any)} className={`px-4 py-2 text-sm font-bold rounded-md capitalize ${activeView === v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>{v === 'list' ? 'Material List' : v === 'cutplan' ? 'Cut Plan' : 'Wall Plans'}</button>
             ))}
         </div>
         <div className="flex gap-2 w-full md:w-auto"><Button variant="secondary" size="md" onClick={handlePrint} className="flex-1 md:flex-none"><Printer size={18} className="mr-2"/> Print / Save PDF</Button><Button variant="primary" size="md" onClick={() => exportToExcel(data.groups, cutPlan, project)} className="flex-1 md:flex-none"><FileSpreadsheet size={18} className="mr-2"/> Export Excel</Button></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-white dark:bg-slate-950 print:p-0 print:overflow-visible h-full">
         <div className="border-b border-slate-200 dark:border-slate-800 pb-6 print:block flex justify-between items-start">
            <div>
               <h1 className="text-3xl font-black text-slate-900 dark:text-white">{project.company || "Cabinet Project"}</h1>
               <p className="text-slate-500">Project: {project.name}</p>
            </div>
            {project.settings.logoUrl && <img src={project.settings.logoUrl} alt="Logo" className="h-12 object-contain" />}
         </div>
         
         {/* COSTING CARD (Print Safe) */}
         <div className="bg-slate-900 text-white p-6 rounded-2xl print:bg-white print:text-black print:border-2 print:border-black print:break-inside-avoid shadow-xl print:shadow-none">
             <h3 className="text-amber-500 font-bold mb-4 flex items-center gap-2 print:text-black"><DollarSign size={20}/> Cost Estimate</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div><div className="text-slate-400 text-xs uppercase print:text-black">Material</div><div className="text-xl font-bold">{currency}{costs.materialCost.toFixed(2)}</div></div>
                <div><div className="text-slate-400 text-xs uppercase print:text-black">Hardware</div><div className="text-xl font-bold">{currency}{costs.hardwareCost.toFixed(2)}</div></div>
                <div><div className="text-slate-400 text-xs uppercase print:text-black">Labor</div><div className="text-xl font-bold">{currency}{costs.laborCost.toFixed(2)}</div></div>
                <div><div className="text-amber-500 text-xs uppercase print:text-black">Total</div><div className="text-3xl font-black">{currency}{costs.totalPrice.toFixed(2)}</div></div>
             </div>
             {/* Edit Cost Settings (Simple) */}
             <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-4 print:hidden">
                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Sheet Price:</span><input type="number" className="bg-slate-800 w-20 rounded px-2 py-1 text-sm text-white" value={project.settings.costs.pricePerSheet} onChange={e => setProject({...project, settings: {...project.settings, costs: {...project.settings.costs, pricePerSheet: Number(e.target.value)}}})} /></div>
                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Labor/Hr:</span><input type="number" className="bg-slate-800 w-20 rounded px-2 py-1 text-sm text-white" value={project.settings.costs.laborRatePerHour} onChange={e => setProject({...project, settings: {...project.settings, costs: {...project.settings.costs, laborRatePerHour: Number(e.target.value)}}})} /></div>
             </div>
         </div>

         {/* MATERIAL SUMMARY TABLE (Always Visible in List/Cut Plan) */}
         <div className="break-inside-avoid">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Layers/> Material Sheets Order</h3>
             <table className="w-full text-sm text-left border-collapse border border-slate-200 dark:border-slate-700 print:border-black">
               <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200">
                 <tr>
                   <th className="p-3 border border-slate-200 dark:border-slate-700 print:border-black">Material</th>
                   <th className="p-3 border border-slate-200 dark:border-slate-700 print:border-black">Sheet Size</th>
                   <th className="p-3 border border-slate-200 dark:border-slate-700 print:border-black">Qty Needed</th>
                   <th className="p-3 border border-slate-200 dark:border-slate-700 print:border-black">Avg Waste</th>
                 </tr>
               </thead>
               <tbody>
                 {materialSummary.map((m) => (
                   <tr key={m.material}>
                     <td className="p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold">{m.material}</td>
                     <td className="p-3 border border-slate-200 dark:border-slate-700 print:border-black font-mono">{m.dims}mm</td>
                     <td className="p-3 border border-slate-200 dark:border-slate-700 print:border-black font-bold text-lg">{m.sheets}</td>
                     <td className="p-3 border border-slate-200 dark:border-slate-700 print:border-black">{m.waste}%</td>
                   </tr>
                 ))}
               </tbody>
             </table>
         </div>

         {/* LIST VIEW */}
         <div className={activeView === 'list' ? 'block' : 'hidden print:block'}>
            <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {data.groups.map((group, i) => (
                <div key={i} className="border border-slate-200 dark:border-amber-900/40 rounded-xl overflow-hidden break-inside-avoid print:border-slate-300 print:border-2 print:border-black">
                   <div className="bg-slate-50 dark:bg-amber-950 px-4 py-2 font-bold text-sm border-b border-slate-200 dark:border-amber-900 text-slate-900 dark:text-amber-500 print:bg-slate-200 print:text-black print:border-black">{group.cabinetName}</div>
                   <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100 dark:divide-amber-900/20 print:divide-slate-300">
                        {group.items.map((item, j) => (<tr key={j} className="hover:bg-slate-50 dark:hover:bg-amber-900/20"><td className="p-2 pl-4 text-slate-600 dark:text-amber-100/80 print:text-black">{item.name}</td><td className="p-2 text-right font-mono text-xs text-slate-500 dark:text-amber-500/60 print:text-black">{item.length} x {item.width}</td><td className="p-2 pr-4 text-right font-bold text-slate-900 dark:text-amber-500 print:text-black">x{item.qty}</td></tr>))}
                      </tbody>
                   </table>
                </div>
              ))}
            </div>
         </div>

         {/* CUT PLAN VIEW */}
         <div className={activeView === 'cutplan' ? 'block' : 'hidden print:block print:break-before-page'}>
             <h3 className="text-xl font-bold mb-4 print:mt-4 flex items-center gap-2"><Scissors/> Cut Optimization</h3>
             <div className="space-y-8">{cutPlan.sheets.map((sheet, i) => <CutPlanVisualizer key={i} sheet={sheet} index={i} settings={project.settings} />)}</div>
         </div>

         {/* WALL PLAN VIEW */}
         <div className={activeView === 'wallplan' ? 'block' : 'hidden print:block print:break-before-page'}>
             <h3 className="text-xl font-bold mb-4 print:mt-4 flex items-center gap-2"><Map/> Wall Elevations</h3>
             <div className="space-y-12">
               {project.zones.filter(z => z.active).map((zone) => (
                 <div key={zone.id} className="break-inside-avoid border border-slate-200 dark:border-slate-800 p-4 rounded-xl print:border-black print:border-2">
                    <h4 className="font-bold text-lg mb-2 border-b pb-2">{zone.id}</h4>
                    <div className="h-[300px] mb-4 border border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 print:bg-white print:border-black">
                       <WallVisualizer zone={zone} height={project.settings.tallHeight + 200} />
                    </div>
                    {/* Legend Table */}
                    <table className="w-full text-sm text-left">
                       <thead><tr className="border-b dark:border-slate-800 print:border-black"><th className="pb-1 dark:text-slate-400 print:text-black">ID</th><th className="pb-1 dark:text-slate-400 print:text-black">Description</th><th className="pb-1 text-right dark:text-slate-400 print:text-black">Width</th><th className="pb-1 text-right dark:text-slate-400 print:text-black">Qty</th></tr></thead>
                       <tbody>
                          {zone.cabinets.map((cab, idx) => (
                             <tr key={idx}><td className="py-1 text-slate-500 font-mono print:text-black">#{idx+1}</td><td className="py-1 font-bold dark:text-slate-200 print:text-black">{cab.preset}</td><td className="py-1 text-right font-mono dark:text-slate-400 print:text-black">{cab.width}</td><td className="py-1 text-right dark:text-slate-400 print:text-black">1</td></tr>
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
