import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, AlertTriangle, Wand2 } from 'lucide-react';
import { Project, Zone, Obstacle } from '../types';
import { CabinetViewer } from './3d';
import { v4 as uuid } from 'uuid';

interface WallEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (newZones: Zone[]) => void;
  isDark?: boolean;
  hideCabinets?: boolean;
  readOnly?: boolean;
}

const DEFAULT_WALL_NAMES = ['Wall A', 'Wall B', 'Wall C', 'Wall D'];

export const WallEditModal: React.FC<WallEditModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  isDark = true,
  hideCabinets = false,
  readOnly = false
}) => {
  const [localZones, setLocalZones] = useState<Zone[]>(project.zones);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Create a temporary project object for the 3D viewer to render
  const tempProject: Project = { 
    ...project, 
    zones: hideCabinets 
      ? localZones.map(z => ({ ...z, cabinets: [] })) 
      : localZones 
  };

  const currentZoneIndex = localZones.findIndex(z => z.id === activeTab);
  const currentZone = currentZoneIndex >= 0 ? localZones[currentZoneIndex] : localZones[0];

  useEffect(() => {
    if (isOpen) {
      if (project.zones.length === 0) {
        // Ensure there is at least Wall A if empty
        setLocalZones([{
          id: 'Wall A',
          active: true,
          totalLength: 3000,
          wallHeight: 2400,
          obstacles: [],
          cabinets: []
        }]);
        setActiveTab('Wall A');
      } else {
        setLocalZones(JSON.parse(JSON.stringify(project.zones)));
        setActiveTab(project.zones[0]?.id || 'Wall A');
      }
    }
  }, [project.zones, isOpen]);

  if (!isOpen) return null;

  const handleZoneChange = (index: number, field: keyof Zone, value: any) => {
    const newZones = [...localZones];
    newZones[index] = { ...newZones[index], [field]: value };
    setLocalZones(newZones);
  };

  const handleAddWall = () => {
    if (localZones.length >= 4) {
      alert('Maximum 4 walls supported for auto-layout.');
      return;
    }
    
    // Find the next available default name or use a custom one
    const nameStr = DEFAULT_WALL_NAMES[localZones.length] || `Wall ${localZones.length + 1}`;
    
    const newZone: Zone = {
      id: nameStr,
      active: true,
      totalLength: 3000,
      wallHeight: localZones.length > 0 ? localZones[0].wallHeight : 2400,
      obstacles: [],
      cabinets: []
    };
    
    setLocalZones([...localZones, newZone]);
    setActiveTab(nameStr);
  };

  const handleRemoveWall = (index: number) => {
    if (localZones.length <= 1) {
      alert('You must have at least one wall.');
      return;
    }
    
    const zoneToRemove = localZones[index];
    if (zoneToRemove.cabinets.length > 0 || zoneToRemove.obstacles.length > 0) {
      if (!window.confirm(`This wall has cabinets or obstacles. Are you sure you want to remove it?`)) {
        return;
      }
    }
    
    const newZones = [...localZones];
    newZones.splice(index, 1);
    setLocalZones(newZones);
  };

  const handleAddObstacle = (wallIndex: number, type: Obstacle['type']) => {
    const newZones = [...localZones];
    const wall = newZones[wallIndex];
    
    const newObstacle: Obstacle = {
      id: uuid(),
      type,
      fromLeft: 500,
      width: type === 'window' ? 1200 : type === 'door' ? 900 : 100,
      height: type === 'door' ? 2100 : type === 'window' ? 1200 : 2400,
      sillHeight: type === 'window' ? 1050 : undefined,
      elevation: type === 'pipe' ? 1500 : undefined,
      depth: type === 'column' ? 100 : undefined,
    };
    
    newZones[wallIndex] = {
      ...wall,
      obstacles: [...wall.obstacles, newObstacle]
    };
    setLocalZones(newZones);
  };

  const handleRemoveObstacle = (wallIndex: number, obstacleIndex: number) => {
    const newZones = [...localZones];
    const wall = newZones[wallIndex];
    const newObstacles = [...wall.obstacles];
    newObstacles.splice(obstacleIndex, 1);
    newZones[wallIndex] = { ...wall, obstacles: newObstacles };
    setLocalZones(newZones);
  };

  const handleObstacleChange = (wallIndex: number, obstacleIndex: number, field: keyof Obstacle, value: any) => {
    const newZones = [...localZones];
    const wall = newZones[wallIndex];
    const newObstacles = [...wall.obstacles];
    newObstacles[obstacleIndex] = { ...newObstacles[obstacleIndex], [field]: value };
    newZones[wallIndex] = { ...wall, obstacles: newObstacles };
    setLocalZones(newZones);
  };

  const getObstacleIcon = (type: Obstacle['type']) => {
    switch (type) {
      case 'door': return '🚪';
      case 'window': return '🪟';
      case 'column': return '�柱子';
      case 'pipe': return '🔧';
      default: return '⚠️';
    }
  };

  const handleSave = () => {
    onSave(localZones);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Wall Dimensions Setup
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Live 3D Preview */}
          <div className="w-1/2 md:w-3/5 bg-slate-100 relative">
              <CabinetViewer 
                project={tempProject} 
                showHardware={false} 
                showEmptyWalls={true} 
                activeWallId={activeTab}
                onWallClick={(wallId) => setActiveTab(wallId)}
                lightTheme={!isDark}
              />
          </div>

          {/* Right panel: Wall tabs and form */}
          <div className="w-1/2 md:w-2/5 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-950 shrink-0 border-b border-slate-200 dark:border-slate-800">
              {localZones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setActiveTab(zone.id)}
                  className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${
                    activeTab === zone.id 
                      ? 'bg-white dark:bg-slate-900 text-amber-500 shadow-sm border-t-2 border-amber-500' 
                      : 'text-slate-500 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300'
                  }`}
                >
                  {zone.id}
                </button>
              ))}
              {localZones.length < 4 && !readOnly && (
                <button
                  onClick={handleAddWall}
                  className="px-4 py-2 text-sm font-bold rounded-t-lg bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors"
                >
                  +
                </button>
              )}
            </div>

            {/* Wall Form */}
            <div className="flex-1 overflow-y-auto p-4">
              {currentZone && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <input 
                        value={currentZone.id}
                        disabled={readOnly}
                        onChange={(e) => {
                          const idx = localZones.findIndex(z => z.id === activeTab);
                          handleZoneChange(idx, 'id', e.target.value);
                          setActiveTab(e.target.value);
                        }}
                        className="font-bold text-lg text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 outline-none pb-0.5 transition-colors"
                      />
                    </div>
                    {localZones.length > 1 && !readOnly && (
                      <button
                        onClick={() => {
                          const idx = localZones.findIndex(z => z.id === activeTab);
                          handleRemoveWall(idx);
                          setActiveTab(localZones[0]?.id || '');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Remove Wall"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Length (W) mm</label>
                      <input
                        type="number"
                        min="500"
                        max="10000"
                        step="100"
                        value={currentZone.totalLength}
                        disabled={readOnly}
                        onChange={(e) => {
                          const idx = localZones.findIndex(z => z.id === activeTab);
                          handleZoneChange(idx, 'totalLength', Number(e.target.value));
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Height (H) mm</label>
                      <input
                        type="number"
                        min="1000"
                        max="4000"
                        step="100"
                        value={currentZone.wallHeight}
                        disabled={readOnly}
                        onChange={(e) => {
                          const idx = localZones.findIndex(z => z.id === activeTab);
                          handleZoneChange(idx, 'wallHeight', Number(e.target.value));
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Obstacles Section */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Obstacles</span>
                        <span className="text-xs text-slate-400">({currentZone.obstacles.filter(o => !o.id.startsWith('corner_')).length})</span>
                      </div>
                      <div className="flex gap-1">
                        {!readOnly && (
                          <>
                            <button
                              onClick={() => {
                                const idx = localZones.findIndex(z => z.id === activeTab);
                                handleAddObstacle(idx, 'door');
                              }}
                              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"
                              title="Add Door"
                            >
                              🚪
                            </button>
                            <button
                              onClick={() => {
                                const idx = localZones.findIndex(z => z.id === activeTab);
                                handleAddObstacle(idx, 'window');
                              }}
                              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"
                              title="Add Window"
                            >
                              🪟
                            </button>
                            <button
                              onClick={() => {
                                const idx = localZones.findIndex(z => z.id === activeTab);
                                handleAddObstacle(idx, 'column');
                              }}
                              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"
                              title="Add Column"
                            >
                              🧱
                            </button>
                            <button
                              onClick={() => {
                                const idx = localZones.findIndex(z => z.id === activeTab);
                                handleAddObstacle(idx, 'pipe');
                              }}
                              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"
                              title="Add Pipe"
                            >
                              🔧
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {currentZone.obstacles.length > 0 && (
                      <div className="space-y-2">
                        {currentZone.obstacles
                          .filter(o => !o.id.startsWith('corner_'))
                          .map((obstacle, obsIndex) => (
                          <div key={obstacle.id} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 text-xs">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{obstacle.type}</span>
                              {!readOnly && (
                                <button
                                  onClick={() => {
                                    const idx = localZones.findIndex(z => z.id === activeTab);
                                    handleRemoveObstacle(idx, obsIndex);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500">From Left (mm)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={currentZone.totalLength}
                                  value={obstacle.fromLeft}
                                  disabled={readOnly}
                                  onChange={(e) => {
                                    const idx = localZones.findIndex(z => z.id === activeTab);
                                    handleObstacleChange(idx, obsIndex, 'fromLeft', Number(e.target.value));
                                  }}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500">Width (mm)</label>
                                <input
                                  type="number"
                                  min="50"
                                  max={currentZone.totalLength}
                                  value={obstacle.width}
                                  disabled={readOnly}
                                  onChange={(e) => {
                                    const idx = localZones.findIndex(z => z.id === activeTab);
                                    handleObstacleChange(idx, obsIndex, 'width', Number(e.target.value));
                                  }}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500">Height (mm)</label>
                                <input
                                  type="number"
                                  min="50"
                                  max={currentZone.wallHeight}
                                  value={obstacle.height}
                                  disabled={readOnly}
                                  onChange={(e) => {
                                    const idx = localZones.findIndex(z => z.id === activeTab);
                                    handleObstacleChange(idx, obsIndex, 'height', Number(e.target.value));
                                  }}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-white"
                                />
                              </div>
                              {obstacle.type === 'window' && (
                                <div>
                                  <label className="block text-[10px] text-slate-500">Sill Height (mm)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={currentZone.wallHeight}
                                    value={obstacle.sillHeight || 0}
                                    disabled={readOnly}
                                    onChange={(e) => {
                                      const idx = localZones.findIndex(z => z.id === activeTab);
                                      handleObstacleChange(idx, obsIndex, 'sillHeight', Number(e.target.value));
                                    }}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-white"
                                  />
                                </div>
                              )}
                              {obstacle.type === 'pipe' && (
                                <div>
                                  <label className="block text-[10px] text-slate-500">Elevation (mm)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={currentZone.wallHeight}
                                    value={obstacle.elevation || 0}
                                    disabled={readOnly}
                                    onChange={(e) => {
                                      const idx = localZones.findIndex(z => z.id === activeTab);
                                      handleObstacleChange(idx, obsIndex, 'elevation', Number(e.target.value));
                                    }}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-white"
                                  />
                                </div>
                              )}
                              {obstacle.type === 'column' && (
                                <div>
                                  <label className="block text-[10px] text-slate-500">Depth (mm)</label>
                                  <input
                                    type="number"
                                    min="50"
                                    max={500}
                                    value={obstacle.depth || 100}
                                    disabled={readOnly}
                                    onChange={(e) => {
                                      const idx = localZones.findIndex(z => z.id === activeTab);
                                      handleObstacleChange(idx, obsIndex, 'depth', Number(e.target.value));
                                    }}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-4 border-t border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
          <div className="flex gap-3">
            {readOnly ? (
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold shadow-md hover:scale-105 transition-all"
              >
                Close Viewer
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <Wand2 size={18} />
                  Generate 3D Layout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
