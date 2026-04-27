import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, FileText, ChevronDown, Upload, DollarSign, Settings, Box, Lock } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { NumberInput } from '../components/NumberInput';
import { WallSetupCard } from '../components/WallSetupCard';
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

  const SetupCard = ({ icon, title, subtitle, onClick, colorClass }: any) => (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all flex flex-col items-center text-center group relative overflow-hidden"
    >
      <div className={`w-16 h-16 rounded-2xl ${colorClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronDown size={20} className="-rotate-90 text-amber-500" />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Project <span className="text-amber-500">Setup</span></h2>
              <p className="text-sm text-slate-500 font-medium">Configure your manufacturing standards and layout preferences</p>
            </div>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-10 sm:h-14 w-auto object-contain" />
              )}
              <Button variant="primary" size="lg" onClick={onSave} className="shadow-lg shadow-amber-500/20 px-8">
                <Save size={18} className="mr-2" /> Save Changes
              </Button>
            </div>
          </div>

          {/* Setup Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SetupCard 
              icon={<FileText size={32} className="text-teal-600 dark:text-teal-400" />}
              title="Identity"
              subtitle="Name, Company & Branding"
              colorClass="bg-teal-50 dark:bg-teal-900/20"
              onClick={() => setActiveModal('project')}
            />
            <SetupCard 
              icon={isLayoutLocked ? <Lock size={32} className="text-slate-400" /> : <Upload size={32} className="text-blue-600 dark:text-blue-400" />}
              title="Room Layout"
              subtitle={isLayoutLocked ? "Room Layout (View Only)" : "Walls & Global Dimensions"}
              colorClass={isLayoutLocked ? "bg-slate-100 dark:bg-slate-200/50" : "bg-blue-50 dark:bg-blue-900/20"}
              onClick={() => setShowWallModal(true)}
            />
            <SetupCard 
              icon={<Settings size={32} className="text-amber-600 dark:text-amber-400" />}
              title="Materials"
              subtitle="Sheet Types & Boards"
              colorClass="bg-amber-50 dark:bg-amber-900/20"
              onClick={() => setActiveModal('sheets')}
            />
            <SetupCard 
              icon={<DollarSign size={32} className="text-green-600 dark:text-green-400" />}
              title="Pricing"
              subtitle="Costs, Labor & Margins"
              colorClass="bg-green-50 dark:bg-green-900/20"
              onClick={() => setActiveModal('costs')}
            />
            <SetupCard 
              icon={<Box size={32} className="text-purple-600 dark:text-purple-400" />}
              title="Construction"
              subtitle="Kerf, Gola & Standards"
              colorClass="bg-purple-50 dark:bg-purple-900/20"
              onClick={() => setActiveModal('construction')}
            />
            <SetupCard 
              icon={<Save size={32} className="text-rose-600 dark:text-rose-400" />}
              title="Hardware"
              subtitle="Accessories & Templates"
              colorClass="bg-rose-50 dark:bg-rose-900/20"
              onClick={() => setActiveModal('hardware')}
            />
          </div>

          {/* Centered Modal Overlay */}
          {activeModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div 
                className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              >
                {/* Modal Header */}
                <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center shrink-0">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {activeModal === 'project' && 'Project Identity'}
                    {activeModal === 'walls' && 'Room & Wall Setup'}
                    {activeModal === 'sheets' && 'Material Library'}
                    {activeModal === 'costs' && 'Financial Settings'}
                    {activeModal === 'construction' && 'Construction Standards'}
                    {activeModal === 'hardware' && 'Hardware & Accessories'}
                  </h3>
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Save size={24} className="rotate-45" /> {/* Using Save icon rotated as an X for consistency if needed, or just X */}
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeModal === 'project' && (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-slate-400">Project Name</label>
                          <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white" value={project.name} onChange={e => setProject({ ...project, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-slate-400">Company Name</label>
                          <input className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-amber-500 outline-none dark:text-white" value={project.company} onChange={e => setProject({ ...project, company: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400">Branding Logo</label>
                        <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-4">
                          {logoPreview ? (
                            <div className="relative group">
                              <img src={logoPreview} alt="Preview" className="h-24 w-auto object-contain" />
                              <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg">
                                <Save size={12} className="rotate-45" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-center">
                              <Upload size={32} className="mx-auto mb-2 opacity-50" />
                              <p className="text-xs font-bold">No logo uploaded yet</p>
                            </div>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-modal" />
                          <label htmlFor="logo-modal" className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black rounded-full cursor-pointer hover:scale-105 transition-transform">
                            {isUploadingLogo ? 'UPLOADING...' : 'SELECT LOGO'}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}


                  {activeModal === 'sheets' && (
                    <SheetTypeManager 
                      currency={project.settings.currency || '$'}
                      sheetTypesExpanded={true}
                      showSheetsOnly={true}
                    />
                  )}

                  {activeModal === 'hardware' && (
                    <SheetTypeManager 
                      currency={project.settings.currency || '$'}
                      accessoriesExpanded={true}
                      showHardwareOnly={true}
                    />
                  )}

                  {activeModal === 'costs' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <NumberInput label="Labor Cost (LKR)" value={project.settings.costs?.laborCost ?? 0} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborCost: v } } })} />
                        <NumberInput label="Transport Cost (LKR)" value={project.settings.costs?.transportCost ?? 0} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, transportCost: v } } })} />
                        <NumberInput label="Profit Margin (%)" value={project.settings.costs?.marginPercent ?? 50} onChange={v => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: v } } })} />
                      </div>
                    </div>
                  )}

                  {activeModal === 'construction' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end shrink-0">
                  <Button variant="primary" onClick={() => setActiveModal(null)} className="px-10">Done</Button>
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
              const result = generateRubyLayout(updatedProject);
              setProject(result.project);
              if (onSaveProject) {
                onSaveProject(result.project).then(() => navigate('/walls?view=iso'));
              } else {
                navigate('/walls?view=iso');
              }
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
