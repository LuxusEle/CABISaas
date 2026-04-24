import React from 'react';
import * as THREE from 'three';

interface RealisticSinkProps {
  width: number;
  depth: number;
  cabinetHeight: number;
  opacity?: number;
}

export const RealisticSink: React.FC<RealisticSinkProps> = ({ width, depth, cabinetHeight, opacity = 1 }) => {
  const plateWidth = width * 0.95;
  const plateDepth = depth * 0.9;
  const bowlWidth = Math.min(width * 0.5, 450);
  const bowlDepth = Math.min(depth * 0.7, 400);
  const bowlHeight = 180;
  const thickness = 2;
  
  // Position bowl to the left to leave space for drainer
  const bowlX = width > 600 ? -plateWidth * 0.2 : 0;
  
  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main Sink Top Plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry 
          args={[
            (() => {
              const shape = new THREE.Shape();
              shape.moveTo(-plateWidth/2, -plateDepth/2);
              shape.lineTo(plateWidth/2, -plateDepth/2);
              shape.lineTo(plateWidth/2, plateDepth/2);
              shape.lineTo(-plateWidth/2, plateDepth/2);
              shape.lineTo(-plateWidth/2, -plateDepth/2);
              
              const hole = new THREE.Path();
              hole.moveTo(bowlX - bowlWidth/2 + 5, -bowlDepth/2 + 5);
              hole.lineTo(bowlX + bowlWidth/2 - 5, -bowlDepth/2 + 5);
              hole.lineTo(bowlX + bowlWidth/2 - 5, bowlDepth/2 - 5);
              hole.lineTo(bowlX - bowlWidth/2 + 5, bowlDepth/2 - 5);
              hole.lineTo(bowlX - bowlWidth/2 + 5, -bowlDepth/2 + 5);
              shape.holes.push(hole);
              return shape;
            })(),
            { depth: thickness, bevelEnabled: true, bevelThickness: 2, bevelSize: 2 }
          ]} 
        />
        <meshStandardMaterial 
          color="#b1b1b1" 
          metalness={0.8} 
          roughness={0.4} 
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity < 1 ? false : true}
        />
      </mesh>

      {/* 2. Drainer Ribs (Decorative) */}
      {width > 600 && Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[plateWidth * 0.25, 1, -bowlDepth/3 + i * 25]} rotation={[-Math.PI/2, 0, 0]}>
          <capsuleGeometry args={[2, plateWidth * 0.3, 4, 8]} />
          <meshStandardMaterial 
            color="#c0c0c0" 
            metalness={0.8} 
            roughness={0.4} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
      ))}

      {/* 3. Hollow Bowl Basin */}
      <group position={[bowlX, -bowlHeight/2, 0]}>
        {/* Bottom */}
        <mesh position={[0, -bowlHeight/2 + thickness, 0]} receiveShadow>
          <boxGeometry args={[bowlWidth, thickness, bowlDepth]} />
          <meshStandardMaterial 
            color="#a0a0a0" 
            metalness={0.6} 
            roughness={0.5} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        {/* Walls */}
        <mesh position={[-bowlWidth/2 + thickness/2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[thickness, bowlHeight, bowlDepth]} />
          <meshStandardMaterial 
            color="#b0b0b0" 
            metalness={0.6} 
            roughness={0.5} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        <mesh position={[bowlWidth/2 - thickness/2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[thickness, bowlHeight, bowlDepth]} />
          <meshStandardMaterial 
            color="#b0b0b0" 
            metalness={0.6} 
            roughness={0.5} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        <mesh position={[0, 0, -bowlDepth/2 + thickness/2]} castShadow receiveShadow>
          <boxGeometry args={[bowlWidth, bowlHeight, thickness]} />
          <meshStandardMaterial 
            color="#b0b0b0" 
            metalness={0.6} 
            roughness={0.5} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        <mesh position={[0, 0, bowlDepth/2 - thickness/2]} castShadow receiveShadow>
          <boxGeometry args={[bowlWidth, bowlHeight, thickness]} />
          <meshStandardMaterial 
            color="#b0b0b0" 
            metalness={0.6} 
            roughness={0.5} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        {/* Drain Hole detail */}
        <mesh position={[0, -bowlHeight/2 + thickness + 0.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[25, 32]} />
          <meshStandardMaterial 
            color="#1e1e1e" 
            metalness={0.8} 
            roughness={0.1} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
      </group>

      {/* 4. Realistic Gooseneck Faucet */}
      <group position={[bowlX, 2, -bowlDepth/2 - 20]}>
        {/* Base */}
        <mesh position={[0, 10, 0]} castShadow>
          <cylinderGeometry args={[15, 18, 20, 32]} />
          <meshStandardMaterial 
            color="#d8d8d8" 
            metalness={0.8} 
            roughness={0.2} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        {/* Main Vertical Pipe */}
        <mesh position={[0, 100, 0]} castShadow>
          <cylinderGeometry args={[10, 10, 180, 32]} />
          <meshStandardMaterial 
            color="#d8d8d8" 
            metalness={0.8} 
            roughness={0.2} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        {/* The Curve (Gooseneck) */}
        <mesh position={[0, 190, 40]} rotation={[0, Math.PI/2, 0]} castShadow>
          <torusGeometry args={[40, 10, 16, 100, Math.PI]} />
          <meshStandardMaterial 
            color="#d8d8d8" 
            metalness={0.8} 
            roughness={0.2} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        {/* Spout End */}
        <mesh position={[0, 175, 80]} castShadow>
          <cylinderGeometry args={[10, 12, 30, 32]} />
          <meshStandardMaterial 
            color="#d8d8d8" 
            metalness={0.8} 
            roughness={0.2} 
            transparent={opacity < 1}
            opacity={opacity}
            depthWrite={opacity < 1 ? false : true}
          />
        </mesh>
        {/* Handle */}
        <mesh position={[20, 40, 0]} rotation={[0, 0, -Math.PI/4]} castShadow>
           <capsuleGeometry args={[5, 40, 4, 8]} />
           <meshStandardMaterial 
             color="#c0c0c0" 
             metalness={0.8} 
             roughness={0.2} 
             transparent={opacity < 1}
             opacity={opacity}
             depthWrite={opacity < 1 ? false : true}
           />
        </mesh>
      </group>
    </group>
  );
};
