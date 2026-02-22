import React, { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Html, useProgress, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Project, CabinetType, CabinetUnit, Zone } from '../../types';
import { Cabinet } from './Cabinet';
import { Wall } from './Wall';

interface Props {
  project: Project;
  showHardware?: boolean;
}

const LoadingFallback = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white font-bold text-lg">{progress.toFixed(0)}% loading...</div>
    </Html>
  );
};

const CameraController = ({ 
  targetView, 
  sceneCenter, 
  sceneSize 
}: { 
  targetView: string; 
  sceneCenter: [number, number, number];
  sceneSize: { width: number; depth: number; height: number };
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const prevViewRef = useRef<string>('');
  
  const maxDim = Math.max(sceneSize.width, sceneSize.depth, sceneSize.height);
  const distance = maxDim * 1.5;
  const centerY = sceneCenter[1];

  const viewPositions: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
    front: { 
      position: [sceneCenter[0], centerY, sceneCenter[2] + distance], 
      target: sceneCenter 
    },
    side: { 
      position: [sceneCenter[0] + distance, centerY, sceneCenter[2]], 
      target: sceneCenter 
    },
    top: { 
      position: [sceneCenter[0], sceneCenter[1] + distance + 500, sceneCenter[2] + 0.1], 
      target: sceneCenter 
    },
    isometric: { 
      position: [sceneCenter[0] + distance * 0.7, centerY + distance * 0.5, sceneCenter[2] + distance * 0.7], 
      target: sceneCenter 
    },
  };

  useEffect(() => {
    if (targetView && viewPositions[targetView] && prevViewRef.current !== targetView) {
      prevViewRef.current = targetView;
      const { position, target } = viewPositions[targetView];
      
      camera.position.set(...position);
      if (controlsRef.current) {
        controlsRef.current.target.set(...target);
        controlsRef.current.update();
      }
    }
  }, [targetView, camera, viewPositions]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={200}
      maxDistance={maxDim * 5}
      maxPolarAngle={Math.PI / 2.1}
      target={sceneCenter}
    />
  );
};

const Scene = ({ 
  project, 
  showHardware, 
  viewMode,
  onSceneBounds
}: { 
  project: Project; 
  showHardware: boolean; 
  viewMode: string;
  onSceneBounds: (bounds: { center: [number, number, number]; size: { width: number; depth: number; height: number } }) => void;
}) => {
  const activeZones = project.zones.filter(z => z.active && z.cabinets.length > 0);
  
  const cabinetData = useMemo(() => {
    const data: { unit: CabinetUnit; zone: Zone; position: [number, number, number]; rotation: number }[] = [];
    
    let currentX = 0;
    
    activeZones.forEach((zone, zoneIndex) => {
      zone.cabinets.forEach((cab) => {
        const cabinetX = currentX + cab.fromLeft;
        data.push({
          unit: cab,
          zone,
          position: [cabinetX, 0, 0],
          rotation: 0
        });
      });
      
      currentX += zone.totalLength + 500;
    });
    
    return data;
  }, [activeZones]);

  const sceneBounds = useMemo(() => {
    if (cabinetData.length === 0) {
      return { 
        center: [1500, 800, 300] as [number, number, number], 
        size: { width: 3000, depth: 1000, height: 2000 } 
      };
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxY = 0;

    cabinetData.forEach(({ unit, position }) => {
      const isWall = unit.type === CabinetType.WALL;
      const isTall = unit.type === CabinetType.TALL;
      const height = isTall ? 2100 : isWall ? 720 : 720;
      const depth = isWall ? 320 : isTall ? 580 : 560;
      
      minX = Math.min(minX, position[0]);
      maxX = Math.max(maxX, position[0] + unit.width);
      minZ = Math.min(minZ, position[2] - depth);
      maxZ = Math.max(maxZ, position[2]);
      maxY = Math.max(maxY, isWall ? 1400 + height : height);
    });

    const width = Math.max(maxX - minX + 1000, 2000);
    const depth = Math.max(maxZ - minZ + 1000, 1000);
    const height = Math.max(maxY + 500, 1500);

    return {
      center: [(minX + maxX) / 2, maxY / 2, (minZ + maxZ) / 2] as [number, number, number],
      size: { width, depth, height }
    };
  }, [cabinetData]);

  useEffect(() => {
    onSceneBounds(sceneBounds);
  }, [sceneBounds, onSceneBounds]);

  return (
    <>
      <CameraController 
        targetView={viewMode} 
        sceneCenter={sceneBounds.center} 
        sceneSize={sceneBounds.size} 
      />
      
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[sceneBounds.center[0] + 1000, 2000, sceneBounds.center[2] + 1000]}
        intensity={1}
        castShadow
      />
      <directionalLight
        position={[sceneBounds.center[0] - 500, 1000, sceneBounds.center[2] - 500]}
        intensity={0.5}
      />
      
      <Grid
        args={[20000, 20000]}
        cellSize={100}
        cellThickness={0.5}
        cellColor="#374151"
        sectionSize={500}
        sectionThickness={1}
        sectionColor="#1f2937"
        fadeDistance={10000}
        position={[0, -0.5, 0]}
      />

      {activeZones.map((zone, zoneIndex) => {
        let zoneStartX = 0;
        for (let i = 0; i < zoneIndex; i++) {
          zoneStartX += activeZones[i].totalLength + 500;
        }
        
        return (
          <Wall
            key={`wall-${zone.id}`}
            position={[zoneStartX, 0, -100]}
            width={zone.totalLength}
            height={zone.wallHeight || 2400}
            rotation={0}
          />
        );
      })}

      {cabinetData.map(({ unit, zone, position, rotation }) => (
        <Cabinet
          key={unit.id}
          unit={unit}
          position={position}
          rotation={rotation}
          showHardware={showHardware}
        />
      ))}
    </>
  );
};

