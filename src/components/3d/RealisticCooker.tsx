import React from 'react';

interface RealisticCookerProps {
  width: number;
  depth: number;
  opacity?: number;
}

export const RealisticCooker: React.FC<RealisticCookerProps> = ({ width, depth, opacity = 1 }) => {
  // Scale burners relative to width
  const burnerRadius = Math.min(width * 0.06, 45);
  
  return (
    <group>
      {/* Glass Top */}
      <mesh castShadow receiveShadow position={[0, 2, 0]}>
        <boxGeometry args={[width * 0.85, 10, depth * 0.8]} />
        <meshStandardMaterial 
          color="#0f172a" 
          roughness={0.05} 
          metalness={0.8} 
          transparent={opacity < 1} 
          opacity={opacity} 
        />
      </mesh>
      {/* Metallic Frame */}
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <boxGeometry args={[width * 0.87, 12, depth * 0.82]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Burners */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
         <mesh key={i} position={[sx * width * 0.22, 8, sz * depth * 0.22]} castShadow>
            <cylinderGeometry args={[burnerRadius * 0.9, burnerRadius, 10, 32]} />
            <meshStandardMaterial 
              color="#334155" 
              metalness={1} 
              transparent={opacity < 1} 
              opacity={opacity} 
            />
         </mesh>
      ))}
      {/* Central burner for wider units */}
      {width > 850 && (
         <mesh position={[0, 8, 0]} castShadow>
            <cylinderGeometry args={[burnerRadius * 1.1, burnerRadius * 1.2, 10, 32]} />
            <meshStandardMaterial color="#1e293b" metalness={1} />
         </mesh>
      )}
    </group>
  );
};
