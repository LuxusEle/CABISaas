/// <reference types="@react-three/fiber" />
import React, { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Html, useProgress, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Project, CabinetType, CabinetUnit, Zone, Obstacle, ProjectSettings } from '../../types';
import { Cabinet } from './Cabinet';
import { Wall } from './Wall';

interface Props {
  project: Project;
  showHardware?: boolean;
  showEmptyWalls?: boolean;
  onWallClick?: (wallId: string) => void;
  onCabinetClick?: (zoneId: string, cabinetIndex: number) => void;
  activeWallId?: string;
  lightTheme?: boolean;
  draggedCabinet?: CabinetUnit | null;
  onDropCabinet?: (zoneId: string, fromLeft: number, cabinet: CabinetUnit) => void;
  selectedCabinet?: { zoneId: string, index: number } | null;
  onCabinetSelect?: (zoneId: string, index: number) => void;
  onSettingsUpdate?: (settings: Partial<ProjectSettings>) => void;
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
  sceneSize,
  lightTheme
}: { 
  targetView: string; 
  sceneCenter: [number, number, number];
  sceneSize: { width: number; depth: number; height: number };
  lightTheme?: boolean;
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const prevViewRef = useRef<string>('');
  const lastProjectRef = useRef<string>('');
  const initialFitRef = useRef<boolean>(false);
  
  const maxDim = Math.max(sceneSize.width, sceneSize.depth, sceneSize.height);
  const distance = Math.max(maxDim * 1.0, 3000); // Increased distance to zoom out
  const centerY = sceneCenter[1];

  const viewPositions = useMemo(() => ({
    front: { 
      position: [sceneCenter[0], centerY, sceneCenter[2] + distance] as [number, number, number], 
      target: sceneCenter 
    },
    side: { 
      position: [sceneCenter[0] + distance, centerY, sceneCenter[2]] as [number, number, number], 
      target: sceneCenter 
    },
    top: { 
      position: [sceneCenter[0], sceneCenter[1] + distance + 500, sceneCenter[2] + 0.1] as [number, number, number], 
      target: sceneCenter 
    },
    isometric: { 
      position: [sceneCenter[0] - distance * 0.8, centerY + distance * 0.4, sceneCenter[2] + distance * 1.0] as [number, number, number], 
      target: [sceneCenter[0] - 500, centerY + 100, sceneCenter[2]] as [number, number, number] 
    },
  }), [sceneCenter, centerY, distance]);

  useEffect(() => {
    const isNewView = prevViewRef.current !== targetView;
    const projectFingerprint = `${sceneCenter.map(c => Math.round(c)).join(',')}-${Math.round(sceneSize.width)}-${Math.round(sceneSize.depth)}`;
    const isNewProject = lastProjectRef.current !== projectFingerprint;
    const isDefaultScene = sceneSize.width === 3000 && sceneSize.depth === 1000;
    const isInvalidScene = sceneCenter[0] === 0 && sceneCenter[1] === 0 && sceneCenter[2] === 0;
    
    if (targetView && viewPositions[targetView as keyof typeof viewPositions]) {
      // Re-fit if view changed, OR if project changed and it's not the default empty/invalid scene
      if (isNewView || (isNewProject && !isDefaultScene && !isInvalidScene)) {
        const performFit = () => {
          prevViewRef.current = targetView;
          lastProjectRef.current = projectFingerprint;
          
          const { position, target } = viewPositions[targetView as keyof typeof viewPositions];
          
          camera.position.set(...position);
          camera.lookAt(...target);
          if (controlsRef.current) {
            controlsRef.current.target.set(...target);
            controlsRef.current.update();
          }
        };

        if (!initialFitRef.current) {
          initialFitRef.current = true;
          setTimeout(performFit, 100); // Small delay for first mount
        } else {
          performFit();
        }
      }
    }
  }, [targetView, camera, viewPositions, sceneCenter, sceneSize.width, sceneSize.depth]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={200}
      maxDistance={maxDim * 5}
      maxPolarAngle={Math.PI / 2.1}
      enableZoom={true}
      enablePan={true}
    />
  );
};

