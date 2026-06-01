import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { X, Save, ArrowRight, MousePointer2 } from 'lucide-react';
import { Project, Zone } from '../types';
import { WallVisualizer } from './WallVisualizer';

interface WallLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (newZones: Zone[]) => void;
  isDark?: boolean;
  isInline?: boolean;
}

export const WallLimitsModal = forwardRef<any, WallLimitsModalProps>(({
  isOpen,
  onClose,
  project,
  onSave,
  isDark = true,
  isInline = false
}, ref) => {
  const wallZones = project.zones.filter(z => z.zoneType !== 'island');
  const islandZone = project.zones.find(z => z.zoneType === 'island');
  const [localZones, setLocalZones] = useState<Zone[]>([]);
  const [localIsland, setLocalIsland] = useState<Zone | null>(null);
  const [dirtyInputs, setDirtyInputs] = useState<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    triggerSave: () => {
      handleSave();
    }
  }));
  const [activeTab, setActiveTab] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      let foundIsland = false;
      setLocalZones(JSON.parse(JSON.stringify(project.zones)).map((z: Zone) => {
        if (z.zoneType === 'island') {
          setLocalIsland(z);
          foundIsland = true;
          return z;
        }
        return {
          ...z,
          startLimit: z.startLimit ?? 0,
          endLimit: z.endLimit ?? z.totalLength
        };
      }).filter((z: Zone) => z.zoneType !== 'island'));
      if (!foundIsland) setLocalIsland(null);
      setActiveTab(project.zones[0]?.id || '');
    }
  }, [project.zones, isOpen]);

  if (!isOpen) return null;

  const currentZoneIndex = localZones.findIndex(z => z.id === activeTab);
  const currentZone = localZones[currentZoneIndex];
  const isIslandTab = activeTab === 'Island';

  const handleUpdateLimit = (type: 'start' | 'end', value: number) => {
    if (!currentZone) return;
    const newZones = [...localZones];
    const zone = { ...currentZone };

    if (type === 'start') {
      zone.startLimit = Math.max(0, Math.min(value, (zone.endLimit || zone.totalLength) - 300));
    } else {
      zone.endLimit = Math.max((zone.startLimit || 0) + 300, Math.min(value, zone.totalLength));
    }

    newZones[currentZoneIndex] = zone;
    setLocalZones(newZones);
  };

  const handleUpdateIslandSetting = (key: string, value: number | boolean | string) => {
    if (!localIsland?.islandSettings) return;
    if (key === 'totalLength') {
      setLocalIsland({ ...localIsland, totalLength: value as number });
    } else if (key === 'facingDirection' && localIsland.islandSettings.numRows === 1) {
      const rotation = value === 'back' ? Math.PI : 0;
      setLocalIsland({
        ...localIsland,
        islandSettings: { ...localIsland.islandSettings, facingDirection: value as 'front' | 'back' | 'left' | 'right', rotation }
      });
    } else {
      setLocalIsland({
        ...localIsland,
        islandSettings: { ...localIsland.islandSettings, [key]: value }
      });
    }
  };

  const commitDirtyInput = (key: string, raw: string, min: number, max: number) => {
    setDirtyInputs(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    const val = parseInt(raw);
    if (!isNaN(val)) {
      handleUpdateIslandSetting(key, Math.max(min, Math.min(val, max)));
    }
  };

  const handleSave = () => {
    const result = [...localZones];
    if (localIsland) result.push(localIsland);
    onSave(result);
    onClose();
  };

  const wallA = wallZones.find(z => z.id === 'Wall A');
  const wallB = wallZones.find(z => z.id === 'Wall B');
  const floorWidth = wallA?.totalLength || 3600;
  const floorDepth = wallB?.totalLength || 3000;

  const renderIslandTab = () => {
    if (!localIsland?.islandSettings) return null;
    const isl = localIsland.islandSettings;

    const viewW = 400;
    const viewH = 300;
    const scaleX = viewW / Math.max(floorWidth, 1);
    const scaleZ = viewH / Math.max(floorDepth, 1);
    const scale = Math.min(scaleX, scaleZ, 1);

    const floorPxW = floorWidth * scale;
    const floorPxH = floorDepth * scale;

    const offX = (viewW - floorPxW) / 2;
    const offY = (viewH - floorPxH) / 2;

    const islandLen = localIsland.totalLength || 1500;
    const islCabDepth = isl.islandDepth || 560;
    const islNumRows = isl.numRows || 1;

    const islLeft = (isl.posX ?? 1800) * scale - (islandLen * scale) / 2;
    const islTop = (isl.posZ ?? 1500) * scale - (islCabDepth * scale) / 2;
    const islW = islandLen * scale;
    const islH = islCabDepth * scale;

    let posXMin = Math.round((isl.clearance ?? 1067) + islandLen / 2);
    let posXMax = Math.round(floorWidth - (isl.clearance ?? 1067) - islandLen / 2);
    let posZMin = Math.round((isl.clearance ?? 1067) + islCabDepth / 2);
    let posZMax = Math.round(floorDepth - (isl.clearance ?? 1067) - islCabDepth / 2);
    if (posXMin > posXMax) { posXMin = 0; posXMax = Math.round(floorWidth); }
    if (posZMin > posZMax) { posZMin = 0; posZMax = Math.round(floorDepth); }

    return (
      <div className="flex-1 relative bg-slate-100/50 dark:bg-slate-950/50 overflow-hidden" ref={containerRef}>
        <div className="absolute inset-0 p-2 sm:p-4 flex flex-col">
          <div className="flex-1 flex gap-2 min-h-0">
            <div className="flex-1 relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-row overflow-hidden">
              {/* Row / Direction controls */}
              <div className="w-1/3 shrink-0 flex flex-col gap-3 p-3 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 p-3">
                  <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block text-center mb-2">Rows</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => {
                      handleUpdateIslandSetting('numRows', 1);
                      if (isl.facingDirection === 'left' || isl.facingDirection === 'right') {
                        handleUpdateIslandSetting('facingDirection', 'front');
                      }
                    }}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-black uppercase transition-all ${
                        isl.numRows === 1
                          ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600'
                      }`}>1</button>
                    <button onClick={() => {
                      setLocalIsland(prev => ({
                        ...prev,
                        islandSettings: {
                          ...prev.islandSettings,
                          numRows: 2,
                          includeIslandSink: false,
                          includeIslandDrawers: false,
                        }
                      }));
                    }}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-black uppercase transition-all ${
                        isl.numRows === 2
                          ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                          : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600'
                      }`}>2</button>
                  </div>
                </div>
                {isl.numRows === 1 && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 p-3">
                    <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block text-center mb-2">Face</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['front', 'back'] as const).map(dir => (
                        <button key={dir} onClick={() => handleUpdateIslandSetting('facingDirection', dir)}
                          className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                            isl.facingDirection === dir
                              ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/20'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600'
                          }`}>{dir}</button>
                      ))}
                    </div>
                  </div>
                )}
                {isl.numRows === 2 && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Layout</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-sm border-2 border-orange-400 bg-indigo-100/50" />
                      <span className="text-indigo-700 dark:text-orange-400">Back-to-back</span>
                    </div>
                  </div>
                )}
                {isl.numRows === 1 && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Special Units</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Sink</span>
                        <button
                          onClick={() => handleUpdateIslandSetting('includeIslandSink', !isl.includeIslandSink)}
                          className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${isl.includeIslandSink ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isl.includeIslandSink ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      {isl.includeIslandSink && (
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium italic -mt-1">Sink unit placed at center</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Drawer Unit</span>
                        <button
                          onClick={() => handleUpdateIslandSetting('includeIslandDrawers', !isl.includeIslandDrawers)}
                          className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${isl.includeIslandDrawers ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isl.includeIslandDrawers ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      {isl.includeIslandDrawers && (
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium italic -mt-1">Drawer unit placed beside sink</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <svg viewBox={`0 0 ${viewW} ${viewH}`} className="flex-1 w-full h-full" style={{ fontSize: '8px' }}>
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                  </marker>
                </defs>
                <rect x={offX} y={offY} width={floorPxW} height={floorPxH}
                  fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" rx="4" />
                {/* Wall cabinet footprints */}
                {localZones.map(z => {
                  const sl = (z.startLimit ?? 0) * scale;
                  const el = (z.endLimit ?? z.totalLength) * scale;
                  const cabDepthPx = (project.settings?.depthBase ?? 560) * scale;
                  if (z.id === 'Wall A') {
                    return <rect key={z.id} x={offX + sl} y={offY} width={el - sl} height={cabDepthPx}
                      fill="#64748b" opacity="0.15" rx="2" />;
                  }
                  if (z.id === 'Wall B' && wallA) {
                    return <rect key={z.id} x={offX + floorPxW - cabDepthPx} y={offY + sl} width={cabDepthPx} height={el - sl}
                      fill="#64748b" opacity="0.15" rx="2" />;
                  }
                  if (z.id === 'Wall C' && wallB) {
                    return <rect key={z.id} x={offX + sl} y={offY + floorPxH - cabDepthPx} width={el - sl} height={cabDepthPx}
                      fill="#64748b" opacity="0.15" rx="2" />;
                  }
                  return null;
                })}
                {/* Door symbols */}
                {localZones.map(z => {
                  const doors = z.obstacles?.filter(o => o.type === 'door') || [];
                  return doors.map(door => {
                    const doorX = offX + door.fromLeft * scale;
                    const doorW = door.width * scale;
                    const hingeLeft = door.hingeSide !== 'right';
                    if (z.id === 'Wall A') {
                      const hx = hingeLeft ? doorX : doorX + doorW;
                      return (
                        <g key={door.id}>
                          <line x1={hx} y1={offY} x2={hx} y2={offY + doorW} stroke="#f97316" strokeWidth="2" />
                          {hingeLeft ? (
                            <path d={`M ${doorX + doorW} ${offY} A ${doorW} ${doorW} 0 0 1 ${doorX} ${offY + doorW}`} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" />
                          ) : (
                            <path d={`M ${doorX} ${offY} A ${doorW} ${doorW} 0 0 0 ${doorX + doorW} ${offY + doorW}`} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" />
                          )}
                        </g>
                      );
                    }
                    if (z.id === 'Wall B' && wallA) {
                      const fromTopY = offY + door.fromLeft * scale;
                      const hx = offX + floorPxW;
                      const hy = hingeLeft ? fromTopY : fromTopY + doorW;
                      return (
                        <g key={door.id}>
                          <line x1={hx} y1={hy} x2={hx - doorW} y2={hy} stroke="#f97316" strokeWidth="2" />
                          {hingeLeft ? (
                            <path d={`M ${hx} ${fromTopY + doorW} A ${doorW} ${doorW} 0 0 1 ${hx - doorW} ${fromTopY}`} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" />
                          ) : (
                            <path d={`M ${hx} ${fromTopY} A ${doorW} ${doorW} 0 0 0 ${hx - doorW} ${fromTopY + doorW}`} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" />
                          )}
                        </g>
                      );
                    }
                    if (z.id === 'Wall C' && wallB) {
                      const hx = hingeLeft ? doorX : doorX + doorW;
                      const wallY = offY + floorPxH;
                      return (
                        <g key={door.id}>
                          <line x1={hx} y1={wallY} x2={hx} y2={wallY - doorW} stroke="#f97316" strokeWidth="2" />
                          {hingeLeft ? (
                            <path d={`M ${doorX + doorW} ${wallY} A ${doorW} ${doorW} 0 0 0 ${doorX} ${wallY - doorW}`} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" />
                          ) : (
                            <path d={`M ${doorX} ${wallY} A ${doorW} ${doorW} 0 0 1 ${doorX + doorW} ${wallY - doorW}`} fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" />
                          )}
                        </g>
                      );
                    }
                    return null;
                  });
                })}
                <rect x={offX + islLeft} y={offY + islTop} width={islW} height={islH}
                  fill="#10b981" opacity="0.3" stroke="#059669" strokeWidth="2" rx="3" />
                <text x={offX + islLeft + islW / 2} y={offY + islTop + islH / 2 + (islNumRows > 1 ? -6 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#059669" fontWeight="bold">Island</text>
                {islNumRows === 1 && (
                  <g>
                    {isl.facingDirection === 'front' ? (
                      <polygon
                        points={`${offX + islLeft + islW / 2},${offY + islTop + islH - 10} ${offX + islLeft + islW / 2 - 5},${offY + islTop + islH - 4} ${offX + islLeft + islW / 2 + 5},${offY + islTop + islH - 4}`}
                        fill="#f59e0b" opacity="0.9"
                      />
                    ) : (
                      <polygon
                        points={`${offX + islLeft + islW / 2},${offY + islTop + 10} ${offX + islLeft + islW / 2 - 5},${offY + islTop + 4} ${offX + islLeft + islW / 2 + 5},${offY + islTop + 4}`}
                        fill="#f59e0b" opacity="0.9"
                      />
                    )}
                    <text x={offX + islLeft + islW / 2} y={isl.facingDirection === 'front' ? offY + islTop + islH - 2 : offY + islTop + 16}
                      textAnchor="middle" fill="#f59e0b" fontWeight="bold" style={{ fontSize: '7px' }}>
                      FACE
                    </text>
                  </g>
                )}
                {islNumRows > 1 && (
                  <>
                    <line x1={offX + islLeft} y1={offY + islTop + islH / 2} x2={offX + islLeft + islW} y2={offY + islTop + islH / 2}
                      stroke="#059669" strokeWidth="1" strokeDasharray="4 3" />
                    <text x={offX + islLeft + islW / 2} y={offY + islTop + islH / 4}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#059669" fontWeight="bold" style={{ fontSize: '7px' }}>Row 1</text>
                    <text x={offX + islLeft + islW / 2} y={offY + islTop + islH * 3 / 4}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#059669" fontWeight="bold" style={{ fontSize: '7px' }}>Row 2</text>
                  </>
                )}
                {/* Dimension lines: clearance from cabinet faces/walls to island edges */}
                {(() => {
                  const cabD = (project.settings?.depthBase ?? 560) * scale;
                  const ix = offX + islLeft, iy = offY + islTop, iw = islW, ih = islH;
                  const cx = ix + iw / 2, cy = iy + ih / 2;
                  const lines = [];
                  const db = project.settings?.depthBase ?? 560;
                  const hasWallB = wallZones.some(z => z.id === 'Wall B');
                  const hasWallC = wallZones.some(z => z.id === 'Wall C');

                  // Wall A (top) — always has cabinets → cabinet face to island top
                  const yTopStart = offY + cabD;
                  const dA = Math.round((isl.posZ ?? 1500) - islCabDepth / 2 - db);
                  if (dA > 0) {
                    lines.push(<line key="da" x1={cx} y1={yTopStart} x2={cx} y2={iy} stroke="#3b82f6" strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />);
                    lines.push(<text key="ta" x={cx + 4} y={(yTopStart + iy) / 2} fill="#3b82f6" fontWeight="bold" dominantBaseline="middle">{dA}mm</text>);
                  }
                  // Right side — Wall B cabinet face if exists, else wall
                  const xCenter = isl.posX ?? 1800;
                  const xRightStart = hasWallB ? offX + floorPxW - cabD : offX + floorPxW;
                  const dB = Math.round(floorWidth - (hasWallB ? db : 0) - (xCenter + islandLen / 2));
                  if (dB > 0) {
                    lines.push(<line key="db" x1={xRightStart} y1={cy} x2={ix + iw} y2={cy} stroke="#3b82f6" strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />);
                    lines.push(<text key="tb" x={(xRightStart + ix + iw) / 2} y={cy - 4} fill="#3b82f6" fontWeight="bold" textAnchor="middle">{dB}mm</text>);
                  }
                  // Bottom side — Wall C cabinet face if exists, else wall
                  const yBottomStart = hasWallC ? offY + floorPxH - cabD : offY + floorPxH;
                  const dC = Math.round(floorDepth - (hasWallC ? db : 0) - (isl.posZ ?? 1500) - islCabDepth / 2);
                  if (dC > 0) {
                    lines.push(<line key="dc" x1={cx} y1={yBottomStart} x2={cx} y2={iy + ih} stroke="#3b82f6" strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />);
                    lines.push(<text key="tc" x={cx + 4} y={(yBottomStart + iy + ih) / 2} fill="#3b82f6" fontWeight="bold" dominantBaseline="middle">{dC}mm</text>);
                  }
                  // Left side (entrance) — always wall to island left edge
                  const dE = Math.round(xCenter - islandLen / 2);
                  if (dE > 0) {
                    lines.push(<line key="de" x1={offX} y1={cy} x2={ix} y2={cy} stroke="#3b82f6" strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />);
                    lines.push(<text key="te" x={(offX + ix) / 2} y={cy - 4} fill="#3b82f6" fontWeight="bold" textAnchor="middle">{dE}mm</text>);
                  }
                  return lines;
                })()}
              </svg>
            </div>
            {/* Vertical Position Z slider */}
            <div className="flex flex-col items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg py-2 sm:py-3 w-10 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Z</span>
              <input type="range" min={posZMin} max={posZMax} step="10"
                value={Math.round(isl.posZ ?? 1500)}
                onChange={(e) => handleUpdateIslandSetting('posZ', parseInt(e.target.value))}
                className="flex-1 w-2 min-h-0 my-1 cursor-pointer accent-amber-500 [writing-mode:vertical-lr] [&::-webkit-slider-runnable-track]:h-full [&::-moz-range-track]:h-full"
              />
              <div className="flex flex-col items-center gap-0.5">
                <input type="number" value={dirtyInputs.posZ ?? Math.round(isl.posZ ?? 1500)}
                  onChange={(e) => setDirtyInputs(prev => ({ ...prev, posZ: e.target.value }))}
                  onBlur={(e) => commitDirtyInput('posZ', e.target.value, posZMin, posZMax)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  className="w-12 bg-transparent text-sm font-black text-orange-600 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-transparent focus:border-orange-500 transition-all" />
                <span className="text-[10px] font-black text-orange-600 font-mono">mm</span>
              </div>
            </div>
          </div>

          {/* Position X, Length, Depth, Seating — single row */}
          <div className="mt-2 grid grid-cols-4 gap-2">
            <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">X</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={dirtyInputs.posX ?? Math.round(isl.posX ?? 1800)}
                    onChange={(e) => setDirtyInputs(prev => ({ ...prev, posX: e.target.value }))}
                    onBlur={(e) => commitDirtyInput('posX', e.target.value, posXMin, posXMax)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-16 bg-transparent text-sm font-black text-orange-600 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-transparent focus:border-orange-500 transition-all" />
                  <span className="text-xs font-black text-orange-600 font-mono">mm</span>
                </div>
              </div>
              <input type="range" min={posXMin} max={posXMax} step="10"
                value={Math.round(isl.posX ?? 1800)}
                onChange={(e) => handleUpdateIslandSetting('posX', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Length</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={dirtyInputs.totalLength ?? localIsland.totalLength}
                    onChange={(e) => setDirtyInputs(prev => ({ ...prev, totalLength: e.target.value }))}
                    onBlur={(e) => commitDirtyInput('totalLength', e.target.value, 900, 3600)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-16 bg-transparent text-sm font-black text-emerald-500 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-transparent focus:border-emerald-500 transition-all" />
                  <span className="text-xs font-black text-emerald-500 font-mono">mm</span>
                </div>
              </div>
              <input type="range" min="900" max="3600" step="100"
                value={localIsland.totalLength}
                onChange={(e) => handleUpdateIslandSetting('totalLength', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Depth</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={dirtyInputs.islandDepth ?? isl.islandDepth}
                    onChange={(e) => setDirtyInputs(prev => ({ ...prev, islandDepth: e.target.value }))}
                    onBlur={(e) => commitDirtyInput('islandDepth', e.target.value, 500, 800)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-16 bg-transparent text-sm font-black text-emerald-500 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-transparent focus:border-emerald-500 transition-all" />
                  <span className="text-xs font-black text-emerald-500 font-mono">mm</span>
                </div>
              </div>
              <input type="range" min="500" max="800" step="10"
                value={isl.islandDepth}
                onChange={(e) => handleUpdateIslandSetting('islandDepth', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Seating</span>
                <button
                  onClick={() => handleUpdateIslandSetting('hasSeating', !isl.hasSeating)}
                  className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${isl.hasSeating ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${isl.hasSeating ? 'left-5.5' : 'left-0.5'
                    }`} />
                </button>
              </div>
              {isl.hasSeating && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Overhang</span>
                  <input type="range" min="250" max="400" step="10"
                    value={isl.seatingOverhang}
                    onChange={(e) => handleUpdateIslandSetting('seatingOverhang', parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">{isl.seatingOverhang}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const content = (
    <div className={`${isInline ? 'h-full rounded-2xl' : 'h-[95vh] sm:h-[85vh] rounded-t-[2.5rem] sm:rounded-[2rem]'} bg-white dark:bg-slate-900 shadow-2xl w-full ${isInline ? 'max-w-none' : 'max-w-6xl'} overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 sm:duration-200 border border-slate-200 dark:border-slate-800`}>
      {/* Header with Tabs Integrated */}
      <div className="px-6 py-1 border-b dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {localZones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setActiveTab(zone.id)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === zone.id
                    ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {zone.id}
              </button>
            ))}
            {localIsland && (
              <button
                onClick={() => setActiveTab('Island')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'Island'
                    ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                Island
              </button>
            )}
          </div>
        </div>

        {!isInline && (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {isIslandTab ? renderIslandTab() : (
          <>
            {/* Visualization Area for wall zones */}
            <div className="flex-1 relative bg-slate-100/50 dark:bg-slate-950/50 overflow-hidden" ref={containerRef}>
              {currentZone && (
                <div className="absolute inset-0 p-2 sm:p-4 flex flex-col">
                  <div className="flex-1 relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden group">

                    <WallVisualizer
                      zone={{ ...currentZone, cabinets: [] }}
                      height={currentZone.wallHeight}
                      isStatic={true}
                      hideArrows={true}
                      settings={project.settings}
                      editLimits={true}
                      onLimitMove={handleUpdateLimit}
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Offset from Left Edge</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={currentZone.startLimit || 0}
                            onChange={(e) => handleUpdateLimit('start', parseInt(e.target.value) || 0)}
                            className="w-24 bg-transparent text-xl font-black text-orange-600 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b-2 border-transparent focus:border-orange-500 transition-all"
                          />
                          <span className="text-xl font-black text-orange-600 font-mono">mm</span>
                        </div>
                      </div>
                      <input
                        type="range" min="0" max={currentZone.totalLength} step="10"
                        value={currentZone.startLimit || 0}
                        onChange={(e) => handleUpdateLimit('start', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Offset from Right Edge</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={currentZone.totalLength - (currentZone.endLimit || currentZone.totalLength)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              handleUpdateLimit('end', currentZone.totalLength - val);
                            }}
                            className="w-24 bg-transparent text-xl font-black text-orange-600 font-mono text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b-2 border-transparent focus:border-orange-500 transition-all"
                          />
                          <span className="text-xl font-black text-orange-600 font-mono">mm</span>
                        </div>
                      </div>
                      <input
                        type="range" min="0" max={currentZone.totalLength} step="10"
                        value={currentZone.totalLength - (currentZone.endLimit || currentZone.totalLength)}
                        onChange={(e) => handleUpdateLimit('end', currentZone.totalLength - parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 scale-x-[-1]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!isInline && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wall Edges</span>
              <span className="text-lg font-black text-slate-900 dark:text-white italic">Measured from Left/Right</span>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Usable Area</span>
              <span className="text-lg font-black text-orange-600 font-mono">
                {currentZone ? (currentZone.endLimit || currentZone.totalLength) - (currentZone.startLimit || 0) : 0}mm
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-12 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-full shadow-2xl shadow-orange-500/40 text-xs transition-all flex items-center gap-2 group"
            >
              Confirm Limits <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isInline) return content;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md">
      {content}
    </div>
  );
});
