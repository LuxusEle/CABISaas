import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { FileText, MapPin, Phone, Sparkles, Layout, Layers, Cpu, ArrowRight, CheckCircle2, AlertCircle, Wand2, X, Box, Settings2, RotateCcw, Undo2, Redo2 } from 'lucide-react';
import { Project, CabinetType, CabinetUnit, PresetType, Zone } from '../types';
import { Button } from '../components/Button';
import { WallEditModal } from '../components/WallEditModal';
import { WallLimitsModal } from '../components/WallLimitsModal';
import { createNewProject, resolveCollisions, resolveLocalCollisions } from '../services/bomService';
import { supabase } from '../services/supabaseClient';
import { CabinetViewer } from '../components/3d/CabinetViewer';
import { generateRubyLayout } from '../services/layoutSolver';
import { CabinetSpanSlider } from '../components/CabinetSpanSlider';
import { SingleCabinetEditorModal } from '../components/SingleCabinetEditorModal';

interface ScreenEmbedSetupProps {
  isDark: boolean;
}

const ScreenEmbedSetup = ({ isDark }: ScreenEmbedSetupProps) => {
  const location = useLocation();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [project, setProject] = useState<Project>(() => createNewProject(undefined, '$'));
  const [activeModal, setActiveModal] = useState<'project' | 'walls' | 'limits' | 'preferences' | 'design' | 'success' | null>('project');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  const wallEditRef = useRef<any>(null);
  const wallLimitsRef = useRef<any>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const [visualMode, setVisualMode] = useState<'iso' | 'studio'>('iso');
  const [isoViewMode, setIsoViewMode] = useState<string>('isometric');
  const [isoDoorOpenAngle, setIsoDoorOpenAngle] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('Wall A');
  const [selectedCabinet, setSelectedCabinet] = useState<{ zoneId: string, id: string } | null>(null);

  const [showAdvancedCabinetEditor, setShowAdvancedCabinetEditor] = useState(false);
  const [initialZoneCabinetsBackup, setInitialZoneCabinetsBackup] = useState<CabinetUnit[] | null>(null);
  const [history, setHistory] = useState<{ zones: typeof project.zones; activeTab: string; timestamp: number }[]>([]);
  const [redoStack, setRedoStack] = useState<{ zones: typeof project.zones; activeTab: string; timestamp: number }[]>([]);
  const [isTransparent, setIsTransparent] = useState(false);
  const [isSkeleton, setIsSkeleton] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<{ zoneId: string, index: number }[]>([]);
  const [draggingCabinet, setDraggingCabinet] = useState<CabinetUnit | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (draggingCabinet) {
      const handleGlobalMove = (e: PointerEvent) => {
        setDraggingPosition({ x: e.clientX, y: e.clientY });
      };
      const handleGlobalUp = () => {
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

  const maxHistorySize = 20;

  const saveToHistory = React.useCallback(() => {
    setHistory(prev => {
      const newHistory = [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev].slice(0, maxHistorySize);
      return newHistory;
    });
    setRedoStack([]);
  }, [project.zones, activeTab]);

  const handleUndo = () => {
    if (history.length > 0) {
      const [lastState, ...remainingHistory] = history;
      setRedoStack(prev => [{ zones: JSON.parse(JSON.stringify(project.zones)), activeTab, timestamp: Date.now() }, ...prev]);
      setProject(prev => ({ ...prev, zones: lastState.zones }));
      setActiveTab(lastState.activeTab);
      setHistory(remainingHistory);
    }
  };

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

  const handleResetCabinet = () => {
    if (initialZoneCabinetsBackup && selectedCabinet) {
      const originalCabinets = JSON.parse(JSON.stringify(initialZoneCabinetsBackup));
      setProject(prev => {
        const newZones = prev.zones.map(z => {
          if (z.id !== selectedCabinet.zoneId) return z;
          return { ...z, cabinets: originalCabinets };
        });
        return { ...prev, zones: newZones };
      });
      const cab = originalCabinets.find((c: any) => c.id === selectedCabinet.id);
      if (cab) {
        setTempCabinet(JSON.parse(JSON.stringify(cab)));
      }
    }
  };

  const [tempCabinet, setTempCabinet] = useState<CabinetUnit | null>(null);

  useEffect(() => {
    if (selectedCabinet) {
      const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
      if (zone) {
        setInitialZoneCabinetsBackup(JSON.parse(JSON.stringify(zone.cabinets)));
        const cab = zone.cabinets.find(c => c.id === selectedCabinet.id);
        if (cab) {
          setTempCabinet(JSON.parse(JSON.stringify(cab)));
        }
      }
    } else {
      setInitialZoneCabinetsBackup(null);
      setTempCabinet(null);
    }
  }, [selectedCabinet?.id, selectedCabinet?.zoneId]);

  const handleCabinetSelection = React.useCallback((index: number, zoneId?: string) => {
    const targetZoneId = zoneId || activeTab;
    const zone = project.zones.find(z => z.id === targetZoneId);
    if (!zone) return;
    
    const cab = zone.cabinets[index];
    if (!cab) return;

    if (swapMode) {
      const isCorner = (c: CabinetUnit) => c.preset === PresetType.BASE_CORNER || c.preset === PresetType.WALL_CORNER;
      const hasDecorativePanel = (c: CabinetUnit) => !!c.exposedLeft || !!c.exposedRight;
      const getStack = (z: Zone, fromLeft: number) => z.cabinets.filter(c => c.fromLeft === fromLeft);
      
      const currentStack = getStack(zone, cab.fromLeft);
      if (currentStack.some(c => isCorner(c) || hasDecorativePanel(c))) {
        return;
      }
      
      if (swapSelection.length > 0) {
        const s1 = swapSelection[0];
        const z1 = project.zones.find(z => z.id === s1.zoneId);
        const z2 = project.zones.find(z => z.id === targetZoneId);
        if (!z1 || !z2) return;
        const cab1 = z1.cabinets[s1.index];
        const cab2 = z2.cabinets[index];
        if (!cab1 || !cab2) return;
        
        if (cab1.width !== cab2.width) return;
        if (cab1.id === cab2.id) return;
        if (cab1.type !== cab2.type) return;

        saveToHistory();

        setProject(prev => {
          const newZones = prev.zones.map(z => {
            const nextCabs = [...z.cabinets];
            if (z.id === s1.zoneId && z.id === targetZoneId) {
              const c1 = nextCabs[s1.index];
              const c2 = nextCabs[index];
              const pos1 = c1.fromLeft;
              const pos2 = c2.fromLeft;
              nextCabs[s1.index] = { ...c2, fromLeft: pos1 };
              nextCabs[index] = { ...c1, fromLeft: pos2 };
            } else {
              if (z.id === s1.zoneId) {
                const c1 = nextCabs[s1.index];
                const z2Local = prev.zones.find(zoneLocal => zoneLocal.id === targetZoneId);
                const c2 = z2Local?.cabinets[index];
                if (c2) {
                  const pos1 = c1.fromLeft;
                  nextCabs[s1.index] = { ...c2, fromLeft: pos1 };
                }
              }
              if (z.id === targetZoneId) {
                const c2 = nextCabs[index];
                const z1Local = prev.zones.find(zoneLocal => zoneLocal.id === s1.zoneId);
                const c1 = z1Local?.cabinets[s1.index];
                if (c1) {
                  const pos2 = c2.fromLeft;
                  nextCabs[index] = { ...c1, fromLeft: pos2 };
                }
              }
            }
            return { ...z, cabinets: nextCabs };
          });
          return { ...prev, zones: newZones };
        });

        setSwapMode(false);
        setSwapSelection([]);
      } else {
        setSwapSelection([{ zoneId: targetZoneId, index }]);
      }
    } else {
      setSelectedCabinet({ zoneId: targetZoneId, id: cab.id });
    }
  }, [swapMode, swapSelection, activeTab, project.zones, saveToHistory]);

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
    
    saveToHistory();
    setProject(prev => {
      const newZones = prev.zones.map(z => {
        if (z.id === targetId) {
          return resolveCollisions({ ...z, cabinets: [...z.cabinets, newCabinet] });
        }
        return z;
      });
      return { ...prev, zones: newZones };
    });
    setDraggingCabinet(null);
  };

  const wizardSteps = ['project', 'walls', 'limits', 'preferences', 'design'];

  const updateSelectedCabinet = (updates: Partial<CabinetUnit>) => {
    if (!selectedCabinet) return;
    saveToHistory();
    setProject(prev => {
      const newZones = prev.zones.map(z => {
        if (z.id !== selectedCabinet.zoneId) return z;
        let cabs = z.cabinets.map(c => {
          if (c.id !== selectedCabinet.id) return c;
          return { ...c, ...updates };
        });

        // Sync counterpart cooker/hood
        if ('width' in updates || 'fromLeft' in updates) {
          const targetCab = z.cabinets.find(c => c.id === selectedCabinet.id);
          if (targetCab) {
            const oldFromLeft = targetCab.fromLeft;
            const newWidth = updates.width ?? targetCab.width;
            const newFromLeft = updates.fromLeft ?? targetCab.fromLeft;
            const isCookerType = targetCab.preset === PresetType.COOKER_HOB || targetCab.preset === PresetType.BASE_DRAWER_3;
            const isHoodType = targetCab.preset === PresetType.HOOD_UNIT;
            
            if (isCookerType || isHoodType) {
              cabs = cabs.map(c => {
                if (c.id === selectedCabinet.id) return c;
                const isOtherCooker = c.preset === PresetType.COOKER_HOB || c.preset === PresetType.BASE_DRAWER_3;
                const isOtherHood = c.preset === PresetType.HOOD_UNIT;
                
                if (c.fromLeft === oldFromLeft) {
                  if ((isCookerType && isOtherHood) || (isHoodType && isOtherCooker)) {
                    return { ...c, width: newWidth, fromLeft: newFromLeft };
                  }
                }
                return c;
              });
            }
          }
        }

        const changedIndex = cabs.findIndex(c => c.id === selectedCabinet.id);
        if (changedIndex !== -1 && ('width' in updates || 'fromLeft' in updates)) {
          return resolveLocalCollisions({ ...z, cabinets: cabs }, changedIndex, prev.settings);
        }

        return resolveCollisions({ ...z, cabinets: cabs });
      });
      return { ...prev, zones: newZones };
    });
  };

  const updateSelectedAdvancedSetting = (updates: any) => {
    if (!selectedCabinet) return;
    saveToHistory();
    setProject(prev => {
      const newZones = prev.zones.map(z => {
        if (z.id !== selectedCabinet.zoneId) return z;
        const cabs = z.cabinets.map(c => {
          if (c.id !== selectedCabinet.id) return c;
          return {
            ...c,
            advancedSettings: { ...(c.advancedSettings || {}), ...updates }
          };
        });
        return { ...z, cabinets: cabs };
      });
      return { ...prev, zones: newZones };
    });
  };

  const handleDeleteCabinet = () => {
    if (!selectedCabinet) return;
    saveToHistory();
    setProject(prev => {
      const newZones = prev.zones.map(z => {
        if (z.id !== selectedCabinet.zoneId) return z;
        
        // Remove cooker/hood counterpart too if deleted
        const targetCab = z.cabinets.find(c => c.id === selectedCabinet.id);
        let filterIds = [selectedCabinet.id];
        if (targetCab && (targetCab.preset === PresetType.COOKER_HOB || targetCab.preset === PresetType.BASE_DRAWER_3 || targetCab.preset === PresetType.HOOD_UNIT)) {
          const oldFromLeft = targetCab.fromLeft;
          const counterpart = z.cabinets.find(c => c.id !== selectedCabinet.id && c.fromLeft === oldFromLeft && (c.preset === PresetType.COOKER_HOB || c.preset === PresetType.BASE_DRAWER_3 || c.preset === PresetType.HOOD_UNIT));
          if (counterpart) {
            filterIds.push(counterpart.id);
          }
        }
        
        const filteredCabs = z.cabinets.filter(c => !filterIds.includes(c.id));
        return resolveCollisions({ ...z, cabinets: filteredCabs });
      });
      return { ...prev, zones: newZones };
    });
    setSelectedCabinet(null);
  };

  // Parse query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const key = params.get('apiKey');
    setApiKey(key);
    if (!key) {
      setErrorMessage('Missing API Key. Please verify your widget embed code.');
    }
  }, [location.search]);

  // Auto-generate layout when entering the design tab
  useEffect(() => {
    if (activeModal === 'design') {
      try {
        const result = generateRubyLayout(project);
        setProject(result.project);
        if (result.project.zones.length > 0) {
          const firstActiveZone = result.project.zones.find(z => z.active) || result.project.zones[0];
          setActiveTab(firstActiveZone.id);
        }
      } catch (err) {
        console.error('Error generating layout solver:', err);
      }
    }
    setSelectedCabinet(null);
  }, [activeModal]);

  // Step validation
  const isIdentityDone = project.name.trim().length > 0;
  const isWallsDone = project.zones.length > 0 && project.zones.some(z => z.totalLength > 0);
  const isLimitsDone = isWallsDone && project.zones.every(z => (z.startLimit !== undefined && z.endLimit !== undefined) || (z.startLimit === 0 && z.endLimit === z.totalLength));
  const isPreferencesDone = !!project.settings.layoutPreferences;

  const isReadyToSubmit = isIdentityDone && isWallsDone && isLimitsDone;

  const handleNextStep = () => {
    if (!activeModal) return;

    if (activeModal === 'walls' && wallEditRef.current) {
      wallEditRef.current.triggerSave();
      return;
    }
    if (activeModal === 'limits' && wallLimitsRef.current) {
      wallLimitsRef.current.triggerSave();
      return;
    }

    const currentIndex = wizardSteps.indexOf(activeModal);
    if (currentIndex !== -1 && currentIndex < wizardSteps.length - 1) {
      setDirection('forward');
      setActiveModal(wizardSteps[currentIndex + 1] as any);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (!activeModal) return;
    const currentIndex = wizardSteps.indexOf(activeModal);
    if (currentIndex > 0) {
      setDirection('backward');
      setActiveModal(wizardSteps[currentIndex - 1] as any);
    }
  };

  const handleSubmit = async () => {
    if (!apiKey) {
      setErrorMessage('Cannot save: API Key is missing.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Invoke Supabase Edge Function securely
      const { data, error } = await supabase.functions.invoke('create-embed-project', {
        body: {
          apiKey,
          projectData: project
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to save project.');
      }

      setSavedProjectId(data.projectId);
      setActiveModal('success');

      // Post success message to parent website
      if (window.parent) {
        window.parent.postMessage({
          type: 'SETUP_COMPLETED',
          projectId: data.projectId
        }, '*');
      }
    } catch (err: any) {
      console.error('Error submitting embedded project:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepSidebarItem = ({ step, index, isActive, isDone, isRequired }: { step: string, index: number, isActive: boolean, isDone: boolean, isRequired: boolean }) => {
    const getIcon = () => {
      if (isDone) return <CheckCircle2 className="text-green-500" size={18} />;
      if (isActive) return <ArrowRight className="text-amber-500 animate-pulse" size={18} />;
      if (isRequired) return <AlertCircle className="text-amber-200" size={18} />;
      return <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-800" />;
    };

    const getLabel = () => {
      switch (step) {
        case 'project': return 'Identity';
        case 'walls': return 'Room Layout';
        case 'limits': return 'Wall Limits';
        case 'preferences': return 'Special Units';
        case 'design': return '3D Preview';
        default: return step;
      }
    };

    return (
      <button
        onClick={() => {
          const newIndex = wizardSteps.indexOf(step);
          const currentIndex = wizardSteps.indexOf(activeModal || 'project');
          setDirection(newIndex > currentIndex ? 'forward' : 'backward');
          setActiveModal(step as any);
        }}
        className={`w-full flex items-center gap-4 rounded-2xl p-4 transition-all border-2 text-left relative ${
          isActive 
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xl' 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
        }`}
      >
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isActive ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-amber-600' : 'text-slate-500'}`}>
            Step {index + 1}
          </p>
          <h4 className={`text-xs font-bold uppercase truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {getLabel()}
          </h4>
        </div>
      </button>
    );
  };

  if (errorMessage && activeModal !== 'success') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-red-500/20 p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Integration Error</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-6">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl relative">
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden p-4">
            <div className="h-full w-full max-w-none transition-all duration-500 relative">
              <AnimatePresence initial={false} custom={direction}>
                {activeModal === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 h-full w-full flex items-center justify-center"
                  >
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-emerald-500/20 p-10 max-w-md w-full text-center shadow-2xl">
                      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                        <CheckCircle2 size={40} className="animate-bounce" />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-3">Setup Complete!</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic mb-6">Your kitchen specifications have been successfully sent to the designer's account.</p>
                      <button 
                        onClick={() => {
                          if (window.parent) {
                            window.parent.postMessage({ type: 'SETUP_COMPLETED' }, '*');
                          }
                        }}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                      >
                        Close Setup
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={activeModal}
                    custom={direction}
                    variants={{
                      enter: (dir: string) => ({ x: dir === 'forward' ? '100%' : '-100%', opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (dir: string) => ({ x: dir === 'forward' ? '-100%' : '100%', opacity: 0 })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ x: { type: "spring", stiffness: 300, damping: 35 }, opacity: { duration: 0.2 } }}
                    className="absolute inset-0 h-full w-full"
                  >
                    <div className={`h-full w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-200/60 dark:border-slate-800 shadow-xl ${['walls', 'limits', 'design'].includes(activeModal as string) ? '' : 'p-4 sm:p-10 overflow-y-auto'}`}>
                      <div className={`${['walls', 'limits', 'design'].includes(activeModal as string) ? 'h-full w-full' + (activeModal === 'design' ? '' : ' px-4') : 'max-w-5xl mx-auto w-full'}`}>
                        
                        {activeModal === 'project' && (
                          <div className="h-full flex flex-col justify-center py-10">
                            <div className="max-w-4xl mx-auto w-full px-6">
                              <div className="text-center mb-10 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                                <h2 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase mb-2 leading-tight">
                                  Kitchen <span className="text-amber-500">Configurator</span>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic max-w-md mx-auto">
                                  Let's design your standard setup. Fill in your project specifications to begin.
                                </p>
                              </div>

                              <div className="space-y-6 relative">
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="group relative">
                                    <label className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Customer Name</label>
                                    <div className="relative">
                                      <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                                      <input 
                                        className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-amber-500 outline-none dark:text-white font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all" 
                                        placeholder="John Doe" 
                                        value={project.name} 
                                        onChange={e => setProject({ ...project, name: e.target.value })} 
                                      />
                                    </div>
                                  </div>

                                  <div className="group relative">
                                    <label className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Contact Number</label>
                                    <div className="relative">
                                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                      <input 
                                        type="tel"
                                        className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-emerald-500 outline-none dark:text-white font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all" 
                                        placeholder="+1 234 567 890" 
                                        value={project.customerPhone || ''} 
                                        onChange={e => setProject({ ...project, customerPhone: e.target.value })} 
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="group relative">
                                  <label className="text-[9px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Site Address</label>
                                  <div className="relative">
                                    <MapPin className="absolute left-5 top-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <textarea 
                                      rows={3}
                                      className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none dark:text-white font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all resize-none" 
                                      placeholder="Full delivery/installation address" 
                                      value={project.customerAddress || ''} 
                                      onChange={e => setProject({ ...project, customerAddress: e.target.value })} 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeModal === 'walls' && (
                          <WallEditModal
                            ref={wallEditRef}
                            isOpen={true}
                            onClose={() => {}}
                            project={project}
                            isDark={isDark}
                            isInline={true}
                            hideCabinets={true}
                            readOnly={false}
                            onSave={(newZones) => {
                              const projectWithZones = { ...project, zones: newZones };
                              setProject(projectWithZones);
                              setActiveModal('limits');
                            }}
                          />
                        )}

                        {activeModal === 'limits' && (
                          <WallLimitsModal
                            ref={wallLimitsRef}
                            isOpen={true}
                            onClose={() => {}}
                            project={project}
                            isDark={isDark}
                            isInline={true}
                            onSave={(newZones) => {
                              const projectWithZones = { ...project, zones: newZones };
                              setProject(projectWithZones);
                              setActiveModal('preferences');
                            }}
                          />
                        )}

                        {activeModal === 'preferences' && (
                          <div className="space-y-6 py-6">
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2rem] border-2 border-amber-500/10">
                              <h4 className="text-base font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1 italic">Cabinet Selection</h4>
                              <p className="text-xs text-amber-700/70 dark:text-amber-500/50 font-medium italic">Choose which types of specialized units to include in your kitchen design.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              {[
                                { id: 'includeTall', label: 'Tall Units', desc: 'Floor-to-ceiling storage and appliances', icon: <Box size={20} /> },
                                { id: 'includeSink', label: 'Sink Base', desc: 'Plumbing-ready units for wet areas', icon: <Box size={20} /> },
                                { id: 'includeCooker', label: 'Cooking Hub', desc: 'Specialized oven and hob cabinets', icon: <Box size={20} /> },
                                { id: 'includeDrawers', label: 'Drawer Stacks', desc: 'Smooth-glide multi-tier storage', icon: <Box size={20} /> },
                              ].map((item) => (
                                <label 
                                  key={item.id}
                                  className={`flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all cursor-pointer group relative ${
                                    (project.settings.layoutPreferences?.[item.id as keyof typeof project.settings.layoutPreferences] ?? true)
                                      ? 'border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10' 
                                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <div className="pt-1">
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                                      checked={project.settings.layoutPreferences?.[item.id as keyof typeof project.settings.layoutPreferences] ?? true}
                                      onChange={(e) => {
                                        const currentPrefs = project.settings.layoutPreferences || { includeTall: true, includeSink: true, includeCooker: true, includeDrawers: true };
                                        setProject({
                                          ...project,
                                          settings: {
                                            ...project.settings,
                                            layoutPreferences: {
                                              ...currentPrefs,
                                              [item.id]: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <h5 className="font-black uppercase tracking-tight text-xs mb-0.5">{item.label}</h5>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">{item.desc}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeModal === 'design' && (
                          <div className="h-full w-full flex flex-row overflow-hidden relative bg-slate-100 dark:bg-slate-950">
                            {/* 3D Viewer Canvas container */}
                            <div className="flex-1 min-w-0 relative h-full flex flex-col">
                              {/* 3D Viewer Canvas */}
                              <div className="flex-1 relative min-h-0">
                                <CabinetViewer 
                                  project={project}
                                  showHardware={true}
                                  showEmptyWalls={true}
                                  activeWallId={activeTab}
                                  onWallClick={(wallId) => { setActiveTab(wallId); setSelectedCabinet(null); }}
                                  lightTheme={!isDark}
                                  viewMode={isoViewMode}
                                  onViewModeChange={setIsoViewMode}
                                  doorOpenAngle={isoDoorOpenAngle}
                                  onDoorOpenAngleChange={setIsoDoorOpenAngle}
                                  isStudio={visualMode === 'studio'}
                                  opacity={isTransparent ? 0.4 : 1}
                                  selectedCabinet={swapMode ? null : selectedCabinet}
                                  swapSelection={swapMode ? swapSelection : []}
                                  draggedCabinet={draggingCabinet}
                                  onDropCabinet={handleDropCabinet}
                                  skeletonView={isSkeleton}
                                  onCabinetSelect={(zoneId, idx) => handleCabinetSelection(idx, zoneId)}
                                />
                              </div>
                              
                              {/* Controls Overlay */}
                              <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between items-center gap-4 pointer-events-none z-20">
                                 {/* View Mode Toggle */}
                                 <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-slate-200/50 dark:border-slate-800 pointer-events-auto gap-2">
                                   <div className="flex items-center">
                                     <button
                                       type="button"
                                       onClick={() => setVisualMode('iso')}
                                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                         visualMode === 'iso'
                                           ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                           : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                       }`}
                                     >
                                       3D Design
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => setVisualMode('studio')}
                                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                         visualMode === 'studio'
                                           ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                           : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                                       }`}
                                     >
                                       Studio Render
                                     </button>
                                   </div>

                                   <div className="w-px h-6 bg-slate-200 dark:bg-slate-850 mx-1" />

                                   <div className="flex items-center gap-1">
                                     <button 
                                       type="button"
                                       onClick={handleUndo} 
                                       disabled={!canUndo} 
                                       className={`p-1.5 rounded-lg border transition-all ${
                                         canUndo 
                                           ? 'bg-white dark:bg-slate-800 text-amber-500 border-slate-200 dark:border-slate-750 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750' 
                                           : 'bg-slate-50 dark:bg-slate-905 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'
                                       }`}
                                       title="Undo"
                                     >
                                       <Undo2 size={14} />
                                     </button>
                                     <button 
                                       type="button"
                                       onClick={handleRedo} 
                                       disabled={!canRedo} 
                                       className={`p-1.5 rounded-lg border transition-all ${
                                         canRedo 
                                           ? 'bg-white dark:bg-slate-800 text-amber-500 border-slate-200 dark:border-slate-750 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750' 
                                           : 'bg-slate-50 dark:bg-slate-905 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'
                                       }`}
                                       title="Redo"
                                     >
                                       <Redo2 size={14} />
                                     </button>
                                   </div>
                                 </div>

                                {/* Door Controller */}
                                <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-slate-200/50 dark:border-slate-800 pointer-events-auto gap-4">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Open Doors</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="90"
                                    value={isoDoorOpenAngle}
                                    onChange={(e) => setIsoDoorOpenAngle(Number(e.target.value))}
                                    className="w-24 accent-amber-500 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 w-8 text-right">
                                    {isoDoorOpenAngle}°
                                  </span>
                                </div>

                                {/* Active Wall Selector */}
                                <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-slate-200/50 dark:border-slate-800 pointer-events-auto">
                                  {project.zones.map((zone) => (
                                    <button
                                      key={zone.id}
                                      type="button"
                                      onClick={() => { setActiveTab(zone.id); setSelectedCabinet(null); }}
                                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                        activeTab === zone.id
                                          ? 'bg-slate-100 dark:bg-slate-800 text-amber-500 font-black'
                                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                      }`}
                                    >
                                      {zone.id}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Cabinet Editor Sidebar */}
                            <AnimatePresence>
                              {selectedCabinet ? (() => {
                                const zone = project.zones.find(z => z.id === selectedCabinet.zoneId);
                                const cab = zone?.cabinets.find(c => c.id === selectedCabinet.id);
                                if (!cab) return null;

                                return (
                                  <motion.div
                                    key="cabinet-sidebar"
                                    initial={{ x: '100%', opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: '100%', opacity: 0 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-2xl relative"
                                  >
                                    {/* Sidebar Header */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                      <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Cabinet Editor</h4>
                                        <p className="text-[10px] font-mono text-slate-500 font-bold mt-0.5">{cab.preset} ({cab.id})</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedCabinet(null)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>

                                    {/* Sidebar scrollable contents */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                      {/* Width Adjuster */}
                                      <div className="space-y-2">
                                        <CabinetSpanSlider 
                                          totalLength={zone?.totalLength ?? 3000}
                                          fromLeft={cab.fromLeft}
                                          width={cab.width}
                                          snapGuides={Array.from(new Set(
                                            zone?.cabinets
                                              .filter(c => c.id !== cab.id)
                                              .flatMap(c => [c.fromLeft, c.fromLeft + c.width]) ?? []
                                          ))}
                                          onChange={(updates) => updateSelectedCabinet(updates)}
                                        />
                                      </div>

                                      {/* Cabinet Specific Controls */}
                                      <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cabinet Options</label>
                                        
                                        {/* Tall Cabinet Sections */}
                                        {cab.type === CabinetType.TALL ? (
                                          <div className="space-y-4">
                                            {/* Upper Height */}
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
                                                className="w-4 h-4 accent-amber-500 cursor-pointer"
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
                                                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                                                />
                                              </div>
                                              {(cab.advancedSettings?.showShelves ?? true) && (
                                                <div className="flex items-center gap-3">
                                                  <button 
                                                    type="button"
                                                    onClick={() => updateSelectedAdvancedSetting({ numShelves: Math.max(0, (cab.advancedSettings?.numShelves ?? 2) - 1) })}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                  >-</button>
                                                  <span className="flex-1 text-center font-bold text-xs">{cab.advancedSettings?.numShelves ?? 2}</span>
                                                  <button 
                                                    type="button"
                                                    onClick={() => updateSelectedAdvancedSetting({ numShelves: (cab.advancedSettings?.numShelves ?? 2) + 1 })}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                  >+</button>
                                                </div>
                                              )}
                                            </div>

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
                                                  const updates: any = { showLowerDoors: checked };
                                                  if (checked) updates.showDrawers = false;
                                                  updateSelectedAdvancedSetting(updates);
                                                }}
                                                className="w-4 h-4 accent-amber-500 cursor-pointer"
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
                                                    const updates: any = { showLowerShelves: checked };
                                                    if (checked) updates.showDrawers = false;
                                                    updateSelectedAdvancedSetting(updates);
                                                  }}
                                                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                                                />
                                              </div>
                                              {(cab.advancedSettings?.showLowerShelves ?? false) && (
                                                <div className="flex items-center gap-3">
                                                  <button 
                                                    type="button"
                                                    onClick={() => updateSelectedAdvancedSetting({ numLowerShelves: Math.max(0, (cab.advancedSettings?.numLowerShelves ?? 0) - 1) })}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold font-mono"
                                                  >-</button>
                                                  <span className="flex-1 text-center font-bold text-xs">{cab.advancedSettings?.numLowerShelves ?? 0}</span>
                                                  <button 
                                                    type="button"
                                                    onClick={() => updateSelectedAdvancedSetting({ numLowerShelves: (cab.advancedSettings?.numLowerShelves ?? 0) + 1 })}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold font-mono"
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
                                                    const updates: any = { showDrawers: checked };
                                                    if (checked) {
                                                      updates.showLowerDoors = false;
                                                      updates.showLowerShelves = false;
                                                    }
                                                    updateSelectedAdvancedSetting(updates);
                                                  }}
                                                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                                                />
                                              </div>
                                              {(cab.advancedSettings?.showDrawers ?? false) && (
                                                <div className="flex items-center gap-3">
                                                  <button 
                                                    type="button"
                                                    onClick={() => updateSelectedAdvancedSetting({ numDrawers: Math.max(0, (cab.advancedSettings?.numDrawers ?? 3) - 1) })}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                  >-</button>
                                                  <span className="flex-1 text-center font-bold text-xs">{cab.advancedSettings?.numDrawers ?? 3}</span>
                                                  <button 
                                                    type="button"
                                                    onClick={() => updateSelectedAdvancedSetting({ numDrawers: (cab.advancedSettings?.numDrawers ?? 3) + 1 })}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                  >+</button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-4">
                                            {/* Standard Doors */}
                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Doors</span>
                                              <input 
                                                type="checkbox" 
                                                checked={cab.advancedSettings?.showDoors ?? (cab.preset === PresetType.SINK_UNIT ? true : true)}
                                                onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  const updates: any = { showDoors: checked };
                                                  if (checked) updates.showDrawers = false;
                                                  updateSelectedAdvancedSetting(updates);
                                                }}
                                                className="w-4 h-4 accent-amber-500 cursor-pointer"
                                              />
                                            </div>

                                            {/* Standard Shelves */}
                                            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Shelves</span>
                                                <input 
                                                  type="checkbox" 
                                                  checked={cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true)}
                                                  onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    const updates: any = { showShelves: checked };
                                                    if (checked) updates.showDrawers = false;
                                                    updateSelectedAdvancedSetting(updates);
                                                  }}
                                                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                                                />
                                              </div>
                                              {(cab.advancedSettings?.showShelves ?? (cab.preset === PresetType.SINK_UNIT ? false : true)) && (
                                                <div className="flex items-center gap-3">
                                                  <button 
                                                    type="button"
                                                    onClick={() => {
                                                      const current = cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2);
                                                      updateSelectedAdvancedSetting({ numShelves: Math.max(0, current - 1) });
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                  >-</button>
                                                  <span className="flex-1 text-center font-bold text-xs">{cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2)}</span>
                                                  <button 
                                                    type="button"
                                                    onClick={() => {
                                                      const current = cab.advancedSettings?.numShelves ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 2);
                                                      updateSelectedAdvancedSetting({ numShelves: current + 1 });
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
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
                                                      const updates: any = { showDrawers: checked };
                                                      if (checked) {
                                                        updates.showDoors = false;
                                                        updates.showShelves = false;
                                                      }
                                                      updateSelectedAdvancedSetting(updates);
                                                    }}
                                                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                                                  />
                                                </div>
                                                {(cab.advancedSettings?.showDrawers ?? false) && (
                                                  <div className="flex items-center gap-3">
                                                    <button 
                                                      type="button"
                                                      onClick={() => {
                                                        const current = cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3);
                                                        updateSelectedAdvancedSetting({ numDrawers: Math.max(0, current - 1) });
                                                      }}
                                                      className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                    >-</button>
                                                    <span className="flex-1 text-center font-bold text-xs">{cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3)}</span>
                                                    <button 
                                                      type="button"
                                                      onClick={() => {
                                                        const current = cab.advancedSettings?.numDrawers ?? (cab.preset === PresetType.SINK_UNIT ? 0 : 3);
                                                        updateSelectedAdvancedSetting({ numDrawers: current + 1 });
                                                      }}
                                                      className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm font-bold"
                                                    >+</button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      <div className="pt-2 space-y-2">
                                        <button 
                                          type="button"
                                          onClick={() => setShowAdvancedCabinetEditor(true)}
                                          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                          <Settings2 size={14} />
                                          Advanced 3D Editor
                                        </button>

                                        {(() => {
                                          const isCabinetChanged = initialZoneCabinetsBackup && (
                                            JSON.stringify(zone?.cabinets) !== JSON.stringify(initialZoneCabinetsBackup)
                                          );
                                          return isCabinetChanged ? (
                                            <button 
                                              type="button"
                                              onClick={handleResetCabinet}
                                              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2"
                                            >
                                              <RotateCcw size={14} /> Reset Changes
                                            </button>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>

                                    {/* Sidebar Footer Action */}
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                      <button
                                        type="button"
                                        onClick={handleDeleteCabinet}
                                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-rose-500/20"
                                      >
                                        Delete Cabinet
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })() : (
                                <motion.div
                                  key="presets-sidebar"
                                  initial={{ x: '100%', opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: '100%', opacity: 0 }}
                                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                  className="w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-2xl relative"
                                >
                                  {/* Sidebar header */}
                                  <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/30">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <Layout size={14} className="text-amber-500" />
                                      3D Settings
                                    </h4>
                                  </div>

                                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                    {/* View Modes */}
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Projection Views</label>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {['front', 'side', 'top', 'isometric'].map((v) => (
                                          <button
                                            key={v}
                                            type="button"
                                            onClick={() => setIsoViewMode(v)}
                                            className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                                              isoViewMode === v 
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                            }`}
                                          >
                                            {v}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="space-y-4 pt-2">
                                      {/* Transparent Mode */}
                                      <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-colors">Transparent View</span>
                                        <div className="relative inline-flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={isTransparent}
                                            onChange={(e) => setIsTransparent(e.target.checked)}
                                            className="sr-only peer"
                                          />
                                          <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 font-sans"></div>
                                        </div>
                                      </label>

                                      {/* Skeleton Mode */}
                                      <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-colors">Skeleton View</span>
                                        <div className="relative inline-flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={isSkeleton}
                                            onChange={(e) => setIsSkeleton(e.target.checked)}
                                            className="sr-only peer"
                                          />
                                          <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 font-sans"></div>
                                        </div>
                                      </label>

                                      {/* Gola Mode */}
                                      <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-colors">Global Gola Mode</span>
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
                                          <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500 font-sans"></div>
                                        </div>
                                      </label>
                                    </div>

                                    {/* Doors Open slider */}
                                    <div className="space-y-1.5 pt-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Doors Open</span>
                                        <span className="text-[10px] font-mono text-amber-500 font-bold">{isoDoorOpenAngle}°</span>
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

                                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-4" />

                                    <Button 
                                      type="button"
                                      variant={swapMode ? "primary" : "secondary"} 
                                      onClick={() => {
                                        setSwapMode(!swapMode);
                                        setSwapSelection([]);
                                        setSelectedCabinet(null);
                                      }}
                                      className={`w-full gap-2 transition-all duration-300 h-10 rounded-xl font-black text-xs uppercase tracking-wider ${swapMode ? 'ring-2 ring-amber-500 shadow-lg' : ''}`}
                                    >
                                      <RotateCcw size={14} className={swapMode ? 'animate-spin' : ''} />
                                      {swapMode ? 'Exit Swap Mode' : 'Swap Cabinets'}
                                    </Button>
                                    {swapMode && (
                                      <p className="text-[9px] font-black text-amber-500 uppercase animate-pulse text-center tracking-widest mt-2">
                                        {swapSelection.length === 0 ? 'Select first cabinet' : 'Select second cabinet'}
                                      </p>
                                    )}

                                    <div className="pt-2">
                                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider italic mb-3">Presets</h3>
                                      <div className="space-y-3">
                                        {[
                                          { type: CabinetType.BASE, preset: PresetType.BASE_DOOR, label: 'Base Cabinet', sub: 'BASE', icon: <Box size={20} /> },
                                          { type: CabinetType.WALL, preset: PresetType.WALL_STD, label: 'Wall Cabinet', sub: 'WALL', icon: <Layers size={20} /> },
                                          { type: CabinetType.TALL, preset: PresetType.TALL_UTILITY, label: 'Tall Cabinet', sub: 'TALL', icon: <Layers size={20} className="rotate-90" /> },
                                          { type: CabinetType.BASE, preset: PresetType.SINK_UNIT, label: 'Sink Unit', sub: 'BASE', icon: <Box size={20} className="text-blue-500" /> },
                                        ].map((proto, i) => (
                                          <div 
                                            key={i}
                                            onPointerDown={(e) => {
                                              e.preventDefault();
                                              (e.currentTarget as any).releasePointerCapture(e.pointerId);
                                              const { icon, sub, ...protoData } = proto;
                                              setDraggingCabinet({ ...protoData, id: 'proto', width: 600, qty: 1, fromLeft: 0 } as any);
                                              setDraggingPosition({ x: e.clientX, y: e.clientY });
                                            }}
                                            onClick={() => {
                                              const { icon, sub, ...protoData } = proto;
                                              const targetId = activeTab || project.zones[0]?.id;
                                              if (!targetId) return;
                                              handleDropCabinet(targetId, 0, { ...protoData, id: 'proto', width: 600, qty: 1, fromLeft: 0 } as any);
                                            }}
                                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 cursor-grab active:cursor-grabbing transition-all select-none group"
                                          >
                                            <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm group-hover:border-amber-500/50 transition-colors">
                                              {proto.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{proto.label}</div>
                                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{proto.sub}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed Footer Navigation */}
          {activeModal && activeModal !== 'success' && (
            <div className="px-8 py-4 border-t dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex justify-between items-center shrink-0 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <Button 
                variant="secondary" 
                onClick={handlePrevStep}
                disabled={wizardSteps.indexOf(activeModal) === 0 || isSubmitting}
                className="text-[10px] font-black uppercase tracking-[0.2em] px-5 h-10 rounded-xl border-2"
              >
                Previous
              </Button>

              <div className="flex gap-4">
                {wizardSteps.indexOf(activeModal) === wizardSteps.length - 1 ? (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!isReadyToSubmit || isSubmitting}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-amber-500/30 text-[10px] transition-all flex items-center gap-2 h-12"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save & Submit <Wand2 size={16} />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextStep} 
                    disabled={activeModal === 'project' && !isIdentityDone}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-amber-500/30 text-[10px] transition-all flex items-center gap-2 h-12"
                  >
                    Next Step <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Journey Map */}
        {activeModal && activeModal !== 'success' && (
          <aside className="hidden md:flex w-56 border-l dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 overflow-hidden relative z-10">
            <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2">Setup Steps</h3>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${((wizardSteps.indexOf(activeModal) + 1) / wizardSteps.length) * 100}%` }} 
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {wizardSteps.map((step, index) => {
                let isDone = false;
                if (step === 'project') isDone = isIdentityDone;
                if (step === 'walls') isDone = isWallsDone;
                if (step === 'limits') isDone = isLimitsDone;
                if (step === 'preferences') isDone = isPreferencesDone;
                if (step === 'design') isDone = isReadyToSubmit;

                return (
                  <StepSidebarItem 
                    key={step}
                    step={step}
                    index={index}
                    isActive={activeModal === step}
                    isDone={isDone}
                    isRequired={true}
                  />
                );
              })}
            </div>
          </aside>
        )}
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
    </div>
  );
};

export default ScreenEmbedSetup;
