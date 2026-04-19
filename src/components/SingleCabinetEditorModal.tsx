import React, { useState, useMemo, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { 
  TestingSettings, 
  DEFAULT_SETTINGS, 
  RUBY_DOOR_THRESHOLD 
} from './CabinetTestingUtils';
import { BaseCabinetTesting } from './BaseCabinetTesting';
import { WallCabinetTesting } from './WallCabinetTesting';
import { TallCabinetTesting } from './TallCabinetTesting';
import { CabinetUnit, ProjectSettings, CabinetType } from '../types';

interface Props {
  isOpen: boolean;
  cabinet: CabinetUnit;
  globalSettings: ProjectSettings;
  onClose: () => void;
  onSave: (updatedCabinet: CabinetUnit) => void;
  isDark?: boolean;
}

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 mb-3 last:mb-0">
    {children}
  </div>
);

const SettingRow: React.FC<{ label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }> = ({ label, value, onChange, step = 1, min = 0, max = 2400 }) => (
  <div className="flex items-center justify-between gap-4 mb-2 last:mb-0">
    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
      <input
        type="number" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-14 px-1 py-0.5 text-[11px] bg-slate-900 border border-slate-600 rounded text-amber-500 font-mono text-center"
      />
    </div>
  </div>
);

const CheckboxRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 py-1.5 cursor-pointer hover:bg-slate-700/30 px-1 rounded transition-colors group">
    <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors whitespace-nowrap">{label}</span>
    <div className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-7 h-4 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
    </div>
  </label>
);

