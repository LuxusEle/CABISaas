import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { BaseCabinetTesting } from './BaseCabinetTesting';
import { TestingSettings, DEFAULT_SETTINGS } from './CabinetTestingUtils';
import * as THREE from 'three';

const cabinetSettings: TestingSettings = {
  ...DEFAULT_SETTINGS,
  showDifferentPanelColors: true,
};

// BaseCabinetTesting positions its root group at [width/2, toeKickHeight + innerHeight/2, depth/2]
// = [450, 410, 280]. We offset to center at origin and scale to fit the viewport.
const CABINET_CENTER_X = cabinetSettings.width / 2;
const CABINET_CENTER_Y = cabinetSettings.height / 2;
const CABINET_CENTER_Z = cabinetSettings.depth / 2;
const SCALE = 1.5;

const CameraLookAt: React.FC = () => {
  useFrame(({ camera }) => {
    camera.lookAt(0, 0, 0);
  });
  return null;
};

interface SceneContentProps {
  separationProgress: number;
  skeletonView: boolean;
}

const SceneContent: React.FC<SceneContentProps> = ({ separationProgress, skeletonView }) => {
  const groupRef = useRef<THREE.Group>(null);
  const settings: TestingSettings = useMemo(() => ({
    ...cabinetSettings,
    skeletonView,
  }), [skeletonView]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={SCALE}>
      <group position={[-CABINET_CENTER_X, -CABINET_CENTER_Y, -CABINET_CENTER_Z]}>
        <BaseCabinetTesting settings={settings} separationProgress={separationProgress} />
      </group>
    </group>
  );
};

const LandingCabinetScene: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const container = document.querySelector('.overflow-y-auto');
    const el = sectionRef.current;
    if (!container || !el) return;

    let lastUpdate = 0;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = (container as HTMLElement).clientHeight;
      // Progress goes 0→1 as section top moves from bottom of viewport to top of viewport
      const scrolled = vh - rect.top;
      const p = Math.max(0, Math.min(1, scrolled / vh));
      progressRef.current = p;

      const now = performance.now();
      if (now - lastUpdate > 50) {
        lastUpdate = now;
        setProgress(p);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const separationProgress = 1 - progress;

  return (
    <div ref={sectionRef} className="cabinet-3d-section">
      <div className="container">
        <div className="section-heading reveal">
          <h2>Look Inside <span className="gradient-text">Every Cabinet</span></h2>
          <p>Scroll to see every part — from carcass panels to doors and shelves. Each component is precision-engineered and ready for your workshop.</p>
        </div>
          <div
            className="cabinet-canvas-scene"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onTouchStart={() => setHovered(true)}
            onTouchEnd={() => setHovered(false)}
          >
            <Canvas
              shadows
              camera={{ position: [1550, 1050, 1550], fov: 42, near: 1, far: 8000 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <CameraLookAt />
              <ambientLight intensity={0.6} />
              <directionalLight position={[500, 800, 500]} intensity={0.8} />
              <directionalLight position={[-300, 200, -300]} intensity={0.3} />
              <SceneContent separationProgress={separationProgress} skeletonView={hovered} />
            </Canvas>
          </div>
      </div>
    </div>
  );
};

export { LandingCabinetScene };
