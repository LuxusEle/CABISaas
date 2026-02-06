import React, { useState, useMemo } from 'react';
import { Home, Layers, Calculator, Zap, Flashlight, ArrowLeft, MoreHorizontal, Trash2, Plus, Box, CheckSquare, Square, DoorOpen, LayoutTemplate, Wand2 } from 'lucide-react';
import { Screen, Project, ZoneId, PresetType, CabinetType, CabinetUnit, Obstacle } from './types';
import { createNewProject, generateProjectBOM, autoFillZone } from './services/bomService';

// Components
import { Button } from './components/Button';
import { NumberInput } from './components/NumberInput';
import { WallVisualizer } from './components/WallVisualizer';

// --- SUB-COMPONENTS ---

const Header = ({ title, onBack, rightAction }: { title: string, onBack?: () => void, rightAction?: React.ReactNode }) => (
  <div className="p-4 flex items-center justify-between bg-slate-950 border-b border-slate-800 sticky top-0 z-20">
    <div className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
      )}
      <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{title}</h2>
    </div>
    {rightAction}
  </div>
);

// --- SCREENS ---

// 1. HOME SCREEN
const ScreenHome = ({ onNavigate, onNewProject }: { onNavigate: (s: Screen) => void, onNewProject: () => void }) => (
  <div className="flex flex-col h-full p-6 space-y-8 bg-slate-950">
    <header className="mt-8">
      <h1 className="text-4xl font-black tracking-tight text-white mb-2">CAB<span className="text-amber-500">ENGINE</span></h1>
      <p className="text-slate-500 font-medium">No CAD. Just Lists. Fast.</p>
    </header>

    <Button 
      variant="primary" 
      size="xl" 
      onClick={onNewProject}
      leftIcon={<Layers size={28} />}
      className="w-full py-10 shadow-amber-900/30 text-2xl"
    >
      Start Project
    </Button>

    <div className="grid grid-cols-2 gap-4">
      <Button variant="secondary" size="lg" className="h-32 flex-col gap-2">
        <Calculator size={32} className="text-amber-500" />
        <span>Quick Parts</span>
      </Button>
      <Button variant="secondary" size="lg" className="h-32 flex-col gap-2">
        <Zap size={32} className="text-amber-500" />
        <span>Area Calc</span>
      </Button>
    </div>
  </div>
);

