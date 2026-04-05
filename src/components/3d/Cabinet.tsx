import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CabinetUnit, CabinetType, ProjectSettings } from '../../types';
import { getCabinetTestingSettings } from '../CabinetTestingUtils';
import { BaseCabinetTesting } from '../BaseCabinetTesting';
import { WallCabinetTesting } from '../WallCabinetTesting';
import { TallCabinetTesting } from '../TallCabinetTesting';

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
  onClick
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
  const height = isTall ? (settings?.tallHeight || 2100) : isWall ? (settings?.wallHeight || 720) : (settings?.baseHeight || 870);
  
  const baseHeight = settings?.baseHeight || 870;
  const counterThickness = settings?.counterThickness || 40;
  const wallElevation = settings?.wallCabinetElevation || 450;
  const toeKickHeight = settings?.toeKickHeight || 100;
  
  let zBase = 0;
  if (isWall && !previewMode) {
    zBase = baseHeight + counterThickness + wallElevation;
  }

  // Merge legacy project settings and advanced testing settings
  const testingSettings = useMemo(() => {
    return getCabinetTestingSettings(unit, settings || {}, width, height, depth);
  }, [unit, settings, width, height, depth]);

  return (
    <group 
      position={position} 
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* 
          Testing models already center themselves internally at [width/2, height/2, depth/2].
          We just need to handle the vertical baseline (zBase) for wall cabinets.
      */}
      {isBase && (
        <BaseCabinetTesting settings={testingSettings} />
      )}
      {isWall && (
        <group position={[0, zBase, 0]}>
          <WallCabinetTesting settings={testingSettings} />
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
            <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.1} />
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

      {label && (
        <Html position={[width / 2, zBase + height + 50, depth / 2]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div className="bg-amber-500/90 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};
