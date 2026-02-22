import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CabinetUnit, CabinetType, PresetType, Zone } from '../../types';
import { getActiveColor } from '../../services/cabinetColors';
import { HardwareMarkers } from './HardwareMarkers';

interface Props {
  unit: CabinetUnit;
  position: [number, number, number];
  rotation: number;
  showHardware: boolean;
}

const getNumDoors = (unit: CabinetUnit): number => {
  if (unit.customConfig?.num_doors !== undefined) {
    return unit.customConfig.num_doors;
  }
  switch (unit.preset) {
    case PresetType.BASE_DOOR:
    case PresetType.WALL_STD:
      return unit.width > 400 ? 2 : 1;
    case PresetType.TALL_OVEN:
    case PresetType.TALL_UTILITY:
      return 1;
    default:
      return 0;
  }
};

export const Cabinet: React.FC<Props> = ({ unit, position, rotation, showHardware }) => {
  const isWall = unit.type === CabinetType.WALL;
  const isTall = unit.type === CabinetType.TALL;

  const width = unit.width;
  const depth = isWall ? 320 : isTall ? 580 : 560;
  const height = isTall ? 2100 : isWall ? 720 : 720;
  const zBase = isWall ? 1400 : 0;

  const activeColor = getActiveColor(unit.preset);
  const baseColor = new THREE.Color(
    activeColor.rgb[0] / 255,
    activeColor.rgb[1] / 255,
    activeColor.rgb[2] / 255
  );

  const darkerColor = baseColor.clone().multiplyScalar(0.7);
  const darkerColor2 = baseColor.clone().multiplyScalar(0.5);

  const numDoors = getNumDoors(unit);
  const doorWidth = numDoors > 1 ? (width / numDoors) - 2 : width - 4;
  const doorHeight = height - 4;

  const materials = useMemo(() => ({
    top: new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.8 }),
    front: new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7 }),
    side: new THREE.MeshStandardMaterial({ color: darkerColor, roughness: 0.8 }),
    back: new THREE.MeshStandardMaterial({ color: darkerColor2, roughness: 0.9 }),
    door: new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.6 }),
  }), [baseColor, darkerColor, darkerColor2]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Cabinet body */}
      <group position={[width / 2, zBase + height / 2, depth / 2]}>
        {/* Top panel */}
        <mesh position={[0, height / 2 - 9, 0]} castShadow receiveShadow>
          <boxGeometry args={[width - 36, 18, depth - 36]} />
          <meshStandardMaterial color={baseColor} roughness={0.8} />
        </mesh>

        {/* Bottom panel */}
        <mesh position={[0, -height / 2 + 9, 0]} castShadow receiveShadow>
          <boxGeometry args={[width - 36, 18, depth - 36]} />
          <meshStandardMaterial color={baseColor} roughness={0.8} />
        </mesh>

        {/* Left side panel */}
        <mesh position={[-width / 2 + 9, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[18, height, depth]} />
          <meshStandardMaterial color={darkerColor} roughness={0.8} />
        </mesh>

        {/* Right side panel */}
        <mesh position={[width / 2 - 9, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[18, height, depth]} />
          <meshStandardMaterial color={darkerColor} roughness={0.8} />
        </mesh>

        {/* Back panel */}
        <mesh position={[0, 0, -depth / 2 + 4]} castShadow receiveShadow>
          <boxGeometry args={[width, height, 8]} />
          <meshStandardMaterial color={darkerColor2} roughness={0.9} />
        </mesh>

        {/* Doors */}
        {numDoors > 0 && Array.from({ length: numDoors }).map((_, i) => {
          const doorX = numDoors > 1 
            ? (i - (numDoors - 1) / 2) * (doorWidth + 2)
            : 0;
          
          return (
            <mesh
              key={`door-${i}`}
              position={[doorX, 0, depth / 2 - 3]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[doorWidth, doorHeight, 18]} />
              <meshStandardMaterial color={baseColor} roughness={0.6} />
            </mesh>
          );
        })}
      </group>

      {/* Hardware markers */}
      {showHardware && (
        <HardwareMarkers
          unit={unit}
          width={width}
          depth={depth}
          height={height}
          zBase={zBase}
        />
      )}

      {/* Label */}
      {unit.label && (
        <Html
          position={[width / 2, zBase + height + 50, depth / 2]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-amber-500/90 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
            {unit.label}
          </div>
        </Html>
      )}
    </group>
  );
};