export const CabinetViewer: React.FC<Props> = ({ project, showHardware = true }) => {
  const [viewMode, setViewMode] = useState<string>('isometric');
  const [showHW, setShowHW] = useState(showHardware);
  const [sceneBounds, setSceneBounds] = useState<{ 
    center: [number, number, number]; 
    size: { width: number; depth: number; height: number } 
  }>({
    center: [1500, 800, 300],
    size: { width: 3000, depth: 1000, height: 2000 }
  });

  const handleSceneBounds = (bounds: typeof sceneBounds) => {
    setSceneBounds(bounds);
  };

  const activeZones = project.zones.filter(z => z.active && z.cabinets.length > 0);
  const hasCabinets = activeZones.some(z => z.cabinets.length > 0);

  if (!hasCabinets) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="text-center">
          <div className="text-amber-400 text-lg font-bold mb-2">3D ISO View</div>
          <div className="text-slate-400 text-sm">Add cabinets to see 3D preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
        <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-2 border border-slate-700 shadow-lg">
          <div className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
            3D View
          </div>
          
          <div className="flex flex-wrap gap-1 mb-2">
            {['front', 'side', 'top', 'isometric'].map((view) => (
              <button
                key={view}
                onClick={() => setViewMode(view)}
                className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                  viewMode === view
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showHW}
                onChange={(e) => setShowHW(e.target.checked)}
                className="w-3 h-3 rounded accent-amber-500"
              />
              Hardware
            </label>
          </div>
        </div>
        
        {showHW && (
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-2 border border-slate-700 shadow-lg">
            <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1.5">
              Legend
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-400 text-[10px]">Hinge</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-red-500" />
                <span className="text-slate-400 text-[10px]">Cam-Lock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-yellow-500" />
                <span className="text-slate-400 text-[10px]">Confirmat</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm rounded px-2 py-1 border border-slate-700">
        <div className="text-slate-400 text-[10px]">
          Left: Rotate | Right: Pan | Scroll: Zoom
        </div>
      </div>

      <Canvas
        shadows
        camera={{ fov: 50 }}
        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
      >
        <PerspectiveCamera 
          makeDefault 
          position={[
            sceneBounds.center[0] + sceneBounds.size.width * 0.8,
            sceneBounds.center[1] + sceneBounds.size.height * 0.6,
            sceneBounds.center[2] + Math.max(sceneBounds.size.width, sceneBounds.size.depth) * 1.2
          ]}
          fov={50}
          near={10}
          far={50000}
        />
        <Suspense fallback={<LoadingFallback />}>
          <Scene 
            project={project} 
            showHardware={showHW} 
            viewMode={viewMode}
            onSceneBounds={handleSceneBounds}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
