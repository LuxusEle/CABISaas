import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import JSZip from 'jszip';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { 
  TestingSettings, 
  DEFAULT_SETTINGS, 
  RUBY_DOOR_THRESHOLD 
} from './CabinetTestingUtils';
import { BaseCabinetTesting, exportBaseCabinetDXF } from './BaseCabinetTesting';
import { WallCabinetTesting, exportWallCabinetDXF } from './WallCabinetTesting';
import { TallCabinetTesting, exportTallCabinetDXF } from './TallCabinetTesting';
import { BaseCornerCabinetTesting, exportBaseCornerCabinetDXF } from './BaseCornerCabinetTesting';
import { WallCornerCabinetTesting, exportWallCornerCabinetDXF } from './WallCornerCabinetTesting';

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
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
      <input
        type="number"
        value={value}
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
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <div className="w-7 h-4 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
    </div>
  </label>
);

export const CabinetTestingPage: React.FC<{ isDark?: boolean }> = ({ isDark = true }) => {
  const [activeType, setActiveType] = useState<'base' | 'sink' | 'wall' | 'tall' | 'corner' | 'wall_corner'>('base');
  const [allConfigs, setAllConfigs] = useState<Record<'base' | 'sink' | 'wall' | 'tall' | 'corner' | 'wall_corner', TestingSettings>>({
    base: { ...DEFAULT_SETTINGS, cabinetType: 'base' },
    sink: { ...DEFAULT_SETTINGS, cabinetType: 'sink', showBackPanel: false, showShelves: false, showDrawers: false, preset: 'Sink Unit' },
    wall: { ...DEFAULT_SETTINGS, cabinetType: 'wall', height: 720, depth: 300, toeKickHeight: 0, showDrawers: false, showDoors: true, shelfDepth: 300 - 18 - 6 },
    tall: { ...DEFAULT_SETTINGS, cabinetType: 'tall', height: 2100, depth: 560, toeKickHeight: 100, showDrawers: false, showDoors: true, shelfDepth: 560 - 18 - 6 },
    corner: { ...DEFAULT_SETTINGS, cabinetType: 'corner', width: 1000, height: 870, depth: 560, blindPanelWidth: 400, blindCornerSide: 'left' },
    wall_corner: { ...DEFAULT_SETTINGS, cabinetType: 'wall_corner', width: 1000, height: 720, depth: 300, blindPanelWidth: 400, blindCornerSide: 'left', toeKickHeight: 0, showDrawers: false }
  });

  const settings = allConfigs[activeType];

  const updateSetting = <K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) => {
    setAllConfigs(prev => {
      const current = prev[activeType];
      const next = { ...current, [key]: value };

      // Gola auto-sync logic
      if ((key === 'enableGola' || key === 'enableTallUpperGola') && value === true) {
        next.doorOverride = 25;
      } else if ((key === 'enableGola' || key === 'enableTallUpperGola') && value === false) {
        if (!next.enableGola && !next.enableTallUpperGola) {
          next.doorOverride = 0;
        }
      }
      
      // Gola mode auto-disable
      if (next.cabinetType === 'base' && next.enableGola) {
        if (!next.showDoors && !next.showDrawers) {
          next.enableGola = false;
          next.doorOverride = 0;
        }
      }

      // Dynamic internal component resizing
      if (key === 'depth') {
        const diff = (value as number) - current.depth;
        next.shelfDepth = Math.max(0, current.shelfDepth + diff);
      }

      // Mutual exclusion for shelves, drawers, and doors (skip for tall cabinets)
      if (activeType !== 'tall') {
        if (key === 'showDrawers' && value === true) {
          next.showShelves = false;
          next.showDoors = false;
        }
        if (key === 'showShelves' && value === true) {
          next.showDrawers = false;
        }
        if (key === 'showDoors' && value === true) {
          next.showDrawers = false;
        }
      }

      return { ...prev, [activeType]: next };
    });
  };

  const handleExportDXF = async () => {
    const zip = new JSZip();
    if (settings.cabinetType === 'base' || settings.cabinetType === 'sink') {
      await exportBaseCabinetDXF(settings, zip);
    } else if (settings.cabinetType === 'wall') {
      await exportWallCabinetDXF(settings, zip);
    } else if (settings.cabinetType === 'tall') {
      await exportTallCabinetDXF(settings, zip);
    } else if (settings.cabinetType === 'corner') {
      await exportBaseCornerCabinetDXF(settings, zip);
    } else if (settings.cabinetType === 'wall_corner') {
      await exportWallCornerCabinetDXF(settings, zip);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cabinet_export_${settings.cabinetType}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const CalculatedStats = useMemo(() => {
    const isBase = settings.cabinetType === 'base' || settings.cabinetType === 'sink';
    const innerHeight = isBase ? settings.height - settings.toeKickHeight : settings.height;
    const actualNumDoors = settings.width < RUBY_DOOR_THRESHOLD ? 1 : 2;
    const doorWidth = actualNumDoors === 1 
      ? settings.width - settings.doorOuterGap * 2 
      : (settings.width - settings.doorOuterGap * 2 - settings.doorInnerGap) / 2;
    return { innerHeight, actualNumDoors, doorWidth };
  }, [settings]);

  return (
    <div className="flex h-full bg-slate-900 text-white font-sans overflow-hidden">
      <div className="w-96 shrink-0 overflow-y-auto p-4 border-r border-slate-700 bg-slate-800 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="font-bold text-white text-lg">C</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 leading-none">Cabinet Testing</h2>
            <span className="text-[10px] text-slate-400 font-medium">Configurator v2.1</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <Section>
            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Cabinet Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['base', 'sink', 'wall', 'tall', 'corner', 'wall_corner'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-3 py-2 text-[10px] font-bold rounded-md transition-all duration-200 ${
                    activeType === type 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </Section>

          {(settings.cabinetType === 'base' || settings.cabinetType === 'sink' || settings.cabinetType === 'tall' || settings.cabinetType === 'corner' || settings.cabinetType === 'wall_corner') && (
            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">{settings.cabinetType.toUpperCase().replace('_', ' ')} Options</h3>
              {(settings.cabinetType === 'base' || settings.cabinetType === 'sink' || settings.cabinetType === 'tall' || settings.cabinetType === 'corner') && (
                <SettingRow label="Toe Kick Height" value={settings.toeKickHeight} onChange={v => updateSetting('toeKickHeight', v)} step={5} min={0} max={200} />
              )}
              {(settings.cabinetType === 'corner' || settings.cabinetType === 'wall_corner') && (
                <>
                  <SettingRow label="Blind Width" value={settings.blindPanelWidth} onChange={v => updateSetting('blindPanelWidth', v)} step={10} min={200} max={settings.width} />
                  <div className="flex items-center justify-between gap-4 py-1.5 px-1">
                    <span className="text-[11px] text-slate-400 font-medium">Blind Side</span>
                    <div className="flex bg-slate-900 rounded p-0.5 border border-slate-700">
                      {(['left', 'right'] as const).map(side => (
                        <button
                          key={side}
                          onClick={() => updateSetting('blindCornerSide', side)}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-all duration-200 ${
                            settings.blindCornerSide === side
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {side.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Section>
          )}

          <Section>
            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Dimensions</h3>
            <SettingRow label="Width" value={settings.width} onChange={v => updateSetting('width', v)} step={10} min={200} max={1200} />
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

          <Section>
            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Gaps & Clearances</h3>
            <SettingRow label="Door to Door" value={settings.doorToDoorGap} onChange={v => updateSetting('doorToDoorGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door to Panel" value={settings.doorToPanelGap} onChange={v => updateSetting('doorToPanelGap', v)} step={0.5} min={0} max={10} />
            {activeType !== 'wall' && activeType !== 'corner' && activeType !== 'wall_corner' && <SettingRow label="Drawer to Drawer" value={settings.drawerToDrawerGap} onChange={v => updateSetting('drawerToDrawerGap', v)} step={0.5} min={0} max={10} />}
            <SettingRow label="Door Outer Gap" value={settings.doorOuterGap} onChange={v => updateSetting('doorOuterGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door Inner Gap" value={settings.doorInnerGap} onChange={v => updateSetting('doorInnerGap', v)} step={0.5} min={0} max={10} />
            <SettingRow label="Door Side Clear." value={settings.doorSideClearance} onChange={v => updateSetting('doorSideClearance', v)} step={0.5} min={0} max={10} />
          </Section>

          {(settings.enableGola || settings.enableTallUpperGola) && (
            <Section>
              <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Gola System</h3>
              <SettingRow label="Door Override" value={settings.doorOverride} onChange={v => updateSetting('doorOverride', v)} step={1} min={10} max={60} />
              <SettingRow label="L-Gola Height" value={settings.golaLCutoutHeight} onChange={v => updateSetting('golaLCutoutHeight', v)} step={1} min={20} max={100} />
              <SettingRow label="L-Gola Depth" value={settings.golaLCutoutDepth} onChange={v => updateSetting('golaLCutoutDepth', v)} step={1} min={10} max={60} />
              <SettingRow label="C-Gola Height" value={settings.golaCCutoutHeight} onChange={v => updateSetting('golaCCutoutHeight', v)} step={1} min={20} max={100} />
              <SettingRow label="C-Gola Depth" value={settings.golaCutoutDepth} onChange={v => updateSetting('golaCutoutDepth', v)} step={1} min={10} max={60} />
              {activeType !== 'wall' && activeType !== 'wall_corner' && activeType !== 'corner' && <SettingRow label="Gola Top Gap" value={settings.golaTopGap} onChange={v => updateSetting('golaTopGap', v)} step={1} min={0} max={60} />}
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
                  <CheckboxRow label="Enable Gola (Upper Section)" checked={settings.enableTallUpperGola} onChange={v => updateSetting('enableTallUpperGola', v)} />
                  <CheckboxRow 
                    label="Show Upper Doors" 
                    checked={settings.showDoors} 
                    onChange={v => {
                      updateSetting('showDoors', v);
                      if (v) updateSetting('showHinges', true);
                    }} 
                  />
                  <CheckboxRow label="Show Upper Shelves" checked={settings.showShelves} onChange={v => updateSetting('showShelves', v)} />
                  {settings.showShelves && (
                    <div className="ml-4 p-2 bg-slate-900/50 rounded-md border-l-2 border-blue-500/50">
                      <SettingRow label="Num Shelves" value={settings.numShelves} onChange={v => updateSetting('numShelves', v)} step={1} min={0} max={10} />
                    </div>
                  )}
                  {settings.showDoors && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                        <span>Upper Door Angle</span>
                        <span className="text-blue-400">{settings.doorOpenAngle}°</span>
                      </label>
                      <input 
                        type="range" min="0" max="110" step="1" 
                        value={settings.doorOpenAngle} 
                        onChange={(e) => updateSetting('doorOpenAngle', parseInt(e.target.value))} 
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                      />
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
                      const oldV = settings.tallLowerSectionHeight;
                      updateSetting('tallLowerSectionHeight', v);
                      if (v + settings.tallUpperSectionHeight > settings.height) {
                        updateSetting('tallUpperSectionHeight', settings.height - v);
                      }
                      // Sync drawer stack height if it was equal to the old section height (default behavior)
                      if (settings.lowerSectionDrawerStackHeight === oldV) {
                        updateSetting('lowerSectionDrawerStackHeight', v);
                      } else if (settings.lowerSectionDrawerStackHeight > v) {
                        // Cap it if it's now larger than the section
                        updateSetting('lowerSectionDrawerStackHeight', v);
                      }
                    }} 
                    step={10} min={100} max={settings.height - 100} 
                  />
                  <CheckboxRow label="Enable Gola (Lower Section)" checked={settings.enableGola} onChange={v => updateSetting('enableGola', v)} />
                  <CheckboxRow 
                    label="Show Lower Doors" 
                    checked={settings.showLowerDoors} 
                    onChange={v => {
                      updateSetting('showLowerDoors', v);
                      if (v) {
                        updateSetting('showHinges', true);
                        updateSetting('showDrawers', false);
                      }
                    }} 
                  />
                  <CheckboxRow 
                    label="Show Drawers" 
                    checked={settings.showDrawers} 
                    onChange={v => {
                      updateSetting('showDrawers', v);
                      if (v) {
                        updateSetting('showLowerDoors', false);
                        updateSetting('showNailHoles', true);
                      }
                    }} 
                  />
                  <CheckboxRow label="Show Lower Shelves" checked={settings.showLowerShelves} onChange={v => updateSetting('showLowerShelves', v)} />
                  
                  {settings.showLowerDoors && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                        <span>Lower Door Angle</span>
                        <span className="text-amber-400">{settings.lowerDoorOpenAngle}°</span>
                      </label>
                      <input 
                        type="range" min="0" max="110" step="1" 
                        value={settings.lowerDoorOpenAngle} 
                        onChange={(e) => updateSetting('lowerDoorOpenAngle', parseInt(e.target.value))} 
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" 
                      />
                    </div>
                  )}

                  {settings.showDrawers && (
                    <div className="ml-4 p-2 bg-slate-900/50 rounded-md border-l-2 border-amber-500/50 space-y-2">
                      <SettingRow label="Drawer Stack H" value={settings.lowerSectionDrawerStackHeight} onChange={v => updateSetting('lowerSectionDrawerStackHeight', v)} step={10} min={50} max={settings.tallLowerSectionHeight} />
                      <SettingRow label="Num Drawers" value={settings.numDrawers} onChange={v => updateSetting('numDrawers', v)} step={1} min={1} max={6} />
                      <div className="flex flex-col gap-2 mt-2">
                        {Array.from({ length: settings.numDrawers }).map((_, i) => {
                          const dataIndex = settings.numDrawers - 1 - i;
                          return (
                            <div key={`lower-drawer-open-${dataIndex}`} className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                                <span>Drawer {i + 1} Open Dist</span>
                                <span className="text-blue-500">{settings.drawerOpenDistances[dataIndex] || 0}mm</span>
                              </label>
                              <input 
                                type="range" min="0" max={settings.depth - 50} step="5" 
                                value={settings.drawerOpenDistances[dataIndex] || 0} 
                                onChange={(e) => {
                                  const newDists = [...settings.drawerOpenDistances];
                                  newDists[dataIndex] = parseInt(e.target.value);
                                  updateSetting('drawerOpenDistances', newDists);
                                }} 
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                              />
                            </div>
                          );
                        })}
                      </div>
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
                  settings.showDrawers ? (
                    <div className="flex flex-col gap-2 mb-3">
                      {Array.from({ length: settings.numDrawers }).map((_, i) => {
                        const dataIndex = settings.numDrawers - 1 - i;
                        return (
                          <div key={`drawer-open-${dataIndex}`} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                              <span>Drawer {i + 1} Open Dist</span>
                              <span className="text-blue-500">{settings.drawerOpenDistances[dataIndex] || 0}mm</span>
                            </label>
                            <input 
                              type="range" min="0" max={settings.depth - 50} step="5" 
                              value={settings.drawerOpenDistances[dataIndex] || 0} 
                              onChange={(e) => {
                                const newDists = [...settings.drawerOpenDistances];
                                newDists[dataIndex] = parseInt(e.target.value);
                                updateSetting('drawerOpenDistances', newDists);
                              }} 
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 mb-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        <span>Door Opening Angle</span>
                        <span className="text-blue-500">{settings.doorOpenAngle}°</span>
                      </label>
                      <input 
                        type="range" min="0" max="110" step="1" 
                        value={settings.doorOpenAngle} 
                        onChange={(e) => updateSetting('doorOpenAngle', parseInt(e.target.value))} 
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                      />
                    </div>
                  )
                )}
                {activeType === 'wall' && (
                  <div className="flex flex-col gap-1 mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                      <span>Door Opening Angle</span>
                      <span className="text-blue-500">{settings.doorOpenAngle}°</span>
                    </label>
                    <input 
                      type="range" min="0" max="110" step="1" 
                      value={settings.doorOpenAngle} 
                      onChange={(e) => updateSetting('doorOpenAngle', parseInt(e.target.value))} 
                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                    />
                  </div>
                )}
                <CheckboxRow 
                  label="Show Doors" 
                  checked={settings.showDoors} 
                  onChange={v => {
                    updateSetting('showDoors', v);
                    if (v) updateSetting('showHinges', true);
                  }} 
                />
                <CheckboxRow label="Show Hinges" checked={settings.showHinges} onChange={v => updateSetting('showHinges', v)} />
                {settings.showHinges && (
                  <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                    <SettingRow label="Hinge Diameter" value={settings.hingeDiameter} onChange={v => updateSetting('hingeDiameter', v)} step={1} min={10} max={50} />
                    <SettingRow label="Hinge Depth" value={settings.hingeDepth} onChange={v => updateSetting('hingeDepth', v)} step={1} min={2} max={20} />
                    <SettingRow label="Hinge H Offset" value={settings.hingeHorizontalOffset} onChange={v => updateSetting('hingeHorizontalOffset', v)} step={1} min={20} max={100} />
                    <SettingRow label="Hinge V Offset" value={settings.hingeVerticalOffset} onChange={v => updateSetting('hingeVerticalOffset', v)} step={1} min={20} max={200} />
                  </div>
                )}
                {activeType !== 'wall' && activeType !== 'corner' && activeType !== 'sink' && activeType !== 'wall_corner' && <CheckboxRow label="Show Drawers" checked={settings.showDrawers} onChange={v => updateSetting('showDrawers', v)} />}
                {settings.showDrawers && activeType !== 'wall' && activeType !== 'corner' && activeType !== 'wall_corner' && (
                  <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                    <SettingRow label="Num Drawers" value={settings.numDrawers} onChange={v => updateSetting('numDrawers', v)} step={1} min={1} max={6} />
                    <SettingRow label="Side Clearance" value={settings.drawerSideClearance} onChange={v => updateSetting('drawerSideClearance', v)} step={1} min={0} max={50} />
                    <SettingRow label="Box Bottom Thk" value={settings.drawerBottomThickness} onChange={v => updateSetting('drawerBottomThickness', v)} step={1} min={3} max={20} />
                    <SettingRow label="Box Back Thk" value={settings.drawerBackThickness} onChange={v => updateSetting('drawerBackThickness', v)} step={1} min={3} max={20} />
                    <SettingRow label="Box H Ratio" value={settings.drawerBoxHeightRatio} onChange={v => updateSetting('drawerBoxHeightRatio', v)} step={0.1} min={0.1} max={1} />
                    <SettingRow label="Back Clearance" value={settings.drawerBackClearance} onChange={v => updateSetting('drawerBackClearance', v)} step={1} min={0} max={100} />
                  </div>
                )}
                {activeType !== 'sink' && <CheckboxRow label="Show Shelves" checked={settings.showShelves} onChange={v => updateSetting('showShelves', v)} />}
                {settings.showShelves && (
                  <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                    <SettingRow label="Num Shelves" value={settings.numShelves} onChange={v => updateSetting('numShelves', v)} step={1} min={0} max={10} />
                  </div>
                )}
              </>
            )}
          </Section>

          <Section>
            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">Construction</h3>
            <CheckboxRow label="Show Nail Holes" checked={settings.showNailHoles} onChange={v => updateSetting('showNailHoles', v)} />
            {settings.showNailHoles && (
              <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                <SettingRow label="Stretcher Hole Dia" value={settings.nailHoleDiameter} onChange={v => updateSetting('nailHoleDiameter', v)} step={1} min={2} max={10} />
                <SettingRow label="Shelf Hole Dia" value={settings.shelfHoleDiameter} onChange={v => updateSetting('shelfHoleDiameter', v)} step={1} min={2} max={10} />
                <SettingRow label="Shelf Depth" value={settings.shelfDepth} onChange={v => updateSetting('shelfDepth', v)} step={10} min={100} max={1000} />
                <SettingRow label="Hole Depth" value={settings.nailHoleDepth} onChange={v => updateSetting('nailHoleDepth', v)} step={1} min={2} max={20} />
                <SettingRow label="Shelf to Hole Dist" value={settings.nailHoleShelfDistance} onChange={v => updateSetting('nailHoleShelfDistance', v)} step={1} min={0} max={50} />
              </div>
            )}
            <CheckboxRow label="Show Back Panel" checked={settings.showBackPanel} onChange={v => updateSetting('showBackPanel', v)} />
            <CheckboxRow label="Show Back Stretchers" checked={settings.showBackStretchers} onChange={v => updateSetting('showBackStretchers', v)} />
            {settings.showBackStretchers && (
              <div className="mt-2 pl-2 border-l-2 border-amber-500/30 space-y-2">
                <SettingRow label="Stretcher H" value={settings.backStretcherHeight} onChange={v => updateSetting('backStretcherHeight', v)} step={10} min={50} max={200} />
                <SettingRow label="Top Stretcher W" value={settings.topStretcherWidth} onChange={v => updateSetting('topStretcherWidth', v)} step={10} min={50} max={200} />
              </div>
            )}
          </Section>

          {(settings.cabinetType === 'base' || settings.cabinetType === 'sink' || settings.cabinetType === 'wall' || settings.cabinetType === 'wall_corner' || settings.cabinetType === 'corner') && (settings.showDoors || settings.showDrawers) && (
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
            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-3">View Options</h3>
            <CheckboxRow label="Skeleton View" checked={settings.skeletonView} onChange={v => updateSetting('skeletonView', v)} />
            <CheckboxRow label="Different Panel Colors" checked={settings.showDifferentPanelColors} onChange={v => updateSetting('showDifferentPanelColors', v)} />
            <CheckboxRow label="Parts Separated View" checked={settings.partsSeparatedView} onChange={v => updateSetting('partsSeparatedView', v)} />
            {settings.partsSeparatedView && (
              <div className="mt-3">
                <select 
                  value={settings.selectedPart} 
                  onChange={(e) => updateSetting('selectedPart', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-[11px] text-amber-500 font-medium"
                >
                  <option value="all">View All Parts</option>
                  <option value="leftPanel">Left Panel</option>
                  <option value="rightPanel">Right Panel</option>
                  <option value="bottomPanel">Bottom Panel</option>
                  <option value="topPanel">Top Panel</option>
                  <option value="backPanel">Back Panel</option>
                  <option value="door">Doors</option>
                  {settings.cabinetType !== 'corner' && settings.cabinetType !== 'wall_corner' && <option value="drawer">Drawers</option>}
                  <option value="blindPanel">Blind Panel</option>
                  <option value="toeKick">Toe Kick</option>
                </select>
              </div>
            )}
          </Section>

          <div className="pt-2">
            <button 
              onClick={handleExportDXF}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-md shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
              Download CNC DXF
            </button>
          </div>
          
          <button
            onClick={() => setAllConfigs(prev => ({ ...prev, [activeType]: { ...DEFAULT_SETTINGS, cabinetType: activeType } }))}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold rounded-md transition-colors"
          >
            Reset {activeType.toUpperCase()} CONFIG
          </button>
        </div>
      </div>

      <div className={`flex-1 relative ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Canvas 
          shadows 
          camera={{ position: [900, 600, 900], fov: 40, near: 1, far: 10000 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={[isDark ? '#1e293b' : '#f8fafc']} />
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <spotLight position={[1000, 1000, 1000]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <directionalLight position={[-400, 400, -400]} intensity={0.5} />
          
          <ContactShadows 
            position={[0, -1, 0]} 
            opacity={0.4} 
            scale={2000} 
            blur={2} 
            far={4} 
          />
          
          {(settings.cabinetType === 'base' || settings.cabinetType === 'sink') && <BaseCabinetTesting settings={settings} />}
          {settings.cabinetType === 'wall' && <WallCabinetTesting settings={settings} />}
          {settings.cabinetType === 'tall' && <TallCabinetTesting settings={settings} />}
          {settings.cabinetType === 'corner' && <BaseCornerCabinetTesting settings={settings} />}
          {settings.cabinetType === 'wall_corner' && <WallCornerCabinetTesting settings={settings} />}
          
          <gridHelper 
            args={[4000, 40, isDark ? '#1e293b' : '#cbd5e1', isDark ? '#0f172a' : '#e2e8f0']} 
            rotation={[0, 0, 0]} 
          />
          <OrbitControls 
            makeDefault 
            minDistance={100} 
            maxDistance={5000}
            target={[settings.width / 2, settings.height / 2, settings.depth / 2]}
            enableDamping
          />
        </Canvas>

        <div className="absolute top-6 left-6 flex flex-col gap-2">
          <div className="bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/50 shadow-xl">
             <div className="text-[10px] uppercase tracking-wider text-amber-500 font-bold mb-1">Live Stats</div>
             <div className="text-[11px] text-slate-300 font-mono">
               DIM: {settings.width}x{settings.height}x{settings.depth}<br/>
               DOORS: {CalculatedStats.actualNumDoors} units<br/>
               INNER H: {CalculatedStats.innerHeight}mm
             </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 flex gap-2">
          <div className="bg-slate-800/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/50 text-[10px] text-slate-400">
            <span className="text-amber-500 font-bold uppercase">Pro Tip:</span> Hold SHIFT + Right Click to PAN
          </div>
        </div>
      </div>
    </div>
  );
};


