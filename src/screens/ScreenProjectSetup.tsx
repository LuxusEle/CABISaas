import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, FileText, Upload, DollarSign, Settings, Box, Lock, CheckCircle2, AlertCircle, Wand2, ArrowRight, X } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { NumberInput } from '../components/NumberInput';
import { WallEditModal } from '../components/WallEditModal';
import { CabinetEditModal } from '../components/CabinetEditModal';
import { SheetTypeManager } from '../components/SheetTypeManager';
import { MaterialAllocationPanel } from '../components/MaterialAllocationPanel';
import { generateRubyLayout } from '../services/layoutSolver';
import { logoService } from '../services/logoService';
import { supabase } from '../services/supabaseClient';

interface ScreenProjectSetupProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  onSave: () => void;
  onSaveProject?: (p: Project) => Promise<any>;
  isDark: boolean;
}

const ScreenProjectSetup = ({ project, setProject, onSave, onSaveProject, isDark }: ScreenProjectSetupProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for centered modal
  const [activeModal, setActiveModal] = useState<'project' | 'walls' | 'sheets' | 'hardware' | 'construction' | 'costs' | 'allocation' | null>(null);

  // Modal control states
  const [showWallModal, setShowWallModal] = useState(false);
  const isLayoutLocked = project.zones.some(z => z.cabinets && z.cabinets.length > 0);
  const [showCabinetModal, setShowCabinetModal] = useState(false);
  const [editingCabinetType, setEditingCabinetType] = useState<'base' | 'wall' | 'tall'>('base');

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(project.settings.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step Completion Logic
  const isIdentityDone = project.name.trim().length > 0;
  const isWallsDone = project.zones.length > 0 && project.zones.some(z => z.totalLength > 0);
  const isConstructionDone = project.settings.counterThickness > 0; // Simple check if construction was visited/saved
  
  const isReadyToGenerate = isIdentityDone && isWallsDone && isConstructionDone;

  const wizardSteps = ['project', 'walls', 'construction', 'sheets', 'hardware', 'costs'];

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
  }, []);

  const handleNextStep = () => {
    const currentIndex = wizardSteps.indexOf(activeModal as string);
    if (currentIndex !== -1 && currentIndex < wizardSteps.length - 1) {
      const nextStep = wizardSteps[currentIndex + 1];
      if (nextStep === 'walls') {
        setActiveModal(null);
        setShowWallModal(true);
      } else {
        setActiveModal(nextStep as any);
      }
    } else {
      setActiveModal(null);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, GIF)');
      return;
    }

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
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setProject(prev => ({
      ...prev,
      settings: { ...prev.settings, logoUrl: undefined }
    }));
  };

  const handleGenerateLayout = () => {
    if (!isReadyToGenerate) return;
    
    const result = generateRubyLayout(project);
    setProject(result.project);
    
    if (onSaveProject) {
      onSaveProject(result.project).then(() => navigate('/walls?view=iso'));
    } else {
      onSave(); // Ensure it's saved locally
      navigate('/walls?view=iso');
    }
  };

  const SetupCard = ({ icon, title, subtitle, onClick, colorClass, isDone, isRequired }: any) => (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center group relative overflow-hidden h-full ${
        isDone 
          ? 'border-green-500/20 bg-green-50/10' 
          : isRequired 
            ? 'border-amber-500/30' 
            : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colorClass} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform relative`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
        {isDone && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-lg border-2 border-white dark:border-slate-900">
            <CheckCircle2 size={12} />
          </div>
        )}
      </div>
      <h3 className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white mb-0.5 uppercase tracking-tight">{title}</h3>
      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{subtitle}</p>
      
      {isRequired && !isDone && (
        <div className="mt-2 flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[8px] font-black uppercase tracking-wider">
          Required
        </div>
      )}
      {isDone && (
        <div className="mt-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-[8px] font-black uppercase tracking-wider">
          Done
        </div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Project <span className="text-amber-500">Setup</span></h2>
                <div className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-full uppercase tracking-widest">Wizard</div>
              </div>
              <p className="text-xs text-slate-500 font-medium italic">Complete the 3 required steps below</p>
            </div>
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-8 w-auto object-contain hidden sm:block" />
              )}
              <Button variant="primary" size="sm" onClick={onSave} className="shadow-lg shadow-amber-500/20 px-6 py-2 h-auto text-xs uppercase font-black">
                <Save size={14} className="mr-2" /> Save Draft
              </Button>
            </div>
          </div>

          {/* Setup Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
            <SetupCard 
              icon={<FileText size={32} className="text-teal-600 dark:text-teal-400" />}
              title="Identity"
              subtitle="Project Name & Company"
              colorClass="bg-teal-50 dark:bg-teal-900/20"
              onClick={() => setActiveModal('project')}
              isDone={isIdentityDone}
              isRequired={true}
            />
            <SetupCard 
              icon={isLayoutLocked ? <Lock size={32} className="text-slate-400" /> : <Upload size={32} className="text-blue-600 dark:text-blue-400" />}
              title="Room Layout"
              subtitle="Walls & Global Dimensions"
              colorClass={isLayoutLocked ? "bg-slate-100 dark:bg-slate-200/50" : "bg-blue-50 dark:bg-blue-900/20"}
              onClick={() => setShowWallModal(true)}
              isDone={isWallsDone}
              isRequired={true}
            />
            <SetupCard 
              icon={<Box size={32} className="text-purple-600 dark:text-purple-400" />}
              title="Construction"
              subtitle="Kerf, Gola & Standards"
              colorClass="bg-purple-50 dark:bg-purple-900/20"
              onClick={() => setActiveModal('construction')}
              isDone={isConstructionDone}
              isRequired={true}
            />
            <SetupCard 
              icon={<Settings size={32} className="text-amber-600 dark:text-amber-400" />}
              title="Materials"
              subtitle="Sheet Types & Boards"
              colorClass="bg-amber-50 dark:bg-amber-900/20"
              onClick={() => setActiveModal('sheets')}
              isDone={project.settings.thickness > 0}
            />
            <SetupCard 
              icon={<Save size={32} className="text-rose-600 dark:text-rose-400" />}
              title="Hardware"
              subtitle="Accessories & Templates"
              colorClass="bg-rose-50 dark:bg-rose-900/20"
              onClick={() => setActiveModal('hardware')}
            />
            <SetupCard 
              icon={<DollarSign size={32} className="text-green-600 dark:text-green-400" />}
              title="Pricing"
              subtitle="Costs, Labor & Margins"
              colorClass="bg-green-50 dark:bg-green-900/20"
              onClick={() => setActiveModal('costs')}
              isDone={project.settings.costs?.laborCost > 0}
            />
          </div>

          {/* Action Area */}
          <div className="mt-8 p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4 max-w-5xl mx-auto relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isReadyToGenerate ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                <Wand2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Generate Full 3D Design</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {isReadyToGenerate 
                    ? "Excellent! Everything is ready to calculate your layout."
                    : "Complete Identity, Room Layout, and Construction to unlock."}
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateLayout}
              disabled={!isReadyToGenerate}
              className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                isReadyToGenerate 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/40 hover:scale-105 active:scale-95 cursor-pointer' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              {isReadyToGenerate ? (
                <>
                  Start 3D Layout <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <Lock size={14} /> Locked
                </>
              )}
            </button>
          </div>

          {/* Centered Modal Overlay */}
          {activeModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div 
                className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              >
                {/* Modal Header */}
                <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-amber-500">
                      {activeModal === 'project' && <FileText size={24} />}
                      {activeModal === 'construction' && <Box size={24} />}
                      {activeModal === 'sheets' && <Settings size={24} />}
                      {activeModal === 'hardware' && <Save size={24} />}
                      {activeModal === 'costs' && <DollarSign size={24} />}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      {activeModal === 'project' && 'Identity'}
                      {activeModal === 'walls' && 'Room Layout'}
                      {activeModal === 'sheets' && 'Material Library'}
                      {activeModal === 'costs' && 'Financial Settings'}
                      {activeModal === 'construction' && 'Construction'}
                      {activeModal === 'hardware' && 'Hardware'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  {activeModal === 'project' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Project Name</label>
                          <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white font-bold" placeholder="e.g., Lakeview Kitchen" value={project.name} onChange={e => setProject({ ...project, name: e.target.value })} />
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Company Name</label>
                          <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white font-bold" placeholder="Your Business" value={project.company} onChange={e => setProject({ ...project, company: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Company Branding</label>
                        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] flex flex-col items-center gap-6 bg-slate-50/50 dark:bg-slate-800/30">
                          {logoPreview ? (
                            <div className="relative group">
                              <img src={logoPreview} alt="Preview" className="h-32 w-auto object-contain drop-shadow-xl" />
                              <button onClick={handleRemoveLogo} className="absolute -top-3 -right-3 bg-rose-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-center">
                              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload size={32} className="opacity-30" />
                              </div>
                              <p className="text-sm font-bold">Drop your logo here</p>
                              <p className="text-xs opacity-50 mt-1">PNG or JPG, max 5MB</p>
                            </div>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-modal" />
                          <label htmlFor="logo-modal" className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black rounded-full cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all">
                            {isUploadingLogo ? 'UPLOADING...' : 'UPLOAD LOGO'}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal === 'sheets' && (
                    <div className="animate-in slide-in-from-bottom-4">
                      <SheetTypeManager 
                        currency={project.settings.currency || '$'}
                        sheetTypesExpanded={true}
                        showSheetsOnly={true}
                      />
                    </div>
                  )}

                  {activeModal === 'hardware' && (
                    <div className="animate-in slide-in-from-bottom-4">
                      <SheetTypeManager 
                        currency={project.settings.currency || '$'}
                        accessoriesExpanded={true}
                        showHardwareOnly={true}
                      />
                    </div>
                  )}

                  {activeModal === 'costs' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4">
                      <div className="grid grid-cols-1 gap-6">
                        <NumberInput label="Labor Cost (LKR)" value={project.settings.costs?.laborCost ?? 0} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborCost: v } } })} />
                        <NumberInput label="Transport Cost (LKR)" value={project.settings.costs?.transportCost ?? 0} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, transportCost: v } } })} />
                        <NumberInput label="Profit Margin (%)" value={project.settings.costs?.marginPercent ?? 50} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: v } } })} />
                      </div>
                    </div>
                  )}

                  {activeModal === 'construction' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <NumberInput label="Kerf (mm)" value={project.settings.kerf} onChange={v => setProject({ ...project, settings: { ...project.settings, kerf: v } })} />
                        <NumberInput label="Counter Thickness (mm)" value={project.settings.counterThickness} onChange={v => setProject({ ...project, settings: { ...project.settings, counterThickness: v } })} />
                        <div className="col-span-full">
                          <MaterialAllocationPanel
                            settings={project.settings}
                            onUpdate={s => setProject({ ...project, settings: { ...project.settings, ...s } })}
                            isExpanded={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0 border-t dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {wizardSteps.indexOf(activeModal as string) + 1} / {wizardSteps.length}
                  </p>
                  <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                    <button 
                      onClick={handleNextStep} 
                      className="px-10 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 group"
                    >
                      {wizardSteps.indexOf(activeModal as string) < wizardSteps.length - 1 ? (
                        <>
                          Next Step <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        'Done'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legacy Modals */}
          <WallEditModal
            isOpen={showWallModal}
            onClose={() => setShowWallModal(false)}
            project={project}
            isDark={isDark}
            hideCabinets={true}
            readOnly={isLayoutLocked}
            onSave={(newZones) => {
              const updatedProject = { ...project, zones: newZones };
              setProject(updatedProject);
              setShowWallModal(false);
              // After wall setup, move to Construction
              setActiveModal('construction');
            }}
          />

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
        </div>
      </div>
    </div>
  );
};

export default ScreenProjectSetup;
