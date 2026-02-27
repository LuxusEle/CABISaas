import React from 'react';
import { Obstacle } from '../../types';

interface Props {
  position: [number, number, number];
  width: number;
  height: number;
  rotation: number;
  obstacles?: Obstacle[];
  wallIndex?: number;
}

export const Wall: React.FC<Props> = ({ position, width, height, rotation, obstacles = [], wallIndex = 0 }) => {
  const wallThickness = 100;
  const wallDepth = wallThickness;

  const openings = obstacles.filter(o => o.type === 'window' || o.type === 'door');
  const protrudingObstacles = obstacles.filter(o => o.type === 'column' || o.type === 'pipe');
  const sortedOpenings = [...openings].sort((a, b) => a.fromLeft - b.fromLeft);
  const sortedProtruding = [...protrudingObstacles].sort((a, b) => a.fromLeft - b.fromLeft);

  const renderWallSegments = () => {
    const segments: React.ReactNode[] = [];
    let currentX = 0;
    
    if (sortedOpenings.length === 0) {
      segments.push(
        <mesh key="full-wall" position={[width / 2, height / 2, -wallDepth / 2]} receiveShadow>
          <boxGeometry args={[width, height, wallDepth]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} transparent opacity={0.5} />
        </mesh>
      );
      return segments;
    }

    sortedOpenings.forEach((opening, index) => {
      const openingWidth = opening.width;
      const openingHeight = opening.height || (opening.type === 'window' ? 1200 : 2100);
      
      let openingY: number;
      if (opening.type === 'window' && opening.sillHeight !== undefined) {
        openingY = opening.sillHeight + openingHeight / 2;
      } else if (opening.elevation !== undefined) {
        openingY = opening.elevation + openingHeight / 2;
      } else {
        openingY = openingHeight / 2;
      }

      if (opening.fromLeft > currentX) {
        const segWidth = opening.fromLeft - currentX;
        segments.push(
          <mesh key={`seg-before-${index}`} position={[currentX + segWidth / 2, height / 2, -wallDepth / 2]} receiveShadow>
            <boxGeometry args={[segWidth, height, wallDepth]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} transparent opacity={0.5} />
          </mesh>
        );
      }

      if (openingY + openingHeight / 2 < height) {
        const aboveHeight = height - (openingY + openingHeight / 2);
        segments.push(
          <mesh key={`seg-above-${index}`} position={[opening.fromLeft + openingWidth / 2, openingY + openingHeight / 2 + aboveHeight / 2, -wallDepth / 2]} receiveShadow>
            <boxGeometry args={[openingWidth, aboveHeight, wallDepth]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} transparent opacity={0.5} />
          </mesh>
        );
      }

      if (openingY - openingHeight / 2 > 0) {
        const belowHeight = openingY - openingHeight / 2;
        segments.push(
          <mesh key={`seg-below-${index}`} position={[opening.fromLeft + openingWidth / 2, belowHeight / 2, -wallDepth / 2]} receiveShadow>
            <boxGeometry args={[openingWidth, belowHeight, wallDepth]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} transparent opacity={0.5} />
          </mesh>
        );
      }

      currentX = opening.fromLeft + openingWidth;
    });

    if (currentX < width) {
      const segWidth = width - currentX;
      segments.push(
        <mesh key="seg-after" position={[currentX + segWidth / 2, height / 2, -wallDepth / 2]} receiveShadow>
          <boxGeometry args={[segWidth, height, wallDepth]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} transparent opacity={0.5} />
        </mesh>
      );
    }

    return segments;
  };

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {renderWallSegments()}
      
      {sortedOpenings.map((opening, index) => {
        const openingWidth = opening.width;
        const openingHeight = opening.height || (opening.type === 'window' ? 1200 : 2100);
        
        let openingY: number;
        if (opening.type === 'window' && opening.sillHeight !== undefined) {
          openingY = opening.sillHeight + openingHeight / 2;
        } else if (opening.elevation !== undefined) {
          openingY = opening.elevation + openingHeight / 2;
        } else {
          openingY = openingHeight / 2;
        }

        if (opening.type === 'window') {
          return (
            <group key={`opening-${index}`}>
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth + 8, openingHeight + 8, wallDepth + 4]} />
                <meshStandardMaterial color="#374151" roughness={0.8} />
              </mesh>
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 4, openingHeight - 4, wallDepth - 4]} />
                <meshStandardMaterial 
                  color="#93c5fd" 
                  transparent 
                  opacity={0.4} 
                  roughness={0.1}
                  metalness={0.0}
                />
              </mesh>
            </group>
          );
        }

        if (opening.type === 'door') {
          return (
            <group key={`opening-${index}`}>
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth + 8, openingHeight + 8, wallDepth + 4]} />
                <meshStandardMaterial color="#374151" roughness={0.8} />
              </mesh>
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 4, openingHeight - 4, wallDepth - 4]} />
                <meshStandardMaterial color="#1f2937" roughness={0.9} />
              </mesh>
            </group>
          );
        }

        return null;
      })}
      
      <mesh position={[width / 2, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} transparent opacity={0.2} side={2} />
      </mesh>

      {sortedProtruding.map((obstacle, index) => {
        const obsWidth = obstacle.width || 100;
        const obsHeight = obstacle.height || 2400;
        const obsDepth = obstacle.depth || 150;
        
        const elevation = obstacle.elevation || 0;
        
        const obsY = elevation + obsHeight / 2;
        
        return (
          <mesh 
            key={`protruding-${index}`} 
            position={[obstacle.fromLeft + obsWidth / 2, obsY, obsDepth / 2]}
          >
            <boxGeometry args={[obsWidth, obsHeight, obsDepth]} />
            <meshStandardMaterial 
              color={obstacle.type === 'column' ? '#6b7280' : '#78716c'} 
              roughness={0.7} 
            />
          </mesh>
        );
      })}
    </group>
  );
};
