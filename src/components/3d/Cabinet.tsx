import React, { useMemo } from 'react';
import { Html, Outlines, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { CabinetUnit, CabinetType, ProjectSettings, PresetType, Obstacle } from '../../types';
import { getCabinetTestingSettings, woodPalette } from '../CabinetTestingUtils';
import { BaseCabinetTesting } from '../BaseCabinetTesting';
import { BaseCornerCabinetTesting } from '../BaseCornerCabinetTesting';
import { WallCabinetTesting } from '../WallCabinetTesting';
import { WallCornerCabinetTesting } from '../WallCornerCabinetTesting';
import { TallCabinetTesting } from '../TallCabinetTesting';

import { RealisticHood } from './RealisticHood';

interface Props {
  unit: CabinetUnit;
  position: [number, number, number];
  rotation: number;
  showHardware?: boolean;
  wallIndex?: number;
  label?: string;
  settings?: ProjectSettings;
  showDimensionLabels?: boolean;
  onDimensionClick?: (dimension: string) => void;
  showCountertop?: boolean;
  previewMode?: boolean;
  editingDimension?: string | null;
  onClick?: () => void;
  doorOpenAngle?: number;
  forceGola?: boolean;
  opacity?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  skeletonView?: boolean;
  isStudio?: boolean;
  isMobile?: boolean;
  obstacles?: Obstacle[];
}

const DimensionLine: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  onClick?: () => void;
}> = ({ start, end, label, onClick }) => {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([...start, ...end])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
      <Html position={[midX, midY, midZ]} center>
        <div
          onClick={onClick}
          className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:bg-blue-500 -mt-6"
        >
          {label}
        </div>
      </Html>
    </group>
  );
};