const Scene = ({ 
  project, 
  showHardware, 
  viewMode,
  showEmptyWalls,
  onSceneBounds,
  onWallClick,
  onCabinetClick,
  activeWallId,
  lightTheme,
  doorOpenAngle,
  forceGola,
  draggedCabinet,
  onDropCabinet,
  selectedCabinet,
  onCabinetSelect
}: { 
  project: Project; 
  showHardware: boolean; 
  viewMode: string;
  showEmptyWalls?: boolean;
  onSceneBounds: (bounds: { center: [number, number, number]; size: { width: number; depth: number; height: number } }) => void;
  onWallClick?: (wallId: string) => void;
  onCabinetClick?: (zoneId: string, cabinetIndex: number) => void;
  activeWallId?: string;
  lightTheme?: boolean;
  doorOpenAngle?: number;
  forceGola?: boolean;
  draggedCabinet?: CabinetUnit | null;
  onDropCabinet?: (zoneId: string, fromLeft: number, cabinet: CabinetUnit, targetWidth?: number) => void;
  selectedCabinet?: { zoneId: string, index: number } | null;
  onCabinetSelect?: (zoneId: string, index: number) => void;
}) => {
  const [previewPos, setPreviewPos] = useState<{ wallIndex: number; fromLeft: number; width: number } | null>(null);
  const activeZones = (showEmptyWalls || !!draggedCabinet)
    ? project.zones.filter(z => z.active)
    : project.zones.filter(z => z.active && z.cabinets.length > 0);
  
  const layoutData = useMemo(() => {
    const cabinetPositions: { 
      unit: CabinetUnit; 
      zone: Zone; 
      position: [number, number, number]; 
      rotation: number;
      wallIndex: number; // This is the zone index
      cabinetIndex: number;
      label: string;
    }[] = [];
    
    const wallPositions: {
      zone: Zone;
      position: [number, number, number];
      width: number;
      height: number;
      rotation: number;
    }[] = [];
    
    const obstaclePositions: {
      zone: Zone;
      obstacles: Obstacle[];
      wallIndex: number;
      wallAEnd: number;
      wallBEnd: number;
      wallCEnd: number;
    }[] = [];

    const wallCounters: Record<number, { B: number; T: number; W: number }> = {};
    
    // First pass: calculate wall dimensions
    const wallLengths = activeZones.map(z => z.totalLength);
    const wallAEnd = wallLengths[0] || 0;
    const wallBEnd = wallLengths[1] || 0;
    const wallCEnd = wallLengths[2] || 0;
    
    activeZones.forEach((zone, wallIndex) => {
      const wallLength = zone.totalLength;
      const wallHeight = zone.wallHeight || 2400;
      
      wallCounters[wallIndex] = { B: 0, T: 0, W: 0 };
    });

    activeZones.forEach((zone, wallIndex) => {
      const wallLength = zone.totalLength;
      const wallHeight = zone.wallHeight || 2400;
      
      // Position cabinets
      zone.cabinets.forEach((cab) => {
        let pos: [number, number, number];
        let rotation: number;
        const cabinetOffset = 0; // Distance from wall
        
        switch (wallIndex) {
          case 0: // Wall A: XY plane, cabinets face +Z
            pos = [cab.fromLeft, 0, cabinetOffset];
            rotation = 0;
            break;
          case 1: // Wall B: ZY plane, cabinets face -X
            pos = [wallAEnd - cabinetOffset, 0, cab.fromLeft];
            rotation = -Math.PI / 2;
            break;
          case 2: // Wall C: XY plane, cabinets face -Z
            pos = [wallAEnd - cab.fromLeft, 0, wallBEnd - cabinetOffset];
            rotation = Math.PI;
            break;
          case 3: // Wall D: ZY plane, cabinets face +X
            pos = [cabinetOffset, 0, wallBEnd - cab.fromLeft];
            rotation = Math.PI / 2;
            break;
          default:
            pos = [cab.fromLeft, 0, cabinetOffset];
            rotation = 0;
        }

        const counters = wallCounters[wallIndex];
        let typeChar = 'B';
        if (cab.type === CabinetType.WALL) {
          typeChar = 'W';
          counters.W++;
        } else if (cab.type === CabinetType.TALL) {
          typeChar = 'T';
          counters.T++;
        } else {
          counters.B++;
        }
        const wallNum = String(wallIndex + 1).padStart(2, '0');
        const count = counters[typeChar as keyof typeof counters];
        const label = `W${wallNum}${typeChar}${String(count).padStart(2, '0')}`;
        
        cabinetPositions.push({
          unit: cab,
          zone,
          position: pos,
          rotation,
          wallIndex,
          cabinetIndex: zone.cabinets.indexOf(cab),
          label
        });
      });
      
      // Position walls
      let wallPos: [number, number, number];
      let wallRot: number;
      let wallW: number;
      
      switch (wallIndex) {
        case 0: // Wall A: along X axis at Z = 0
          wallPos = [0, 0, 0];
          wallRot = 0;
          wallW = wallLength;
          break;
        case 1: // Wall B: along Z axis at X = wallAEnd
          wallPos = [wallAEnd, 0, 0];
          wallRot = -Math.PI / 2;
          wallW = wallLength;
          break;
        case 2: // Wall C: along X axis at Z = wallBEnd
          wallPos = [wallAEnd, 0, wallBEnd];
          wallRot = Math.PI;
          wallW = wallLength;
          break;
        case 3: // Wall D: along Z axis at X = 0
          wallPos = [0, 0, wallBEnd];
          wallRot = Math.PI / 2;
          wallW = wallLength;
          break;
        default:
          wallPos = [0, 0, 0];
          wallRot = 0;
          wallW = wallLength;
      }
      
      wallPositions.push({
        zone,
        position: wallPos,
        width: wallW,
        height: wallHeight,
        rotation: wallRot
      });
    });
    
    // Position obstacles (after all walls are positioned)
    activeZones.forEach((zone, wallIndex) => {
      obstaclePositions.push({
        zone,
        obstacles: zone.obstacles,
        wallIndex,
        wallAEnd,
        wallBEnd,
        wallCEnd
      });
    });
    
    return { cabinetPositions, wallPositions, obstaclePositions };
  }, [activeZones]);

  const sceneBounds = useMemo(() => {
    if (layoutData.cabinetPositions.length === 0 && (!showEmptyWalls || layoutData.wallPositions.length === 0)) {
      return { 
        center: [1500, 800, 300] as [number, number, number], 
        size: { width: 3000, depth: 1000, height: 2000 } 
      };
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxY = 0;

    if (layoutData.cabinetPositions.length > 0) {
      layoutData.cabinetPositions.forEach(({ unit, position, wallIndex }) => {
        const isWall = unit.type === CabinetType.WALL;
        const isTall = unit.type === CabinetType.TALL;
        const settings = project.settings;
        const cabHeight = unit.advancedSettings?.height || (isTall ? (settings?.tallHeight || 2100) : isWall ? (settings?.wallHeight || 720) : (settings?.baseHeight || 870));
        const cabDepth = unit.advancedSettings?.depth || (isWall ? (settings?.depthWall || 350) : isTall ? (settings?.depthTall || 560) : (settings?.depthBase || 560));
        
        let x1 = position[0];
        let x2 = position[0];
        let z1 = position[2];
        let z2 = position[2];
        
        if (wallIndex === 0 || wallIndex === 2) {
          x2 = x1 + unit.width;
          z2 = z1 + cabDepth;
        } else {
          x2 = x1 + cabDepth;
          z2 = z1 + unit.width;
        }
        
        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minZ = Math.min(minZ, z1, z2);
        maxZ = Math.max(maxZ, z1, z2);
        maxY = Math.max(maxY, isWall ? 1400 + cabHeight : cabHeight);
      });
    } else if (showEmptyWalls) {
      layoutData.wallPositions.forEach(({ position, width, height, rotation }) => {
        const x1 = position[0];
        const z1 = position[2];
        let x2 = x1, z2 = z1;
        if (Math.abs(rotation) < 0.1 || Math.abs(rotation - Math.PI) < 0.1) {
          x2 = x1 + width;
        } else {
          z2 = z1 + width;
        }
        minX = Math.min(minX, Math.min(x1, x2));
        maxX = Math.max(maxX, Math.max(x1, x2));
        minZ = Math.min(minZ, Math.min(z1, z2));
        maxZ = Math.max(maxZ, Math.max(z1, z2));
        maxY = Math.max(maxY, height);
      });
    }

    const width = Math.max(maxX - minX + 1000, 2000);
    const depth = Math.max(maxZ - minZ + 1000, 1000);
    const height = Math.max(maxY + 500, 1500);

    return {
      center: [(minX + maxX) / 2, maxY / 2, (minZ + maxZ) / 2] as [number, number, number],
      size: { width, depth, height }
    };
  }, [layoutData, showEmptyWalls]);

  useEffect(() => {
    onSceneBounds(sceneBounds);
  }, [sceneBounds, onSceneBounds]);

  return (
    <>
      <CameraController 
        targetView={viewMode} 
        sceneCenter={sceneBounds.center} 
        sceneSize={sceneBounds.size}
        lightTheme={lightTheme}
      />
      
      <ambientLight intensity={0.5} />
      <Environment preset="city" />
      <directionalLight
        position={[sceneBounds.center[0] + 1000, 2000, sceneBounds.center[2] + 1000]}
        intensity={1}
        castShadow
      />
      <directionalLight
        position={[sceneBounds.center[0] - 500, 1000, sceneBounds.center[2] - 500]}
        intensity={0.5}
      />
      
      <ContactShadows 
        position={[0, -0.1, 0]} 
        opacity={0.4} 
        scale={10000} 
        blur={2} 
        far={4} 
      />
      
      <Grid
        args={[20000, 20000]}
        cellSize={100}
        cellThickness={0.5}
        cellColor={lightTheme ? '#94a3b8' : '#374151'}
        sectionSize={500}
        sectionThickness={1}
        sectionColor={lightTheme ? '#64748b' : '#1f2937'}
        fadeDistance={10000}
        position={[0, -0.5, 0]}
      />

      {layoutData.wallPositions.map(({ zone, position, width, height, rotation }, index) => (
        <Wall
          key={`wall-${zone.id}`}
          position={position}
          width={width}
          height={height}
          rotation={rotation}
          obstacles={zone.obstacles}
          wallIndex={index}
          isActive={activeWallId === zone.id}
          onClick={() => onWallClick?.(zone.id)}
          onPointerMove={(e) => {
            if (!draggedCabinet) return;
            e.stopPropagation();
            // Calculate fromLeft from the local X coordinate of the intersection
            const point = e.point.clone();
            const wallMatrixInverse = new THREE.Matrix4().makeTranslation(...position).multiply(new THREE.Matrix4().makeRotationY(rotation)).invert();
            point.applyMatrix4(wallMatrixInverse);
            
            const targetX = point.x;
            const snapThreshold = 100;
            
            // Find all empty spans on this wall (segments not occupied by relevant items)
            const occupied = [
              ...layoutData.cabinetPositions.filter(cp => cp.wallIndex === index).map(cp => ({ start: cp.unit.fromLeft, end: cp.unit.fromLeft + cp.unit.width, type: cp.unit.type })),
              ...zone.obstacles.map(obs => ({ start: obs.fromLeft, end: obs.fromLeft + obs.width, obstacle: obs }))
            ].filter(o => {
               if ((o as any).obstacle) {
                 const obs = (o as any).obstacle;
                 
                 // Ruby Rule: Wall cabinets only care about wall corner offsets, Base only care about base offsets
                 if (obs.id === 'corner_base_offset' && draggedCabinet.type === CabinetType.WALL) return false;
                 if (obs.id === 'corner_wall_offset' && draggedCabinet.type === CabinetType.BASE) return false;

                 if (obs.type === 'door' || obs.type === 'column' || obs.type === 'pipe') return true;
                 if (obs.type === 'window') {
                   const sill = obs.sillHeight || 0;
                   const cabTop = (draggedCabinet.type === CabinetType.WALL) ? 2100 : (draggedCabinet.type === CabinetType.TALL ? 2100 : 870);
                   return sill < cabTop;
                 }
                 return true;
               }
               return (o as any).type === draggedCabinet.type || (o as any).type === CabinetType.TALL || draggedCabinet.type === CabinetType.TALL;
            }).sort((a, b) => a.start - b.start);

            const spans: { start: number; end: number }[] = [];
            let curr = 0;
            occupied.forEach(o => {
              if (o.start > curr + 50) spans.push({ start: curr, end: o.start });
              curr = Math.max(curr, o.end);
            });
            if (curr < width - 50) spans.push({ start: curr, end: width });
            
            // Default to full wall if no other items
            if (spans.length === 0 && occupied.length === 0) spans.push({ start: 0, end: width });

            // Find the span the user is currently hovering over, or the nearest one
            const span = spans.find(s => targetX >= s.start && targetX <= s.end) || 
                         [...spans].sort((a, b) => {
                           const dA = Math.min(Math.abs(targetX - a.start), Math.abs(targetX - a.end));
                           const dB = Math.min(Math.abs(targetX - b.start), Math.abs(targetX - b.end));
                           return dA - dB;
                         })[0] || { start: 0, end: width };

            const gapStart = span.start;
            const gapEnd = span.end;

            // Snap points
            const snapPoints = [gapStart, gapEnd - draggedCabinet.width];
            
            let snappedX = Math.round(targetX / 25) * 25;
            const closestSnap = snapPoints.reduce((prev, curr) => 
              Math.abs(curr - targetX) < Math.abs(prev - targetX) ? curr : prev, snapPoints[0]
            );
            
            if (Math.abs(closestSnap - targetX) < snapThreshold) {
              snappedX = closestSnap;
            }
            
            // Clamp to the identified gap
            let fromLeft = Math.max(gapStart, snappedX);
            if (fromLeft + 100 > gapEnd) {
              fromLeft = Math.max(gapStart, gapEnd - draggedCabinet.width);
            }
            
            // Adjust width to fit the gap
            const finalWidth = Math.min(draggedCabinet.width, gapEnd - fromLeft);
            
            setPreviewPos({ wallIndex: index, fromLeft, width: finalWidth });
          }}
          onPointerUp={(e) => {
            if (draggedCabinet && previewPos) {
              e.stopPropagation();
              const wall = layoutData.wallPositions[previewPos.wallIndex];
              onDropCabinet?.(wall.zone.id, previewPos.fromLeft, draggedCabinet, previewPos.width);
              setPreviewPos(null);
            }
          }}
          lightTheme={lightTheme}
          showGrid={!!draggedCabinet}
        />
      ))}

      {previewPos && draggedCabinet && (
        <Cabinet
          unit={{ ...draggedCabinet, id: 'preview-ghost', width: previewPos.width }}
          position={(() => {
            const wall = layoutData.wallPositions[previewPos.wallIndex];
            const cabOffset = 0;
            switch (previewPos.wallIndex) {
              case 0: return [previewPos.fromLeft, 0, cabOffset];
              case 1: return [layoutData.wallPositions[0].width - cabOffset, 0, previewPos.fromLeft];
              case 2: return [layoutData.wallPositions[0].width - previewPos.fromLeft, 0, layoutData.wallPositions[1].width - cabOffset];
              case 3: return [cabOffset, 0, layoutData.wallPositions[1].width - previewPos.fromLeft];
              default: return [previewPos.fromLeft, 0, cabOffset];
            }
          })()}
          rotation={layoutData.wallPositions[previewPos.wallIndex].rotation}
          showHardware={false}
          wallIndex={previewPos.wallIndex}
          label="PLACE HERE"
          settings={project.settings}
          opacity={0.5}
          doorOpenAngle={doorOpenAngle}
        />
      )}

      {layoutData.cabinetPositions.map(({ unit, zone, position, rotation, wallIndex, cabinetIndex, label }) => {
        const isSelected = selectedCabinet?.zoneId === zone.id && selectedCabinet?.index === cabinetIndex;
        return (
          <Cabinet
            key={unit.id}
            unit={unit}
            position={position}
            rotation={rotation}
            showHardware={showHardware}
            wallIndex={wallIndex}
            label={label}
            settings={project.settings}
            isSelected={isSelected}
            onClick={() => {
              onCabinetSelect?.(zone.id, cabinetIndex);
            }}
            doorOpenAngle={doorOpenAngle}
            forceGola={forceGola}
          />
        );
      })}

      {/* Background plane to catch drag events in empty space */}
      {draggedCabinet && (
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.5, 0]} 
          onPointerMove={(e) => {
            if (!draggedCabinet) return;
            const point = e.point;
            
            let minDist = Infinity;
            let nearest = null;
            
            layoutData.wallPositions.forEach((wall, idx) => {
              let dist = 0;
              let fromLeft = 0;
              
              // Approximate distance to wall line segments
              switch(idx) {
                case 0: // Wall A: z=0, x from 0 to wallAWidth
                  dist = Math.abs(point.z);
                  fromLeft = point.x;
                  break;
                case 1: // Wall B: x=wallAWidth, z from 0 to wallBWidth
                  dist = Math.abs(point.x - layoutData.wallPositions[0].width);
                  fromLeft = point.z;
                  break;
                case 2: // Wall C: z=wallBWidth, x from 0 to wallAWidth
                  dist = Math.abs(point.z - (layoutData.wallPositions[1]?.width || 0));
                  fromLeft = layoutData.wallPositions[0].width - point.x;
                  break;
                case 3: // Wall D: x=0, z from 0 to wallBWidth
                  dist = Math.abs(point.x);
                  fromLeft = (layoutData.wallPositions[1]?.width || 0) - point.z;
                  break;
              }
              
              if (dist < minDist) {
                minDist = dist;
                const targetX = fromLeft;
                const snapThreshold = 100;
                
                // Find all empty spans on this wall
                const occupied = [
                  ...layoutData.cabinetPositions.filter(cp => cp.wallIndex === idx).map(cp => ({ start: cp.unit.fromLeft, end: cp.unit.fromLeft + cp.unit.width, type: cp.unit.type })),
                  ...wall.zone.obstacles.map(obs => ({ start: obs.fromLeft, end: obs.fromLeft + obs.width, obstacle: obs }))
                ].filter(o => {
                  if ((o as any).obstacle) {
                    const obs = (o as any).obstacle;
                    
                    // Ruby Rule: Row-specific corner isolation
                    if (obs.id === 'corner_base_offset' && draggedCabinet.type === CabinetType.WALL) return false;
                    if (obs.id === 'corner_wall_offset' && draggedCabinet.type === CabinetType.BASE) return false;

                    if (obs.type === 'door' || obs.type === 'column' || obs.type === 'pipe') return true;
                    if (obs.type === 'window') {
                      const sill = obs.sillHeight || 0;
                      const cabTop = (draggedCabinet.type === CabinetType.WALL) ? 2100 : (draggedCabinet.type === CabinetType.TALL ? 2100 : 870);
                      return sill < cabTop;
                    }
                    return true;
                  }
                  return (o as any).type === draggedCabinet.type || (o as any).type === CabinetType.TALL || draggedCabinet.type === CabinetType.TALL;
                }).sort((a, b) => a.start - b.start);

                const spans: { start: number; end: number }[] = [];
                let curr = 0;
                occupied.forEach(o => {
                  if (o.start > curr + 50) spans.push({ start: curr, end: o.start });
                  curr = Math.max(curr, o.end);
                });
                if (curr < wall.width - 50) spans.push({ start: curr, end: wall.width });
                
                if (spans.length === 0 && occupied.length === 0) spans.push({ start: 0, end: wall.width });

                const span = spans.find(s => targetX >= s.start && targetX <= s.end) || 
                             [...spans].sort((a, b) => {
                               const dA = Math.min(Math.abs(targetX - a.start), Math.abs(targetX - a.end));
                               const dB = Math.min(Math.abs(targetX - b.start), Math.abs(targetX - b.end));
                               return dA - dB;
                             })[0] || { start: 0, end: wall.width };

                const gapStart = span.start;
                const gapEnd = span.end;
                
                // Snap points
                const snapPoints = [gapStart, gapEnd - draggedCabinet.width];
                
                let snappedX = Math.round(targetX / 25) * 25;
                const closestSnap = snapPoints.reduce((prev, curr) => 
                  Math.abs(curr - targetX) < Math.abs(prev - targetX) ? curr : prev, snapPoints[0]
                );
                
                if (Math.abs(closestSnap - targetX) < snapThreshold) {
                  snappedX = closestSnap;
                }
                
                // Clamp to the identified gap
                let fl = Math.max(gapStart, snappedX);
                if (fl + 100 > gapEnd) {
                  fl = Math.max(gapStart, gapEnd - draggedCabinet.width);
                }
                
                // Adjust width to fit the gap
                const finalWidth = Math.min(draggedCabinet.width, gapEnd - fl);
                
                nearest = { wallIndex: idx, fromLeft: fl, width: finalWidth };
              }
            });
            
            if (nearest) setPreviewPos(nearest);
          }}
          onPointerUp={(e) => {
            if (draggedCabinet && previewPos) {
              const wall = layoutData.wallPositions[previewPos.wallIndex];
              onDropCabinet?.(wall.zone.id, previewPos.fromLeft, draggedCabinet, previewPos.width);
              setPreviewPos(null);
            }
          }}
        >
          <planeGeometry args={[100000, 100000]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      )}
    </>
  );
};

