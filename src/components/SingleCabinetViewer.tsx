import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useProgress, PerspectiveCamera } from '@react-three/drei';
import { CabinetType, PresetType, ProjectSettings, CabinetUnit } from '../types';
import { Cabinet } from './3d/Cabinet';
import { v4 as uuid } from 'uuid';

interface SingleCabinetViewerProps {
  cabinetType: 'base' | 'wall' | 'tall';
  preset: PresetType;
  settings: ProjectSettings;
  onDimensionClick?: (dimension: string) => void;
  showDimensionLabels?: boolean;
  editingDimension?: string | null;
  lightTheme?: boolean;
}

const LoadingFallback = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-slate-600 font-bold text-lg">{progress.toFixed(0)}% loading...</div>
    </Html>
  );
};

const SceneContent: React.FC<{
  cabinetType: 'base' | 'wall' | 'tall';
  preset: PresetType;
  settings: ProjectSettings;
  showDimensionLabels: boolean;
  onDimensionClick?: (dimension: string) => void;
  editingDimension?: string | null;
  lightTheme: boolean;
}> = ({ cabinetType, preset, settings, showDimensionLabels, onDimensionClick, editingDimension, lightTheme }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);

  const unit: CabinetUnit = {
    id: uuid(),
    type: cabinetType === 'base' ? CabinetType.BASE : cabinetType === 'wall' ? CabinetType.WALL : CabinetType.TALL,
    preset: preset,
    width: cabinetType === 'tall' ? (settings.widthTall || 450) : (cabinetType === 'wall' ? (settings.widthWall || 600) : (settings.widthBase || 600)),
    qty: 1,
    fromLeft: 0,
    label: '',
    isAutoFilled: false,
    materials: {}
  };

  const showCountertop = cabinetType === 'base';
  const showToeKick = cabinetType === 'base';

  // For preview, we use actual depth/height but position from 0
  const depth = cabinetType === 'base' ? settings.depthBase || 560 : 
                cabinetType === 'wall' ? settings.depthWall || 350 : 
                settings.depthTall || 600;
  const height = cabinetType === 'tall' ? settings.tallHeight || 2100 : 
                cabinetType === 'wall' ? settings.wallHeight || 720 : 
                settings.baseHeight || 870;
  const toeKickHeight = settings.toeKickHeight || 100;
  const counterThickness = settings.counterThickness || 40;
  
  // For wall cabinet preview, don't use the elevation offset - just show cabinet at ground level
  const previewHeight = cabinetType === 'wall' ? height : 
                        cabinetType === 'base' ? height + counterThickness + toeKickHeight : 
                        height;
  
  const totalHeight = previewHeight;
  const maxDimension = Math.max(600, depth + 100, totalHeight + 100);

  useEffect(() => {
    camera.near = 1;
    camera.far = maxDimension * 10;
    camera.updateProjectionMatrix();
  }, [camera, maxDimension]);

  const cameraDistance = maxDimension * 2.5;
  const centerY = totalHeight / 2;

  const [animating, setAnimating] = useState(false);

  const getTargetPosition = (dimension: string | null | undefined) => {
    if (dimension === 'wallElevation') {
      return {
        x: cameraDistance * 0.2,
        y: centerY - cameraDistance * 0.2,
        z: cameraDistance * 2
      };
    }
    return {
      x: cameraDistance * 0.8,
      y: centerY + cameraDistance * 0.3,
      z: cameraDistance * 0.8
    };
  };

  const getTargetLookAt = (dimension: string | null | undefined) => {
    if (dimension === 'wallElevation') {
      return { x: 0, y: centerY - cameraDistance * 0.2, z: 0 };
    }
    return { x: 0, y: centerY, z: 0 };
  };

  const targetPosition = getTargetPosition(editingDimension);
  const targetLookAt = getTargetLookAt(editingDimension);

  useEffect(() => {
    camera.near = 1;
    camera.far = maxDimension * 10;
    camera.updateProjectionMatrix();
  }, [camera, maxDimension]);

  useEffect(() => {
    setAnimating(true);
    
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const startTarget = controlsRef.current ? {
      x: controlsRef.current.target.x,
      y: controlsRef.current.target.y,
      z: controlsRef.current.target.z
    } : targetLookAt;
    
    const duration = 500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.x = startPos.x + (targetPosition.x - startPos.x) * eased;
      camera.position.y = startPos.y + (targetPosition.y - startPos.y) * eased;
      camera.position.z = startPos.z + (targetPosition.z - startPos.z) * eased;

      if (controlsRef.current) {
        controlsRef.current.target.x = startTarget.x + (targetLookAt.x - startTarget.x) * eased;
        controlsRef.current.target.y = startTarget.y + (targetLookAt.y - startTarget.y) * eased;
        controlsRef.current.target.z = startTarget.z + (targetLookAt.z - startTarget.z) * eased;
        controlsRef.current.update();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [camera, cameraDistance, centerY, depth, height, totalHeight, editingDimension]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 15, -10]} intensity={0.5} />
      <pointLight position={[0, totalHeight + 200, 0]} intensity={0.3} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[maxDimension * 4, maxDimension * 4]} />
        <meshStandardMaterial color={lightTheme ? '#f1f5f9' : '#1e293b'} />
      </mesh>

      <Cabinet
        unit={unit}
        position={[0, 0, 0]}
        rotation={0}
        showHardware={false}
        settings={settings}
        showDimensionLabels={showDimensionLabels}
        onDimensionClick={onDimensionClick}
        showCountertop={showCountertop}
        previewMode={true}
        editingDimension={editingDimension}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={false}
        enableRotate={true}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.85}
        target={[0, centerY, 0]}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
    </>
  );
};

export const SingleCabinetViewer: React.FC<SingleCabinetViewerProps> = ({
  cabinetType,
  preset,
  settings,
  onDimensionClick,
  showDimensionLabels = true,
  editingDimension = null,
  lightTheme = false
}) => {
  return (
    <div className="w-full h-full min-h-[350px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg overflow-hidden">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault fov={35} />
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent
            cabinetType={cabinetType}
            preset={preset}
            settings={settings}
            showDimensionLabels={showDimensionLabels}
            onDimensionClick={onDimensionClick}
            editingDimension={editingDimension}
            lightTheme={lightTheme}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
