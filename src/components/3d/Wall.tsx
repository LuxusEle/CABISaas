import React from 'react';
import { useLoader } from '@react-three/fiber';
import { Obstacle } from '../../types';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

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
  opacity?: number;
  isStudio?: boolean;
}

export const Wall: React.FC<Props> = ({ 
  position, width, height, rotation, 
  obstacles = [], wallIndex = 0, isActive = false, 
  onClick, lightTheme = false, showGrid = false,
  onPointerMove, onPointerOut, onPointerUp,
  opacity = 1, isStudio = false
}) => {
  const rawPlasterTexture = isStudio ? useLoader(THREE.TextureLoader, '/textures/wall.png') : undefined;
  const rawWoodTexture = isStudio ? useLoader(THREE.TextureLoader, '/textures/wood_light.png') : undefined;

  const plasterTexture = React.useMemo(() => {
    if (rawPlasterTexture) {
      const tex = rawPlasterTexture.clone();
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(width / 1000, height / 1000);
      tex.needsUpdate = true;
      return tex;
    }
    return undefined;
  }, [rawPlasterTexture, width, height]);

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
      if (plasterTexture) plasterTexture.dispose();
      if (woodTexture) woodTexture.dispose();
    };
  }, [plasterTexture, woodTexture]);

  const wallThickness = 50;
  const wallDepth = wallThickness;

  const activeColor = lightTheme ? '#cbd5e1' : '#94a3b8';
  const activeOpacity = isStudio ? 1 : ((lightTheme ? 0.8 : 0.3) * opacity);

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
          <meshStandardMaterial color={isStudio ? '#555555' : activeColor} map={isStudio ? plasterTexture : undefined} roughness={isStudio ? 0.8 : 0.9} transparent opacity={activeOpacity} depthWrite={opacity < 1 ? false : true} />
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
            <meshStandardMaterial color={isStudio ? '#555555' : activeColor} map={isStudio ? plasterTexture : undefined} roughness={isStudio ? 0.8 : 0.9} transparent opacity={activeOpacity} depthWrite={opacity < 1 ? false : true} />
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
            <meshStandardMaterial color={isStudio ? '#555555' : activeColor} map={isStudio ? plasterTexture : undefined} roughness={isStudio ? 0.8 : 0.9} transparent opacity={activeOpacity} depthWrite={opacity < 1 ? false : true} />
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
            <meshStandardMaterial color={isStudio ? '#555555' : activeColor} map={isStudio ? plasterTexture : undefined} roughness={isStudio ? 0.8 : 0.9} transparent opacity={activeOpacity} depthWrite={opacity < 1 ? false : true} />
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
          <meshStandardMaterial color={isStudio ? '#555555' : activeColor} map={isStudio ? plasterTexture : undefined} roughness={isStudio ? 0.8 : 0.9} transparent opacity={activeOpacity} depthWrite={opacity < 1 ? false : true} />
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
              {/* Left frame */}
              <mesh position={[opening.fromLeft + 4, openingY, -wallDepth / 2]}>
                <boxGeometry args={[8, openingHeight + 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#ffffff' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.4 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>
              {/* Right frame */}
              <mesh position={[opening.fromLeft + openingWidth - 4, openingY, -wallDepth / 2]}>
                <boxGeometry args={[8, openingHeight + 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#ffffff' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.4 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>
              {/* Top frame */}
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY + openingHeight / 2, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 8, 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#ffffff' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.4 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>
              {/* Bottom frame */}
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY - openingHeight / 2, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 8, 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#ffffff' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.4 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>

              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 4, openingHeight - 4, wallDepth - 4]} />
                {isStudio ? (
                  <meshPhysicalMaterial 
                    color="#ffffff" 
                    transmission={1} 
                    opacity={1} 
                    transparent 
                    roughness={0.0} 
                    ior={1.52} 
                    thickness={wallDepth - 4} 
                    envMapIntensity={2} 
                    depthWrite={false}
                  />
                ) : (
                  <meshStandardMaterial 
                    color="#93c5fd" 
                    transparent 
                    opacity={0.4 * opacity} 
                    roughness={0.1}
                    metalness={0.0}
                    depthWrite={false}
                  />
                )}
              </mesh>
            </group>
          );
        }

        if (opening.type === 'door') {
          return (
            <group key={`opening-${index}`}>
              {/* Left Frame */}
              <mesh position={[opening.fromLeft + 4, openingY, -wallDepth / 2]}>
                <boxGeometry args={[8, openingHeight + 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#333333' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.5 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>
              {/* Right Frame */}
              <mesh position={[opening.fromLeft + openingWidth - 4, openingY, -wallDepth / 2]}>
                <boxGeometry args={[8, openingHeight + 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#333333' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.5 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>
              {/* Top Frame */}
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY + openingHeight / 2, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 8, 8, wallDepth + 4]} />
                <meshStandardMaterial color={isStudio ? '#333333' : (lightTheme ? '#64748b' : '#020617')} roughness={isStudio ? 0.5 : 0.8} transparent={opacity < 1} opacity={opacity} depthWrite={opacity < 1 ? false : true} />
              </mesh>

              {/* Door Panel */}
              <mesh position={[opening.fromLeft + openingWidth / 2, openingY, -wallDepth / 2]}>
                <boxGeometry args={[openingWidth - 4, openingHeight - 4, wallDepth - 4]} />
                <meshStandardMaterial 
                  color={isStudio ? '#ffffff' : (lightTheme ? '#cbd5e1' : '#0f172a')} 
                  map={isStudio ? woodTexture : undefined}
                  roughness={isStudio ? 0.5 : 0.9} 
                  metalness={isStudio ? 0.1 : 0}
                  transparent={opacity < 1}
                  opacity={opacity}
                  depthWrite={opacity < 1 ? false : true}
                />
              </mesh>

              {/* Door Handle */}
              {isStudio && (
                <group position={[opening.fromLeft + openingWidth - 80, openingHeight / 2 - 50, -wallDepth / 2]}>
                  {/* Front Handle */}
                  <group position={[0, 0, (wallDepth - 4) / 2]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[25, 25, 10, 32]} />
                      <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <mesh position={[-40, 0, 15]}>
                      <boxGeometry args={[100, 15, 8]} />
                      <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[10, 10, 20, 16]} />
                      <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
                    </mesh>
                  </group>
                  
                  {/* Back Handle */}
                  <group position={[0, 0, -(wallDepth - 4) / 2]} rotation={[0, Math.PI, 0]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[25, 25, 10, 32]} />
                      <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <mesh position={[-40, 0, 15]}>
                      <boxGeometry args={[100, 15, 8]} />
                      <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[10, 10, 20, 16]} />
                      <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
                    </mesh>
                  </group>
                </group>
              )}

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
          color={isStudio ? '#ffffff' : (lightTheme ? '#f1f5f9' : '#e2e8f0')} 
          roughness={0.8} 
          transparent 
          opacity={isStudio ? 0 : ((showGrid ? 0.4 : (lightTheme ? 0.5 : 0.2)) * opacity)} 
          side={2} 
          depthWrite={false}
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
              color={isStudio ? '#555555' : obstacle.type === 'column' 
                ? (lightTheme ? '#94a3b8' : '#0f172a') 
                : (lightTheme ? '#a8a29e' : '#1c1917')} map={isStudio ? plasterTexture : undefined} 
              roughness={isStudio ? 0.8 : 0.7} 
              transparent={opacity < 1}
              opacity={opacity}
              depthWrite={opacity < 1 ? false : true}
            />
          </mesh>
        );
      })}
    </group>
  );
};