export const CabinetViewer: React.FC<Props> = ({ 
  project, 
  showHardware = true, 
  showEmptyWalls = false, 
  onWallClick, 
  onCabinetClick,
  activeWallId, 
  lightTheme = false,
  draggedCabinet,
  onDropCabinet,
  selectedCabinet,
  onCabinetSelect,
  onSettingsUpdate
}) => {
  const [viewMode, setViewMode] = useState<string>('isometric');
  const [showHW, setShowHW] = useState(showHardware);
  const [doorOpenAngle, setDoorOpenAngle] = useState(0);
  
  // Link forceGola to project settings for persistence
  const forceGola = project.settings.advancedTestingSettings?.enableGola ?? false;
  const setForceGola = (val: boolean) => {
    onSettingsUpdate?.({
      advancedTestingSettings: {
        ...project.settings.advancedTestingSettings,
        enableGola: val
      }
    });
  };

  const [isInitialLoading, setIsInitialLoading] = useState(true);
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

  const activeZones = showEmptyWalls 
    ? project.zones.filter(z => z.active)
    : project.zones.filter(z => z.active && z.cabinets.length > 0);
  const hasContent = activeZones.length > 0 && (showEmptyWalls || activeZones.some(z => z.cabinets.length > 0));

  useEffect(() => {
    if (hasContent && sceneBounds.size.width !== 3000) {
      const timer = setTimeout(() => setIsInitialLoading(false), 800); // Wait for scene to settle
      return () => clearTimeout(timer);
    }
  }, [hasContent, sceneBounds.size.width]);

  if (!hasContent) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${lightTheme ? 'from-slate-50 to-slate-100' : 'from-slate-800 to-slate-900'}`}>
        <div className="text-center">
          <div className={`${lightTheme ? 'text-amber-600' : 'text-amber-400'} text-lg font-bold mb-2`}>3D ISO View</div>
          <div className={`${lightTheme ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Add cabinets to see 3D preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative overflow-hidden ${lightTheme ? 'bg-gradient-to-br from-slate-100 to-slate-200' : ''}`}>
        {isInitialLoading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-amber-500 font-bold animate-pulse uppercase tracking-widest text-sm">Building 3D Scene...</div>
          </div>
        )}
        <>
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
            <div className={`${lightTheme ? 'bg-white/90 border-slate-200' : 'bg-slate-900/95 border-slate-700'} backdrop-blur-sm rounded-lg p-2 border shadow-lg`}>
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
                        : `${lightTheme ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const currentView = viewMode;
                    setViewMode(''); // Briefly clear
                    setTimeout(() => setViewMode(currentView), 10); // Re-trigger effect
                  }}
                  className={`p-1 text-xs font-bold rounded transition-all ${lightTheme ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  title="Fit View"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className={`flex items-center gap-2 text-xs ${lightTheme ? 'text-slate-600' : 'text-slate-300'} cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={showHW}
                    onChange={(e) => setShowHW(e.target.checked)}
                    className="w-3 h-3 rounded accent-amber-500"
                  />
                  Hardware
                </label>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className={`text-[10px] ${lightTheme ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase tracking-wider`}>
                      Doors Open
                    </label>
                    <span className="text-[10px] text-amber-500 font-mono">{doorOpenAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="1"
                    value={doorOpenAngle}
                    onChange={(e) => setDoorOpenAngle(parseInt(e.target.value))}
                    className={`w-full h-1.5 ${lightTheme ? 'bg-slate-200' : 'bg-slate-700'} rounded-lg appearance-none cursor-pointer accent-amber-500`}
                  />
                </div>

                <label className={`flex items-center justify-between gap-2 text-[10px] ${lightTheme ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-300'} font-bold uppercase tracking-wider cursor-pointer transition-colors`}>
                  <span>Global Gola Mode</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceGola}
                      onChange={(e) => setForceGola(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-7 h-4 ${lightTheme ? 'bg-slate-200' : 'bg-slate-700'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500`}></div>
                  </div>
                </label>
              </div>
            </div>
            
            {showHW && (
              <div className={`${lightTheme ? 'bg-white/90 border-slate-200' : 'bg-slate-900/95 border-slate-700'} backdrop-blur-sm rounded-lg p-2 border shadow-lg`}>
                <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1.5">
                  Legend
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className={`text-[10px] ${lightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Hinge</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-red-500" />
                    <span className={`text-[10px] ${lightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Cam-Lock</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-yellow-500" />
                    <span className={`text-[10px] ${lightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Confirmat</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`absolute bottom-2 left-2 z-10 ${lightTheme ? 'bg-white/80 border-slate-200' : 'bg-slate-900/80 border-slate-700'} backdrop-blur-sm rounded px-2 py-1 border`}>
            <div className={`${lightTheme ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>
              Left: Rotate | Right: Pan | Scroll: Zoom
            </div>
          </div>
        </>

      <Canvas
        shadows
        camera={{ fov: 50 }}
        style={{ background: lightTheme ? '#f3f4f6' : '#1e293b' }}
      >
        <PerspectiveCamera 
          makeDefault 
          fov={50}
          near={10}
          far={50000}
        />
        <Suspense fallback={<LoadingFallback />}>
          <Scene 
            project={project} 
            showHardware={showHW} 
            viewMode={viewMode}
            showEmptyWalls={showEmptyWalls}
            onSceneBounds={handleSceneBounds}
            onWallClick={onWallClick}
            onCabinetClick={onCabinetClick}
            activeWallId={activeWallId}
            lightTheme={lightTheme}
            doorOpenAngle={doorOpenAngle}
            forceGola={forceGola}
            draggedCabinet={draggedCabinet}
            onDropCabinet={onDropCabinet}
            selectedCabinet={selectedCabinet}
            onCabinetSelect={onCabinetSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
