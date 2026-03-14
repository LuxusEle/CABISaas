import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CabinetUnit, CabinetType, PresetType, ProjectSettings } from '../../types';
import { getActiveColor } from '../../services/cabinetColors';
import { HardwareMarkers } from './HardwareMarkers';

interface Props {
  unit: CabinetUnit;
  position: [number, number, number];
  rotation: number;
  showHardware?: boolean;
  wallIndex?: number;
  label?: string;
  settings?: ProjectSettings;
  showDimensionLabels?: boolean;
  onDimensionClick?: (dimension: string) => void;
  showCountertop?: boolean;
  previewMode?: boolean;
  editingDimension?: string | null;
}

const RUBY_DOOR_THRESHOLD = 599.5;

const getNumDoors = (unit: CabinetUnit): number => {
  if (unit.customConfig?.num_doors !== undefined) {
    return unit.customConfig.num_doors;
  }
  switch (unit.preset) {
    case PresetType.BASE_DOOR:
    case PresetType.WALL_STD:
    case PresetType.TALL_OVEN:
    case PresetType.TALL_UTILITY:
      return unit.width >= RUBY_DOOR_THRESHOLD ? 2 : 1;
    default:
      return 0;
  }
};

const DimensionLabel: React.FC<{
  position: [number, number, number];
  text: string;
  onClick?: () => void;
  vertical?: boolean;
}> = ({ position, text, onClick, vertical }) => (
  <Html position={position} center>
    <div
      onClick={onClick}
      className={`
        bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold cursor-pointer
        hover:bg-blue-500 transition-colors shadow-lg whitespace-nowrap
        ${vertical ? 'writing-mode-vertical' : ''}
      `}
    >
      {text}
    </div>
  </Html>
);

const DimensionLine: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  onClick?: () => void;
}> = ({ start, end, label, onClick }) => {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([...start, ...end])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
      <Html position={[midX, midY, midZ]} center>
        <div
          onClick={onClick}
          className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:bg-blue-500 -mt-6"
        >
          {label}
        </div>
      </Html>
    </group>
  );
};