export const SingleCabinetEditorModal: React.FC<Props> = ({ isOpen, cabinet, globalSettings, onClose, onSave, isDark = true }) => {
  const [settings, setSettings] = useState<TestingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (isOpen && cabinet) {
      // Map basic cabinet properties + global defaults to TestingSettings
      const typeStr = cabinet.type.toLowerCase() as 'base' | 'wall' | 'tall';
      const initialHeight = typeStr === 'tall' ? globalSettings.tallHeight : typeStr === 'wall' ? globalSettings.wallHeight : globalSettings.baseHeight;
      const initialDepth = typeStr === 'tall' ? globalSettings.depthTall : typeStr === 'wall' ? globalSettings.depthWall : globalSettings.depthBase;
      const initialToeKick = (typeStr === 'base' || typeStr === 'tall') ? globalSettings.toeKickHeight : 0;
      
      const baseSettings: TestingSettings = {
        ...DEFAULT_SETTINGS,
        cabinetType: typeStr,
        width: cabinet.width,
        height: initialHeight,
        depth: initialDepth,
        toeKickHeight: initialToeKick,
        panelThickness: globalSettings.thickness || 18,
        doorOuterGap: globalSettings.doorOuterGap,
        doorInnerGap: globalSettings.doorInnerGap,
        doorToDoorGap: globalSettings.doorToDoorGap,
        doorToPanelGap: globalSettings.doorToPanelGap,
        drawerToDrawerGap: globalSettings.drawerToDrawerGap,
        doorSideClearance: globalSettings.doorSideClearance,
        grooveDepth: globalSettings.grooveDepth,
        backPanelThickness: globalSettings.backPanelThickness,
        doorMaterialThickness: globalSettings.doorMaterialThickness,
      };

      // Override with previously saved advancedSettings
      if (cabinet.advancedSettings) {
        setSettings({ ...baseSettings, ...cabinet.advancedSettings });
      } else {
        // Safe overrides for types
        if (typeStr === 'wall') {
          baseSettings.showDrawers = false;
          baseSettings.showDoors = true;
          baseSettings.shelfDepth = initialDepth - baseSettings.panelThickness - baseSettings.backPanelThickness;
        } else if (typeStr === 'tall') {
          baseSettings.showDrawers = false;
          baseSettings.showDoors = true;
          baseSettings.shelfDepth = initialDepth - baseSettings.panelThickness - baseSettings.backPanelThickness;
        }
        setSettings(baseSettings);
      }
    }
  }, [isOpen, cabinet, globalSettings]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };

      if ((key === 'enableGola' || key === 'enableTallUpperGola') && value === true) { next.doorOverride = 25; }
      else if ((key === 'enableGola' || key === 'enableTallUpperGola') && value === false) {
        if (!next.enableGola && !next.enableTallUpperGola) {
          next.doorOverride = 0;
        }
      }
      
      if (next.cabinetType === 'base' && next.enableGola && !next.showDoors && !next.showDrawers) {
        next.enableGola = false;
        next.doorOverride = 0;
      }
      if (key === 'depth') {
        const diff = (value as number) - prev.depth;
        next.shelfDepth = Math.max(0, prev.shelfDepth + diff);
      }
      if (next.cabinetType !== 'tall') {
        if (key === 'showDrawers' && value === true) { next.showShelves = false; next.showDoors = false; }
        if (key === 'showShelves' && value === true) { next.showDrawers = false; }
        if (key === 'showDoors' && value === true) { next.showDrawers = false; }
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave({
      ...cabinet,
      width: settings.width, // Sync width back up
      advancedSettings: settings
    });
  };

  const activeType = settings.cabinetType;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ${isDark ? 'bg-slate-900/80' : 'bg-slate-200/80'} backdrop-blur-sm`}>
      <div className={`${isDark ? 'bg-slate-800 ring-slate-700' : 'bg-white ring-slate-200'} w-full max-w-[1400px] h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center px-6 py-4 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="font-bold text-white text-lg">E</span>
            </div>
            <div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'} leading-tight`}>Advanced Edit: {cabinet.label || cabinet.preset}</h3>
              <div className="text-xs text-slate-400">Configure parameters, gola, clearances, and manufacturing rules</div>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} rounded-lg transition-colors`}>
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className={`w-96 shrink-0 overflow-y-auto p-4 border-r ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'} scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent`}>
            {(activeType === 'base' || activeType === 'tall') && (
              <Section>
                <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">
                  {activeType === 'base' ? 'Base Cabinet' : 'Tall Cabinet'} Plinth
                </h3>
                <SettingRow label="Toe Kick Height" value={settings.toeKickHeight} onChange={v => updateSetting('toeKickHeight', v)} step={5} min={0} max={200} />
              </Section>
            )}

            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Dimensions</h3>
              <SettingRow label="Width" value={settings.width} onChange={v => updateSetting('width', v)} step={10} min={150} max={1800} />
              <SettingRow label="Height" value={settings.height} onChange={v => updateSetting('height', v)} step={10} min={300} max={2400} />
              <SettingRow label="Depth" value={settings.depth} onChange={v => updateSetting('depth', v)} step={10} min={200} max={800} />
            </Section>

            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Panels & Materials</h3>
              <SettingRow label="Main Panel (mm)" value={settings.panelThickness} onChange={v => updateSetting('panelThickness', v)} step={1} min={12} max={25} />
              <SettingRow label="Back Panel (mm)" value={settings.backPanelThickness} onChange={v => updateSetting('backPanelThickness', v)} step={1} min={3} max={18} />
              <SettingRow label="Door Thk (mm)" value={settings.doorMaterialThickness} onChange={v => updateSetting('doorMaterialThickness', v)} step={1} min={12} max={25} />
              <SettingRow label="Groove Depth" value={settings.grooveDepth} onChange={v => updateSetting('grooveDepth', v)} step={1} min={2} max={10} />
            </Section>

            {/* View Options */}
            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">View Options</h3>
              <CheckboxRow label="Skeleton View" checked={settings.skeletonView} onChange={v => updateSetting('skeletonView', v)} />
              <CheckboxRow label="Parts Separated View" checked={settings.partsSeparatedView} onChange={v => updateSetting('partsSeparatedView', v)} />
            </Section>

            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Gaps & Clearances</h3>
              <SettingRow label="Door to Door" value={settings.doorToDoorGap} onChange={v => updateSetting('doorToDoorGap', v)} step={0.5} min={0} max={10} />
              <SettingRow label="Door to Panel" value={settings.doorToPanelGap} onChange={v => updateSetting('doorToPanelGap', v)} step={0.5} min={0} max={10} />
              {activeType !== 'wall' && <SettingRow label="Drawer to Drawer" value={settings.drawerToDrawerGap} onChange={v => updateSetting('drawerToDrawerGap', v)} step={0.5} min={0} max={10} />}
              <SettingRow label="Door Outer Gap" value={settings.doorOuterGap} onChange={v => updateSetting('doorOuterGap', v)} step={0.5} min={0} max={10} />
              <SettingRow label="Door Inner Gap" value={settings.doorInnerGap} onChange={v => updateSetting('doorInnerGap', v)} step={0.5} min={0} max={10} />
              <SettingRow label="Door Side Clear." value={settings.doorSideClearance} onChange={v => updateSetting('doorSideClearance', v)} step={0.5} min={0} max={10} />
            </Section>

            {(settings.cabinetType === 'base' || settings.cabinetType === 'wall') && (settings.showDoors || settings.showDrawers) && (
              <Section>
                <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Gola System</h3>
                <CheckboxRow label="Enable Gola" checked={settings.enableGola} onChange={v => updateSetting('enableGola', v)} />
                {settings.enableGola && (
                  <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                    <SettingRow label="Door Drop" value={settings.doorOverride} onChange={v => updateSetting('doorOverride', v)} step={1} min={0} max={50} />
                    <SettingRow label="L-Cut Height" value={settings.golaLCutoutHeight} onChange={v => updateSetting('golaLCutoutHeight', v)} step={1} min={20} max={100} />
                    <SettingRow label="L-Cut Depth" value={settings.golaLCutoutDepth} onChange={v => updateSetting('golaLCutoutDepth', v)} step={1} min={10} max={50} />
                    {settings.showDrawers && settings.numDrawers > 1 && (
                      <SettingRow label="C-Cut Height" value={settings.golaCCutoutHeight} onChange={v => updateSetting('golaCCutoutHeight', v)} step={1} min={20} max={100} />
                    )}
                    <SettingRow label="C-Cut Depth" value={settings.golaCutoutDepth} onChange={v => updateSetting('golaCutoutDepth', v)} step={1} min={10} max={50} />
                  </div>
                )}
              </Section>
            )}

            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Front Options</h3>
              {activeType === 'tall' ? (
                <div className="space-y-6 mt-4">
                  {/* Upper Section Settings */}
                  <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-3">
                    <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      Upper Section
                    </h3>
                    <SettingRow 
                      label="Upper Section H" 
                      value={settings.tallUpperSectionHeight} 
                      onChange={v => {
                        updateSetting('tallUpperSectionHeight', v);
                        if (v + settings.tallLowerSectionHeight > settings.height) {
                          updateSetting('tallLowerSectionHeight', settings.height - v);
                        }
                      }} 
                      step={10} min={100} max={settings.height - 100} 
                    />
                    <CheckboxRow label="Enable Gola (Upper)" checked={settings.enableTallUpperGola} onChange={v => updateSetting('enableTallUpperGola', v)} />
                    <CheckboxRow label="Show Upper Doors" checked={settings.showDoors} onChange={v => updateSetting('showDoors', v)} />
                    <CheckboxRow label="Show Upper Shelves" checked={settings.showShelves} onChange={v => updateSetting('showShelves', v)} />
                    {settings.showShelves && (
                      <div className="ml-4 p-2 bg-slate-900/50 rounded-md border-l-2 border-blue-500/50">
                        <SettingRow label="Num Shelves" value={settings.numShelves} onChange={v => updateSetting('numShelves', v)} step={1} min={0} max={10} />
                      </div>
                    )}
                  </div>

                  {/* Lower Section Settings */}
                  <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-3">
                    <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      Lower Section
                    </h3>
                    <SettingRow 
                      label="Lower Section H" 
                      value={settings.tallLowerSectionHeight} 
                      onChange={v => {
                        updateSetting('tallLowerSectionHeight', v);
                        if (v + settings.tallUpperSectionHeight > settings.height) {
                          updateSetting('tallUpperSectionHeight', settings.height - v);
                        }
                        if (settings.lowerSectionDrawerStackHeight > v) {
                          updateSetting('lowerSectionDrawerStackHeight', v);
                        }
                      }} 
                      step={10} min={100} max={settings.height - 100} 
                    />
                    <CheckboxRow label="Enable Gola (Lower)" checked={settings.enableGola} onChange={v => updateSetting('enableGola', v)} />
                    <CheckboxRow 
                      label="Show Lower Doors" 
                      checked={settings.showLowerDoors} 
                      onChange={v => {
                        updateSetting('showLowerDoors', v);
                        if (v) updateSetting('showDrawers', false);
                      }} 
                    />
                    <CheckboxRow 
                      label="Show Drawers" 
                      checked={settings.showDrawers} 
                      onChange={v => {
                        updateSetting('showDrawers', v);
                        if (v) updateSetting('showLowerDoors', false);
                      }} 
                    />
                    <CheckboxRow label="Show Lower Shelves" checked={settings.showLowerShelves} onChange={v => updateSetting('showLowerShelves', v)} />
                    
                    {settings.showDrawers && (
                      <div className="ml-4 p-2 bg-slate-900/50 rounded-md border-l-2 border-amber-500/50 space-y-2">
                        <SettingRow label="Drawer Stack H" value={settings.lowerSectionDrawerStackHeight} onChange={v => updateSetting('lowerSectionDrawerStackHeight', v)} step={10} min={50} max={settings.tallLowerSectionHeight} />
                        <SettingRow label="Num Drawers" value={settings.numDrawers} onChange={v => updateSetting('numDrawers', v)} step={1} min={1} max={6} />
                      </div>
                    )}
                    {settings.showLowerShelves && (
                      <div className="ml-4 p-2 bg-slate-900/50 rounded-md border-l-2 border-amber-500/50">
                        <SettingRow label="Num Shelves" value={settings.numLowerShelves} onChange={v => updateSetting('numLowerShelves', v)} step={1} min={0} max={10} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {activeType !== 'wall' && (
                    <CheckboxRow label="Show Drawers" checked={settings.showDrawers} onChange={v => updateSetting('showDrawers', v)} />
                  )}
                  {settings.showDrawers && (
                    <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2 mb-3">
                      <SettingRow label="Num Drawers" value={settings.numDrawers} onChange={v => updateSetting('numDrawers', v)} step={1} min={1} max={6} />
                    </div>
                  )}
                  <CheckboxRow label="Show Doors" checked={settings.showDoors} onChange={v => updateSetting('showDoors', v)} />
                  <CheckboxRow label="Show Shelves" checked={settings.showShelves} onChange={v => updateSetting('showShelves', v)} />
                  {settings.showShelves && (
                    <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                      <SettingRow label="Num Shelves" value={settings.numShelves} onChange={v => updateSetting('numShelves', v)} step={1} min={0} max={10} />
                    </div>
                  )}
                </>
              )}
            </Section>
          </div>

          {/* 3D Canvas */}
          <div className={`flex-1 relative ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <Canvas 
              shadows 
              camera={{ position: [900, 600, 900], fov: 40, near: 1, far: 10000 }}
              gl={{ antialias: true }}
            >
              <color attach="background" args={[isDark ? '#0f172a' : '#f1f5f9']} />
              <ambientLight intensity={0.5} />
              <spotLight position={[1000, 1000, 1000]} angle={0.15} penumbra={1} intensity={1} castShadow />
              <directionalLight position={[-400, 400, -400]} intensity={0.5} />
              
              {settings.cabinetType === 'base' && <BaseCabinetTesting settings={settings} />}
              {settings.cabinetType === 'wall' && <WallCabinetTesting settings={settings} />}
              {settings.cabinetType === 'tall' && <TallCabinetTesting settings={settings} />}
              
              <gridHelper args={[4000, 40, isDark ? '#1e293b' : '#cbd5e1', isDark ? '#0f172a' : '#e2e8f0']} rotation={[0, 0, 0]} />
              <OrbitControls 
                makeDefault 
                minDistance={100} 
                maxDistance={5000}
                target={[settings.width / 2, settings.height / 2, settings.depth / 2]}
                enableDamping
              />
            </Canvas>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'} flex justify-end gap-3 flex-shrink-0`}>
          <button 
            onClick={onClose}
            className={`px-6 py-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'} font-medium rounded-lg transition-colors border`}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-amber-600/20"
          >
            <Save size={18} />
            Save Advanced Settings
          </button>
        </div>
      </div>
    </div>
  );
};
