import React from 'react';
import { CabinetUnit, PresetType, CabinetType } from '../../types';
import { getHingeYPositions, getCamLockPositions, HINGE_SPECS } from '../../services/hardware';

interface Props {
  unit: CabinetUnit;
  width: number;
  depth: number;
  height: number;
  zBase: number;
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

const getNumHingesPerDoor = (doorHeight: number): number => {
  if (doorHeight > 1800) return 4;
  if (doorHeight > 1200) return 3;
  return 2;
};

export const HardwareMarkers: React.FC<Props> = ({ unit, width, depth, height, zBase }) => {
  const numDoors = getNumDoors(unit);
  
  if (numDoors === 0) return null;

  const markers: React.ReactNode[] = [];
  
  const doorHeight = height - 4;
  const numHingesPerDoor = getNumHingesPerDoor(doorHeight);
  const hingePositions = getHingeYPositions(doorHeight, numHingesPerDoor);
  const cupOffset = HINGE_SPECS.door.cup.edgeOffset(4);
  
  const doorFrontZ = depth;
  
  const sidePanelThickness = 18;

  // Hinge cups on left and right sides of doors
  hingePositions.forEach((yRel, idx) => {
    const y = zBase + yRel;
    
    // Left side hinges (on door face, cup hole center)
    markers.push(
      <mesh key={`hinge-L-${idx}`} position={[cupOffset, y, doorFrontZ]}>
        <cylinderGeometry args={[17.5, 17.5, 12.5, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    );
    
    // Right side hinges
    markers.push(
      <mesh key={`hinge-R-${idx}`} position={[width - cupOffset, y, doorFrontZ]}>
        <cylinderGeometry args={[17.5, 17.5, 12.5, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    );
  });

  // Cam-locks on panel joints
  const camPositions = getCamLockPositions(height, 4);
  
  camPositions.forEach((yRel, idx) => {
    const y = zBase + yRel;
    
    // Left side cam-locks (on side panel inside face)
    markers.push(
      <mesh key={`cam-L-${idx}`} position={[sidePanelThickness + 34, y, depth / 2]}>
        <cylinderGeometry args={[7.5, 7.5, 12, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
    
    // Right side cam-locks (on side panel inside face)
    markers.push(
      <mesh key={`cam-R-${idx}`} position={[width - sidePanelThickness - 34, y, depth / 2]}>
        <cylinderGeometry args={[7.5, 7.5, 12, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
    
    // Top panel cam-locks
    markers.push(
      <mesh key={`cam-T-${idx}`} position={[width / 2, zBase + height - sidePanelThickness - 34, depth / 2]}>
        <cylinderGeometry args={[7.5, 7.5, 12, 12]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
    );
    
    // Bottom panel cam-locks
    markers.push(
      <mesh key={`cam-B-${idx}`} position={[width / 2, zBase + sidePanelThickness + 34, depth / 2]}>
        <cylinderGeometry args={[7.5, 7.5, 12, 12]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
    );
  });

  return <>{markers}</>;
};
