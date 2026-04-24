import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, FileText, ChevronDown, Upload, DollarSign 
} from 'lucide-react';
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
  // State to track which section is expanded - only one at a time
  const [expandedSection, setExpandedSection] = useState<'projectInfo' | 'sheetTypes' | 'accessories' | 'allocation' | 'costs' | null>('projectInfo');

  // Cabinet Edit Modal
  const [showCabinetModal, setShowCabinetModal] = useState(false);
  const [editingCabinetType, setEditingCabinetType] = useState<'base' | 'wall' | 'tall'>('base');

  // Wall Edit Modal
  const [showWallModal, setShowWallModal] = useState(false);

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
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
      } else {
        alert('Failed to upload logo. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setProject(prev => ({
      ...prev,
      settings: { ...prev.settings, logoUrl: undefined }
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSection = (section: 'projectInfo' | 'sheetTypes' | 'accessories' | 'allocation' | 'costs') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Project Setup</h2>
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              )}
              <Button variant="primary" size="sm" onClick={onSave} className="min-h-[40px]">
                <Save size={16} className="mr-2" /> Save
              </Button>
            </div>
          </div>

          {/* Project Info & Dimensions - Combined Collapsible Menu */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Header - Always visible */}
            <div
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => toggleSection('projectInfo')}
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <FileText className="text-teal-500" /> Project Info & Dimensions
              </h3>
              <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${expandedSection === 'projectInfo' ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Content - Collapsible with animation */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'projectInfo' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 pt-0 space-y-6">
                {/* Project Info Section */}
                <div className="space-y-4">
                  <h4 className="text-slate-500 font-bold uppercase text-xs tracking-wider">Project Info</h4>
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
                      <label className="text-xs font-bold text-slate-400">Company Logo</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            className={`flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isUploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            {isUploadingLogo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700 dark:border-slate-200" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                              </>
                            )}
                          </label>
                          <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF (max 5MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dimensions & Nesting Section */}
                <div className="space-y-4">
                  <WallSetupCard 
                    project={project}
                    onClick={() => setShowWallModal(true)}
                  />


                  {/* Additional Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 mt-4">
                    <NumberInput label="Kerf (mm)" value={project.settings.kerf} onChange={(v) => setProject({ ...project, settings: { ...project.settings, kerf: v } })} step={1} />
                    <NumberInput label="Counter Thickness (mm)" value={project.settings.counterThickness} onChange={(v) => setProject({ ...project, settings: { ...project.settings, counterThickness: v } })} step={5} />
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Wall Edit Modal */}
          <WallEditModal
            isOpen={showWallModal}
            onClose={() => setShowWallModal(false)}
            project={project}
            isDark={isDark}
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

          {/* Cabinet Edit Modal */}
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

          {/* Sheet Types Manager */}
          <SheetTypeManager
            currency={project.settings.currency || '$'}
            sheetTypesExpanded={expandedSection === 'sheetTypes'}
            accessoriesExpanded={expandedSection === 'accessories'}
            onToggleSheetTypes={() => toggleSection('sheetTypes')}
            onToggleAccessories={() => toggleSection('accessories')}
          />

          {/* Cost Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => toggleSection('costs')}
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <DollarSign className="text-green-500" /> Cost Settings
              </h3>
              <button className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-transform duration-300 ${expandedSection === 'costs' ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'costs' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Labor Cost (LKR)</label>
                    <input
                      type="number"
                      value={project.settings.costs?.laborCost ?? 0}
                      onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, laborCost: Number(e.target.value) } } })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Transport Cost (LKR)</label>
                    <input
                      type="number"
                      value={project.settings.costs?.transportCost ?? 0}
                      onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, transportCost: Number(e.target.value) } } })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Profit Margin (%)</label>
                    <input
                      type="number"
                      value={project.settings.costs?.marginPercent ?? 50}
                      onChange={e => setProject({ ...project, settings: { ...project.settings, costs: { ...project.settings.costs, marginPercent: Number(e.target.value) } } })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Material Allocation */}
          <MaterialAllocationPanel
            settings={project.settings}
            onUpdate={(settings) => setProject({ ...project, settings: { ...project.settings, ...settings } })}
            isExpanded={expandedSection === 'allocation'}
            onToggle={() => toggleSection('allocation')}
          />
        </div>
      </div>
    </div>
  );
};

export default ScreenProjectSetup;
