/// <reference types="@react-three/fiber" />
import React, { Suspense, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html, useProgress, PerspectiveCamera, Environment, ContactShadows, Line, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Video } from 'lucide-react';
import { Project, CabinetType, CabinetUnit, Zone, Obstacle, ProjectSettings } from '../../types';
import { Cabinet } from './Cabinet';
import { Wall } from './Wall';
// @ts-ignore
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

// Pre-warm assets to prevent "cold start" hangups on complex projects
useTexture.preload('/textures/wood.png');

interface Props {
  project: Project;
  showHardware?: boolean;
  showEmptyWalls?: boolean;
  onWallClick?: (wallId: string) => void;
  onCabinetClick?: (zoneId: string, cabinetIndex: number) => void;
  activeWallId?: string;
  lightTheme?: boolean;
  draggedCabinet?: CabinetUnit | null;
  onDropCabinet?: (zoneId: string, fromLeft: number, cabinet: CabinetUnit, targetWidth?: number) => void;
  selectedCabinet?: { zoneId: string, id: string } | null;
  onCabinetSelect?: (zoneId: string, index: number) => void;
  onSettingsUpdate?: (settings: Partial<ProjectSettings>) => void;
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
  doorOpenAngle?: number;
  onDoorOpenAngleChange?: (angle: number) => void;
  onShowHardwareChange?: (show: boolean) => void;
  opacity?: number;
  skeletonView?: boolean;
  isStudio?: boolean;
  isMobile?: boolean;
  swapSelection?: { zoneId: string, index: number }[];
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
  lightTheme,
  isRecording,
  isDragging
}: { 
  targetView: string; 
  sceneCenter: [number, number, number];
  sceneSize: { width: number; depth: number; height: number };
  lightTheme?: boolean;
  isRecording?: boolean;
  isDragging?: boolean;
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const prevViewRef = useRef<string>('');
  const lastProjectRef = useRef<string>('');
  const initialFitRef = useRef<boolean>(false);
  
  const maxDim = Math.max(sceneSize.width, sceneSize.depth, sceneSize.height);
  const distance = isRecording ? Math.max(maxDim * 0.65, 1800) : Math.max(maxDim * 0.85, 2500); 
  const centerY = sceneCenter[1];

  const viewPositions = useMemo(() => ({
    front: { 
      position: [sceneCenter[0], centerY, sceneCenter[2] + distance] as [number, number, number], 
      target: sceneCenter 
    },
    back: { 
      position: [sceneCenter[0], centerY, sceneCenter[2] - distance] as [number, number, number], 
      target: sceneCenter 
    },
    left: { 
      position: [sceneCenter[0] - distance, centerY, sceneCenter[2]] as [number, number, number], 
      target: sceneCenter 
    },
    right: { 
      position: [sceneCenter[0] + distance, centerY, sceneCenter[2]] as [number, number, number], 
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
    
    // Instead of resetting camera on every pixel of resize, only reset if center moves drastically (e.g. wall deleted)
    const lastCenter = lastProjectRef.current ? lastProjectRef.current.split(',').map(Number) : null;
    const isNewProject = !lastCenter || 
      Math.abs(lastCenter[0] - sceneCenter[0]) > 1000 || 
      Math.abs(lastCenter[2] - sceneCenter[2]) > 1000;
      
    const isDefaultScene = sceneSize.width === 3000 && sceneSize.depth === 1000;
    const isInvalidScene = sceneCenter[0] === 0 && sceneCenter[1] === 0 && sceneCenter[2] === 0;
    
    if (targetView && viewPositions[targetView as keyof typeof viewPositions]) {
      // Re-fit if view changed, OR if project changed drastically and it's not the default empty/invalid scene
      if (isNewView || (isNewProject && !isDefaultScene && !isInvalidScene)) {
        const performFit = () => {
          prevViewRef.current = targetView;
          lastProjectRef.current = `${sceneCenter[0]},${sceneCenter[1]},${sceneCenter[2]}`;
          
          const { position, target } = viewPositions[targetView as keyof typeof viewPositions];
          
          camera.position.set(...position);
          camera.lookAt(...target);
          if (controlsRef.current && typeof controlsRef.current.update === 'function') {
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
      enableRotate={!isRecording && !isDragging}
      enableZoom={!isRecording && !isDragging}
      enablePan={!isRecording && !isDragging}
      autoRotate={isRecording}
      autoRotateSpeed={isRecording ? 12.0 : 2.0}
    />
  );
};

export const Dimension3D = ({ 
  start, 
  end, 
  label, 
  color = "#64748b", 
  offset = 150, 
  isVertical = false 
}: { 
  start: [number, number, number], 
  end: [number, number, number], 
  label: string, 
  color?: string,
  offset?: number,
  isVertical?: boolean
}) => {
  const points = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    
    // Calculate offset direction
    let offDir = isVertical ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const lineStart = s.clone().add(offDir.clone().multiplyScalar(offset));
    const lineEnd = e.clone().add(offDir.clone().multiplyScalar(offset));
    
    return [lineStart, lineEnd];
  }, [start, end, offset, isVertical]);

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.8}
      />
      {/* Tick marks */}
      <mesh position={points[0]}>
        <boxGeometry args={[10, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={points[1]}>
        <boxGeometry args={[10, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5)} center>
        <div style={{
          padding: '2px 8px',
          background: 'rgba(255,255,255,0.95)',
          border: `1px solid ${color}`,
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'black',
          color: color,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          fontFamily: 'monospace'
        }}>
          {label}mm
        </div>
      </Html>
    </group>
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
  swapSelection,
  onCabinetSelect,
  opacity,
  skeletonView,
  isRecording,
  onRecordingComplete,
  onViewModeChange,
  isStudio,
  isMobile
}: { 
  project: Project; 
  showHardware?: boolean; 
  viewMode: string;
  showEmptyWalls?: boolean;
  onSceneBounds: (bounds: any) => void;
  onWallClick?: (id: string) => void;
  onCabinetClick?: (zoneId: string, index: number) => void;
  activeWallId?: string;
  lightTheme?: boolean;
  doorOpenAngle?: number;
  forceGola?: boolean;
  draggedCabinet?: CabinetUnit | null;
  onDropCabinet?: (zoneId: string, fromLeft: number, cabinet: CabinetUnit, targetWidth?: number) => void;
  selectedCabinet?: { zoneId: string, id: string } | null;
  swapSelection?: { zoneId: string, index: number }[];
  onCabinetSelect?: (zoneId: string, index: number) => void;
  opacity?: number;
  skeletonView?: boolean;
  isRecording?: boolean;
  onRecordingComplete: () => void;
  onViewModeChange: (mode: string) => void;
  isStudio?: boolean;
  isMobile?: boolean;
}) => {
  const [previewPos, setPreviewPos] = useState<{ wallIndex: number; fromLeft: number; width: number } | null>(null);
  const { raycaster, camera, scene, gl } = useThree();

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
        const cabDepth = unit.advancedSettings?.depth || (isWall ? (settings?.depthWall || 300) : isTall ? (settings?.depthTall || 560) : (settings?.depthBase || 560));
        
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

  // Refactored move handler that can be called by R3F events or global listener
  const updatePreview = useCallback((point: THREE.Vector3, targetWallIndex?: number) => {
    if (!draggedCabinet) return null;

    let bestMatch: { wallIndex: number, fromLeft: number, width: number } | null = null;

    if (targetWallIndex !== undefined) {
      // Direct wall hit logic
      const wall = layoutData.wallPositions[targetWallIndex];
      const wallMatrixInverse = new THREE.Matrix4().makeTranslation(...wall.position).multiply(new THREE.Matrix4().makeRotationY(wall.rotation)).invert();
      const localPoint = point.clone().applyMatrix4(wallMatrixInverse);
      
      const targetX = localPoint.x;
      
      const occupied = [
        ...layoutData.cabinetPositions.filter(cp => cp.wallIndex === targetWallIndex).map(cp => ({ start: cp.unit.fromLeft, end: cp.unit.fromLeft + cp.unit.width, type: cp.unit.type })),
        ...wall.zone.obstacles.map(obs => ({ start: obs.fromLeft, end: obs.fromLeft + obs.width, obstacle: obs }))
      ].filter(o => {
          if ((o as any).obstacle) {
            const obs = (o as any).obstacle;
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

      let fl = Math.max(span.start, Math.round(targetX / 25) * 25);
      if (fl + 100 > span.end) fl = Math.max(span.start, span.end - draggedCabinet.width);
      
      bestMatch = { wallIndex: targetWallIndex, fromLeft: fl, width: Math.min(draggedCabinet.width, span.end - fl) };
    } else {
      // Floor hit logic - find nearest wall
      let minDist = Infinity;
      layoutData.wallPositions.forEach((wall, idx) => {
        let dist = 0;
        switch(idx) {
          case 0: dist = Math.abs(point.z); break;
          case 1: dist = Math.abs(point.x - layoutData.wallPositions[0].width); break;
          case 2: dist = Math.abs(point.z - (layoutData.wallPositions[1]?.width || 0)); break;
          case 3: dist = Math.abs(point.x); break;
        }
        if (dist < minDist) {
          minDist = dist;
          // Recursively call with identified wall index
          const result = updatePreview(point, idx);
          if (result) bestMatch = result;
        }
      });
    }

    if (bestMatch) {
      setPreviewPos(bestMatch);
      return bestMatch;
    }
    return null;
  }, [draggedCabinet, layoutData]);

  const handleDrop = useCallback(() => {
    if (draggedCabinet && previewPos) {
      const wall = layoutData.wallPositions[previewPos.wallIndex];
      onDropCabinet?.(wall.zone.id, previewPos.fromLeft, draggedCabinet, previewPos.width);
    }
    setPreviewPos(null);
  }, [draggedCabinet, previewPos, layoutData, onDropCabinet]);

  // Global listeners for robust mobile dragging
  useEffect(() => {
    if (!draggedCabinet) return;

    const onGlobalMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const tempRaycaster = new THREE.Raycaster();
      tempRaycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      const intersects = tempRaycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        // Try to find a wall mesh or the floor
        const wallHit = intersects.find(i => {
           let curr: THREE.Object3D | null = i.object;
           while (curr) {
             if (curr.name?.startsWith('wall-group-')) return true;
             curr = curr.parent;
           }
           return false;
        });

        if (wallHit) {
          let wallIdx = -1;
          let curr: THREE.Object3D | null = wallHit.object;
          while (curr) {
            if (curr.name?.startsWith('wall-group-')) {
              wallIdx = parseInt(curr.name.split('-')[2]);
              break;
            }
            curr = curr.parent;
          }
          updatePreview(wallHit.point, wallIdx);
        } else {
          const floorHit = intersects.find(i => i.object.name === 'drag-floor');
          if (floorHit) updatePreview(floorHit.point);
        }
      }
    };

    const onGlobalUp = () => {
      handleDrop();
    };

    window.addEventListener('pointermove', onGlobalMove);
    window.addEventListener('pointerup', onGlobalUp);
    return () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
    };
  }, [draggedCabinet, previewPos, camera, scene, gl, updatePreview, handleDrop]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isRecording) {
      let isCancelled = false;
      try {
        // @ts-ignore
        const stream = gl.domElement.captureStream(30);
        
        // Some browsers need a specific mimeType for MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm';
          
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (isCancelled) return;
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'kitchen_showcase.webm';
          a.click();
          URL.revokeObjectURL(url);
          onRecordingComplete();
        };

        mediaRecorder.start();

        // Sequence: Top -> Active Walls -> Isometric
        const activeZones = project.zones.filter(z => z.active);
        const wallViewMap: Record<string, string> = {
          'Wall A': 'front',
          'Wall B': 'left',
          'Wall C': 'back',
          'Wall D': 'right'
        };
        const wallViews = activeZones.map(z => wallViewMap[z.id] || 'front');
        
        // Remove duplicates and combine
        const sequence = Array.from(new Set(['top', ...wallViews, 'isometric']));
        const phaseDuration = 1800; // ms
        
        sequence.forEach((view, index) => {
          setTimeout(() => {
            if (!isCancelled) onViewModeChange(view);
          }, index * phaseDuration);
        });

        const totalDuration = sequence.length * phaseDuration;

        const timerId = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, totalDuration + 500);

        return () => {
          isCancelled = true;
          clearTimeout(timerId);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        };
      } catch (err) {
        console.error('Failed to capture video', err);
        onRecordingComplete();
      }
    }
  }, [isRecording, gl, onRecordingComplete, onViewModeChange, project.zones]);

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
        isRecording={isRecording}
        isDragging={!!draggedCabinet}
      />
      
      <color attach="background" args={[isStudio ? '#1a1a1a' : (lightTheme ? '#f3f4f6' : '#2d3748')]} />
      
      <ambientLight intensity={isStudio ? 0.4 : 1.2} />
      {!isStudio && (
        <>
          {/* Symmetrical 4-Corner Lighting for perfectly even walls */}
          <directionalLight
            position={[sceneBounds.center[0] + 4000, 5000, sceneBounds.center[2] + 4000]}
            intensity={0.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight
            position={[sceneBounds.center[0] - 4000, 5000, sceneBounds.center[2] + 4000]}
            intensity={0.6}
          />
          <directionalLight
            position={[sceneBounds.center[0] + 4000, 5000, sceneBounds.center[2] - 4000]}
            intensity={0.6}
          />
          <directionalLight
            position={[sceneBounds.center[0] - 4000, 5000, sceneBounds.center[2] - 4000]}
            intensity={0.6}
          />
        </>
      )}
      
      <ContactShadows 
        position={[sceneBounds.center[0], -0.4, sceneBounds.center[2]]} 
        opacity={0.4} 
        scale={Math.max(sceneBounds.size.width, sceneBounds.size.depth) * 2} 
        blur={1.5} 
        far={4} 
        frames={1}
        resolution={512}
      />
      
      {!isStudio && (
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
      )}

      {isStudio && <StudioEnvironment center={sceneBounds.center} size={sceneBounds.size} />}


      {layoutData.wallPositions.map(({ zone, position, width, height, rotation }, index) => (
        <Wall
          key={`wall-${zone.id}`}
          name={`wall-group-${index}`}
          position={position}
          width={width}
          height={height}
          rotation={rotation}
          obstacles={zone.obstacles}
          wallIndex={index}
          isActive={activeWallId === zone.id}
          onClick={() => onWallClick?.(zone.id)}
          onPointerMove={(e) => {
            e.stopPropagation();
            updatePreview(e.point, index);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            handleDrop();
          }}
          lightTheme={lightTheme}
          showGrid={!!draggedCabinet}
          opacity={opacity}
          isStudio={isStudio}
        />
      ))}

      {previewPos && draggedCabinet && (
        <Cabinet
          unit={{ ...draggedCabinet, id: 'preview-ghost', width: previewPos.width, fromLeft: previewPos.fromLeft }}
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
          skeletonView={skeletonView}
          isStudio={isStudio}
        />
      )}

      {layoutData.cabinetPositions.map(({ unit, zone, position, rotation, wallIndex, cabinetIndex, label }) => {
        const isSelected = !isStudio && selectedCabinet?.zoneId === zone.id && selectedCabinet?.id === unit.id;
        const isSwapSelected = !isStudio && swapSelection?.some(s => s.zoneId === zone.id && s.index === cabinetIndex);
        
        return (
          <group key={unit.id} position={position} rotation={[0, rotation, 0]}>
            <Cabinet
              unit={unit}
              position={[0, 0, 0]}
              rotation={0}
              showHardware={showHardware}
              wallIndex={wallIndex}
              label={label}
              settings={project.settings}
              isSelected={isSelected}
              isHighlighted={isSwapSelected}
              skeletonView={skeletonView}
              onClick={isStudio ? undefined : () => {
                onCabinetSelect?.(zone.id, cabinetIndex);
              }}
              doorOpenAngle={doorOpenAngle}
              forceGola={forceGola}
              opacity={opacity}
              isStudio={isStudio}
              isMobile={isMobile}
            />
            {!isStudio && isSelected && !isMobile && (() => {
              const baseH = project.settings.baseHeight || 870;
              const ct = project.settings.counterThickness || 40;
              const wallElev = project.settings.wallCabinetElevation || 450;
              const wallH = project.settings.wallHeight || 720;
              const tallH = project.settings.tallHeight || 2100;
              
              const yBase = unit.type === CabinetType.WALL ? (baseH + ct + wallElev) : 0;
              const h = unit.type === CabinetType.TALL ? ((project.settings.tallHeight === 2100 || !project.settings.tallHeight) ? (baseH + ct + wallElev + wallH) : tallH) : unit.type === CabinetType.WALL ? wallH : baseH;
              const d = unit.depth || (unit.type === CabinetType.WALL ? 300 : 560);
              
              return (
                <>
                  {/* Width Dimension (Top Front) - AMBER */}
                  <Dimension3D 
                    start={[0, yBase + h, d]} 
                    end={[unit.width, yBase + h, d]} 
                    label={unit.width.toString()} 
                    offset={120}
                    color="#f59e0b"
                  />
                  {/* Height Dimension (Front Left) - RED */}
                  <Dimension3D 
                    start={[0, yBase, d]} 
                    end={[0, yBase + h, d]} 
                    label={h.toString()} 
                    offset={-50}
                    color="#ef4444"
                    isVertical
                  />
                  {/* Depth Dimension (Top Left Edge) - GREEN */}
                  <Dimension3D 
                    start={[0, yBase + h, 0]} 
                    end={[0, yBase + h, d]} 
                    label={d.toString()} 
                    offset={-50}
                    color="#10b981"
                  />
                </>
              );
            })()}
          </group>
        );
      })}

      {/* 3D Alignment Guides */}
      {selectedCabinet && !isStudio && (() => {
        const selCabPos = layoutData.cabinetPositions.find(
          cp => cp.zone.id === selectedCabinet.zoneId && cp.unit.id === selectedCabinet.id
        );
        if (!selCabPos) return null;
        
        const sameWallCabinets = layoutData.cabinetPositions.filter(cp => cp.wallIndex === selCabPos.wallIndex);
        
        const otherEdges = new Set(
          sameWallCabinets.flatMap(cp => cp.unit.id === selectedCabinet.id ? [] : [cp.unit.fromLeft, cp.unit.fromLeft + cp.unit.width])
        );
        
        const selEdges = [selCabPos.unit.fromLeft, selCabPos.unit.fromLeft + selCabPos.unit.width];
        const allUniqueEdges = Array.from(new Set([...otherEdges, ...selEdges]));
        
        const wall = layoutData.wallPositions[selCabPos.wallIndex];
        const wallMatrix = new THREE.Matrix4().makeTranslation(...wall.position).multiply(new THREE.Matrix4().makeRotationY(wall.rotation));
        
        return allUniqueEdges.map(localX => {
          const isSelectedEdge = selEdges.includes(localX);
          const isOtherEdge = otherEdges.has(localX);
          const isAligned = isSelectedEdge && isOtherEdge;
          
          const startPt = new THREE.Vector3(localX, 0, 1).applyMatrix4(wallMatrix);
          const endPt = new THREE.Vector3(localX, wall.height, 1).applyMatrix4(wallMatrix);
          
          return (
             <Line
                key={`guide3d-${localX}`}
                points={[startPt, endPt]}
                color={isAligned ? "#10b981" : isSelectedEdge ? "#3b82f6" : (lightTheme ? "#94a3b8" : "#475569")}
                lineWidth={isAligned ? 4 : isSelectedEdge ? 2 : 1}
                transparent
                opacity={isAligned ? 0.9 : isSelectedEdge ? 0.7 : 0.4}
                dashed={!isAligned && !isSelectedEdge}
                dashSize={50}
                gapSize={50}
             />
          );
        });
      })()}

      {/* Wall dimensions for the active wall */}
      {!isStudio && !isMobile && activeWallId && layoutData.wallPositions.map((wp, i) => {
        if (wp.zone.id !== activeWallId) return null;
        return (
          <group key={`wall-dim-${wp.zone.id}`} position={wp.position} rotation={[0, wp.rotation, 0]}>
            {/* Total Wall Length */}
            <Dimension3D 
              start={[0, wp.height, 20]} 
              end={[wp.width, wp.height, 20]} 
              label={wp.width.toString()} 
              offset={100}
            />
            {/* Wall Height */}
            <Dimension3D 
              start={[0, 0, 0]} 
              end={[0, wp.height, 0]} 
              label={wp.height.toString()} 
              offset={-100}
              isVertical
            />
          </group>
        );
      })}

      {/* Background plane to catch drag events in empty space */}
      {draggedCabinet && (
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.5, 0]} 
          onPointerMove={(e) => {
            e.stopPropagation();
            updatePreview(e.point);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            handleDrop();
          }}
          name="drag-floor"
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
  onSettingsUpdate,
  viewMode = 'isometric',
  onViewModeChange,
  doorOpenAngle = 0,
  onDoorOpenAngleChange,
  onShowHardwareChange,
  opacity,
  skeletonView,
  isStudio = false,
  isMobile: isMobileProp,
  swapSelection
}) => {
  const isMobile = useMemo(() => isMobileProp ?? (typeof window !== 'undefined' && window.innerWidth < 768), [isMobileProp]);
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

  const [isRecording, setIsRecording] = useState(false);
  
  const handleRecordingComplete = React.useCallback(() => {
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      // Clear geometry cache on unmount to reclaim memory
      import('../CabinetTestingUtils').then(m => m.clearGeometryCache());
    };
  }, []);

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

  // Block page refresh/close while recording
  useEffect(() => {
    if (!isRecording) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Recording is in progress. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

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
    <div className={`w-full h-full relative overflow-hidden touch-none ${lightTheme ? 'bg-gradient-to-br from-slate-100 to-slate-200' : ''}`}>
        {isInitialLoading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-amber-500 font-bold animate-pulse uppercase tracking-widest text-sm">Building 3D Scene...</div>
          </div>
        )}
        <>
          <div className={`absolute bottom-2 left-2 z-10 ${lightTheme ? 'bg-white/80 border-slate-200' : 'bg-slate-900/80 border-slate-700'} backdrop-blur-sm rounded px-2 py-1 border`}>
            <div className={`${lightTheme ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>
              Left: Rotate | Right: Pan | Scroll: Zoom
            </div>
          </div>
          {isStudio && (
            <button
              onClick={() => setIsRecording(true)}
              disabled={isRecording}
              className={`absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all shadow-lg backdrop-blur-md border ${
                isRecording 
                  ? 'bg-red-500/80 text-white border-red-500/50 cursor-not-allowed animate-pulse' 
                  : lightTheme 
                    ? 'bg-white/80 text-slate-800 border-slate-200/50 hover:bg-white' 
                    : 'bg-slate-800/80 text-white border-slate-700/50 hover:bg-slate-700'
              }`}
            >
              {isRecording ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Recording Showcase...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Record Showcase
                </>
              )}
            </button>
          )}
          {isRecording && (
            <div 
              className="fixed inset-0 z-[9999] cursor-wait touch-none" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
        </>

      <Canvas 
        shadows
        camera={{ position: [2000, 2000, 2000], fov: 45, near: 10, far: 50000 }}
        gl={{ 
          preserveDrawingBuffer: true,
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
          precision: "highp"
        }}
        style={{ 
          background: isStudio ? '#1a1a1a' : (lightTheme ? '#f3f4f6' : '#2d3748'), 
          cursor: draggedCabinet ? 'crosshair' : 'default',
          touchAction: 'none'
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene 
            project={project} 
            showHardware={showHardware} 
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
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
            swapSelection={swapSelection}
            onCabinetSelect={onCabinetSelect}
            opacity={opacity}
            skeletonView={skeletonView}
            isRecording={isRecording}
            onRecordingComplete={handleRecordingComplete}
            isStudio={isStudio}
            isMobile={isMobile}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

const StudioEnvironment = ({ center, size }: { center: [number, number, number], size: { width: number, depth: number } }) => {
  const floorW = Math.max(5000, size.width + 3000);
  const floorD = Math.max(5000, size.depth + 3000);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.5, center[2]]} receiveShadow>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* Uniform Hemispherical Fill */}
      <hemisphereLight args={['#ffffff', '#1a1a1a', 0.6]} />
      
      {/* Environment for reflections, 'city' is very diffuse and soft */}
      <Environment preset="city" />
    </group>
  );
};
