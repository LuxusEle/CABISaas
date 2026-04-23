import React from 'react';
import * as THREE from 'three';
import { Obstacle, Zone } from '../../types';

interface Props {
  obstacles: Obstacle[];
  zone: Zone;
  wallIndex: number;
  wallAEnd: number;
  wallBEnd: number;
  wallCEnd: number;
  opacity?: number;
}

const getObstacleColor = (type: string): string => {
  switch (type) {
    case 'window': return '#60a5fa'; // blue-400
    case 'door': return '#f97316'; // orange-500
    case 'column': return '#6b7280'; // gray-500
    case 'pipe': return '#10b981'; // emerald-500
    default: return '#8b5cf6'; // purple-500
  }
};

const getObstaclePosition = (
  obstacle: Obstacle,
  wallIndex: number,
  wallAEnd: number,
  wallBEnd: number,
  wallCEnd: number
): [number, number, number] => {
  // For windows, use sillHeight if available, otherwise calculate from elevation
  // For other obstacles, use elevation or default positioning
  let y: number;
  
  if (obstacle.type === 'window' && obstacle.sillHeight !== undefined) {
    // Window: position based on sill height (bottom edge from floor)
    y = obstacle.sillHeight + (obstacle.height || 1200) / 2;
  } else if (obstacle.elevation !== undefined) {
    // Use elevation if provided (distance from floor)
    y = obstacle.elevation + (obstacle.height || 2100) / 2;
  } else {
    // Default positioning for doors and other obstacles
    y = (obstacle.height || 2100) / 2;
  }
  
  // Determine depth based on obstacle type
  const obstacleDepth = (obstacle.type === 'door' || obstacle.type === 'window') 
    ? 18 // Standard wall thickness for doors/windows (flush with wall)
    : (obstacle.depth || 150); // Use custom depth for columns/pipes
  
  switch (wallIndex) {
    case 0: // Wall A: XY plane, obstacles face +Z
      return [obstacle.fromLeft + obstacle.width / 2, y, obstacleDepth / 2];
    case 1: // Wall B: ZY plane, obstacles face -X
      return [wallAEnd + obstacleDepth / 2, y, obstacle.fromLeft + obstacle.width / 2];
    case 2: // Wall C: XY plane, obstacles face -Z
      return [wallAEnd - obstacle.fromLeft - obstacle.width / 2, y, wallBEnd + obstacleDepth / 2];
    case 3: // Wall D: ZY plane, obstacles face +X
      return [obstacleDepth / 2, y, wallCEnd - obstacle.fromLeft - obstacle.width / 2];
    default:
      return [obstacle.fromLeft + obstacle.width / 2, y, obstacleDepth / 2];
  }
};

export const Obstacles: React.FC<Props> = ({ obstacles, zone, wallIndex, wallAEnd, wallBEnd, wallCEnd, opacity = 1 }) => {
  if (!obstacles || obstacles.length === 0) return null;

  return (
    <>
      {obstacles.filter(o => !o.id.startsWith('corner_')).map((obstacle, index) => {
        const position = getObstaclePosition(obstacle, wallIndex, wallAEnd, wallBEnd, wallCEnd);
        const color = getObstacleColor(obstacle.type);
        const isTransparentWindow = obstacle.type === 'window';
        
        return (
          <group key={`obstacle-${zone.id}-${index}`}>
            {/* Main obstacle body */}
            <mesh position={position}>
              <boxGeometry args={[obstacle.width, obstacle.height || 2100, obstacle.depth]} />
              <meshStandardMaterial 
                color={color} 
                transparent={isTransparentWindow || opacity < 1}
                opacity={(isTransparentWindow ? 0.7 : 1.0) * opacity}
                roughness={0.3}
                metalness={0.1}
                depthWrite={opacity < 1 ? false : true}
              />
            </mesh>
            
            {/* Frame/outline for windows and doors */}
            {(obstacle.type === 'window' || obstacle.type === 'door') && (
              <mesh position={position}>
                <boxGeometry args={[obstacle.width + 4, (obstacle.height || 2100) + 4, 18 + 4]} />
                <meshStandardMaterial 
                  color="#1f2937" 
                  transparent={true}
                  opacity={0.8 * opacity}
                  roughness={0.8}
                  depthWrite={opacity < 1 ? false : true}
                />
              </mesh>
            )}
            
            {/* Window glass effect */}
            {obstacle.type === 'window' && (
              <mesh position={position}>
                <boxGeometry args={[obstacle.width - 4, (obstacle.height || 2100) - 4, obstacle.depth - 2]} />
                <meshStandardMaterial 
                  color="#dbeafe" 
                  transparent={true}
                  opacity={0.3 * opacity}
                  roughness={0.1}
                  metalness={0.0}
                  depthWrite={opacity < 1 ? false : true}
                />
              </mesh>
            )}
            
            {/* Column reinforcement */}
            {obstacle.type === 'column' && (
              <mesh position={[position[0], position[1] - (obstacle.height || 2100) / 2 + 50, position[2]]}>
                <cylinderGeometry args={[20, 20, 100, 8]} />
                <meshStandardMaterial 
                  color="#374151" 
                  roughness={0.9} 
                  transparent={opacity < 1}
                  opacity={opacity}
                  depthWrite={opacity < 1 ? false : true}
                />
              </mesh>
            )}
            
            {/* Pipe visualization */}
            {obstacle.type === 'pipe' && (
              <mesh position={position}>
                <cylinderGeometry args={[obstacle.width / 2, obstacle.width / 2, obstacle.height || 2100, 16]} />
                <meshStandardMaterial 
                  color={color} 
                  roughness={0.2} 
                  metalness={0.8} 
                  transparent={opacity < 1}
                  opacity={opacity}
                  depthWrite={opacity < 1 ? false : true}
                />
              </mesh>
            )}
            
            {/* Label */}
            <mesh position={[position[0], position[1] + (obstacle.height || 2100) / 2 + 20, position[2]]}>
              <planeGeometry args={[60, 15]} />
              <meshStandardMaterial 
                color="#fbbf24" 
                transparent={true}
                opacity={0.9 * opacity}
                side={THREE.DoubleSide}
                depthWrite={opacity < 1 ? false : true}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
};