export const Cabinet: React.FC<Props> = ({
  unit,
  position,
  rotation,
  showHardware = true,
  wallIndex = 0,
  label,
  settings,
  showDimensionLabels = false,
  onDimensionClick,
  showCountertop = false,
  previewMode = false,
  editingDimension = null
}) => {
  const isWall = unit.type === CabinetType.WALL;
  const isTall = unit.type === CabinetType.TALL;
  const isBase = !isWall && !isTall;

  const width = unit.width;
  const depth = isWall ? (settings?.depthWall || 350) : isTall ? (settings?.depthTall || 600) : (settings?.depthBase || 560);
  const height = isTall ? (settings?.tallHeight || 2100) : isWall ? (settings?.wallHeight || 720) : (settings?.baseHeight || 870);
  const panelThickness = settings?.thickness || 18;
  
  const baseHeight = settings?.baseHeight || 870;
  const counterThickness = settings?.counterThickness || 40;
  const wallElevation = settings?.wallCabinetElevation || 450;
  const toeKickHeight = settings?.toeKickHeight || 100;
  
  let zBase = 0;
  if (isWall && !previewMode) {
    zBase = baseHeight + counterThickness + wallElevation;
  }

  const activeColor = getActiveColor(unit.preset);
  const baseColor = new THREE.Color(activeColor.rgb[0] / 255, activeColor.rgb[1] / 255, activeColor.rgb[2] / 255);
  const darkerColor = baseColor.clone().multiplyScalar(0.7);
  const darkerColor2 = baseColor.clone().multiplyScalar(0.5);
  const drawerColor = baseColor.clone().multiplyScalar(0.85);

  const numDoors = getNumDoors(unit);
  const doorWidth = numDoors > 1 ? (width / numDoors) - 2 : width - 4;
  const doorHeight = height - 4;

  const isDrawer = unit.preset === PresetType.BASE_DRAWER_3;
  const numDrawers = isDrawer ? 3 : 0;
  const drawerHeight = isDrawer ? (height - panelThickness * 2) / 3 - 4 : 0;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[width / 2, zBase + height / 2, depth / 2]}>
        {isBase && (
          <>
            <mesh position={[0, height / 2 - panelThickness / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[width - panelThickness * 2, panelThickness, depth - panelThickness * 2]} />
              <meshStandardMaterial color={darkerColor} roughness={0.8} />
            </mesh>

            <mesh position={[0, -height / 2 + panelThickness / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[width - panelThickness * 2, panelThickness, depth - panelThickness * 2]} />
              <meshStandardMaterial color={darkerColor} roughness={0.8} />
            </mesh>
          </>
        )}

        {!isWall && (
          <mesh position={[0, -height / 2 + panelThickness / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - panelThickness * 2, panelThickness, depth - panelThickness * 2]} />
            <meshStandardMaterial color={darkerColor} roughness={0.8} />
          </mesh>
        )}

        {isWall && (
          <mesh position={[0, height / 2 - panelThickness / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - panelThickness * 2, panelThickness, depth - panelThickness * 2]} />
            <meshStandardMaterial color={darkerColor} roughness={0.8} />
          </mesh>
        )}

        <mesh position={[-width / 2 + panelThickness / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[panelThickness, height, depth]} />
          <meshStandardMaterial color={darkerColor} roughness={0.8} />
        </mesh>

        <mesh position={[width / 2 - panelThickness / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[panelThickness, height, depth]} />
          <meshStandardMaterial color={darkerColor} roughness={0.8} />
        </mesh>

        <mesh position={[0, 0, -depth / 2 + 4]} castShadow receiveShadow>
          <boxGeometry args={[width, height, 8]} />
          <meshStandardMaterial color={darkerColor2} roughness={0.9} />
        </mesh>

        {numDoors > 0 && !isDrawer && Array.from({ length: numDoors }).map((_, i) => {
          const doorX = numDoors > 1 ? (i - (numDoors - 1) / 2) * (doorWidth + 2) : 0;
          // Wall cabinets: handle at bottom, horizontal, near edges
          // Base cabinets: handle near top edge, vertical
          // Tall cabinets: handle at vertical center, vertical
          let handleXPos, handleYPos;
          if (isWall) {
            if (numDoors === 1) {
              handleXPos = doorX - doorWidth / 2 + 40;
            } else {
              handleXPos = i === 0 ? doorX + doorWidth / 2 - 40 : doorX - doorWidth / 2 + 40;
            }
            handleYPos = -doorHeight / 2 + 50;
          } else if (isTall) {
            // Tall: vertical center
            if (numDoors === 1) {
              handleXPos = doorX + doorWidth / 2 - 30;
            } else {
              handleXPos = i === 0 ? doorX + doorWidth / 2 - 30 : doorX - doorWidth / 2 + 30;
            }
            handleYPos = 0;
          } else {
            // Base: near top
            if (numDoors === 1) {
              handleXPos = doorX + doorWidth / 2 - 30;
            } else {
              handleXPos = i === 0 ? doorX + doorWidth / 2 - 30 : doorX - doorWidth / 2 + 30;
            }
            handleYPos = doorHeight / 2 - 50;
          }
          return (
            <group key={`door-${i}`}>
              <mesh position={[doorX, 0, depth / 2 - 3]} castShadow receiveShadow>
                <boxGeometry args={[doorWidth, doorHeight, panelThickness]} />
                <meshStandardMaterial color={baseColor} roughness={0.6} />
              </mesh>
              {/* Door Handle - horizontal for wall cabinets, vertical for base/tall */}
              <mesh position={[handleXPos, handleYPos, depth / 2 + 5]} rotation={[0, 0, isWall ? Math.PI / 2 : 0]} castShadow>
                <cylinderGeometry args={[3, 3, isWall ? 60 : 50, 16]} />
                <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          );
        })}

        {isDrawer && Array.from({ length: numDrawers }).map((_, i) => {
          const drawerY = -height / 2 + panelThickness + i * (drawerHeight + 2) + drawerHeight / 2 + 2;
          
          return (
            <group key={`drawer-${i}`}>
              <mesh position={[0, drawerY, depth / 2 - panelThickness / 2]} castShadow receiveShadow>
                <boxGeometry args={[width - panelThickness * 2 - 4, drawerHeight, panelThickness]} />
                <meshStandardMaterial color={drawerColor} roughness={0.6} />
              </mesh>
              {/* Drawer Handle */}
              <mesh position={[0, drawerY, depth / 2 + 5]} castShadow>
                <cylinderGeometry args={[2.5, 2.5, 40, 16]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
              </mesh>
              
              <mesh position={[0, drawerY, depth / 2 - panelThickness - 2]} castShadow receiveShadow>
                <boxGeometry args={[width - panelThickness * 2 - 8, drawerHeight - 4, 2]} />
                <meshStandardMaterial color={darkerColor2} roughness={0.8} />
              </mesh>
              
              <mesh position={[-width / 2 + panelThickness / 2 + 2, drawerY, depth / 2 - panelThickness - 10]} castShadow>
                <boxGeometry args={[2, drawerHeight - 8, depth - panelThickness * 2 - 16]} />
                <meshStandardMaterial color={darkerColor2} roughness={0.8} />
              </mesh>
              
              <mesh position={[width / 2 - panelThickness / 2 - 2, drawerY, depth / 2 - panelThickness - 10]} castShadow>
                <boxGeometry args={[2, drawerHeight - 8, depth - panelThickness * 2 - 16]} />
                <meshStandardMaterial color={darkerColor2} roughness={0.8} />
              </mesh>
              
              <mesh position={[0, drawerY - drawerHeight / 2 + 2, depth / 2 - panelThickness - 10]} castShadow receiveShadow>
                <boxGeometry args={[width - panelThickness * 2 - 8, 2, depth - panelThickness * 2 - 16]} />
                <meshStandardMaterial color={darkerColor2} roughness={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>

      {showCountertop && isBase && (
        <group position={[width / 2, zBase + height, depth / 2]}>
          <mesh position={[0, counterThickness / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + 20, counterThickness, depth + 20]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.1} />
          </mesh>
        </group>
      )}

      {isBase && (
        <group position={[width / 2, 0, depth / 2]}>
          <mesh position={[0, -height / 2 + toeKickHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, toeKickHeight, depth - 20]} />
            <meshStandardMaterial color={darkerColor2} roughness={0.8} />
          </mesh>
        </group>
      )}

      {showDimensionLabels && (
        <group>
          <DimensionLine
            start={[0, zBase, depth / 2 + 50]}
            end={[0, zBase + height, depth / 2 + 50]}
            label={`H: ${height}mm`}
            onClick={() => onDimensionClick?.('height')}
          />
          <DimensionLine
            start={[-50, zBase + height / 2, depth / 2]}
            end={[width + 50, zBase + height / 2, depth / 2]}
            label={`W: ${width}mm`}
            onClick={() => onDimensionClick?.('width')}
          />
          <DimensionLine
            start={[width / 2 + width, zBase + height / 2, -depth / 2 - 50]}
            end={[width / 2 + width, zBase + height / 2, depth / 2 + 50]}
            label={`D: ${depth}mm`}
            onClick={() => onDimensionClick?.('depth')}
          />
          
          {isBase && (
            <DimensionLine
              start={[0, zBase - toeKickHeight, depth / 2 + 50]}
              end={[0, zBase, depth / 2 + 50]}
              label={`Toe: ${toeKickHeight}mm`}
              onClick={() => onDimensionClick?.('toeKick')}
            />
          )}
          
          {isWall && (
            <DimensionLine
              start={[0, baseHeight + counterThickness, depth / 2 + 50]}
              end={[0, zBase, depth / 2 + 50]}
              label={`Elev: ${wallElevation}mm`}
              onClick={() => onDimensionClick?.('wallElevation')}
            />
          )}
          
          <DimensionLine
            start={[-width / 2 - 30, zBase + height / 2, -depth / 2]}
            end={[-width / 2 - 30, zBase + height / 2, depth / 2]}
            label={`P: ${panelThickness}mm`}
            onClick={() => onDimensionClick?.('panelThickness')}
          />
        </group>
      )}

      {editingDimension && (
        <group position={[width / 2, zBase + height / 2, depth / 2]}>
          {editingDimension === 'height' && (
            <>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, -height/2, 0,
                      -width/2, height/2, 0
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      width/2, -height/2, 0,
                      width/2, height/2, 0
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
            </>
          )}
          {editingDimension === 'width' && (
            <>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, 0, depth/2 + 15,
                      width/2, 0, depth/2 + 15
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, 0, -depth/2,
                      width/2, 0, -depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
            </>
          )}
          {editingDimension === 'depth' && (
            <>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, 0, -depth/2,
                      -width/2, 0, depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      width/2, 0, -depth/2,
                      width/2, 0, depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
            </>
          )}
          {editingDimension === 'toeKick' && isBase && (
            <>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, -height/2 - toeKickHeight, depth/2,
                      width/2, -height/2 - toeKickHeight, depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, -height/2, depth/2,
                      width/2, -height/2, depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
            </>
          )}
          {editingDimension === 'wallElevation' && isWall && (
            <>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      -width/2, -height/2 - wallElevation, depth/2,
                      -width/2, -height/2, depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={new Float32Array([
                      width/2, -height/2 - wallElevation, depth/2,
                      width/2, -height/2, depth/2
                    ])}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={4} />
              </line>
            </>
          )}
        </group>
      )}

      {showHardware && !previewMode && (
        <HardwareMarkers
          unit={unit}
          width={width}
          depth={depth}
          height={height}
          zBase={zBase}
        />
      )}

      {label && (
        <Html position={[width / 2, zBase + height + 50, depth / 2]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div className="bg-amber-500/90 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};
