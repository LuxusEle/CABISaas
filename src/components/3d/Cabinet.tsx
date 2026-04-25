import React, { useMemo } from 'react';
import { Html, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { CabinetUnit, CabinetType, ProjectSettings } from '../../types';
import { getCabinetTestingSettings } from '../CabinetTestingUtils';
import { BaseCabinetTesting } from '../BaseCabinetTesting';
import { BaseCornerCabinetTesting } from '../BaseCornerCabinetTesting';
import { WallCabinetTesting } from '../WallCabinetTesting';
import { WallCornerCabinetTesting } from '../WallCornerCabinetTesting';
import { TallCabinetTesting } from '../TallCabinetTesting';
import { PresetType } from '../../types';

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
  skeletonView?: boolean;
  isStudio?: boolean;
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

export const Cabinet: React.FC<Props> = ({
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
  skeletonView = false,
  isStudio = false
}) => {
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  const isWall = unit.type === CabinetType.WALL;
  const isTall = unit.type === CabinetType.TALL;
  const isBase = !isWall && !isTall;

  // Use effective dimensions (layout sizes)
  const width = unit.width;
  const depth = unit.advancedSettings?.depth || (isWall ? (settings?.depthWall || 350) : isTall ? (settings?.depthTall || 560) : (settings?.depthBase || 560));
  const height = isTall ? ((settings?.tallHeight === 2100 || !settings?.tallHeight) ? ((settings?.baseHeight || 870) + (settings?.counterThickness || 40) + (settings?.wallCabinetElevation || 450) + (settings?.wallHeight || 720)) : settings.tallHeight) : isWall ? (settings?.wallHeight || 720) : (settings?.baseHeight || 870);
  
  const baseHeight = settings?.baseHeight || 870;
  const counterThickness = settings?.counterThickness || 40;
  const wallElevation = settings?.wallCabinetElevation || 450;
  
  let zBase = 0;
  if (isWall && !previewMode) {
    zBase = baseHeight + counterThickness + wallElevation;
  }

  const isCooker = unit.preset === PresetType.COOKER_HOB || (unit.preset === PresetType.BASE_DRAWER_3 && width >= 800);

  const rawWoodTexture = isStudio ? useLoader(THREE.TextureLoader, '/textures/wood_light.png') : undefined;
  
  const woodTexture = React.useMemo(() => {
    if (rawWoodTexture) {
      const tex = rawWoodTexture.clone();
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1/8000, 1/8000);
      tex.needsUpdate = true;
      return tex;
    }
    return undefined;
  }, [rawWoodTexture]);

  React.useEffect(() => {
    return () => {
      if (woodTexture) woodTexture.dispose();
    };
  }, [woodTexture]);

  // Merge legacy project settings and advanced testing settings
  const testingSettings = useMemo(() => {
    const s = getCabinetTestingSettings(unit, settings || {}, width, height, depth);
    if (forceGola !== undefined) s.enableGola = forceGola;
    if (opacity !== undefined) s.opacity = opacity;
    s.isSelected = isSelected;
    if (skeletonView !== undefined) s.skeletonView = skeletonView;
    if (isStudio !== undefined) s.isStudio = isStudio;
    if (doorOpenAngle !== undefined) {
      s.doorOpenAngle = doorOpenAngle;
      s.lowerDoorOpenAngle = doorOpenAngle;
    }
    if (woodTexture) {
      s.woodTexture = woodTexture;
    }
    return s;
  }, [unit, settings, width, height, depth, doorOpenAngle, forceGola, opacity, isSelected, skeletonView, isStudio, woodTexture]);

  return (
    <group 
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
      
      {/* Standalone Visual Hood for cookers - stays even if wall cabs are deleted */}
      {isBase && isCooker && !previewMode && (
        <VisualHood 
          width={width} 
          depth={depth} 
          y={baseHeight + counterThickness + wallElevation} 
          opacity={opacity}
        />
      )}

      {isWall && (
        <group position={[0, zBase, 0]}>
          {unit.preset === PresetType.WALL_CORNER ? (
            <WallCornerCabinetTesting settings={testingSettings} />
          ) : (
            <WallCabinetTesting settings={testingSettings} />
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
      {isTall && (
        <group position={[0, 0, 0]}>
          <TallCabinetTesting settings={testingSettings} />
        </group>
      )}

      {/* Countertop rendering (Legacy logic kept for global layout) */}
      {showCountertop && isBase && (
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

      {!isStudio && (
        <Html position={[width / 2, zBase + height + 50, depth / 2]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div className={`transition-all duration-300 transform ${isSelected ? 'bg-blue-600 scale-125 ring-2 ring-white shadow-[0_0_20px_rgba(59,130,246,0.5)] px-3 py-1.5' : 'bg-slate-500/90 px-2 py-1'} text-white rounded text-xs font-bold`}>
            {label || unit.label || unit.preset.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
        </Html>
      )}
    </group>
  );
};
