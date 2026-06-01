import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, FileText, Upload, DollarSign, Settings, Box, Lock, CheckCircle2, AlertCircle, Wand2, ArrowRight, X, MousePointer2, Plus, Check, Pencil, MapPin, Phone, Sparkles, Layout, Layers, Cpu, ChevronDown, Zap } from 'lucide-react';
import { Project, CabinetType, PresetType } from '../types';
import { Button } from '../components/Button';
import { NumberInput } from '../components/NumberInput';
import { WallEditModal } from '../components/WallEditModal';
import { WallLimitsModal } from '../components/WallLimitsModal';
import { SheetTypeManager } from '../components/SheetTypeManager';
import { MaterialAllocationPanel } from '../components/MaterialAllocationPanel';
import { generateRubyLayout } from '../services/layoutSolver';
import { autoFillIsland } from '../services/islandService';
import { logoService } from '../services/logoService';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { recalculateCabinetPositions, calculateTotalZoneLength, createAdvancedCabinet } from '../services/advancedWorkflowService';
import { useProjectStore } from '../store/useProjectStore';
import { createDefaultIslandZone } from '../services/islandService';

interface ScreenProjectSetupProps {
  onSave: (p?: Project) => Promise<any>;
  onSaveProject?: (p: Project) => Promise<any>;
  isDark: boolean;
  isUserPro?: boolean;
}

