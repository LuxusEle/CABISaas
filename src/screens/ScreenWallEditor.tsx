import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Box, DoorOpen, Settings, Settings2, RotateCcw, Lock, X, ArrowLeft, ArrowRight, Save, LayoutDashboard, Calculator, Zap, Menu, Layers, Table2, Maximize2 } from 'lucide-react';
import { Screen, Project, Zone, PresetType, CabinetType, CabinetUnit, Obstacle, AutoFillOptions } from '../types';
import { autoFillZone, resolveCollisions, resolveLocalCollisions } from '../services/bomService';
import { Button } from '../components/Button';
import { WallVisualizer } from '../components/WallVisualizer';
import { CabinetViewer } from '../components/3d/CabinetViewer';
import { CabinetSpanSlider } from '../components/CabinetSpanSlider';
import { SingleCabinetEditorModal } from '../components/SingleCabinetEditorModal';
import { TestingSettings } from '../components/CabinetTestingUtils';

interface ScreenWallEditorProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  setScreen: (s: Screen) => void;
  onSave: () => Promise<any>;
  isDark: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isUserPro: boolean;
}

const ScreenWallEditor = ({ 
  project, 
  setProject, 
  setScreen, 
  onSave, 
  isDark, 
  isDirty, 
  isSaving, 
  isUserPro 
}: ScreenWallEditorProps) => {
  const [activeTab, setActiveTab] = useState<string>(project.zones[0]?.id || 'Wall A');
  
  const [isTransparent, setIsTransparent] = useState(false);
  const [isSkeleton, setIsSkeleton] = useState(false);
  
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
  const resizingRef = useRef(false);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [showAdvancedCabinetEditor, setShowAdvancedCabinetEditor] = useState(false);
  const [initialZoneCabinetsBackup, setInitialZoneCabinetsBackup] = useState<CabinetUnit[] | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<{ zones: typeof project.zones; activeTab: string; timestamp: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ zones: typeof project.zones; activeTab: string; timestamp: number }[]>([]);
  const maxHistorySize = 20;

  const [selectedCabinet, setSelectedCabinet] = useState<{ zoneId: string, index: number } | null>(null);
  
  // 3D View states migrated from CabinetViewer
  const [isoViewMode, setIsoViewMode] = useState<string>('isometric');
  const [isoDoorOpenAngle, setIsoDoorOpenAngle] = useState(0);
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('view') === 'iso' ? 'iso' : 'elevation';
  const [visualMode, setVisualMode] = useState<'elevation' | 'iso' | 'studio'>(initialMode as any);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [draggingCabinet, setDraggingCabinet] = useState<CabinetUnit | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<{ x: number, y: number } | null>(null);

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
    if (draggingCabinet) {
      const handleGlobalMove = (e: PointerEvent) => {
        setDraggingPosition({ x: e.clientX, y: e.clientY });
      };
      const handleGlobalUp = () => {
        // We delay slightly to allow onPointerUp on specific components to fire first
        setTimeout(() => {
          setDraggingCabinet(null);
          setDraggingPosition(null);
        }, 50);
      };
      window.addEventListener('pointermove', handleGlobalMove);
      window.addEventListener('pointerup', handleGlobalUp);
      return () => {
        window.removeEventListener('pointermove', handleGlobalMove);
        window.removeEventListener('pointerup', handleGlobalUp);
      };
    }
  }, [draggingCabinet]);

  const handleDropCabinet = (zoneId: string, fromLeft: number, cabinet: CabinetUnit, targetWidth?: number) => {
    const targetId = zoneId || activeTab || project.zones[0]?.id;
    if (!targetId) return;

    const newCabinet: CabinetUnit = {
      ...cabinet,
      id: Math.random().toString(36).substr(2, 9),
      fromLeft,
      width: targetWidth || cabinet.width,
      label: '' 
    };
    
    updateZone(z => resolveCollisions({ ...z, cabinets: [...z.cabinets, newCabinet] }), false, targetId);
    setDraggingCabinet(null);
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
      setRedoStack(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev]);
      setProject(prev => ({ ...prev, zones: lastState.zones }));
      setActiveTab(lastState.activeTab);
      setHistory(remainingHistory);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (redoStack.length > 0) {
      const [nextState, ...remainingRedo] = redoStack;
      setHistory(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev]);
      setProject(prev => ({ ...prev, zones: nextState.zones }));
      setActiveTab(nextState.activeTab);
      setRedoStack(remainingRedo);
    }
  };

  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains('resizer-handle')) {
        resizingRef.current = true;
        dragStartRef.current = { startY: e.clientY, startHeight: tablePanelHeight };
        document.body.classList.add('cursor-ns-resize', 'select-none');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingRef.current && dragStartRef.current) {
        const delta = dragStartRef.current.startY - e.clientY;
        const newHeight = Math.min(Math.max(150, dragStartRef.current.startHeight + delta), window.innerHeight * 0.7);
        setTablePanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      dragStartRef.current = null;
      document.body.classList.remove('cursor-ns-resize', 'select-none');
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tablePanelHeight]);

  const updateZone = (updater: (z: Zone) => Zone | Partial<Zone>, silent = false, zoneIdOverride?: string) => {
    if (!silent) saveToHistory();
    const id = zoneIdOverride || activeTab;
    setProject(prev => {
      const newZones = prev.zones.map(z => {
        if (z.id === id) {
          const res = updater(z);
          return { ...z, ...res };
        }
        return z;
      });
      return { ...prev, zones: newZones };
    });
  };


  const deleteZone = (id: string) => {
    if (project.zones.length > 1 && window.confirm(`Delete ${id}?`)) {
      setProject(prev => ({ ...prev, zones: prev.zones.filter(z => z.id !== id) }));
    }
  };

  const handleCabinetMove = (index: number, newX: number) => {
    updateZone(z => {
      const cabs = [...z.cabinets];
      cabs[index] = { ...cabs[index], fromLeft: newX };
      return resolveLocalCollisions({ ...z, cabinets: cabs }, index, project.settings);
    }, true, activeTab);
  };

  const handleObstacleMove = (index: number, newX: number) => {
    updateZone(z => {
      const obs = [...z.obstacles];
      obs[index] = { ...obs[index], fromLeft: newX };
      return { ...z, obstacles: obs };
    }, true, activeTab);
  };

  const handleSwapCabinets = (i1: number, i2: number) => {
    saveToHistory();
    updateZone(z => {
      const cabs = [...z.cabinets];
      const temp = cabs[i1].fromLeft;
      cabs[i1].fromLeft = cabs[i2].fromLeft;
      cabs[i2].fromLeft = temp;
      return resolveCollisions({ ...z, cabinets: cabs });
    }, false, activeTab);
  };

  const openEdit = (type: 'cabinet' | 'obstacle', index: number) => {
    if (type === 'cabinet') {
      setSelectedCabinet({ zoneId: activeTab, index });
    }
  };

  const updateSelectedCabinet = (updates: Partial<CabinetUnit>) => {
    if (!selectedCabinet) return;
    updateZone(z => {
      const cabs = [...z.cabinets];
      cabs[selectedCabinet.index] = { ...cabs[selectedCabinet.index], ...updates };
      
      // If width or position changed, use local collision resolution (shrinking/blocking)
      if ('width' in updates || 'fromLeft' in updates) {
        return resolveLocalCollisions({ ...z, cabinets: cabs }, selectedCabinet.index, project.settings);
      }
      
      return resolveCollisions({ ...z, cabinets: cabs });
    }, false, selectedCabinet.zoneId);
  };

  const updateSelectedAdvancedSetting = (updates: Partial<TestingSettings>) => {
    if (!selectedCabinet) return;
    updateZone(z => {
      const cabs = [...z.cabinets];
      const cab = cabs[selectedCabinet.index];
      cabs[selectedCabinet.index] = {
        ...cab,
        advancedSettings: { ...(cab.advancedSettings || {}), ...updates }
      };
      return { ...z, cabinets: cabs };
    }, false, selectedCabinet.zoneId);
  };

  const handleResetCabinet = () => {
    if (initialZoneCabinetsBackup && selectedCabinet) {
      const originalCabinets = JSON.parse(JSON.stringify(initialZoneCabinetsBackup));
      updateZone(z => ({ ...z, cabinets: originalCabinets }), false, selectedCabinet.zoneId);
      
      // Sync temp cabinet for editors
      const cab = originalCabinets[selectedCabinet.index];
      if (cab) setTempCabinet(JSON.parse(JSON.stringify(cab)));
    }
  };

  const handleAutoFill = (options: AutoFillOptions) => {
    saveToHistory();
    const result = autoFillZone(currentZone, project.settings, activeTab, options);
    updateZone(() => result, true);
  };

  // Helper for cabinet settings in standard view
  const updateAdvancedSetting = (key: keyof TestingSettings, val: any) => {
    updateSelectedAdvancedSetting({ [key]: val });
  };

  const [tempCabinet, setTempCabinet] = useState<CabinetUnit | null>(null);
  
  useEffect(() => {
    if (selectedCabinet) {
      const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
      const cab = zone?.cabinets[selectedCabinet.index];
      if (cab) setTempCabinet(JSON.parse(JSON.stringify(cab)));
    } else {
      setTempCabinet(null);
    }
  }, [selectedCabinet?.index, selectedCabinet?.zoneId]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">

      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP LAYOUT - HIDDEN ON MOBILE */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          {/* DESKTOP HEADER */}
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Wall Editor</h1>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none">Design & Layout</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 flex-col md:flex-row overflow-hidden relative">
            {/* Main Visualizer Area */}
            <div className="hidden md:flex flex-1 flex-col relative min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
              {/* Desktop: Tab Row */}
              <div className="hidden md:flex items-center justify-between px-6 pt-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {project.zones.map(z => (
                    <button
                      key={z.id}
                      onClick={() => setActiveTab(z.id)}
                      className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-t-xl transition-all relative overflow-hidden group ${activeTab === z.id ? 'bg-slate-50 dark:bg-slate-950 text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {activeTab === z.id && <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />}
                      <span className="relative z-10">{z.id}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 pb-1">
                   <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border dark:border-slate-700">
                    <Button size="xs" variant={visualMode === 'elevation' ? 'primary' : 'secondary'} onClick={() => setVisualMode('elevation')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${visualMode === 'elevation' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-md' : 'bg-transparent text-slate-400 border-none shadow-none'}`}>Elevation</Button>
                    <Button size="xs" variant={visualMode === 'iso' ? 'primary' : 'secondary'} onClick={() => setVisualMode('iso')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${visualMode === 'iso' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-md' : 'bg-transparent text-slate-400 border-none shadow-none'}`}>3D Design</Button>
                    <Button size="xs" variant={visualMode === 'studio' ? 'primary' : 'secondary'} onClick={() => setVisualMode('studio')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${visualMode === 'studio' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-md' : 'bg-transparent text-slate-400 border-none shadow-none'}`}>Studio</Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={handleUndo} disabled={!canUndo} className={`p-2 rounded-lg transition-all ${canUndo ? 'text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-800 cursor-not-allowed'}`} title="Undo (Ctrl+Z)">
                      <ArrowLeft size={18} />
                    </button>
                    <button onClick={handleRedo} disabled={!canRedo} className={`p-2 rounded-lg transition-all ${canRedo ? 'text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-800 cursor-not-allowed'}`} title="Redo (Ctrl+Y)">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />
                  
                  <Button 
                    size="sm" 
                    variant={isTableVisible ? 'primary' : 'secondary'} 
                    onClick={() => setIsTableVisible(!isTableVisible)}
                    className="gap-2 min-w-[100px] transition-all duration-300"
                  >
                    <Table2 size={16} />
                    {isTableVisible ? 'Hide Parts' : 'Show Parts'}
                  </Button>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />
                  
                  <Button 
                    size="sm" 
                    variant={isDirty ? "primary" : "secondary"} 
                    onClick={() => onSave()}
                    disabled={isSaving || !isDirty}
                    className={`gap-2 min-w-[100px] transition-all duration-300 ${
                      isDirty 
                        ? 'shadow-lg shadow-amber-500/20' 
                        : 'opacity-50 grayscale'
                    }`}
                  >
                    <Save size={16} className={isSaving ? 'animate-spin' : isDirty ? 'animate-pulse' : ''} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              {/* View Area */}
              <div className="flex-1 min-h-0 relative bg-slate-100/30 dark:bg-slate-950/50">
                {visualMode === 'elevation' ? (
                  <WallVisualizer 
                    zone={currentZone}
                    height={currentZone.wallHeight || 2400}
                    settings={project.settings}
                    onCabinetClick={(i) => openEdit('cabinet', i)}
                    onObstacleClick={(i) => openEdit('obstacle', i)}
                    onCabinetMove={handleCabinetMove}
                    onObstacleMove={handleObstacleMove}
                    onSwapCabinets={handleSwapCabinets}
                    onDragEnd={() => {}}
                    selectedCabinet={selectedCabinet}
                    draggedCabinet={draggingCabinet}
                    onDropCabinet={handleDropCabinet}
                  />
                ) : (
                  <CabinetViewer 
                    project={project} 
                    activeWallId={activeTab} 
                    onCabinetSelect={(zoneId, i) => setSelectedCabinet({ zoneId, index: i })}
                    onSettingsUpdate={(settings) => setProject(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }))}
                    viewMode={isoViewMode}
                    onViewModeChange={setIsoViewMode}
                    doorOpenAngle={isoDoorOpenAngle}
                    onDoorOpenAngleChange={setIsoDoorOpenAngle}
                    showHardware={true}
                    lightTheme={!isDark}
                    opacity={isTransparent ? 0.4 : 1}
                    selectedCabinet={selectedCabinet}
                    draggedCabinet={draggingCabinet}
                    onDropCabinet={handleDropCabinet}
                    skeletonView={isSkeleton}
                    isStudio={visualMode === 'studio'}
                  />
                )}
              </div>

              {/* Table */}
              {isTableVisible && (
                <div className="hidden md:flex h-1/3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl z-20">
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

        </div>
        {/* END DESKTOP LAYOUT */}

        {/* Mobile: Stack layout */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
            {/* View Modes & Add Tools - Row 2 (Now Row 1) */}
            <div className={`flex flex-col shrink-0 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900 ${visualMode === 'studio' ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between px-2 py-2 gap-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 border dark:border-slate-700">
                  <button onClick={() => setVisualMode('elevation')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${visualMode === 'elevation' ? 'bg-white dark:bg-slate-950 text-amber-500 shadow-sm' : 'text-slate-500'}`}>Elv</button>
                  <button onClick={() => setVisualMode('iso')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${visualMode === 'iso' ? 'bg-white dark:bg-slate-950 text-amber-500 shadow-sm' : 'text-slate-500'}`}>3D</button>
                  <button onClick={() => setVisualMode('studio')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${visualMode === 'studio' ? 'bg-white dark:bg-slate-950 text-amber-500 shadow-sm' : 'text-slate-500'}`}>Studio</button>
                </div>

                <div className="flex items-center gap-1 pr-1">
                  <button onClick={handleUndo} disabled={!canUndo} className={`p-2 rounded-lg bg-white dark:bg-slate-800 border dark:border-slate-700 ${canUndo ? 'text-amber-500 shadow-sm' : 'text-slate-300 opacity-50'}`}>
                    <ArrowLeft size={16} />
                  </button>
                  <button onClick={handleRedo} disabled={!canRedo} className={`p-2 rounded-lg bg-white dark:bg-slate-800 border dark:border-slate-700 ${canRedo ? 'text-amber-500 shadow-sm' : 'text-slate-300 opacity-50'}`}>
                    <ArrowRight size={16} />
                  </button>
                  <button 
                    onClick={() => onSave()}
                    disabled={isSaving || !isDirty}
                    className={`p-2 rounded-lg border transition-all ${isDirty ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 opacity-50'}`}
                  >
                    <Save size={16} className={isSaving ? 'animate-spin' : ''} />
                  </button>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                  <button 
                    onClick={() => setIsTableVisible(!isTableVisible)}
                    className={`p-2.5 rounded-lg border transition-all ${isTableVisible ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 shadow-sm'}`}
                    title="Toggle Parts List"
                  >
                    <Table2 size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* View Area - Mobile */}
            {/* Mobile View Area - Elevation/3D */}
            <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden border-b dark:border-slate-800">
              {/* Floating Wall Tabs - Elevation Only */}
              {visualMode === 'elevation' && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="px-2 text-[8px] font-black uppercase text-slate-400 mr-1 italic tracking-tighter">Wall View</div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
                    {project.zones.map(z => (
                      <button 
                        key={z.id} 
                        onClick={() => setActiveTab(z.id)} 
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === z.id ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}
                      >
                        {z.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Floating ISO View Modes - 3D Only */}
              {visualMode === 'iso' && (
                <div className="absolute top-3 left-3 z-20 flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border dark:border-slate-700">
                     <button onClick={() => setIsoViewMode('isometric')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isoViewMode === 'isometric' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-400'}`}>ISO</button>
                     <button onClick={() => setIsoViewMode('top')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isoViewMode === 'top' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-400'}`}>TOP</button>
                     <button onClick={() => setIsoViewMode('front')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isoViewMode === 'front' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-400'}`}>FRO</button>
                   </div>
                </div>
              )}

              {/* Floating Exit - Studio Only */}
              {visualMode === 'studio' && (
                <div className="absolute top-3 left-3 z-20 flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1 rounded-xl border border-slate-200/30 dark:border-slate-800/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 hover:bg-white/90 dark:hover:bg-slate-900/90 transition-all">
                   <button 
                    onClick={() => setVisualMode('iso')} 
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
                   >
                     <Maximize2 size={14} className="rotate-45" />
                     <span>Exit Studio</span>
                   </button>
                </div>
              )}

              {visualMode === 'elevation' ? (
                <WallVisualizer 
                  zone={currentZone}
                  height={currentZone.wallHeight || 2400}
                  settings={project.settings}
                  onCabinetClick={(i) => openEdit('cabinet', i)}
                  onObstacleClick={(i) => openEdit('obstacle', i)}
                  onCabinetMove={handleCabinetMove}
                  onObstacleMove={handleObstacleMove}
                  onSwapCabinets={handleSwapCabinets}
                  onDragEnd={() => {}}
                  selectedCabinet={selectedCabinet}
                  draggedCabinet={draggingCabinet}
                  onDropCabinet={handleDropCabinet}
                />
              ) : (
                <CabinetViewer 
                  project={project} 
                  activeWallId={activeTab} 
                  onCabinetSelect={visualMode === 'studio' ? undefined : ((zoneId, i) => setSelectedCabinet({ zoneId, index: i }))}
                  onSettingsUpdate={(settings) => setProject(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }))}
                  viewMode={isoViewMode}
                  onViewModeChange={setIsoViewMode}
                  doorOpenAngle={isoDoorOpenAngle}
                  onDoorOpenAngleChange={setIsoDoorOpenAngle}
                  showHardware={true}
                  lightTheme={!isDark}
                  draggedCabinet={draggingCabinet}
                  onDropCabinet={handleDropCabinet}
                  selectedCabinet={visualMode === 'studio' ? null : selectedCabinet}
                  opacity={isTransparent ? 0.4 : 1}
                  skeletonView={isSkeleton}
                  isStudio={visualMode === 'studio'}
                />
              )}

            </div>
 
            {/* MOBILE CABINET EDITOR BOTTOM MENU (INTEGRATED) */}
            {selectedCabinet && (
              <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 animate-in slide-in-from-bottom duration-300">
                <div className="px-4 pb-4 pt-2">
                  {/* Handle */}
                  <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
                  
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      {(() => {
                        const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
                        const cab = zone?.cabinets[selectedCabinet.index];
                        if (!cab) return null;
                        return (
                          <>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Edit {cab.label || 'Cabinet'}</h3>
                            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-none">{cab.preset}</p>
                          </>
                        );
                      })()}
                    </div>
                    <button 
                      onClick={() => setSelectedCabinet(null)}
                      className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {(() => {
                    const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
                    const cab = zone?.cabinets[selectedCabinet.index];
                    if (!cab) return null;
                    return (
                      <div className="space-y-2">
                        {/* QUICK TOGGLES ROW (Doors, Shelves, Drawers) - WEIGHTED GRID */}
                        <div className="grid grid-cols-4 gap-1.5 pb-1">
                          {/* Doors - 1/4 Width */}
                          <label className={`col-span-1 flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg border transition-all ${cab.advancedSettings?.showDoors ?? (cab.preset === PresetType.SINK_UNIT ? true : true) ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60'}`}>
                            <input 
                              type="checkbox" 
                              checked={cab.advancedSettings?.showDoors ?? (cab.preset === PresetType.SINK_UNIT ? true : true)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updates: Partial<TestingSettings> = { showDoors: checked };
                                if (checked) updates.showDrawers = false;
                                updateSelectedAdvancedSetting(updates);
                              }}
                              className="w-3 h-3 accent-amber-500"
                            />
                            <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Doors</span>
                          </label>

                          {/* Shelves - 1/2 Width if enabled, else 1/4 */}
                          <div className={`${cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true) ? 'col-span-2' : cab.advancedSettings?.showDrawers ? 'col-span-1' : 'col-span-2'} flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg border transition-all ${cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true) ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60'}`}>
                            <input 
                              type="checkbox" 
                              checked={cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updates: Partial<TestingSettings> = { showShelves: checked };
                                if (checked) updates.showDrawers = false;
                                updateSelectedAdvancedSetting(updates);
                              }}
                              className="w-3 h-3 accent-amber-500"
                            />
                            <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Shelves</span>
                            {(cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true)) && (
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-md px-1 py-0.5 shadow-sm ml-0.5 border dark:border-slate-600">
                                <button onClick={() => {
                                  const current = cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2);
                                  updateSelectedAdvancedSetting({ numShelves: Math.max(0, current - 1) });
                                }} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-amber-500">-</button>
                                <span className="text-[9px] font-bold w-3 text-center dark:text-white">{cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2)}</span>
                                <button onClick={() => {
                                  const current = cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2);
                                  updateSelectedAdvancedSetting({ numShelves: current + 1 });
                                }} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-amber-500">+</button>
                              </div>
                            )}
                          </div>

                          {/* Drawers - 1/2 Width if enabled, else 1/4 */}
                          <div className={`${cab.advancedSettings?.showDrawers ? 'col-span-2' : (cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true)) ? 'col-span-1' : 'col-span-1'} flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg border transition-all ${cab.advancedSettings?.showDrawers ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60'}`}>
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
                              className="w-3 h-3 accent-amber-500"
                            />
                            <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Drawers</span>
                            {(cab.advancedSettings?.showDrawers ?? false) && (
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-md px-1 py-0.5 shadow-sm ml-0.5 border dark:border-slate-600">
                                <button onClick={() => {
                                  const current = cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3);
                                  updateSelectedAdvancedSetting({ numDrawers: Math.max(0, current - 1) });
                                }} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-amber-500">-</button>
                                <span className="text-[9px] font-bold w-3 text-center dark:text-white">{cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3)}</span>
                                <button onClick={() => {
                                  const current = cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3);
                                  updateSelectedAdvancedSetting({ numDrawers: current + 1 });
                                }} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-amber-500">+</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <CabinetSpanSlider 
                          totalLength={currentZone.totalLength}
                          fromLeft={cab.fromLeft}
                          width={cab.width}
                          onChange={(updates) => updateSelectedCabinet(updates)}
                        />
                        
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => {
                              if (isUserPro) setShowAdvancedCabinetEditor(true);
                              else setScreen(Screen.PRICING);
                            }}
                            className="py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center justify-center gap-1.5"
                          >
                            {isUserPro ? <Settings size={12} /> : <Lock size={12} />} Advanced
                          </button>
                          <button 
                            onClick={handleResetCabinet}
                            className="py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw size={12} /> Reset
                          </button>
                          <button 
                            onClick={() => {
                              updateZone(z => {
                                const cabs = z.cabinets.filter((_, i) => i !== selectedCabinet.index);
                                return resolveCollisions({ ...z, cabinets: cabs });
                              }, false, selectedCabinet.zoneId);
                              setSelectedCabinet(null);
                            }}
                            className="py-2.5 bg-rose-500 text-white font-black uppercase tracking-widest text-[9px] rounded-lg flex items-center justify-center gap-1.5"
                          >
                            <X size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Mobile Sidebar Content - Ultra Compact */}
            <div className={`shrink-0 overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col ${visualMode === 'studio' || isTableVisible || !!selectedCabinet ? 'hidden' : ''}`}>
              {/* Row 1: Add Units (4 in a row) */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { type: CabinetType.BASE, preset: PresetType.BASE_DOOR, label: 'Base', icon: <Box size={18} /> },
                    { type: CabinetType.WALL, preset: PresetType.WALL_STD, label: 'Wall', icon: <Layers size={18} /> },
                    { type: CabinetType.TALL, preset: PresetType.TALL_UTILITY, label: 'Tall', icon: <Layers size={18} className="rotate-90" /> },
                    { type: CabinetType.BASE, preset: PresetType.SINK_UNIT, label: 'Sink', icon: <Box size={18} className="text-blue-500" /> },
                  ].map((proto, i) => (
                    <button 
                      key={i}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        (e.currentTarget as any).releasePointerCapture(e.pointerId);
                        const { icon, ...protoData } = proto;
                        setDraggingCabinet({ ...protoData, id: 'proto', width: 600, qty: 1, fromLeft: 0 } as any);
                        setDraggingPosition({ x: e.clientX, y: e.clientY });
                      }}
                      onClick={() => {
                        const { icon, ...protoData } = proto;
                        handleDropCabinet(activeTab, 0, protoData as CabinetUnit);
                      }}
                      className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl transition-all active:scale-95 touch-none"
                    >
                      <div className="text-slate-400 mb-1">{proto.icon}</div>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">{proto.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Door Slider & View Toggles */}
              <div className="px-3 py-2 space-y-2">
                {visualMode === 'iso' && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <DoorOpen size={16} className="text-amber-500 shrink-0" />
                      <input
                        type="range" min="0" max="45" value={isoDoorOpenAngle}
                        onChange={(e) => setIsoDoorOpenAngle(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-[10px] font-mono font-bold text-amber-500 min-w-[24px] text-right">{isoDoorOpenAngle}°</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button onClick={() => setIsTransparent(!isTransparent)} className={`p-2 rounded-lg border transition-all ${isTransparent ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                         <div className="w-4 h-4 flex items-center justify-center text-[8px] font-black">TR</div>
                      </button>
                      <button onClick={() => setIsSkeleton(!isSkeleton)} className={`p-2 rounded-lg border transition-all ${isSkeleton ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                         <div className="w-4 h-4 flex items-center justify-center text-[8px] font-black">SK</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Table */}
            {isTableVisible && (
              <div className="shrink-0 bg-white dark:bg-slate-950 overflow-hidden flex flex-col z-20 border-t border-slate-200 dark:border-slate-800 h-[250px]">
                <div className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Material & Items ({(currentZone?.cabinets.length || 0) + (currentZone?.obstacles.length || 0)})</span>
                  <button onClick={() => setIsTableVisible(false)} className="hover:text-slate-700"><X size={14} /></button>
                </div>
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
              </div>
            )}
          </div>

        {/* Desktop Sidebar: Presets or Selected Cabinet Editor */}
        <div className={`hidden md:flex w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col overflow-hidden shrink-0 ${visualMode === 'studio' ? '!hidden' : ''}`}>
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


                return (
                  <div className="space-y-5">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Active Unit</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{cab.label || 'Cabinet'} - {cab.preset}</p>
                    </div>

                    {/* Width */}
                    <CabinetSpanSlider 
                      totalLength={currentZone.totalLength}
                      fromLeft={cab.fromLeft}
                      width={cab.width}
                      onChange={(updates) => updateSelectedCabinet(updates)}
                      onDragEnd={() => {}}
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
                            checked={cab.advancedSettings?.showDoors ?? (cab.preset === PresetType.SINK_UNIT ? true : true)}
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
                              checked={cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true)}
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
                                onClick={() => {
                                  const current = cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2);
                                  updateSelectedAdvancedSetting({ numShelves: Math.max(0, current - 1) });
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                              >-</button>
                              <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2)}</span>
                              <button 
                                onClick={() => {
                                  const current = cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2);
                                  updateSelectedAdvancedSetting({ numShelves: current + 1 });
                                }}
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
                                  onClick={() => {
                                    const current = cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3);
                                    updateSelectedAdvancedSetting({ numDrawers: Math.max(0, current - 1) });
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                >-</button>
                                <span className="flex-1 text-center font-bold">{cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3)}</span>
                                <button 
                                  onClick={() => {
                                    const current = cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3);
                                    updateSelectedAdvancedSetting({ numDrawers: current + 1 });
                                  }}
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
                        onClick={() => {
                          if (isUserPro) {
                            setShowAdvancedCabinetEditor(true);
                          } else {
                            setScreen(Screen.PRICING);
                          }
                        }}
                        className={`w-full py-2.5 ${isUserPro ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' : 'bg-slate-700 hover:bg-slate-600 opacity-90'} text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2`}
                      >
                        {isUserPro ? <Settings2 size={14} /> : <Lock size={14} className="text-amber-400" />}
                        Advanced 3D Editor {!isUserPro && <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">PRO</span>}
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
              {/* Migrated 3D Controls Sidebar Section */}
              {visualMode === 'iso' && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">View Controls</label>
                    <button 
                      onClick={() => {
                        const current = isoViewMode;
                        setIsoViewMode('');
                        setTimeout(() => setIsoViewMode(current), 10);
                      }}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-500 shadow-sm transition-all"
                      title="Reset View"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>

                  {/* View Modes */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {['front', 'side', 'top', 'isometric'].map((v) => (
                      <button
                        key={v}
                        onClick={() => setIsoViewMode(v)}
                        className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                          isoViewMode === v 
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Transparent Mode */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Transparent View</span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={isTransparent}
                          onChange={(e) => {
                            setIsTransparent(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                      </div>
                    </label>
                  </div>

                  {/* Skeleton Mode */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Skeleton View</span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={isSkeleton}
                          onChange={(e) => {
                            setIsSkeleton(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                      </div>
                    </label>
                  </div>

                  {/* Gola Mode */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Global Gola Mode</span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={project.settings.advancedTestingSettings?.enableGola ?? false}
                          onChange={(e) => {
                            setProject(prev => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                advancedTestingSettings: {
                                  ...prev.settings.advancedTestingSettings,
                                  enableGola: e.target.checked
                                }
                              }
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                      </div>
                    </label>
                  </div>

                  {/* Doors Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Doors Open</span>
                      <span className="text-[10px] font-mono text-amber-500">{isoDoorOpenAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={isoDoorOpenAngle}
                      onChange={(e) => setIsoDoorOpenAngle(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}

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
                      (e.currentTarget as any).releasePointerCapture(e.pointerId);
                      const { icon, ...protoData } = proto;
                      setDraggingCabinet({ ...protoData, id: 'proto', width: 600, qty: 1, fromLeft: 0 } as any);
                      setDraggingPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onClick={() => {
                      const { icon, ...protoData } = proto;
                      handleDropCabinet(activeTab, 0, protoData as CabinetUnit);
                    }}
                    className="group bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-lg transition-all flex items-center gap-3 select-none active:scale-95 touch-none"
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

      {/* Advanced Cabinet Editor Modal */}
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

      {/* Dragging Ghost */}
      {draggingCabinet && draggingPosition && (
        <div 
          className="fixed pointer-events-none z-[9999] opacity-70"
          style={{ 
            left: draggingPosition.x, 
            top: draggingPosition.y,
            transform: 'translate(-50%, -50%)',
            width: '120px'
          }}
        >
          <div className="bg-amber-500/20 border-2 border-amber-500 rounded-xl p-4 flex items-center gap-3 shadow-2xl backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-amber-500 border border-amber-500/30">
              <Box size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-100">{draggingCabinet.label || draggingCabinet.preset}</div>
              <div className="text-[8px] text-amber-600 uppercase font-black">Dragging...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenWallEditor;
