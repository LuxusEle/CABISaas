import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, FileText, Upload, DollarSign, Settings, Box, Lock, CheckCircle2, AlertCircle, Wand2, ArrowRight, X, MousePointer2 } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { NumberInput } from '../components/NumberInput';
import { WallEditModal } from '../components/WallEditModal';
import { WallLimitsModal } from '../components/WallLimitsModal';
import { CabinetEditModal } from '../components/CabinetEditModal';
import { SheetTypeManager } from '../components/SheetTypeManager';
import { MaterialAllocationPanel } from '../components/MaterialAllocationPanel';
import { generateRubyLayout } from '../services/layoutSolver';
import { logoService } from '../services/logoService';
import { subscriptionService } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';

interface ScreenProjectSetupProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  onSave: () => void;
  onSaveProject?: (p: Project) => Promise<any>;
  isDark: boolean;
  isUserPro?: boolean;
}

const ScreenProjectSetup = ({ project, setProject, onSave, onSaveProject, isDark, isUserPro }: ScreenProjectSetupProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for centered modal
  const [activeModal, setActiveModal] = useState<'project' | 'walls' | 'limits' | 'sheets' | 'hardware' | 'construction' | 'costs' | 'allocation' | 'preferences' | null>('project');

  // Modal control states
  const isLayoutLocked = project.zones.some(z => z.cabinets && z.cabinets.length > 0);
  const [isPro, setIsPro] = useState(false);
  const [showCabinetModal, setShowCabinetModal] = useState(false);
  const [editingCabinetType, setEditingCabinetType] = useState<'base' | 'wall' | 'tall'>('base');

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(project.settings.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvancedConstruction, setShowAdvancedConstruction] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(new Set(['project']));
  const wallEditRef = useRef<any>(null);
  const wallLimitsRef = useRef<any>(null);

  // Step Completion Logic
  const isIdentityDone = project.name.trim().length > 0 && project.name !== 'New Kitchen';
  const isWallsDone = project.zones.length > 0 && project.zones.some(z => z.totalLength > 0);
  const isLimitsDone = isWallsDone && project.zones.every(z => (z.startLimit !== undefined && z.endLimit !== undefined) || (z.startLimit === 0 && z.endLimit === z.totalLength));
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

  const isReadyToGenerate = isIdentityDone && isWallsDone && isLimitsDone && isConstructionDone && isPreferencesDone && isSheetsDone;

  const wizardSteps = ['project', 'walls', 'limits', 'preferences', 'sheets', 'hardware', 'construction', 'costs'];

  // Handle auto-open from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const step = params.get('step');
    if (step === 'project' && !activeModal) {
      setActiveModal('project');
    }
  }, [location.search]);

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
      // For removing, we just clear it in the settings. 
      // The old logo will be cleaned up on the next upload by the service.
      setLogoPreview(null);
      setProject(prev => ({
        ...prev,
        settings: { ...prev.settings, logoUrl: undefined }
      }));
  };

  const handleNextStep = () => {
    const currentIndex = wizardSteps.indexOf(activeModal as string);
    if (currentIndex !== -1 && currentIndex < wizardSteps.length - 1) {
      const nextStep = wizardSteps[currentIndex + 1];
      setActiveModal(nextStep as any);
    } else {
      setActiveModal(null);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = wizardSteps.indexOf(activeModal as string);
    if (currentIndex > 0) {
      const prevStep = wizardSteps[currentIndex - 1];
      setActiveModal(prevStep as any);
    }
  };

  const handleGenerateLayout = async () => {
    if (!onSaveProject) return;
    
    try {
      // 1. Save the project state first
      await onSaveProject(project);
      
      // 2. Generate the 3D design using Ruby Layout Solver
      const result = generateRubyLayout(project);
      const updatedProject = result.project;
      
      // 3. Save the final design
      await onSaveProject(updatedProject);
      
      // 4. Navigate to Studio
      navigate('/studio');
    } catch (err) {
      console.error('Failed to generate design:', err);
      alert('Error generating design. Please try again.');
    }
  };

  const StepSidebarItem = ({ step, index, isActive, isDone, isRequired }: { step: string, index: number, isActive: boolean, isDone: boolean, isRequired: boolean }) => {
    const getIcon = () => {
      if (isDone) return <CheckCircle2 className="text-green-500" size={18} />;
      if (isActive) return <ArrowRight className="text-amber-500 animate-pulse" size={18} />;
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
        default: return step;
      }
    };

    return (
      <button
        onClick={() => {
          if (activeModal) setVisitedSteps(prev => new Set([...prev, activeModal]));
          setActiveModal(step as any);
        }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2 text-left group ${
          isActive 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
            : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isActive ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          {getIcon()}
        </div>
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-tight truncate ${isActive ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'}`}>
            Step {index + 1}
          </p>
          <h4 className={`text-xs font-bold uppercase truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {getLabel()}
          </h4>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl relative">
          
          {/* Top Bar */}
          <div className="px-6 py-4 border-b dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center shrink-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Settings size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                  Setup <span className="text-amber-500">Wizard</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Step {wizardSteps.indexOf(activeModal as string) + 1} of {wizardSteps.length}: {activeModal?.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onSave} className="text-[10px] uppercase font-black px-4">
                <Save size={14} className="mr-2" /> Save Draft
              </Button>
            </div>
          </div>

          {/* Main Stage Content Area */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden p-4">
            <div className="h-full w-full max-w-none transition-all duration-500 relative">
              {!activeModal ? (
                <div className="space-y-8 animate-in fade-in zoom-in duration-500 text-center py-20">
                  <div className="w-24 h-24 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center text-amber-500 mx-auto mb-6">
                    <Settings size={48} className="animate-spin-slow" />
                  </div>
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Ready to <span className="text-amber-500">Begin?</span></h1>
                  <p className="text-lg text-slate-500 font-medium italic max-w-lg mx-auto">Let's guide you through the setup process to generate your perfect 3D cabinetry design.</p>
                  
                  <button onClick={() => setActiveModal('project')} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3 mx-auto group text-xs">
                    Start Journey <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="h-full w-full animate-in zoom-in-95 duration-500">
                  <div className={`h-full w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-200/60 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] ${['walls', 'limits'].includes(activeModal as string) ? '' : 'p-4 sm:p-10 overflow-y-auto'}`}>
                    <div className={`${['walls', 'limits'].includes(activeModal as string) ? 'h-full w-full' : 'max-w-5xl mx-auto w-full'}`}>
                    
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
                          setVisitedSteps(prev => new Set([...prev, 'walls']));
                          const updatedProject = { ...project, zones: newZones };
                          setProject(updatedProject);
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
                          setVisitedSteps(prev => new Set([...prev, 'limits']));
                          const updatedProject = { ...project, zones: newZones };
                          setProject(updatedProject);
                          setActiveModal('preferences');
                        }}
                      />
                    )}

                    {activeModal === 'project' && (
                      <div className="space-y-10">
                        <div className="grid md:grid-cols-2 gap-12">
                          <div className="space-y-8">
                            <h4 className="text-xs font-black uppercase text-amber-500 tracking-widest flex items-center gap-3 italic">
                              <div className="w-6 h-1.5 bg-amber-500 rounded-full" /> Company Profile
                            </h4>
                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Company Name</label>
                              <input className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white font-bold text-xl shadow-inner transition-all" placeholder="Your Business" value={project.company} onChange={e => setProject({ ...project, company: e.target.value })} />
                            </div>

                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Brand Identity (Logo)</label>
                              <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center gap-6 bg-slate-50/30 dark:bg-slate-800/20 group hover:border-amber-500 transition-colors">
                                {logoPreview ? (
                                  <div className="relative group">
                                    <img src={logoPreview} alt="Preview" className="h-32 w-auto object-contain drop-shadow-2xl" />
                                    <button onClick={handleRemoveLogo} className="absolute -top-3 -right-3 bg-rose-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-center">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                                      <Upload size={32} className="opacity-20" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest">Drop your logo here</p>
                                  </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-wizard" />
                                <label htmlFor="logo-wizard" className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black rounded-full cursor-pointer hover:scale-105 transition-transform shadow-xl uppercase tracking-[0.2em]">
                                  {isUploadingLogo ? 'UPLOADING...' : 'SELECT IMAGE'}
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-8">
                            <h4 className="text-xs font-black uppercase text-blue-500 tracking-widest flex items-center gap-3 italic">
                               <div className="w-6 h-1.5 bg-blue-500 rounded-full" /> Client Specifications
                            </h4>
                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Project Name</label>
                              <input className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white font-bold text-xl shadow-inner transition-all" placeholder="e.g., Lakeview Kitchen" value={project.name} onChange={e => setProject({ ...project, name: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Site Address</label>
                              <input className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white font-bold text-xl shadow-inner transition-all" placeholder="Street Address" value={project.customerAddress || ''} onChange={e => setProject({ ...project, customerAddress: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Contact Number</label>
                              <input className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white font-bold text-xl shadow-inner transition-all" placeholder="+94 ..." value={project.customerPhone || ''} onChange={e => setProject({ ...project, customerPhone: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeModal === 'sheets' && (
                      <div className="space-y-8">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-[2rem] border-2 border-amber-500/10 mb-8">
                          <h4 className="text-base font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1 italic">Inventory & Materials</h4>
                          <p className="text-sm text-amber-700/70 dark:text-amber-500/50 font-medium italic">Configure the sheet dimensions and types for accurate cutting lists.</p>
                        </div>
                        <SheetTypeManager 
                          currency={project.settings.currency || '$'}
                          sheetTypesExpanded={true}
                          showSheetsOnly={true}
                        />
                      </div>
                    )}

                    {activeModal === 'hardware' && (
                      <div className="space-y-8">
                        <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-[2rem] border-2 border-rose-500/10 mb-8">
                          <h4 className="text-base font-black text-rose-900 dark:text-rose-400 uppercase tracking-widest mb-1 italic">Hardware & Fittings</h4>
                          <p className="text-sm text-rose-700/70 dark:text-rose-500/50 font-medium italic">Select hinges, handles, and runners for your project.</p>
                        </div>
                        <SheetTypeManager 
                          currency={project.settings.currency || '$'}
                          accessoriesExpanded={true}
                          showHardwareOnly={true}
                        />
                      </div>
                    )}

                    {activeModal === 'costs' && (
                      <div className="space-y-10">
                        <div className="p-10 bg-slate-50 dark:bg-slate-800/30 rounded-[3rem] grid grid-cols-1 md:grid-cols-3 gap-8">
                           <NumberInput label="Labor Cost (LKR)" value={project.settings.costs?.laborCost ?? 0} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborCost: v } } })} />
                           <NumberInput label="Transport Cost (LKR)" value={project.settings.costs?.transportCost ?? 0} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, transportCost: v } } })} />
                           <NumberInput label="Profit Margin (%)" value={project.settings.costs?.marginPercent ?? 50} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: v } } })} />
                        </div>
                      </div>
                    )}

                    {activeModal === 'preferences' && (
                      <div className="space-y-10">
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-10 rounded-[3rem] border-2 border-amber-500/10">
                          <h4 className="text-xl font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-3 italic">Layout Smart Selection</h4>
                          <p className="text-base text-amber-700/70 dark:text-amber-500/50 font-medium italic">Choose which functional units to include in the automated 3D generator.</p>
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
                                  ? 'border-amber-500 bg-amber-500/5 shadow-xl shadow-amber-500/10' 
                                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="pt-1 relative z-10">
                                <input 
                                  type="checkbox" 
                                  className="w-7 h-7 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
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
                                    ? 'text-amber-900 dark:text-amber-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}>{item.label}</h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">{item.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeModal === 'construction' && (
                      <div className="space-y-10">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                          <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-[0.2em] flex items-center gap-3 italic">
                            <div className="w-5 h-1.5 bg-amber-500 rounded-full" /> Build Standards
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
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 hover:border-amber-500'
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
                              <h4 className="text-[11px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-3">
                                <div className="w-4 h-1.5 bg-blue-500 rounded-full" /> Standard Depths (mm)
                              </h4>
                              <div className="grid grid-cols-3 gap-6">
                                <NumberInput label="Base Depth" value={project.settings.depthBase} onChange={v => setProject({ ...project, settings: { ...project.settings, depthBase: v } })} />
                                <NumberInput label="Wall Depth" value={project.settings.depthWall} onChange={v => setProject({ ...project, settings: { ...project.settings, depthWall: v } })} />
                                <NumberInput label="Tall Depth" value={project.settings.depthTall} onChange={v => setProject({ ...project, settings: { ...project.settings, depthTall: v } })} />
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[11px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-3">
                                <div className="w-4 h-1.5 bg-emerald-500 rounded-full" /> Standard Heights (mm)
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
                    </div>
                  </div>
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
                  <button
                    onClick={handleGenerateLayout}
                    disabled={!isReadyToGenerate || (!isPro && isLayoutLocked)}
                    className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-xl ${
                      isReadyToGenerate && (isPro || !isLayoutLocked)
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 hover:scale-105 active:scale-95' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Wand2 size={18} /> Generate 3D Design
                  </button>
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
                    className="px-10 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-amber-500/30 text-[11px] transition-all flex items-center gap-3 group hover:scale-105 active:scale-95 h-12"
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
              <span className="text-lg font-black text-amber-500 italic">
                {Math.round((wizardSteps.filter((s) => {
                  if (s === 'project') return isIdentityDone;
                  if (s === 'walls') return isWallsDone;
                  if (s === 'limits') return isLimitsDone;
                  if (s === 'preferences') return isPreferencesDone;
                  if (s === 'sheets') return isSheetsDone;
                  if (s === 'hardware') return isHardwareDone;
                  if (s === 'construction') return isConstructionDone;
                  if (s === 'costs') return isCostsDone;
                  return false;
                }).length / wizardSteps.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
               <div 
                className="h-full bg-amber-500 transition-all duration-1000 ease-out" 
                style={{ width: `${(wizardSteps.filter((s) => {
                  if (s === 'project') return isIdentityDone;
                  if (s === 'walls') return isWallsDone;
                  if (s === 'limits') return isLimitsDone;
                  if (s === 'preferences') return isPreferencesDone;
                  if (s === 'sheets') return isSheetsDone;
                  if (s === 'hardware') return isHardwareDone;
                  if (s === 'construction') return isConstructionDone;
                  if (s === 'costs') return isCostsDone;
                  return false;
                }).length / wizardSteps.length) * 100}%` }} 
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

          <div className="p-8 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
             <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${isReadyToGenerate ? 'bg-amber-500 shadow-2xl shadow-amber-500/40 border-transparent text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-60'}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isReadyToGenerate ? 'bg-white text-amber-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    <CheckCircle2 size={20} />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-[0.1em] ${isReadyToGenerate ? 'text-white' : 'text-slate-400'}`}>System Status</span>
                </div>
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wider">
                  {isReadyToGenerate 
                    ? "Calibration Complete. The system is now ready to generate your production-grade 3D model."
                    : "Please finish the mandatory setup steps to activate the design generation engine."}
                </p>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ScreenProjectSetup;