// 2. PROJECT SETUP
const ScreenProjectSetup = ({ project, setProject, onNext, onBack }: { project: Project, setProject: (p: Project) => void, onNext: () => void, onBack: () => void }) => {
  const toggleZone = (id: ZoneId) => {
    const updatedZones = project.zones.map(z => 
      z.id === id ? { ...z, active: !z.active } : z
    );
    setProject({ ...project, zones: updatedZones });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <Header title="Project Setup" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-8">
        
        {/* Active Zones */}
        <section>
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-3">Active Zones</h3>
          <div className="grid grid-cols-2 gap-3">
            {project.zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => toggleZone(zone.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  zone.active 
                    ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {zone.active ? <CheckSquare size={20} /> : <Square size={20} />}
                <span className="font-bold">{zone.id}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Global Dimensions */}
        <section className="space-y-4">
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Global Heights (mm)</h3>
          <NumberInput 
            label="Base Height" 
            value={project.settings.baseHeight} 
            onChange={(v) => setProject({...project, settings: {...project.settings, baseHeight: v}})} 
            step={10} 
          />
          <NumberInput 
            label="Wall Cab Height" 
            value={project.settings.wallHeight} 
            onChange={(v) => setProject({...project, settings: {...project.settings, wallHeight: v}})} 
            step={50} 
          />
        </section>
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0 safe-area-bottom">
        <Button variant="primary" size="xl" className="w-full" onClick={onNext}>
          Configure Walls
        </Button>
      </div>
    </div>
  );
};

// 3. WALL EDITOR (THE COMPLEX PART)
const ScreenWallEditor = ({ project, setProject, onNext, onBack }: { project: Project, setProject: (p: Project) => void, onNext: () => void, onBack: () => void }) => {
  const activeZones = project.zones.filter(z => z.active);
  const [activeTab, setActiveTab] = useState<ZoneId>(activeZones[0]?.id || ZoneId.WALL_A);
  const currentZoneIndex = project.zones.findIndex(z => z.id === activeTab);
  const currentZone = project.zones[currentZoneIndex];

  // State for adding items
  const [isAddingMode, setIsAddingMode] = useState<'none' | 'obstacle' | 'cabinet'>('none');
  const [tempCabinet, setTempCabinet] = useState<CabinetUnit>({ id: '', preset: PresetType.BASE_DOOR, type: CabinetType.BASE, width: 600, qty: 1 });
  const [tempObstacle, setTempObstacle] = useState<Obstacle>({ id: '', type: 'door', fromLeft: 0, width: 900, height: 2100, elevation: 0, depth: 150 });

  // Math
  const usedSpace = (currentZone?.obstacles.reduce((acc, o) => acc + o.width, 0) || 0) + 
                    (currentZone?.cabinets.reduce((acc, c) => acc + c.width, 0) || 0);
  const remainingSpace = (currentZone?.totalLength || 0) - usedSpace;

  // Actions
  const updateZone = (newZone: typeof currentZone) => {
    const newZones = [...project.zones];
    newZones[currentZoneIndex] = newZone;
    setProject({ ...project, zones: newZones });
  };

  const handleAutoFill = () => {
    const filledZone = autoFillZone(currentZone);
    updateZone(filledZone);
  };

  const clearZone = () => {
    if (window.confirm(`Clear all items from ${currentZone.id}?`)) {
      updateZone({ ...currentZone, obstacles: [], cabinets: [] });
    }
  };

  const addCabinet = () => {
    updateZone({
      ...currentZone,
      cabinets: [...currentZone.cabinets, { ...tempCabinet, id: Math.random().toString() }]
    });
    setIsAddingMode('none');
  };

  const addObstacle = () => {
    updateZone({
      ...currentZone,
      obstacles: [...currentZone.obstacles, { ...tempObstacle, id: Math.random().toString() }]
    });
    setIsAddingMode('none');
  };

  const removeCabinet = (idx: number) => {
    const newCabs = [...currentZone.cabinets];
    newCabs.splice(idx, 1);
    updateZone({ ...currentZone, cabinets: newCabs });
  };

  const removeObstacle = (idx: number) => {
    const newObs = [...currentZone.obstacles];
    newObs.splice(idx, 1);
    updateZone({ ...currentZone, obstacles: newObs });
  };

  if (!currentZone) return <div>No active zones</div>;

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      <Header 
        title="Wall Layout" 
        onBack={onBack} 
        rightAction={<button className="text-amber-500 font-bold text-sm" onClick={onNext}>REPORT &rarr;</button>} 
      />

      {/* Visualizer */}
      <WallVisualizer zone={currentZone} height={project.settings.tallHeight + 300} />

      {/* Zone Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800 bg-slate-900">
        {activeZones.map(z => (
          <button
            key={z.id}
            onClick={() => { setActiveTab(z.id); setIsAddingMode('none'); }}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors ${
              activeTab === z.id 
                ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800' 
                : 'text-slate-500'
            }`}
          >
            {z.id}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-0 pb-40">
        
        {/* Total Length Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex gap-4">
             <div className="flex-1">
                <NumberInput 
                  label="Wall Length" 
                  value={currentZone.totalLength} 
                  onChange={(v) => updateZone({ ...currentZone, totalLength: v })} 
                  step={100} 
                />
             </div>
             <div className="flex-1 flex flex-col justify-end">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={clearZone} size="md" className="h-14 px-4 bg-red-900/10 text-red-500 border-red-900/30 hover:bg-red-900/20">
                    <Trash2 size={20} />
                  </Button>
                  <Button variant="secondary" onClick={handleAutoFill} leftIcon={<Wand2 size={16} />} size="md" className="h-14 w-full flex-1">
                    Magic Fill
                  </Button>
                </div>
             </div>
          </div>
        </div>

        {/* Excel-style List */}
        <div className="w-full">
          <div className="grid grid-cols-[1fr_80px_60px] gap-0 bg-slate-900 border-b border-slate-800 p-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
             <div className="pl-2">Item / Preset</div>
             <div className="text-right">Width</div>
             <div></div>
          </div>
          
          {/* Obstacles */}
          {currentZone.obstacles.map((obs, idx) => (
            <div key={obs.id} className="grid grid-cols-[1fr_80px_60px] gap-0 border-b border-slate-800 bg-slate-900/50 items-center">
              <div className="p-3 border-r border-slate-800/50">
                <div className="font-bold text-slate-300 capitalize flex items-center gap-2">
                  <DoorOpen size={14} className="text-slate-500" />
                  {obs.type}
                </div>
                <div className="text-[10px] text-slate-500">
                   @{obs.fromLeft}mm | H:{obs.height} D:{obs.depth}
                </div>
              </div>
              <div className="p-3 text-right font-mono text-slate-400 border-r border-slate-800/50">
                {obs.width}
              </div>
              <button onClick={() => removeObstacle(idx)} className="flex items-center justify-center h-full w-full text-slate-500 hover:text-red-500 hover:bg-red-900/20 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {/* Cabinets */}
          {currentZone.cabinets.map((cab, idx) => (
            <div key={cab.id} className={`grid grid-cols-[1fr_80px_60px] gap-0 border-b border-slate-800 items-center ${cab.isAutoFilled ? 'bg-amber-900/10' : 'bg-transparent'}`}>
              <div className="p-3 border-r border-slate-800">
                <div className="font-bold text-white flex items-center gap-2">
                   {cab.isAutoFilled && <Wand2 size={12} className="text-amber-500" />}
                   {cab.preset}
                </div>
                <div className="text-[10px] text-slate-500">
                   {cab.type} Cabinet
                </div>
              </div>
              <div className="p-3 text-right font-mono font-bold text-amber-500 border-r border-slate-800">
                {cab.width}
              </div>
              <button onClick={() => removeCabinet(idx)} className="flex items-center justify-center h-full w-full text-slate-500 hover:text-red-500 hover:bg-red-900/20 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Adding Drawer/Sheet */}
      {isAddingMode !== 'none' && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-end animate-in slide-in-from-bottom-10 fade-in">
          <div className="bg-slate-900 w-full p-4 rounded-t-2xl border-t border-slate-700 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-white text-lg">
                Add {isAddingMode === 'obstacle' ? 'Obstacle' : 'Cabinet'}
              </h3>
              <button onClick={() => setIsAddingMode('none')} className="text-slate-400 font-bold">Cancel</button>
            </div>

            {isAddingMode === 'obstacle' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {['door', 'window', 'column', 'pipe'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setTempObstacle({...tempObstacle, type: t as any})}
                      className={`p-3 rounded-lg border capitalize font-bold ${tempObstacle.type === t ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="From Left" value={tempObstacle.fromLeft} onChange={v => setTempObstacle({...tempObstacle, fromLeft: v})} step={50} />
                  <NumberInput label="Width" value={tempObstacle.width} onChange={v => setTempObstacle({...tempObstacle, width: v})} step={50} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="Height" value={tempObstacle.height || 0} onChange={v => setTempObstacle({...tempObstacle, height: v})} step={50} />
                  <NumberInput label="Depth" value={tempObstacle.depth || 0} onChange={v => setTempObstacle({...tempObstacle, depth: v})} step={50} />
                </div>
                {tempObstacle.type === 'window' && (
                  <NumberInput label="Raise from Floor" value={tempObstacle.elevation || 0} onChange={v => setTempObstacle({...tempObstacle, elevation: v})} step={50} />
                )}
                <Button onClick={addObstacle} className="w-full mt-4">Add Obstacle</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-slate-400 text-xs font-bold uppercase">Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(PresetType).map(p => (
                    <button 
                      key={p}
                      onClick={() => {
                         let type = CabinetType.BASE;
                         if(p.includes('Wall')) type = CabinetType.WALL;
                         if(p.includes('Tall') || p.includes('Utility')) type = CabinetType.TALL;
                         setTempCabinet({ ...tempCabinet, preset: p, type });
                      }}
                      className={`p-2 rounded text-xs font-bold border ${tempCabinet.preset === p ? 'bg-amber-500 text-black border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <NumberInput label="Width" value={tempCabinet.width} onChange={v => setTempCabinet({...tempCabinet, width: v})} step={50} />
                <Button onClick={addCabinet} className="w-full mt-4">Add Cabinet</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      {isAddingMode === 'none' && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0 flex gap-3 safe-area-bottom">
          <Button variant="secondary" onClick={() => setIsAddingMode('obstacle')} className="flex-1">
            + Obstacle
          </Button>
          <Button variant="primary" onClick={() => setIsAddingMode('cabinet')} className="flex-1">
            + Cabinet
          </Button>
        </div>
      )}
    </div>
  );
};

// 4. BOM REPORT SCREEN
const ScreenBOMReport = ({ project, onBack, onHome }: { project: Project, onBack: () => void, onHome: () => void }) => {
  const data = useMemo(() => generateProjectBOM(project), [project]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <Header title="Cut & Hardware List" onBack={onBack} />
      
      {/* Summary */}
      <div className="bg-slate-900 p-4 border-b border-slate-800 grid grid-cols-2 gap-4">
        <div>
          <div className="text-slate-500 text-xs font-bold uppercase">Board Area</div>
          <div className="text-2xl font-black text-amber-500">{data.totalArea} m²</div>
        </div>
        <div>
           <div className="text-slate-500 text-xs font-bold uppercase">Cabinets</div>
           <div className="text-2xl font-black text-white">{data.groups.length} Units</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 pb-20">
        {/* CUT LIST BY GROUP */}
        <div className="space-y-6">
          {data.groups.map((group, idx) => (
            <div key={idx} className={`rounded-xl overflow-hidden border border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-900'}`}>
              <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                <span className="font-bold text-white text-sm">{group.cabinetName}</span>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{group.items.length} parts</span>
              </div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-800/50">
                  {group.items.map((item, i) => (
                    <tr key={i}>
                      <td className="p-3 text-slate-300 font-medium">
                        {item.name}
                        <div className="text-[10px] text-slate-500">{item.material}</div>
                      </td>
                      <td className="p-3 text-right text-slate-400 font-mono">
                        {item.length} × {item.width}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-500">
                        x{item.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* HARDWARE SUMMARY */}
        <div className="mt-8 mb-8">
          <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-3 px-2">Hardware Required</h3>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-slate-700">
                {Object.entries(data.hardwareSummary).map(([name, qty]) => (
                  <tr key={name}>
                    <td className="p-4 text-slate-200 font-medium">{name}</td>
                    <td className="p-4 text-right font-bold text-amber-500 text-lg">{qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0 safe-area-bottom">
        <Button variant="primary" className="w-full" onClick={onHome}>Done</Button>
      </div>
    </div>
  );
};


// --- MAIN APP ---

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [project, setProject] = useState<Project>(createNewProject());

  const handleStartProject = () => {
    setProject(createNewProject());
    setScreen(Screen.PROJECT_SETUP);
  };

  const renderScreen = () => {
    switch (screen) {
      case Screen.HOME:
        return <ScreenHome onNavigate={setScreen} onNewProject={handleStartProject} />;
      case Screen.PROJECT_SETUP:
        return <ScreenProjectSetup 
          project={project} 
          setProject={setProject} 
          onNext={() => setScreen(Screen.WALL_EDITOR)} 
          onBack={() => setScreen(Screen.HOME)} 
        />;
      case Screen.WALL_EDITOR:
        return <ScreenWallEditor 
          project={project} 
          setProject={setProject} 
          onNext={() => setScreen(Screen.BOM_REPORT)} 
          onBack={() => setScreen(Screen.PROJECT_SETUP)}
        />;
      case Screen.BOM_REPORT:
        return <ScreenBOMReport 
          project={project} 
          onBack={() => setScreen(Screen.WALL_EDITOR)} 
          onHome={() => setScreen(Screen.HOME)} 
        />;
      default:
        return <ScreenHome onNavigate={setScreen} onNewProject={handleStartProject} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-100 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      <main className="flex-1 overflow-hidden relative">
        {renderScreen()}
      </main>
    </div>
  );
}