import React from 'react';

interface Props {
  position: [number, number, number];
  width: number;
  height: number;
  rotation: number;
}

export const Wall: React.FC<Props> = ({ position, width, height, rotation }) => {
  const wallThickness = 100;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Wall panel */}
      <mesh position={[width / 2, height / 2, -wallThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} transparent opacity={0.3} />
      </mesh>
      
      {/* Wall edge highlight */}
      <mesh position={[width / 2, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} transparent opacity={0.2} side={2} />
      </mesh>
    </group>
  );
};
