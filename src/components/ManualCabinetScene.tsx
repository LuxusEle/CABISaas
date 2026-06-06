import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BaseCabinetTesting } from './BaseCabinetTesting';
import { TestingSettings } from './CabinetTestingUtils';

interface ManualCabinetSceneProps {
  settings: TestingSettings;
}

const SceneContent: React.FC<{ settings: TestingSettings }> = ({ settings }) => {
  const cx = settings.width / 2;
  const cy = settings.height / 2;
  const cz = settings.depth / 2;

  return (
    <group>
      <group position={[-cx, -cy, -cz]}>
        <BaseCabinetTesting settings={settings} />
      </group>
    </group>
  );
};

const ManualCabinetScene: React.FC<ManualCabinetSceneProps> = ({ settings }) => {
  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Canvas
        shadows
        camera={{ position: [1200, 800, 1200], fov: 40, near: 1, far: 8000 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[500, 800, 500]} intensity={0.8} />
        <directionalLight position={[-300, 200, -300]} intensity={0.3} />
        <SceneContent settings={settings} />
        <OrbitControls enablePan={false} enableZoom={true} minDistance={600} maxDistance={3000} />
      </Canvas>
    </div>
  );
};

export { ManualCabinetScene };
