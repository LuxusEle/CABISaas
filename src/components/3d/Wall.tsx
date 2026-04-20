import React from 'react';
import { Obstacle } from '../../types';
import { Grid } from '@react-three/drei';

interface Props {
  position: [number, number, number];
  width: number;
  height: number;
  rotation: number;
  obstacles?: Obstacle[];
  wallIndex?: number;
  isActive?: boolean;
  onClick?: () => void;
  lightTheme?: boolean;
  showGrid?: boolean;
  onPointerMove?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onPointerUp?: (e: any) => void;
}

export const Wall: React.FC<Props> = ({ 
  position, width, height, rotation, 
  obstacles = [], wallIndex = 0, isActive = false, 
  onClick, lightTheme = false, showGrid = false,
  onPointerMove, onPointerOut, onPointerUp
}) => {
  const wallThickness = 50;
  const wallDepth = wallThickness;

  const activeColor = lightTheme ? '#cbd5e1' : '#94a3b8';
  const activeOpacity = lightTheme ? 0.8 : 0.3;

  const openings = obstacles.filter(o => o.type === 'window' || o.type === 'door');
  const protrudingObstacles = obstacles.filter(o => (o.type === 'column' || o.type === 'pipe') && !o.id.startsWith('corner_'));
  const sortedOpenings = [...openings].sort((a, b) => a.fromLeft - b.fromLeft);
  const sortedProtruding = [...protrudingObstacles].sort((a, b) => a.fromLeft - b.fromLeft);

  const renderWallSegments = () => {
    const segments: React.ReactNode[] = [];
    let currentX = 0;
    
    if (sortedOpenings.length === 0) {
      segments.push(
        <mesh 
          key="full-wall" 
          position={[width / 2, height / 2, -wallDepth / 2]} 
          receiveShadow
          onClick={onClick}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
          onPointerUp={onPointerUp}
        >
          <boxGeometry args={[width, height, wallDepth]} />
          <meshStandardMaterial color={activeColor} roughness={0.9} transparent opacity={activeOpacity} />
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
          <mesh 
            key={`seg-before-${index}`} 
            position={[currentX + segWidth / 2, height / 2, -wallDepth / 2]} 
            receiveShadow
            onClick={onClick}
            onPointerMove={onPointerMove}
            onPointerOut={onPointerOut}
            onPointerUp={onPointerUp}
          >
            <boxGeometry args={[segWidth, height, wallDepth]} />
            <meshStandardMaterial color={activeColor} roughness={0.9} transparent opacity={activeOpacity} />
          </mesh>
        );
      }

      if (openingY + openingHeight / 2 < height) {
        const aboveHeight = height - (openingY + openingHeight / 2);
        segments.push(
          <mesh 
            key={`seg-above-${index}`} 
            position={[opening.fromLeft + openingWidth / 2, openingY + openingHeight / 2 + aboveHeight / 2, -wallDepth / 2]} 
            receiveShadow
            onClick={onClick}
            onPointerMove={onPointerMove}
            onPointerOut={onPointerOut}
            onPointerUp={onPointerUp}
          >
            <boxGeometry args={[openingWidth, aboveHeight, wallDepth]} />
            <meshStandardMaterial color={activeColor} roughness={0.9} transparent opacity={activeOpacity} />
          </mesh>
        );
      }

      if (openingY - openingHeight / 2 > 0) {
        const belowHeight = openingY - openingHeight / 2;
        segments.push(
          <mesh 
            key={`seg-below-${index}`} 
            position={[opening.fromLeft + openingWidth / 2, belowHeight / 2, -wallDepth / 2]} 
            receiveShadow
            onClick={onClick}
            onPointerMove={onPointerMove}
            onPointerOut={onPointerOut}
            onPointerUp={onPointerUp}
          >
            <boxGeometry args={[openingWidth, belowHeight, wallDepth]} />
            <meshStandardMaterial color={activeColor} roughness={0.9} transparent opacity={activeOpacity} />
          </mesh>
        );
      }

      currentX = opening.fromLeft + openingWidth;
    });

    if (currentX < width) {
      const segWidth = width - currentX;
      segments.push(
        <mesh 
          key="seg-after" 
          position={[currentX + segWidth / 2, height / 2, -wallDepth / 2]} 
          receiveShadow
          onClick={onClick}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
          onPointerUp={onPointerUp}
        >
          <boxGeometry args={[segWidth, height, wallDepth]} />
          <meshStandardMaterial color={activeColor} roughness={0.9} transparent opacity={activeOpacity} />
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
                <meshStandardMaterial color={lightTheme ? '#64748b' : '#020617'} roughness={0.8} />
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
                <meshStandardMaterial color={lightTheme ? '#64748b' : '#020617'} roughness={0.8} />
              </mesh>
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 4, openingHeight - 4, wallDepth - 4]} />
                <meshStandardMaterial color={lightTheme ? '#cbd5e1' : '#0f172a'} roughness={0.9} />
              </mesh>
            </group>
          );
        }

        return null;
      })}
      
      {/* Base plane for grid/interaction */}
      <mesh 
        position={[width / 2, height / 2, 0]}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial 
          color={lightTheme ? '#f1f5f9' : '#e2e8f0'} 
          roughness={0.8} 
          transparent 
          opacity={showGrid ? 0.4 : (lightTheme ? 0.5 : 0.2)} 
          side={2} 
        />
      </mesh>

      {showGrid && (
        <group position={[width / 2, height / 2, 0.5]}>
          <Grid
            args={[width, height]}
            cellSize={100}
            cellThickness={1}
            cellColor={lightTheme ? '#94a3b8' : '#cbd5e1'}
            sectionSize={500}
            sectionThickness={1.5}
            sectionColor={lightTheme ? '#64748b' : '#ffffff'}
            fadeDistance={10000}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )}

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
              color={obstacle.type === 'column' 
                ? (lightTheme ? '#94a3b8' : '#0f172a') 
                : (lightTheme ? '#a8a29e' : '#1c1917')} 
              roughness={0.7} 
            />
          </mesh>
        );
      })}
    </group>
  );
};