const VisualHood: React.FC<{ width: number; depth: number; y: number; opacity?: number }> = ({ width, depth, y, opacity = 1 }) => {
  return (
    <group position={[width / 2, y - 60, depth / 2]}>
      {/* Main Angled Hood Body - Scaled down */}
      <mesh castShadow>
        <cylinderGeometry args={[width * 0.15, width * 0.35, 120, 4, 1, false]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {/* Base Filter Section */}
      <mesh position={[0, -60, 0]} castShadow>
        <boxGeometry args={[width * 0.95, 15, depth * 0.95]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </group>
  );
};

export const Cabinet = React.memo(({
  unit,
  position,
  rotation,
  label,
  settings,
  showDimensionLabels = false,
  onDimensionClick,
  showCountertop = false,
  previewMode = false,
  editingDimension = null,
  onClick,
  doorOpenAngle,
  forceGola,
  opacity = 1,
  isSelected = false,
  isHighlighted = false,
  skeletonView = false,
  isStudio = false,
  isMobile = false,
  obstacles = []
}: Props) => {
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  const isWall = unit.type === CabinetType.WALL;
  const isTall = unit.type === CabinetType.TALL;
  const isWallTop = unit.type === CabinetType.WALL_TOP;
  const isBase = !isWall && !isTall && !isWallTop;

  // Use effective dimensions (layout sizes)
  const width = unit.width;
  const depth = unit.depth || unit.advancedSettings?.depth || (isWall || isWallTop ? settings?.depthWall || 300 : isTall ? (settings?.depthTall || 560) : (settings?.depthBase || 560));
  const height = unit.height || unit.advancedSettings?.height || (isTall ? ((settings?.tallHeight === 2100 || !settings?.tallHeight) ? ((settings?.baseHeight || 870) + (settings?.counterThickness || 40) + (settings?.wallCabinetElevation || 450) + (settings?.wallHeight || 720)) : settings.tallHeight) : (isWall || isWallTop) ? (settings?.wallHeight || 720) : (settings?.baseHeight || 870));
  
  const baseHeight = settings?.baseHeight || 870;
  const counterThickness = settings?.counterThickness || 40;
  const wallElevation = settings?.wallCabinetElevation || 450;
  
  const wallTopSep = settings?.wallTopSeparatorThickness ?? (settings?.enableTopRow ? (settings?.doorMaterialThickness || 18) : 0);
  const wallTopSepDepth = (settings?.depthTall || 600) + (settings?.doorMaterialThickness || 18);
  const doorColor = new THREE.Color(isSelected ? '#2563eb' : woodPalette.door);

  let zBase = 0;
  if (isWall && !previewMode) {
    zBase = baseHeight + counterThickness + wallElevation + (unit.advancedSettings?.elevationOffset || 0);
  } else if (isWallTop && !previewMode) {
    zBase = baseHeight + counterThickness + wallElevation + (settings?.wallHeight || 720) + wallTopSep;
  }

  const isCooker = unit.preset === PresetType.COOKER_HOB || 
                   (unit.preset === PresetType.BASE_DRAWER_3 && width >= 600);

  // Standalone hood only for the dedicated hob appliance preset
  const showStandaloneHood = isBase && unit.preset === PresetType.COOKER_HOB && !previewMode;

  const carcassUrl = settings?.materialSettings?.textureUrls?.['carcass'] || '/textures/wood.png';
  const doorUrl = settings?.materialSettings?.textureUrls?.['door'] || carcassUrl;
  const shelfUrl = settings?.materialSettings?.textureUrls?.['shelf'] || carcassUrl;

  const rawCarcassTexture = isStudio ? useLoader(THREE.TextureLoader, carcassUrl) : undefined;
  const rawDoorTexture = isStudio ? useLoader(THREE.TextureLoader, doorUrl) : undefined;
  const rawShelfTexture = isStudio ? useLoader(THREE.TextureLoader, shelfUrl) : undefined;
  
  const carcassTexture = React.useMemo(() => {
    if (rawCarcassTexture) {
      const tex = rawCarcassTexture;
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/2500, 1/2500);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    }
    return undefined;
  }, [rawCarcassTexture]);

  const doorTexture = React.useMemo(() => {
    if (rawDoorTexture) {
      const tex = rawDoorTexture;
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/2500, 1/2500);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    }
    return undefined;
  }, [rawDoorTexture]);

  const shelfTexture = React.useMemo(() => {
    if (rawShelfTexture) {
      const tex = rawShelfTexture;
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/2500, 1/2500);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    }
    return undefined;
  }, [rawShelfTexture]);

  React.useEffect(() => {
    return () => {
      // Note: We no longer dispose here as these are shared textures managed by useLoader
    };
  }, [carcassTexture, doorTexture, shelfTexture]);

  // Merge legacy project settings and advanced testing settings
  const testingSettings = useMemo(() => {
    const s = {
      ...getCabinetTestingSettings(unit, settings || {} as ProjectSettings, width, height, depth),
      ...(unit.advancedSettings || {}),
      isSelected,
      isStudio,
      carcassTexture,
      doorTexture,
      shelfTexture
    };
    if (forceGola !== undefined) s.enableGola = forceGola;
    if (isWallTop) s.enableGola = false;
    if (opacity !== undefined) s.opacity = opacity;
    if (skeletonView !== undefined) s.skeletonView = skeletonView;
    if (doorOpenAngle !== undefined) {
      s.doorOpenAngle = doorOpenAngle;
      s.lowerDoorOpenAngle = doorOpenAngle;
    }
    return s;
  }, [unit, settings, width, height, depth, doorOpenAngle, forceGola, opacity, isSelected, skeletonView, isStudio, carcassTexture, doorTexture]);

  return (
    <group 
      name={`cabinet-group-${unit.id}`}
      position={position} 
      rotation={[0, rotation, 0]}
      onClick={!isStudio ? (e) => {
        e.stopPropagation();
        onClick?.();
      } : undefined}
      onPointerOver={!isStudio ? (e) => {
        e.stopPropagation();
        setHovered(true);
      } : undefined}
      onPointerOut={!isStudio ? () => setHovered(false) : undefined}
    >
      {isSelected && (
        <mesh position={[width / 2, zBase + height / 2, depth / 2]}>
          <boxGeometry args={[width + 6, height + 6, depth + 6]} />
          <meshStandardMaterial 
            color="#3b82f6" 
            transparent 
            opacity={0.15} 
            emissive="#3b82f6"
            emissiveIntensity={1.5}
            side={THREE.DoubleSide}
          />
          <Outlines 
            color="#3b82f6" 
            thickness={4}
            screenspace
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {isHighlighted && (
        <mesh position={[width / 2, zBase + height / 2, depth / 2]}>
          <boxGeometry args={[width + 10, height + 10, depth + 10]} />
          <meshStandardMaterial 
            color="#f59e0b" 
            transparent 
            opacity={0.25} 
            emissive="#f59e0b"
            emissiveIntensity={2}
            side={THREE.DoubleSide}
          />
          <Outlines 
            color="#f59e0b" 
            thickness={6}
            screenspace
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {/* 
          Testing models already center themselves internally at [width/2, height/2, depth/2].
          We just need to handle the vertical baseline (zBase) for wall cabinets.
      */}
      {isBase && (
        unit.preset === PresetType.BASE_CORNER ? (
          <BaseCornerCabinetTesting settings={testingSettings} />
        ) : (
          <BaseCabinetTesting settings={testingSettings} />
        )
      )}

      {/* Granite Countertop - Rendered on top of ALL base cabinets - Hidden in Advanced Mode */}
      {isBase && !previewMode && settings?.workflowMode !== 'advanced' && (
        <mesh position={[width / 2, height + counterThickness / 2, depth / 2 + 25]}>
          <boxGeometry args={[width, counterThickness, depth + 50]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.05} metalness={0.4} />
        </mesh>
      )}

      {isWall && (
        <group position={[0, zBase, 0]}>
          {unit.preset === PresetType.WALL_CORNER ? (
            <WallCornerCabinetTesting settings={testingSettings} />
          ) : (
            <WallCabinetTesting settings={testingSettings} />
          )}

          {/* Door material separator sheet on top of wall cabinet row */}
          {wallTopSep > 0 && (
            <mesh position={[width / 2, (height || settings?.wallHeight || 720) + wallTopSep / 2, wallTopSepDepth / 2]}>
              <boxGeometry args={[width, wallTopSep, wallTopSepDepth]} />
              <meshStandardMaterial
                color={isStudio && doorTexture ? '#ffffff' : doorColor}
                map={isStudio ? doorTexture : undefined}
                roughness={0.4}
                metalness={0}
                side={THREE.DoubleSide}
                transparent={testingSettings.opacity < 1}
                opacity={testingSettings.opacity}
                depthWrite={testingSettings.opacity < 1 ? false : true}
              />
            </mesh>
          )}

          {/* Dedicated Hood Component for wall units - Attached to bottom, no chimney */}
          {unit.preset === PresetType.HOOD_UNIT && !skeletonView && (
            <group position={[width / 2, -30, depth / 2]}>
              <RealisticHood width={width} depth={depth} opacity={opacity} showChimney={false} />
            </group>
          )}
          
          {/* LED Strip Lighting (Under-cabinet) */}
          {isStudio && (
            <group position={[width / 2, 0, depth / 2]}>
              <mesh position={[0, -2, -depth / 2 + 30]}>
                <boxGeometry args={[width - 20, 4, 15]} />
                <meshBasicMaterial color="#fffbeb" />
              </mesh>
              <rectAreaLight 
                position={[0, -2, -depth / 2 + 30]} 
                width={width - 20} 
                height={20} 
                intensity={50} 
                color="#fffbeb" 
                rotation={[-Math.PI / 2, 0, 0]}
              />
            </group>
          )}
        </group>
      )}

      {isWallTop && (
        <group position={[0, zBase, 0]}>
          {unit.preset === PresetType.WALL_CORNER ? (
            <WallCornerCabinetTesting settings={testingSettings} />
          ) : (
            <WallCabinetTesting settings={testingSettings} />
          )}
        </group>
      )}
      {isTall && (
        <group position={[0, 0, 0]}>
          <TallCabinetTesting settings={testingSettings} />

          {/* Door material separator sheet on top of tall cabinet row */}
          {wallTopSep > 0 && (
            <mesh position={[width / 2, height + wallTopSep / 2, wallTopSepDepth / 2]}>
              <boxGeometry args={[width, wallTopSep, wallTopSepDepth]} />
              <meshStandardMaterial
                color={isStudio && doorTexture ? '#ffffff' : doorColor}
                map={isStudio ? doorTexture : undefined}
                roughness={0.4}
                metalness={0}
                side={THREE.DoubleSide}
                transparent={testingSettings.opacity < 1}
                opacity={testingSettings.opacity}
                depthWrite={testingSettings.opacity < 1 ? false : true}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Countertop rendering (Legacy logic kept for global layout) - Hidden in Advanced Mode */}
      {showCountertop && isBase && settings?.workflowMode !== 'advanced' && (
        <group position={[width / 2, zBase + height, depth / 2]}>
          <mesh position={[0, counterThickness / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + 20, counterThickness, depth + 20]} />
            <meshStandardMaterial 
              color={isStudio ? "#f8fafc" : "#9ca3af"} 
              roughness={isStudio ? 0.05 : 0.3} 
              metalness={isStudio ? 0.1 : 0.1} 
              transparent={testingSettings.opacity < 1} 
              opacity={testingSettings.opacity}
              depthWrite={testingSettings.opacity < 1 ? false : true}
            />
          </mesh>
        </group>
      )}

      {showDimensionLabels && (
        <group>
          <DimensionLine
            start={[0, zBase, depth / 2 + 50]}
            end={[0, zBase + height, depth / 2 + 50]}
            label={`H: ${height}mm`}
            onClick={() => onDimensionClick?.('height')}
          />
          <DimensionLine
            start={[-50, zBase + height / 2, depth / 2]}
            end={[width + 50, zBase + height / 2, depth / 2]}
            label={`W: ${width}mm`}
            onClick={() => onDimensionClick?.('width')}
          />
          <DimensionLine
            start={[width / 2 + width, zBase + height / 2, -depth / 2 - 50]}
            end={[width / 2 + width, zBase + height / 2, depth / 2 + 50]}
            label={`D: ${depth}mm`}
            onClick={() => onDimensionClick?.('depth')}
          />
        </group>
      )}

      {!isStudio && isMobile && (
        <Text
          position={[width / 2, zBase + height / 2, depth + 50]}
          fontSize={Math.min(width / 5, 80)}
          color={isSelected ? "#60a5fa" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={2}
          outlineColor="#000000"
          fontWeight="900"
          material-toneMapped={false}
          renderOrder={100}
        >
          {label || unit.label || unit.preset.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Text>
      )}

      {!isStudio && !isMobile && (
        <Html position={[width / 2, zBase + height + 200, depth / 2]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div className={`transition-all duration-300 transform ${isSelected ? 'bg-blue-600 scale-125 ring-2 ring-white shadow-[0_0_20px_rgba(59,130,246,0.5)] px-3 py-1.5' : 'bg-slate-500/90 px-2 py-1'} text-white rounded text-xs font-bold`}>
            {label || unit.label || unit.preset.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
        </Html>
      )}
    </group>
  );
}, (prev, next) => {
  // Deep comparison for the unit object and other relevant props
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isHighlighted !== next.isHighlighted) return false;
  if (prev.onClick !== next.onClick) return false;
  if (prev.onDimensionClick !== next.onDimensionClick) return false;
  if (prev.doorOpenAngle !== next.doorOpenAngle) return false;
  if (prev.opacity !== next.opacity) return false;
  if (prev.skeletonView !== next.skeletonView) return false;
  if (prev.isStudio !== next.isStudio) return false;
  if (prev.isMobile !== next.isMobile) return false;
  if (prev.rotation !== next.rotation) return false;
  if (prev.label !== next.label) return false;
  if (prev.showHardware !== next.showHardware) return false;
  if (prev.forceGola !== next.forceGola) return false;
  if (prev.showDimensionLabels !== next.showDimensionLabels) return false;
  if (prev.position[0] !== next.position[0] || prev.position[1] !== next.position[1] || prev.position[2] !== next.position[2]) return false;
  
  // Compare unit properties that affect visual rendering
  const uP = prev.unit;
  const uN = next.unit;
  if (uP.id !== uN.id) return false;
  if (uP.width !== uN.width) return false;
  if (uP.height !== uN.height) return false;
  if (uP.depth !== uN.depth) return false;
  if (uP.preset !== uN.preset) return false;
  if (uP.fromLeft !== uN.fromLeft) return false;
  if (uP.label !== uN.label) return false;
  if (JSON.stringify(uP.advancedSettings) !== JSON.stringify(uN.advancedSettings)) return false;
  if (JSON.stringify(uP.materials) !== JSON.stringify(uN.materials)) return false;
  
  // Compare settings that affect cabinet appearance
  if (prev.settings?.thickness !== next.settings?.thickness) return false;
  if (prev.settings?.baseHeight !== next.settings?.baseHeight) return false;
  if (prev.settings?.wallHeight !== next.settings?.wallHeight) return false;
  if (prev.settings?.tallHeight !== next.settings?.tallHeight) return false;
  if (prev.settings?.counterThickness !== next.settings?.counterThickness) return false;
  if (prev.settings?.toeKickHeight !== next.settings?.toeKickHeight) return false;
  if (prev.settings?.wallCabinetElevation !== next.settings?.wallCabinetElevation) return false;
  
  return true;
});
