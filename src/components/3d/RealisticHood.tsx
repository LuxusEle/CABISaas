import React from 'react';

interface RealisticHoodProps {
  width: number;
  depth: number;
  opacity?: number;
  showChimney?: boolean;
}

export const RealisticHood: React.FC<RealisticHoodProps> = ({ width, depth, opacity = 1, showChimney = true }) => {
  return (
    <group>
      {/* Chimney Section */}
      {showChimney && (
        <mesh position={[0, 60, -depth * 0.1]} castShadow>
          <boxGeometry args={[width * 0.4, 180, depth * 0.5]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} transparent={opacity < 1} opacity={opacity} />
        </mesh>
      )}
      
      {/* Main Angled Hood Body */}
      <mesh position={[0, -30, 0]} castShadow>
        <cylinderGeometry args={[width * 0.4, width * 0.5, 100, 4, 1, false, Math.PI / 4]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      
      {/* Base Filter Section */}
      <mesh position={[0, -85, 0]} castShadow>
        <boxGeometry args={[width * 0.98, 15, depth * 0.98]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      
      {/* Lights under hood */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.3, -90, depth * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[10, 16]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
      ))}
    </group>
  );
};