const ScreenProjectSetup = ({ onSave, onSaveProject, isDark, isUserPro }: ScreenProjectSetupProps) => {
  const { project, setProject } = useProjectStore();

  const navigate = useNavigate();
  const location = useLocation();
  
  // State for centered modal
  const [activeModal, setActiveModal] = useState<'project' | 'walls' | 'limits' | 'sheets' | 'hardware' | 'construction' | 'costs' | 'allocation' | 'preferences' | 'generation' | 'advanced_entry' | null>('project');

  // Modal control states
  const isLayoutLocked = project.zones.some(z => z.cabinets && z.cabinets.length > 0);
  const [isPro, setIsPro] = useState(false);
  const [showCabinetModal, setShowCabinetModal] = useState(false);
  const [editingCabinetType, setEditingCabinetType] = useState<'base' | 'wall' | 'tall'>('base');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Persistence for wizard steps
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(new Set(project.settings.completedSteps || ['project']));
  const [highlightedCabId, setHighlightedCabId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (project.settings.completedSteps) {
      setVisitedSteps(new Set(project.settings.completedSteps));
    }
  }, [project.settings.completedSteps]);

  const updateProgress = (step: string, currentProject?: Project) => {
    const baseProject = currentProject || project;
    const newVisited = new Set(visitedSteps);
    newVisited.add(step);
    
    if (newVisited.size !== visitedSteps.size) {
      setVisitedSteps(newVisited);
    }
    
    const updatedProject = {
      ...baseProject,
      settings: {
        ...baseProject.settings,
        completedSteps: Array.from(newVisited)
      }
    };
    
    setProject(updatedProject);
    onSaveProject?.(updatedProject);
    return updatedProject;
  };

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(project.settings.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvancedConstruction, setShowAdvancedConstruction] = useState(false);
  const wallEditRef = useRef<any>(null);
  const wallLimitsRef = useRef<any>(null);

  // Step Completion Logic
  const isIdentityDone = project.name.trim().length > 0;
  const isWallsDone = project.zones.length > 0 && project.zones.some(z => z.totalLength > 0);
  const isLimitsDone = isWallsDone && project.zones.filter(z => z.zoneType !== 'island').every(z => (z.startLimit !== undefined && z.endLimit !== undefined) || (z.startLimit === 0 && z.endLimit === z.totalLength));
  const isConstructionDone = (() => {
    const mat = project.settings.materialSettings;
    if (!mat) return false;
    const allMaterialsSelected = !!mat.carcassMaterial && !!mat.doorMaterial && !!mat.drawerMaterial && !!mat.backMaterial && !!mat.shelfMaterial;
    const allTexturesUploaded = !!mat.textureUrls?.carcass && !!mat.textureUrls?.door && !!mat.textureUrls?.drawer && !!mat.textureUrls?.back && !!mat.textureUrls?.shelf;
    return allMaterialsSelected && allTexturesUploaded;
  })();
  const isPreferencesDone = !!project.settings.layoutPreferences || visitedSteps.has('preferences');
  const isSheetsDone = project.settings.materialSettings.carcassMaterial !== '' || visitedSteps.has('sheets');
  const isHardwareDone = visitedSteps.has('hardware');
  const isCostsDone = visitedSteps.has('costs');

  const isReadyToGenerate = isIdentityDone && (project.settings.workflowMode === 'advanced' ? true : (isWallsDone && isLimitsDone && isPreferencesDone));
  
  const traditionalSteps = ['project', 'walls', 'limits', 'preferences', 'sheets', 'hardware', 'construction', 'costs', 'generation'];
  const advancedSteps = ['project', 'advanced_entry', 'sheets', 'hardware', 'construction', 'costs', 'generation'];
  const wizardSteps = project.settings.workflowMode === 'advanced' ? advancedSteps : traditionalSteps;
  
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Handle auto-open from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const step = params.get('step');
    if (step === 'project' && !activeModal) {
      setActiveModal('project');
    }
  }, [location.search]);

  // Load user's previous profile (logo & company) on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { profileService } = await import('../services/profileService');
        const profile = await profileService.getProfile(user.id);
        
        if (profile) {
          if (profile.logo_url) {
            setLogoPreview(profile.logo_url);
          }
          
          setProject(prev => ({
            ...prev,
            company: profile.company_name || prev.company,
            settings: { 
              ...prev.settings, 
              logoUrl: profile.logo_url || prev.settings.logoUrl 
            }
          }));
        }
      }
    };
    loadUserProfile();
    
    // Check if user is Pro
    if (isUserPro !== undefined) {
      setIsPro(isUserPro);
    } else {
      subscriptionService.isPro().then(setIsPro);
    }
  }, [isUserPro]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const result = await logoService.uploadLogo(file, user.id);
      if (!result) throw new Error('Upload failed');
      
      const url = result.url;
      setLogoPreview(url);
      setProject(prev => ({
        ...prev,
        settings: { ...prev.settings, logoUrl: url }
      }));
    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
      setLogoPreview(null);
      setProject(prev => ({
        ...prev,
        settings: { ...prev.settings, logoUrl: undefined }
      }));
  };

  const handleNextStep = async () => {
    if (!activeModal) return;
    
    // Trigger internal save for modals with local state before proceeding
    if (activeModal === 'walls' && wallEditRef.current) {
      wallEditRef.current.triggerSave();
      return; // onSave will handle the progress update and modal transition
    }
    if (activeModal === 'limits' && wallLimitsRef.current) {
      wallLimitsRef.current.triggerSave();
      return; // onSave will handle the progress update and modal transition
    }

    updateProgress(activeModal);
    
    const currentIndex = wizardSteps.indexOf(activeModal as string);
    if (currentIndex !== -1 && currentIndex < wizardSteps.length - 1) {
      setDirection('forward');
      const nextStep = wizardSteps[currentIndex + 1];
      setActiveModal(nextStep as any);
    } else {
      handleGenerateLayout();
    }
  };

  const handlePrevStep = () => {
    if (!activeModal) return;
    const currentIndex = wizardSteps.indexOf(activeModal as string);
    if (currentIndex > 0) {
      setDirection('backward');
      setActiveModal(wizardSteps[currentIndex - 1] as any);
    }
  };

  const handleAddExpense = () => {
    const currentCosts = project.settings.costs || { pricePerSheet: 0, pricePerHardwareUnit: 0, laborCost: 0, transportCost: 0, marginPercent: 50 };
    const baseExpenses = !currentCosts.expenses ? [
      { id: 'labor', name: 'Standard Labor', amount: currentCosts.laborCost || 0 },
      { id: 'transport', name: 'Transport & Logistics', amount: currentCosts.transportCost || 0 }
    ] : [];
    
    const newExpense = { id: Math.random().toString(36).substr(2, 9), name: 'New Expense', amount: 0 };
    const updatedExpenses = [...(currentCosts.expenses || baseExpenses), newExpense];
    
    setEditingExpenseId(newExpense.id);
    setProject({
      ...project,
      settings: {
        ...project.settings,
        costs: {
          ...currentCosts,
          expenses: updatedExpenses
        }
      }
    });
  };

  const handleUpdateExpense = (id: string, field: 'name' | 'amount', value: any) => {
    const currentCosts = project.settings.costs || { pricePerSheet: 0, pricePerHardwareUnit: 0, laborCost: 0, transportCost: 0, marginPercent: 50 };
    const currentExpenses = (currentCosts.expenses && currentCosts.expenses.length > 0) ? currentCosts.expenses : [
      { id: 'labor', name: 'Standard Labor', amount: currentCosts.laborCost || 0 },
      { id: 'transport', name: 'Transport & Logistics', amount: currentCosts.transportCost || 0 }
    ];
    
    const updatedExpenses = currentExpenses.map(e => e.id === id ? { ...e, [field]: value } : e);
    
    setProject({
      ...project,
      settings: {
        ...project.settings,
        costs: {
          ...currentCosts,
          expenses: updatedExpenses
        }
      }
    });
  };

  const handleRemoveExpense = (id: string) => {
    const currentExpenses = project.settings.costs?.expenses || [];
    setProject({
      ...project,
      settings: {
        ...project.settings,
        costs: {
          ...project.settings.costs,
          expenses: currentExpenses.filter(e => e.id !== id)
        }
      }
    });
  };

  const handleGenerateLayout = async () => {
    if (!onSaveProject) return;
    
    try {
      await onSaveProject(project);
      
      if (project.settings.workflowMode === 'advanced') {
        // Final layout verification for Advanced Mode
        const updatedZones = [...project.zones];
        updatedZones[0].cabinets = recalculateCabinetPositions(updatedZones[0].cabinets);
        updatedZones[0].totalLength = calculateTotalZoneLength(updatedZones[0].cabinets);
        const finalProject = { ...project, zones: updatedZones };
        await onSaveProject(finalProject);
        navigate('/walls?view=iso');
      } else {
        const result = generateRubyLayout(project);
        const updatedProject = result.project;
        await onSaveProject(updatedProject);
        navigate('/walls?view=iso');
      }
    } catch (err) {
      console.error('Failed to generate design:', err);
      alert('Error generating design. Please try again.');
    }
  };

  const StepSidebarItem = ({ step, index, isActive, isDone, isRequired }: { step: string, index: number, isActive: boolean, isDone: boolean, isRequired: boolean }) => {
    const getIcon = () => {
      if (isDone) return <CheckCircle2 className="text-green-500" size={18} />;
      if (isActive) return <ArrowRight className="text-indigo-600 animate-pulse" size={18} />;
      if (isRequired) return <AlertCircle className="text-amber-200" size={18} />;
      return <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-200 dark:border-slate-800" />;
    };

    const getLabel = () => {
      switch (step) {
        case 'project': return 'Identity';
        case 'walls': return 'Room Layout';
        case 'limits': return 'Wall Limits';
        case 'preferences': return 'Special Units';
        case 'sheets': return 'Materials';
        case 'hardware': return 'Hardware';
        case 'construction': return 'Construction';
        case 'costs': return 'Pricing';
        case 'advanced_entry': return 'Unit List';
        case 'generation': return 'Launch';
        default: return step;
      }
    };

    return (
      <motion.button
        layout
        onClick={() => {
          if (activeModal) updateProgress(activeModal);
          const newIndex = wizardSteps.indexOf(step as any);
          const currentIndex = wizardSteps.indexOf(activeModal as any);
          setDirection(newIndex > currentIndex ? 'forward' : 'backward');
          setActiveModal(step as any);
        }}
        initial={false}
        animate={{ 
          height: isActive ? 'auto' : '64px',
          padding: isActive ? '24px 20px' : '14px 16px',
          scale: isActive ? 1.02 : 1
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1]
        }}
        className={`w-full flex items-center gap-5 rounded-2xl transition-all border-2 text-left group overflow-hidden relative ${
          isActive 
            ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-400 shadow-xl shadow-indigo-500/10 z-10' 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
        }`}
      >
        {isActive && (
          <motion.div 
            layoutId="active-bg"
            className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"
          />
        )}
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <p className={`text-[10px] font-black uppercase tracking-[0.15em] truncate ${isActive ? 'text-indigo-700' : 'text-slate-500 dark:text-slate-400'}`}>
              Step {index + 1}
            </p>
            {isActive && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full tracking-widest"
              >
                ACTIVE
              </motion.span>
            )}
          </div>
          <h4 className={`text-xs font-bold uppercase truncate tracking-wide ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {getLabel()}
          </h4>
          {isActive && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[9px] font-medium text-indigo-700/60 dark:text-indigo-600/50 mt-1 italic leading-tight"
            >
              Current phase of your design journey.
            </motion.p>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl relative">

          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden p-4">
            <div className="h-full w-full max-w-none transition-all duration-500 relative">
              {!activeModal ? (
                <div className="space-y-8 animate-in fade-in zoom-in duration-500 text-center py-20">
                  <div className="w-24 h-24 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-6">
                    <Settings size={48} className="animate-spin-slow" />
                  </div>
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Ready to <span className="text-indigo-600">Begin?</span></h1>
                  <p className="text-lg text-slate-500 font-medium italic max-w-lg mx-auto">Let's guide you through the setup process to generate your perfect 3D cabinetry design.</p>
                  
                  <button onClick={() => { setDirection('forward'); setActiveModal('project'); }} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3 mx-auto group text-xs">
                    Start Journey <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="h-full w-full relative overflow-hidden">
                  <AnimatePresence initial={false} custom={direction}>
                    <motion.div 
                      key={activeModal}
                      custom={direction}
                      variants={{
                        enter: (dir: string) => ({
                          x: dir === 'forward' ? '100%' : '-100%',
                          opacity: 0
                        }),
                        center: {
                          x: 0,
                          opacity: 1
                        },
                        exit: (dir: string) => ({
                          x: dir === 'forward' ? '-100%' : '100%',
                          opacity: 0
                        })
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 35 },
                        opacity: { duration: 0.2 }
                      }}
                      className="absolute inset-0 h-full w-full"
                    >
                      <div className={`h-full w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-200/60 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] ${['walls', 'limits'].includes(activeModal as string) ? '' : 'p-4 sm:p-10 overflow-y-auto'}`}>
                        <div className={`${['walls', 'limits', 'advanced_entry'].includes(activeModal as string) ? 'h-full w-full px-4' : 'max-w-5xl mx-auto w-full'}`}>
                    
                    {activeModal === 'walls' && (
                      <WallEditModal
                        ref={wallEditRef}
                        isOpen={true}
                        onClose={() => {}}
                        project={project}
                        isDark={isDark}
                        isInline={true}
                        hideCabinets={true}
                        readOnly={!isPro && isLayoutLocked}
                        onSave={(newZones) => {
                          const projectWithZones = { ...project, zones: newZones };
                          updateProgress('walls', projectWithZones);
                          setActiveModal('limits');
                        }}
                      />
                    )}

                    {activeModal === 'limits' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-6 py-3 border-b dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Island</span>
                            <button
                              onClick={() => {
                                const hasIsland = project.zones.some(z => z.zoneType === 'island');
                                if (hasIsland) {
                                  setProject(prev => ({
                                    ...prev,
                                    zones: prev.zones.filter(z => z.zoneType !== 'island')
                                  }));
                                } else {
                                  setProject(prev => ({
                                    ...prev,
                                    zones: [...prev.zones, createDefaultIslandZone('Island', 1500)]
                                  }));
                                }
                              }}
                              className={`relative w-12 h-6 rounded-full transition-all ${
                                project.zones.some(z => z.zoneType === 'island')
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                                project.zones.some(z => z.zoneType === 'island') ? 'left-6.5' : 'left-0.5'
                              }`} />
                            </button>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {project.zones.some(z => z.zoneType === 'island')
                                ? 'Island zone included (configure margins in Island tab below)'
                                : 'Add a kitchen island'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-h-0">
                          <WallLimitsModal
                            ref={wallLimitsRef}
                            isOpen={true}
                            onClose={() => {}}
                            project={project}
                            isDark={isDark}
                            isInline={true}
                            onSave={(newZones) => {
                              const syncedZones = newZones.map(z =>
                                z.zoneType === 'island'
                                  ? autoFillIsland({ ...z, cabinets: [] })
                                  : z
                              );
                              const projectWithZones = { ...project, zones: syncedZones };
                              updateProgress('limits', projectWithZones);
                              setActiveModal('preferences');
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {activeModal === 'project' && (
                      <div className="h-full flex flex-col justify-center py-10 animate-in fade-in zoom-in duration-500">
                        <div className="max-w-4xl mx-auto w-full px-6">
                          {/* Header Section */}
                          <div className="text-center mb-16 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />
                            <h2 className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase mb-4 leading-tight">
                              Start New <span className="text-indigo-600">Journey</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-md mx-auto">
                              Define your project specifications to begin the precision engineering process.
                            </p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-8 relative">
                            {/* Card Decoration */}
                            <div className="absolute -top-4 -left-4 w-24 h-24 border-t-4 border-l-4 border-indigo-500/20 rounded-tl-[3rem] pointer-events-none" />
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-4 border-r-4 border-indigo-500/20 rounded-br-[3rem] pointer-events-none" />

                            {/* Project Name & Site Address */}
                            <div className="space-y-6">
                              <div className="group relative">
                                <label className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-1.5 block ml-2 italic">Project Name</label>
                                <div className="relative">
                                  <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                  <input 
                                    className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 outline-none dark:text-white font-bold text-base shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                    placeholder="New Kitchen" 
                                    value={project.name} 
                                    onChange={e => setProject({ ...project, name: e.target.value })} 
                                  />
                                </div>
                              </div>

                              <div className="group relative">
                                <label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Site Address</label>
                                <div className="relative">
                                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                  <textarea 
                                    rows={2}
                                    className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none dark:text-white font-bold text-base shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none" 
                                    placeholder="Full delivery/installation address" 
                                    value={project.customerAddress || ''} 
                                    onChange={e => setProject({ ...project, customerAddress: e.target.value })} 
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Contact & Status Card */}
                            <div className="space-y-4">
                              <div className="group relative">
                                <label className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Contact Number</label>
                                <div className="relative">
                                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                  <input 
                                    type="tel"
                                    className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-emerald-500 outline-none dark:text-white font-bold text-base shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                    placeholder="+1 234 567 890" 
                                    value={project.customerPhone || ''} 
                                    onChange={e => setProject({ ...project, customerPhone: e.target.value })} 
                                  />
                                </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-800/20 rounded-[2rem] p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center group hover:border-indigo-500/30 transition-all">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-lg mb-3 rotate-3 group-hover:rotate-0 transition-transform">
                                  <Sparkles size={24} />
                                </div>
                                <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Branded Experience</h4>
                                <p className="text-[9px] text-slate-500 font-medium italic mb-4">Reports and designs use your profile identity.</p>

                                <div className="flex flex-col gap-2 w-full">
                                  <button
                                    onClick={() => {
                                      setProject(prev => ({
                                        ...prev,
                                        settings: {
                                          ...prev.settings,
                                          workflowMode: prev.settings.workflowMode === 'advanced' ? 'traditional' : 'advanced'
                                        }
                                      }));
                                    }}
                                    className={`w-full py-3.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${
                                      project.settings.workflowMode === 'advanced'
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500'
                                    }`}
                                  >
                                    <Cpu size={14} />
                                    {project.settings.workflowMode === 'advanced' ? 'Advanced Mode Enabled' : 'Enable Advanced Mode'}
                                  </button>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                                    {project.settings.workflowMode === 'advanced' 
                                      ? 'Manual Unit Entry' 
                                      : 'Smart Automation'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeModal === 'advanced_entry' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-500">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2rem] border-2 border-indigo-500/10 flex justify-between items-center shadow-sm">
                          <div>
                            <h4 className="text-lg font-black text-amber-900 dark:text-indigo-400 uppercase tracking-widest mb-1 italic flex items-center gap-3">
                              <Cpu size={22} className="text-indigo-600" /> Direct Unit Entry
                            </h4>
                            <p className="text-sm text-indigo-700/70 dark:text-indigo-600/50 font-medium italic">Define your cabinetry boxes manually. Skip the solver, keep the technical accuracy.</p>
                          </div>
                          
                          <div className="flex items-center gap-12">
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black uppercase text-indigo-600/50 tracking-widest">Total Wall length</span>
                                <span className="text-lg font-black text-amber-900 dark:text-indigo-400 italic">
                                  {calculateTotalZoneLength(project.zones[0].cabinets)}
                                  <span className="text-xs font-bold text-indigo-600/50 not-italic ml-1">mm</span>
                                </span>
                              </div>
                              <div className="w-[1px] h-8 bg-indigo-600/10" />
                              <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black uppercase text-indigo-600/50 tracking-widest">Unit Count</span>
                                <span className="text-lg font-black text-amber-900 dark:text-indigo-400 italic">
                                  {project.zones[0].cabinets.length}
                                  <span className="text-xs font-bold text-indigo-600/50 not-italic ml-1">boxes</span>
                                </span>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                const zone = project.zones[0];
                                const newCab = createAdvancedCabinet(CabinetType.BASE, zone.cabinets);
                                // Add to TOP
                                const updatedCabinets = [newCab, ...zone.cabinets];
                                
                                const updatedZones = [...project.zones];
                                updatedZones[0] = { 
                                  ...zone, 
                                  cabinets: recalculateCabinetPositions(updatedCabinets),
                                  totalLength: calculateTotalZoneLength(recalculateCabinetPositions(updatedCabinets))
                                };
                                setProject({ ...project, zones: updatedZones });
                                setHighlightedCabId(newCab.id);
                                setTimeout(() => setHighlightedCabId(null), 2000);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                            >
                              <Plus size={20} /> Add Unit
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto bg-white dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="p-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pl-10">Unit Type</th>
                                <th className="p-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Width (mm)</th>
                                <th className="p-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Height (mm)</th>
                                <th className="p-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Depth (mm)</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Blind Side</th>
                                <th className="p-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Blind Width</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Door</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Shelves</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Drawers</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pr-10">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {project.zones[0].cabinets.map((cab, idx) => (
                                  <tr 
                                    key={cab.id} 
                                    className={`group transition-all duration-700 ${
                                      highlightedCabId === cab.id 
                                        ? 'bg-indigo-600/10 dark:bg-indigo-600/5 ring-1 ring-amber-500/30' 
                                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                    }`}
                                  >
                                  <td className="p-6 pl-10 relative">
                                    <div className="relative">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdownId(activeDropdownId === cab.id ? null : cab.id);
                                        }}
                                        className="flex items-center gap-2 font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest hover:text-indigo-600 transition-colors group"
                                      >
                                        {cab.preset === PresetType.BASE_CORNER ? 'Base Corner' : 
                                         cab.preset === PresetType.WALL_CORNER ? 'Wall Corner' : 
                                         cab.type === 'Base' ? 'Base Standard' : 
                                         cab.type === 'Wall' ? 'Wall Standard' : 'Tall Utility'}
                                        <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-600 transition-transform duration-300 ${activeDropdownId === cab.id ? 'rotate-180' : ''}`} />
                                      </button>

                                      <AnimatePresence>
                                        {activeDropdownId === cab.id && (
                                          <motion.div 
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                            className="absolute top-full left-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] z-[100] overflow-hidden p-1.5"
                                          >
                                            {[
                                              { label: 'Base Standard', value: 'Base', preset: PresetType.BASE_DOOR, icon: <Box size={14} /> },
                                              { label: 'Base Corner', value: 'BaseCorner', preset: PresetType.BASE_CORNER, icon: <Layout size={14} /> },
                                              { label: 'Wall Standard', value: 'Wall', preset: PresetType.WALL_STD, icon: <Layers size={14} /> },
                                              { label: 'Wall Corner', value: 'WallCorner', preset: PresetType.WALL_CORNER, icon: <Layout size={14} className="rotate-90" /> },
                                              { label: 'Tall Utility', value: 'Tall', preset: PresetType.TALL_UTILITY, icon: <Cpu size={14} /> }
                                            ].map((opt) => {
                                              const isSelected = (opt.value === 'BaseCorner' && cab.preset === PresetType.BASE_CORNER) ||
                                                               (opt.value === 'WallCorner' && cab.preset === PresetType.WALL_CORNER) ||
                                                               (opt.value === 'Base' && cab.type === CabinetType.BASE && cab.preset !== PresetType.BASE_CORNER) ||
                                                               (opt.value === 'Wall' && cab.type === CabinetType.WALL && cab.preset !== PresetType.WALL_CORNER) ||
                                                               (opt.value === 'Tall' && cab.type === CabinetType.TALL);

                                              return (
                                                <button
                                                  key={opt.value}
                                                  onClick={() => {
                                                    const updatedZones = [...project.zones];
                                                    const val = opt.value;
                                                    let type: CabinetType;
                                                    let preset: PresetType;
                                                    
                                                    if (val === 'BaseCorner') {
                                                      type = CabinetType.BASE;
                                                      preset = PresetType.BASE_CORNER;
                                                    } else if (val === 'WallCorner') {
                                                      type = CabinetType.WALL;
                                                      preset = PresetType.WALL_CORNER;
                                                    } else {
                                                      type = val as any;
                                                      preset = type === 'Base' ? PresetType.BASE_DOOR : type === 'Wall' ? PresetType.WALL_STD : PresetType.TALL_UTILITY;
                                                    }

                                                    updatedZones[0].cabinets[idx] = { 
                                                      ...cab, 
                                                      type,
                                                      preset,
                                                      advancedSettings: {
                                                        ...(cab.advancedSettings || {}),
                                                        showDoors: true,
                                                        showShelves: true,
                                                        showDrawers: false,
                                                        blindCornerSide: 'left',
                                                        blindPanelWidth: 600
                                                      }
                                                    };
                                                    updatedZones[0].cabinets = recalculateCabinetPositions(updatedZones[0].cabinets);
                                                    updatedZones[0].totalLength = calculateTotalZoneLength(updatedZones[0].cabinets);
                                                    setProject({ ...project, zones: updatedZones });
                                                    setActiveDropdownId(null);
                                                  }}
                                                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                                    isSelected
                                                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                  }`}
                                                >
                                                  <span className={isSelected ? 'text-white' : 'text-indigo-600'}>{opt.icon}</span>
                                                  {opt.label}
                                                </button>
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </td>
                                  <td className="p-6 text-right">
                                    <input 
                                      type="number" 
                                      value={cab.width}
                                      onChange={(e) => {
                                        const updatedZones = [...project.zones];
                                        const val = Number(e.target.value);
                                        updatedZones[0].cabinets[idx] = { ...cab, width: val };
                                        updatedZones[0].cabinets = recalculateCabinetPositions(updatedZones[0].cabinets);
                                        updatedZones[0].totalLength = calculateTotalZoneLength(updatedZones[0].cabinets);
                                        setProject({ ...project, zones: updatedZones });
                                      }}
                                      className={`w-20 bg-transparent text-right outline-none transition-colors duration-300 ${
                                        cab.width !== 600 ? 'font-black text-indigo-600' : 'font-bold text-slate-400 dark:text-slate-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-6 text-right">
                                    <input 
                                      type="number" 
                                      placeholder={cab.type === 'Base' ? project.settings.baseHeight.toString() : cab.type === 'Wall' ? project.settings.wallHeight.toString() : project.settings.tallHeight.toString()}
                                      value={cab.height || ''}
                                      onChange={(e) => {
                                        const updatedZones = [...project.zones];
                                        updatedZones[0].cabinets[idx] = { ...cab, height: Number(e.target.value) || undefined };
                                        setProject({ ...project, zones: updatedZones });
                                      }}
                                      className={`w-20 bg-transparent text-right outline-none placeholder:opacity-50 transition-colors duration-300 ${
                                        (cab.height && cab.height !== (cab.type === 'Base' ? project.settings.baseHeight : cab.type === 'Wall' ? project.settings.wallHeight : project.settings.tallHeight))
                                          ? 'font-black text-indigo-600' 
                                          : 'font-bold text-slate-400 dark:text-slate-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-6 text-right">
                                    <input 
                                      type="number" 
                                      placeholder={cab.type === 'Base' ? project.settings.depthBase.toString() : cab.type === 'Wall' ? project.settings.depthWall.toString() : project.settings.depthTall.toString()}
                                      value={cab.depth || ''}
                                      onChange={(e) => {
                                        const updatedZones = [...project.zones];
                                        updatedZones[0].cabinets[idx] = { ...cab, depth: Number(e.target.value) || undefined };
                                        setProject({ ...project, zones: updatedZones });
                                      }}
                                      className={`w-20 bg-transparent text-right outline-none placeholder:opacity-50 transition-colors duration-300 ${
                                        (cab.depth && cab.depth !== (cab.type === 'Base' ? project.settings.depthBase : cab.type === 'Wall' ? project.settings.depthWall : project.settings.depthTall))
                                          ? 'font-black text-indigo-600' 
                                          : 'font-bold text-slate-400 dark:text-slate-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-6 text-center">
                                    {(cab.preset === PresetType.BASE_CORNER || cab.preset === PresetType.WALL_CORNER) ? (
                                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border-2 dark:border-slate-700 min-w-[110px] mx-auto shadow-inner">
                                        <button 
                                          onClick={() => {
                                            const updatedZones = [...project.zones];
                                            updatedZones[0].cabinets[idx] = { 
                                              ...cab, 
                                              advancedSettings: { ...(cab.advancedSettings || {}), blindCornerSide: 'left' } 
                                            };
                                            setProject({ ...project, zones: updatedZones });
                                          }}
                                          className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${cab.advancedSettings?.blindCornerSide !== 'right' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
                                        >
                                          Left
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const updatedZones = [...project.zones];
                                            updatedZones[0].cabinets[idx] = { 
                                              ...cab, 
                                              advancedSettings: { ...(cab.advancedSettings || {}), blindCornerSide: 'right' } 
                                            };
                                            setProject({ ...project, zones: updatedZones });
                                          }}
                                          className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${cab.advancedSettings?.blindCornerSide === 'right' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
                                        >
                                          Right
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="text-[10px] font-black text-slate-300 uppercase italic">N/A</div>
                                    )}
                                  </td>
                                  <td className="p-6 text-right">
                                    {(cab.preset === PresetType.BASE_CORNER || cab.preset === PresetType.WALL_CORNER) ? (
                                      <input 
                                        type="number" 
                                        value={cab.advancedSettings?.blindPanelWidth || 600}
                                        onChange={(e) => {
                                          const updatedZones = [...project.zones];
                                          updatedZones[0].cabinets[idx] = { 
                                            ...cab, 
                                            advancedSettings: { 
                                              ...(cab.advancedSettings || {}), 
                                              blindPanelWidth: Number(e.target.value) 
                                            } 
                                          };
                                          setProject({ ...project, zones: updatedZones });
                                        }}
                                        className={`w-20 bg-transparent text-right outline-none transition-colors duration-300 ${
                                          (cab.advancedSettings?.blindPanelWidth && cab.advancedSettings.blindPanelWidth !== 600)
                                            ? 'font-black text-indigo-600'
                                            : 'font-bold text-slate-400 dark:text-slate-500'
                                        }`}
                                      />
                                    ) : (
                                      <div className="text-[10px] font-black text-slate-300 uppercase italic">N/A</div>
                                    )}
                                  </td>
                                  <td className="p-6 text-center">
                                    <input 
                                      type="checkbox"
                                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                                      checked={cab.advancedSettings?.showDoors ?? (cab.preset !== 'Open Box')}
                                      disabled={cab.advancedSettings?.showDrawers}
                                      onChange={(e) => {
                                        const updatedZones = [...project.zones];
                                        updatedZones[0].cabinets[idx] = { 
                                          ...cab, 
                                          advancedSettings: { 
                                            ...(cab.advancedSettings || {}), 
                                            showDoors: e.target.checked 
                                          } 
                                        };
                                        setProject({ ...project, zones: updatedZones });
                                      }}
                                    />
                                  </td>
                                  <td className="p-6 text-center">
                                    <input 
                                      type="checkbox"
                                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                                      checked={cab.advancedSettings?.showShelves ?? true}
                                      disabled={cab.advancedSettings?.showDrawers}
                                      onChange={(e) => {
                                        const updatedZones = [...project.zones];
                                        updatedZones[0].cabinets[idx] = { 
                                          ...cab, 
                                          advancedSettings: { 
                                            ...(cab.advancedSettings || {}), 
                                            showShelves: e.target.checked,
                                            numShelves: e.target.checked ? 2 : 0
                                          } 
                                        };
                                        setProject({ ...project, zones: updatedZones });
                                      }}
                                    />
                                  </td>
                                  <td className="p-6 text-center">
                                    {(cab.preset !== PresetType.BASE_CORNER && cab.preset !== PresetType.WALL_CORNER) ? (
                                      <input 
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-amber-500 accent-amber-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        checked={cab.advancedSettings?.showDrawers ?? (cab.preset === PresetType.BASE_DRAWER_3)}
                                        disabled={(cab.advancedSettings?.showDoors ?? (cab.preset !== PresetType.BASE_DOOR)) || (cab.advancedSettings?.showShelves ?? true)}
                                        onChange={(e) => {
                                          const updatedZones = [...project.zones];
                                          const isChecked = e.target.checked;
                                          updatedZones[0].cabinets[idx] = { 
                                            ...cab, 
                                            preset: isChecked ? PresetType.BASE_DRAWER_3 : cab.preset,
                                            advancedSettings: { 
                                              ...(cab.advancedSettings || {}), 
                                              showDrawers: isChecked,
                                              showDoors: isChecked ? false : (cab.advancedSettings?.showDoors ?? true),
                                              showShelves: isChecked ? false : (cab.advancedSettings?.showShelves ?? true),
                                              numDrawers: isChecked ? 3 : 0
                                            } 
                                          };
                                          setProject({ ...project, zones: updatedZones });
                                        }}
                                      />
                                    ) : (
                                      <div className="text-[10px] font-black text-slate-300 uppercase italic">N/A</div>
                                    )}
                                  </td>
                                  <td className="p-6 text-center pr-10">
                                    <button 
                                      onClick={() => {
                                        const updatedZones = [...project.zones];
                                        updatedZones[0].cabinets = updatedZones[0].cabinets.filter((_, i) => i !== idx);
                                        updatedZones[0].cabinets = recalculateCabinetPositions(updatedZones[0].cabinets);
                                        updatedZones[0].totalLength = calculateTotalZoneLength(updatedZones[0].cabinets);
                                        setProject({ ...project, zones: updatedZones });
                                      }}
                                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <X size={20} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {project.zones[0].cabinets.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4 text-slate-400">
                                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
                                        <Box size={32} className="opacity-20" />
                                      </div>
                                      <p className="font-bold italic uppercase tracking-widest text-xs">No boxes added yet.</p>
                                      <button 
                                        onClick={() => {
                                          const zone = project.zones[0];
                                          const newCab = createAdvancedCabinet(CabinetType.BASE, []);
                                          const updatedZones = [...project.zones];
                                          updatedZones[0] = { ...zone, active: true, totalLength: 600, cabinets: [newCab] };
                                          updatedZones[0].cabinets = recalculateCabinetPositions(updatedZones[0].cabinets);
                                          updatedZones[0].totalLength = calculateTotalZoneLength(updatedZones[0].cabinets);
                                          setProject({ ...project, zones: updatedZones });
                                        }}
                                        className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                      >
                                        Add your first unit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    )}

                    {activeModal === 'sheets' && (
                      <div className="space-y-8">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-[2rem] border-2 border-indigo-500/10 mb-8">
                          <h4 className="text-base font-black text-amber-900 dark:text-indigo-400 uppercase tracking-widest mb-1 italic">Inventory & Materials</h4>
                          <p className="text-sm text-indigo-700/70 dark:text-indigo-600/50 font-medium italic">Configure the sheet dimensions and types for accurate cutting lists.</p>
                        </div>
                        <SheetTypeManager 
                          currency={project.settings.currency || '$'}
                          sheetTypesExpanded={true}
                          showSheetsOnly={true}
                          isProjectLayer={true}
                          sheetSpecs={project.settings.materialSettings?.sheetSpecs}
                          hardwareSpecs={project.settings.materialSettings?.hardwareSpecs}
                          onSheetUpdate={(sheet) => {
                            setProject(prev => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                materialSettings: {
                                  ...prev.settings.materialSettings!,
                                  sheetSpecs: {
                                    ...prev.settings.materialSettings?.sheetSpecs,
                                    [sheet.name]: {
                                      width: sheet.width,
                                      length: sheet.length,
                                      thickness: sheet.thickness,
                                      pricePerSheet: sheet.price_per_sheet
                                    }
                                  }
                                }
                              }
                            }));
                          }}
                          onAccessoryUpdate={(acc) => {
                            setProject(prev => {
                              const hardwareSpecs = { ...(prev.settings.materialSettings?.hardwareSpecs || {}) };
                              hardwareSpecs[acc.name] = { price: acc.default_amount };
                              return {
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  materialSettings: {
                                    ...prev.settings.materialSettings!,
                                    hardwareSpecs
                                  }
                                }
                              };
                            });
                          }}
                        />
                      </div>
                    )}

                    {activeModal === 'hardware' && (
                      <div className="space-y-8">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-[2rem] border-2 border-indigo-500/10 mb-8">
                          <h4 className="text-base font-black text-amber-900 dark:text-indigo-400 uppercase tracking-widest mb-1 italic">Hardware & Fittings</h4>
                          <p className="text-sm text-indigo-700/70 dark:text-indigo-600/50 font-medium italic">Select hinges, handles, and runners for your project.</p>
                        </div>
                        <SheetTypeManager 
                          currency={project.settings.currency || '$'}
                          accessoriesExpanded={true}
                          showHardwareOnly={true}
                          isProjectLayer={true}
                          hardwareSpecs={project.settings.materialSettings?.hardwareSpecs}
                          onAccessoryUpdate={(acc) => {
                            setProject(prev => {
                              const hardwareSpecs = { ...(prev.settings.materialSettings?.hardwareSpecs || {}) };
                              hardwareSpecs[acc.name] = { price: acc.default_amount };
                              
                              return {
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  materialSettings: {
                                    ...prev.settings.materialSettings!,
                                    hardwareSpecs
                                  }
                                }
                              };
                            });
                          }}
                        />
                      </div>
                    )}

                    {activeModal === 'costs' && (
                      <div className="space-y-8 max-w-4xl mx-auto w-full">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-8 rounded-[2.5rem] border-2 border-indigo-500/10 mb-8 flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-black text-amber-900 dark:text-indigo-400 uppercase tracking-widest mb-1 italic">Project Financials</h4>
                            <p className="text-sm text-indigo-700/70 dark:text-indigo-600/50 font-medium italic">Manage overheads, labor, and profit margins.</p>
                          </div>
                          <div className="text-right">
                            <label className="text-[10px] font-black uppercase text-indigo-600/50 tracking-widest mb-2 block">Profit Margin</label>
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border-2 border-indigo-500/20 shadow-sm">
                              <input 
                                type="number" 
                                value={project.settings.costs?.marginPercent ?? 50} 
                                onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: Number(e.target.value) } } })}
                                className="w-16 bg-transparent text-right font-black text-xl text-indigo-600 outline-none"
                              />
                              <span className="text-indigo-600/50 font-bold">%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-[1fr_180px_60px] gap-4 px-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                            <div>Expense Description</div>
                             <div className="text-right">Amount ({project.settings.currency || '$'})</div>
                            <div className="text-right">Action</div>
                          </div>

                          <div className="space-y-3">
                            {(project.settings.costs?.expenses && project.settings.costs.expenses.length > 0 ? project.settings.costs.expenses : [
                              { id: 'labor', name: 'Standard Labor', amount: project.settings.costs?.laborCost || 0 },
                              { id: 'transport', name: 'Transport & Logistics', amount: project.settings.costs?.transportCost || 0 }
                            ]).map((expense) => (
                              <motion.div 
                                layout
                                key={expense.id}
                                className={`grid grid-cols-[1fr_180px_60px] gap-4 items-center p-4 rounded-2xl border-2 transition-all shadow-sm group ${
                                  editingExpenseId === expense.id 
                                    ? 'bg-white dark:bg-slate-800 border-indigo-500/50 ring-2 ring-amber-500/10' 
                                    : 'bg-white/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:border-indigo-500/30'
                                }`}
                              >
                                <input 
                                  type="text" 
                                  value={expense.name}
                                  readOnly={editingExpenseId !== expense.id}
                                  onChange={e => handleUpdateExpense(expense.id, 'name', e.target.value)}
                                  className={`bg-transparent border-none outline-none font-bold placeholder-slate-300 transition-all ${
                                    editingExpenseId === expense.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                  placeholder="Expense Name"
                                />
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    value={expense.amount}
                                    readOnly={editingExpenseId !== expense.id}
                                    onChange={e => handleUpdateExpense(expense.id, 'amount', Number(e.target.value))}
                                    className={`w-full px-4 py-3 rounded-xl border-none outline-none text-right font-black transition-all ${
                                      editingExpenseId === expense.id 
                                        ? 'bg-slate-50 dark:bg-slate-900/50 text-indigo-600 ring-2 ring-amber-500/20' 
                                        : 'bg-transparent text-slate-400'
                                    }`}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  {editingExpenseId === expense.id ? (
                                    <button 
                                      onClick={async () => {
                                        await onSaveProject?.(project);
                                        setEditingExpenseId(null);
                                      }}
                                      className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                                      title="Save changes"
                                    >
                                      <Check size={18} />
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => setEditingExpenseId(expense.id)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                      title="Edit expense"
                                    >
                                      <Pencil size={18} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleRemoveExpense(expense.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                    title="Remove expense"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          <button 
                            onClick={handleAddExpense}
                            className="w-full py-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-500/50 hover:bg-amber-50/10 transition-all flex items-center justify-center gap-3 group font-black uppercase text-[11px] tracking-widest mt-6"
                          >
                            <Plus size={20} className="group-hover:scale-125 transition-transform" /> Add New Project Expense
                          </button>
                        </div>
                        
                      </div>
                    )}

                    {activeModal === 'preferences' && (
                      <div className="space-y-10">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-10 rounded-[3rem] border-2 border-indigo-500/10">
                          <h4 className="text-xl font-black text-amber-900 dark:text-indigo-400 uppercase tracking-widest mb-3 italic">Layout Smart Selection</h4>
                          <p className="text-base text-indigo-700/70 dark:text-indigo-600/50 font-medium italic">Choose which functional units to include in the automated 3D generator.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                          {[
                            { id: 'includeTall', label: 'Tall Units', desc: 'Floor-to-ceiling storage and appliances', icon: <Box size={20} /> },
                            { id: 'includeSink', label: 'Sink Base', desc: 'Plumbing-ready units for wet areas', icon: <Box size={20} /> },
                            { id: 'includeCooker', label: 'Cooking Hub', desc: 'Specialized oven and hob cabinets', icon: <Box size={20} /> },
                            { id: 'includeDrawers', label: 'Drawer Stacks', desc: 'Smooth-glide multi-tier storage', icon: <Box size={20} /> },
                          ].map((item) => (
                            <label 
                              key={item.id}
                              className={`flex items-start gap-6 p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${
                                (project.settings.layoutPreferences?.[item.id as keyof typeof project.settings.layoutPreferences] ?? true)
                                  ? 'border-indigo-500 bg-indigo-600/5 shadow-xl shadow-indigo-500/10' 
                                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="pt-1 relative z-10">
                                <input 
                                  type="checkbox" 
                                  className="w-7 h-7 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-indigo-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
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
                              <div className="relative z-10">
                                <h5 className={`font-black uppercase tracking-tight text-base mb-1 ${
                                  (project.settings.layoutPreferences?.[item.id as keyof typeof project.settings.layoutPreferences] ?? true)
                                    ? 'text-amber-900 dark:text-indigo-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}>{item.label}</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">{item.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 space-y-6">
                          <label className="flex items-center gap-4 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-amber-500 accent-amber-500"
                              checked={project.settings.enableTopRow || false}
                              onChange={(e) => setProject({
                                ...project,
                                settings: { ...project.settings, enableTopRow: e.target.checked }
                              })}
                            />
                            <div>
                              <h5 className="font-black uppercase tracking-tight text-sm text-slate-900 dark:text-white">Ceiling-Touch Wall Cabinets (Top Row)</h5>
                              <p className="text-xs text-slate-500 font-medium italic mt-1">Automatically stack a second row of wall cabinets to reach the ceiling.</p>
                            </div>
                          </label>
                          
                          {project.settings.enableTopRow && (
                            <div className="pl-10 animate-in fade-in slide-in-from-top-4 duration-300">
                              <p className="text-xs text-indigo-600 font-bold italic">Top row height is automatically calculated from wall ceiling height to fit perfectly.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeModal === 'construction' && (
                      <div className="space-y-10">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                          <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-[0.2em] flex items-center gap-3 italic">
                            <div className="w-5 h-1.5 bg-indigo-600 rounded-full" /> Build Standards
                          </h4>
                          
                          <button 
                            onClick={() => {
                              if (!isPro) {
                                alert('Advanced Construction Editor is a Pro feature.');
                                return;
                              }
                              setShowAdvancedConstruction(!showAdvancedConstruction);
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all ${
                              showAdvancedConstruction 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 hover:border-indigo-500'
                            }`}
                          >
                            {isPro ? (showAdvancedConstruction ? 'Close Advanced' : 'Open Pro Editor') : <><Lock size={12} /> Pro Editor</>}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                          <NumberInput label="Kerf (mm)" value={project.settings.kerf} onChange={v => setProject({ ...project, settings: { ...project.settings, kerf: v } })} />
                          <NumberInput label="Countertop (mm)" value={project.settings.counterThickness} onChange={v => setProject({ ...project, settings: { ...project.settings, counterThickness: v } })} />
                        </div>

                        {showAdvancedConstruction && isPro && (
                          <div className="space-y-12 pt-8 animate-in zoom-in-98 duration-300">
                            <div className="space-y-6">
                              <h4 className="text-[11px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-3">
                                <div className="w-4 h-1.5 bg-indigo-600 rounded-full" /> Standard Depths (mm)
                              </h4>
                              <div className="grid grid-cols-3 gap-6">
                                <NumberInput label="Base Depth" value={project.settings.depthBase} onChange={v => setProject({ ...project, settings: { ...project.settings, depthBase: v } })} />
                                <NumberInput label="Wall Depth" value={project.settings.depthWall} onChange={v => setProject({ ...project, settings: { ...project.settings, depthWall: v } })} />
                                <NumberInput label="Tall Depth" value={project.settings.depthTall} onChange={v => setProject({ ...project, settings: { ...project.settings, depthTall: v } })} />
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[11px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-3">
                                <div className="w-4 h-1.5 bg-indigo-600 rounded-full" /> Standard Heights (mm)
                              </h4>
                              <div className="grid grid-cols-3 gap-6">
                                <NumberInput label="Base Height" value={project.settings.baseHeight} onChange={v => setProject({ ...project, settings: { ...project.settings, baseHeight: v } })} />
                                <NumberInput label="Wall Height" value={project.settings.wallHeight} onChange={v => setProject({ ...project, settings: { ...project.settings, wallHeight: v } })} />
                                <NumberInput label="Tall Height" value={project.settings.tallHeight} onChange={v => setProject({ ...project, settings: { ...project.settings, tallHeight: v } })} />
                              </div>
                            </div>
                          </div>
                        )}
                        <MaterialAllocationPanel
                          settings={project.settings}
                          onUpdate={s => setProject({ ...project, settings: { ...project.settings, ...s } })}
                          isExpanded={true}
                        />
                      </div>
                    )}

                    {activeModal === 'generation' && (
                      <div className="h-full flex flex-col justify-center py-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <div className="max-w-5xl mx-auto w-full px-6">
                          {/* Launchpad Header */}
                          <div className="text-center mb-6 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
                            <h2 className="text-6xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase mb-4 leading-tight text-glow">
                              Ready for <span className="text-indigo-600">{project.settings.workflowMode === 'advanced' ? 'Output' : 'Generation'}</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-lg mx-auto">
                              {project.settings.workflowMode === 'advanced' 
                                ? 'Your manual unit list is locked. All systems ready for technical analysis and manufacturing output.'
                                : 'Engineering specifications are locked. All systems ready for automated cabinetry layout generation.'}
                            </p>
                          </div>

                          <div className="grid lg:grid-cols-3 gap-8 relative">
                            {/* 1. Summary Column */}
                            <div className="lg:col-span-2 space-y-6">
                              <div className="bg-white dark:bg-slate-900/50 rounded-[3rem] p-8 border-2 border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                  <Cpu size={120} className="text-indigo-600" />
                                </div>
                                
                                <h3 className="text-xs font-black uppercase text-indigo-600 tracking-[0.3em] mb-4 italic flex items-center gap-4">
                                  <div className="w-8 h-1 bg-indigo-600 rounded-full" />
                                  Engineering Brief
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-x-12 gap-y-4">
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Core Structure</span>
                                    <div className="flex items-center gap-3">
                                      <Layout className="text-blue-500" size={18} />
                                      <span className="text-lg font-black text-slate-900 dark:text-white italic">
                                        {project.settings.workflowMode === 'advanced' 
                                          ? `${project.zones[0].cabinets.length} Units Defined`
                                          : `${project.zones.length} Walls Defined`}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Main Material</span>
                                    <div className="flex items-center gap-3">
                                      <Layers className="text-indigo-600" size={18} />
                                      <span className="text-lg font-black text-slate-900 dark:text-white italic">{project.settings.materialSettings?.doorMaterial || 'Premium White'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Construction Method</span>
                                    <div className="flex items-center gap-3">
                                      <Box className="text-emerald-500" size={18} />
                                      <span className="text-lg font-black text-slate-900 dark:text-white italic">{project.settings.constructionType || 'Frameless'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Financial Status</span>
                                    <div className="flex items-center gap-3">
                                      <DollarSign className="text-purple-500" size={18} />
                                      <span className="text-lg font-black text-slate-900 dark:text-white italic">Budget Locked</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-800/20 rounded-[2.5rem] p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 group">
                                <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-lg group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={24} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Verification Complete</h4>
                                    <p className="text-[10px] text-slate-500 font-medium italic">
                                      {project.settings.workflowMode === 'advanced' ? 'Direct Entry Engine: STATUS ACTIVE' : 'Layout Solver Engine: STATUS ACTIVE'}
                                    </p>
                                  </div>
                                </div>
                                <div className="hidden sm:flex -space-x-4">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-md">
                                      <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-orange-500 opacity-40" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 2. Action Column */}
                            <div className="space-y-4">
                              <button
                                onClick={handleGenerateLayout}
                                disabled={!isReadyToGenerate || (!isPro && isLayoutLocked)}
                                className="w-full aspect-square bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[3rem] flex flex-col items-center justify-center gap-6 group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_30px_60px_rgba(245,158,11,0.2)] dark:shadow-[0_30px_60px_rgba(255,255,255,0.05)] relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 relative z-10 group-hover:rotate-12 transition-transform">
                                  <Wand2 size={48} />
                                </div>
                                <div className="text-center relative z-10">
                                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Launch</h3>
                                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">3D Generator</p>
                                </div>
                                <div className="absolute bottom-10 animate-bounce opacity-20">
                                  <ArrowRight size={24} className="rotate-90" />
                                </div>
                              </button>

                              <div className="bg-indigo-600/5 rounded-3xl p-4 border-2 border-indigo-500/10 text-center italic">
                                <p className="text-xs text-indigo-600/80 font-bold leading-relaxed">
                                  "Precision is the soul of every design. Let the machine do the heavy lifting."
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>

          {/* Fixed Footer Navigation - ALWAYS VISIBLE */}
          {activeModal && (
            <div className="px-8 py-4 border-t dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex justify-between items-center shrink-0 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <Button 
                variant="secondary" 
                onClick={handlePrevStep}
                disabled={wizardSteps.indexOf(activeModal as string) === 0}
                className="text-[11px] font-black uppercase tracking-[0.2em] px-6 h-10 rounded-xl border-2"
              >
                Previous Step
              </Button>

              <div className="flex gap-4">
                {wizardSteps.indexOf(activeModal as string) === wizardSteps.length - 1 ? (
                  <div className="w-[180px]" /> // Placeholder for the launch screen which has its own button
                ) : (
                  <Button 
                    onClick={() => {
                      if (activeModal === 'walls' && wallEditRef.current) {
                        wallEditRef.current.triggerSave();
                      } else if (activeModal === 'limits' && wallLimitsRef.current) {
                        wallLimitsRef.current.triggerSave();
                      } else {
                        handleNextStep();
                      }
                    }} 
                    className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-indigo-500/30 text-[11px] transition-all flex items-center gap-3 group hover:scale-105 active:scale-95 h-12"
                  >
                    Next Step <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Journey Map */}
        <aside className="hidden md:flex w-96 border-l dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 overflow-hidden relative z-10">
          <div className="p-8 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2">Project Journey</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Completion Rate</span>
              <span className="text-lg font-black text-indigo-600 italic">
                {(() => {
                  const done = wizardSteps.filter(s => {
                    if (s === 'project') return isIdentityDone;
                    if (s === 'walls') return isWallsDone;
                    if (s === 'limits') return isLimitsDone;
                    if (s === 'preferences') return isPreferencesDone;
                    if (s === 'sheets') return isSheetsDone;
                    if (s === 'hardware') return isHardwareDone;
                    if (s === 'construction') return isConstructionDone;
                    if (s === 'costs') return isCostsDone;
                    if (s === 'generation') return true;
                    return false;
                  }).length;
                  return Math.round((done / wizardSteps.length) * 100);
                })()}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
               <div 
                className="h-full bg-indigo-600 transition-all duration-1000 ease-out" 
                style={{ width: `${(() => {
                  const done = wizardSteps.filter(s => {
                    if (s === 'project') return isIdentityDone;
                    if (s === 'walls') return isWallsDone;
                    if (s === 'limits') return isLimitsDone;
                    if (s === 'preferences') return isPreferencesDone;
                    if (s === 'sheets') return isSheetsDone;
                    if (s === 'hardware') return isHardwareDone;
                    if (s === 'construction') return isConstructionDone;
                    if (s === 'costs') return isCostsDone;
                    if (s === 'generation') return true;
                    return false;
                  }).length;
                  return (done / wizardSteps.length) * 100;
                })()}%` }} 
               />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {wizardSteps.map((step, index) => {
              let isDone = false;
              if (step === 'project') isDone = isIdentityDone;
              if (step === 'walls') isDone = isWallsDone;
              if (step === 'limits') isDone = isLimitsDone;
              if (step === 'preferences') isDone = isPreferencesDone;
              if (step === 'sheets') isDone = isSheetsDone;
              if (step === 'hardware') isDone = isHardwareDone;
              if (step === 'construction') isDone = isConstructionDone;
              if (step === 'costs') isDone = isCostsDone;
              if (step === 'generation') isDone = isReadyToGenerate;

              return (
                <StepSidebarItem 
                  key={step}
                  step={step}
                  index={index}
                  isActive={activeModal === step}
                  isDone={isDone}
                  isRequired={['project', 'walls', 'limits', 'preferences', 'construction'].includes(step)}
                />
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ScreenProjectSetup;
