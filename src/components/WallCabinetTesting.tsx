import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, point3d, Units, LWPolylineFlags } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles, 
  createGroovedPanelGeo,
  panelColors,
  woodPalette,
  RUBY_DOOR_THRESHOLD
} from './CabinetTestingUtils';

interface Props {
  settings: TestingSettings;
}

export const WallCabinetTesting: React.FC<Props> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorToDoorGap, doorOuterGap, doorInnerGap,
    showBackPanel, showBackStretchers,
    showDoors, showShelves, numShelves, showHinges, skeletonView, partsSeparatedView, selectedPart,
    hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset, showDifferentPanelColors,
    showNailHoles, nailHoleDiameter,
  } = settings;

  const isSelected = settings.isSelected;
  const baseColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const darkerColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const backPanelColor = new THREE.Color(isSelected ? '#60a5fa' : woodPalette.backPanel);
  const doorColor = new THREE.Color(isSelected ? '#2563eb' : woodPalette.door);
  const shelfColor = new THREE.Color(isSelected ? '#93c5fd' : woodPalette.shelf);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;

  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 
    ? innerWidth - doorOuterGap * 2 
    : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;

  const isGolaActive = settings.enableGola && showDoors;
  
  let doorHeight = innerHeight - doorOuterGap * 2;
  let doorYOffset = 0;
  if (isGolaActive) {
    doorHeight += settings.doorOverride;
    doorYOffset = -settings.doorOverride / 2;
  }

  const getOffset = (part: string, index: number = 0): [number, number, number] => {
    if (!partsSeparatedView || selectedPart !== 'all' && selectedPart !== part) return [0, 0, 0];
    const d = 200;
    const offsets: Record<string, [number, number, number]> = {
      leftPanel: [-d, 0, 0],
      rightPanel: [d, 0, 0],
      bottomPanel: [0, -d * 1.5, 0],
      topPanel: [0, d * 1.5, 0],
      backPanel: [0, 0, -d],
      door: [(index % 2 === 0 ? -1 : 1) * Math.ceil((index + 1) / 2) * d * 0.75, 0, d * 1.5],
      shelf: [0, 0, d * 2],
    };
    return offsets[part] || [0, 0, 0];
  };

  const nailHolePositions = useMemo(() => {
    if (!showNailHoles) return [];
    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];
    const technicalR = nailHoleDiameter / 2;
    const shelfR = settings.shelfHoleDiameter / 2;
    const zBack = -depth / 2 + panelThickness / 2;

    // Stretcher Holes (2 per stretcher)
    if (showBackStretchers) {
      const topStretcherYTop = innerHeight / 2 - panelThickness;
      const bottomStretcherYTop = -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 100;
      
      // Top Stretcher: 1/4 and 4/5 of height (100mm)
      positions.push({ y: topStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: topStretcherYTop - 80, z: zBack, r: technicalR, through: true });
      
      // Bottom Stretcher: 1/4 and 4/5 of height (100mm)
      positions.push({ y: bottomStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: bottomStretcherYTop - 80, z: zBack, r: technicalR, through: true });
    }

    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const yLocalSide = shelfYCabinet - panelThickness / 2;
        const holeY = yLocalSide - panelThickness / 2 - settings.nailHoleShelfDistance;
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const frontZ = shelfZStart + settings.shelfDepth * 0.25;
        const backZ = shelfZStart + settings.shelfDepth * 0.75;
        positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: backZ, r: shelfR, through: false });
      }
    }
    return positions;
  }, [showNailHoles, innerHeight, depth, panelThickness, backPanelThickness, settings.shelfHoleDiameter, showShelves, numShelves, settings.nailHoleShelfDistance, settings.shelfDepth, settings.wallBottomRecess, nailHoleDiameter]);

  const leftPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness * 2;
    const notches: any[] = [];
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'px',
      nailHolePositions, 
      settings.nailHoleDepth,
      panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isGolaActive, settings.golaLCutoutDepth, settings.golaLCutoutHeight]);

  const rightPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness * 2;
    const notches: any[] = [];
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'nx',
      nailHolePositions, 
      settings.nailHoleDepth,
      panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, nailHolePositions, settings.nailHoleDepth, isGolaActive, settings.golaLCutoutDepth, settings.golaLCutoutHeight]);

  const actualBottomDepth = innerDepth;

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    const technicalR = nailHoleDiameter / 2;
    const u1 = -actualBottomDepth / 2 + actualBottomDepth / 5;
    const u2 = 0;
    const u3 = actualBottomDepth / 2 - actualBottomDepth / 5;
    const vLeft = -innerWidth / 2 + panelThickness / 2;
    const vRight = innerWidth / 2 - panelThickness / 2;

    const positions = [
      { y: vLeft, z: u1, r: technicalR, through: true },
      { y: vLeft, z: u2, r: technicalR, through: true },
      { y: vLeft, z: u3, r: technicalR, through: true },
      { y: vRight, z: u1, r: technicalR, through: true },
      { y: vRight, z: u2, r: technicalR, through: true },
      { y: vRight, z: u3, r: technicalR, through: true }
    ];

    if (showBackStretchers) {
      const v1 = -innerWidth / 2 + innerWidth / 5;
      const v2 = 0;
      const v3 = innerWidth / 2 - innerWidth / 5;
      const zBackHole = -actualBottomDepth / 2 + panelThickness / 2;
      positions.push(
        { y: v1, z: zBackHole, r: technicalR, through: true },
        { y: v2, z: zBackHole, r: technicalR, through: true },
        { y: v3, z: zBackHole, r: technicalR, through: true }
      );
    }
    return positions;
  }, [showNailHoles, innerWidth, innerDepth, actualBottomDepth, panelThickness, nailHoleDiameter, showBackStretchers]);

  const bottomPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, actualBottomDepth,
    -actualBottomDepth / 2 + panelThickness, -actualBottomDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py',
    bottomPanelHoles, settings.nailHoleDepth,
    panelThickness, panelThickness
  ), [innerWidth, actualBottomDepth, panelThickness, backPanelThickness, grooveDepth, bottomPanelHoles, settings.nailHoleDepth]);


  const topPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'ny',
    bottomPanelHoles, settings.nailHoleDepth,
    panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, bottomPanelHoles, settings.nailHoleDepth]);


  const doorGeos = useMemo(() => {
    const geos = [];
    for (let i = 0; i < actualNumDoors; i++) {
      const hingeXOffset = actualNumDoors === 1 
        ? -doorWidth / 2 + hingeHorizontalOffset 
        : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      geos.push(createDoorWithHingeHoles(
        doorWidth, doorHeight, doorMaterialThickness,
        hingeXOffset, hingeDiameter / 2, hingeDepth, 
        hingeVerticalOffset, hingeVerticalOffset + (isGolaActive ? settings.doorOverride : 0)
      ));
    }
    return geos;
  }, [actualNumDoors, doorWidth, doorHeight, doorMaterialThickness, hingeHorizontalOffset, hingeDiameter, hingeDepth, hingeVerticalOffset]);

  const shelfGeo = useMemo(() => {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    return new THREE.BoxGeometry(shelfWidth, panelThickness, shelfDepth);
  }, [innerWidth, panelThickness, settings.shelfDepth]);

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    if (selectedPart === 'all' || selectedPart === part) return true;
    return false;
  };

  return (
    <group position={[width / 2, height / 2, depth / 2]}>
      {shouldShow('bottomPanel') && (
        <mesh position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + settings.wallBottomRecess + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('bottomPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('bottomPanel') && (
        <lineSegments position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + settings.wallBottomRecess + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]}>
          <edgesGeometry args={[bottomPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('bottomPanel')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('topPanel') && (
        <mesh position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={topPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('topPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('topPanel') && (
        <lineSegments position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]}>
          <edgesGeometry args={[topPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('topPanel')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('leftPanel') && (
        <mesh position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('leftPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}
      {shouldShow('rightPanel') && (
        <mesh position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('rightPanel')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} side={THREE.DoubleSide} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackPanel && shouldShow('backPanel') && (
        <mesh position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness]} />
          <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : showDifferentPanelColors ? panelColors.backPanel : backPanelColor} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.5} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
        </mesh>
      )}
      {showBackPanel && skeletonView && shouldShow('backPanel') && (
        <lineSegments position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -innerDepth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness)]} />
          <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
        </lineSegments>
      )}

      {showBackStretchers && (
        <>
          {/* Top Stretcher */}
          <mesh position={[0, innerHeight / 2 - panelThickness - 50, -innerDepth / 2 + panelThickness / 2 + getOffset('topStretcher')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, 100, panelThickness]} />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('topStretcher')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0, innerHeight / 2 - panelThickness - 50, -innerDepth / 2 + panelThickness / 2 + getOffset('topStretcher')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, 100, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('topStretcher')} linewidth={2} />
            </lineSegments>
          )}

          {/* Bottom Stretcher */}
          <mesh position={[0, -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 50, -innerDepth / 2 + panelThickness / 2 + getOffset('bottomStretcher')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, 100, panelThickness]} />
            <meshStandardMaterial color={settings.isStudio && settings.carcassTexture ? '#ffffff' : getPanelColor('bottomStretcher')} map={settings.isStudio ? settings.carcassTexture : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0, -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 50, -innerDepth / 2 + panelThickness / 2 + getOffset('bottomStretcher')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, 100, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('bottomStretcher')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {showDoors && actualNumDoors > 0 && Array.from({ length: actualNumDoors }).map((_, i) => {
        const doorX = actualNumDoors === 1 ? 0 : (i === 0 ? -doorWidth / 2 - doorInnerGap / 2 : doorWidth / 2 + doorInnerGap / 2);
        const handleXOffset = actualNumDoors === 1 ? doorWidth / 2 - 30 : (i === 0 ? doorWidth / 2 - 30 : -doorWidth / 2 + 30);
        const hingeXOffset = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);

        const doorAngle = (settings.doorOpenAngle * Math.PI) / 180;
        const isLeftDoor = actualNumDoors === 1 || i === 0;
        const rotationDirection = isLeftDoor ? -1 : 1;
        const pivotX = isLeftDoor ? -doorWidth / 2 : doorWidth / 2;

        return (
          <group key={`door-${i}`} position={[doorX + getOffset('door', i)[0], doorYOffset + getOffset('door', i)[1], depth / 2 + getOffset('door', i)[2]]}>
            <group position={[pivotX, 0, 0]} rotation={[0, rotationDirection * doorAngle, 0]}>
              <mesh position={[-pivotX, 0, doorMaterialThickness / 2]} castShadow receiveShadow visible={!skeletonView}>
                <primitive object={doorGeos[i]} attach="geometry" />
                <meshStandardMaterial color={settings.isStudio && settings.doorTexture ? '#ffffff' : doorColor} map={settings.isStudio ? settings.doorTexture : undefined} roughness={0.4} metalness={0} transparent={true} opacity={settings.opacity} side={THREE.DoubleSide} depthWrite={settings.opacity < 1 ? false : true} />
              </mesh>
              {skeletonView && (
                <lineSegments position={[-pivotX, 0, doorMaterialThickness / 2]}>
                  <edgesGeometry args={[doorGeos[i]]} />
                  <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
                </lineSegments>
              )}
              {shouldShow('door') && !isGolaActive && (
                <mesh position={[handleXOffset - pivotX, -doorHeight / 2 + 50, doorMaterialThickness + 5]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[3, 3, 60, 16]} />
                  <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} transparent={settings.opacity < 1} opacity={settings.opacity} />
                </mesh>
              )}
              {showHinges && (
                <>
                  <mesh position={[hingeXOffset - pivotX, doorHeight / 2 - hingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} transparent={settings.opacity < 1} opacity={settings.opacity} />
                  </mesh>
                  <mesh position={[hingeXOffset - pivotX, -doorHeight / 2 + hingeVerticalOffset + (isGolaActive ? settings.doorOverride : 0), -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                    <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} transparent={settings.opacity < 1} opacity={settings.opacity} />
                  </mesh>
                </>
              )}
            </group>
          </group>
        );
      })}

      {showShelves && numShelves > 0 && skeletonView && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <lineSegments key={`sk-shelf-${i}`} position={[0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}>
            <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 - 2, panelThickness, settings.shelfDepth)]} />
            <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
          </lineSegments>
        );
      })}

      {showShelves && numShelves > 0 && !skeletonView && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const shelfZOffset = -depth / 2 + panelThickness + backPanelThickness + settings.shelfDepth / 2;
        return (
          <mesh 
            key={`shelf-${i}`} 
            position={[0 + getOffset('shelf', i)[0], shelfY - panelThickness / 2 + getOffset('shelf', i)[1], shelfZOffset + getOffset('shelf', i)[2]]}
            castShadow 
            receiveShadow
          >
            <primitive object={shelfGeo.clone()} attach="geometry" />
            <meshStandardMaterial color={settings.isStudio && (settings.shelfTexture || settings.carcassTexture) ? '#ffffff' : shelfColor} map={settings.isStudio ? (settings.shelfTexture || settings.carcassTexture) : undefined} roughness={0.4} metalness={0} transparent={settings.opacity < 1} opacity={settings.opacity} />
          </mesh>
        );
      })}

      {/* --- Specialized Equipment --- */}
      
      {/* 1. COOKER HOOD (Now handled globally by Cabinet.tsx) */}
    </group>
  );
};

export const exportWallCabinetDXF = async (settings: TestingSettings, zip: JSZip) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    doorMaterialThickness, grooveDepth, doorOuterGap, doorInnerGap,
    showBackPanel, showBackStretchers, showDoors, showShelves, numShelves, hingeDiameter, hingeHorizontalOffset, hingeVerticalOffset,
    nailHoleDiameter
  } = settings;

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;
  const actualNumDoors = width < RUBY_DOOR_THRESHOLD ? 1 : 2;
  const doorWidth = actualNumDoors === 1 ? innerWidth - doorOuterGap * 2 : (innerWidth - doorOuterGap * 2 - doorInnerGap) / 2;
  const isGolaActive = settings.enableGola && showDoors;
  const doorHeight = innerHeight - doorOuterGap * 2 + (isGolaActive ? settings.doorOverride : 0);

  const addPanelToZip = (name: string, width: number, height: number, holesInput: { y: number, z: number, r: number, through?: boolean }[] = [], grooveInput?: { x: number, y: number, w: number, h: number, depth: number }, mirrorX: boolean = false, golaCutouts?: { x: number, y: number, w: number, h: number, bottom?: boolean }[]) => {
    const writer = new DxfWriter();
    writer.setUnits(Units.Millimeters);
    writer.addLayer('PANEL', 7, 'CONTINUOUS');
    writer.addLayer('DRILL', 1, 'CONTINUOUS');
    writer.addLayer('GROOVE', 3, 'CONTINUOUS');
    writer.addLayer('TEXT', 7, 'CONTINUOUS');
    const modelSpace = writer.modelSpace;
    const holes = holesInput.map(h => ({ ...h }));
    const groove = grooveInput ? { ...grooveInput } : undefined;
    if (mirrorX) {
      if (groove) groove.x = width - groove.x - groove.w;
      holes.forEach(h => { h.z = -h.z; });
      if (golaCutouts) golaCutouts.forEach(c => { c.x = width - c.x - c.w; });
    }
    
    let points = [{ point: { x: 0, y: 0 } }];
    if (golaCutouts && golaCutouts.length > 0) {
      const sorted = [...golaCutouts].sort((a, b) => a.y - b.y);
      if (sorted.some(c => c.bottom)) {
        const c = sorted.find(c => c.bottom)!;
        points = [
          { point: { x: 0, y: c.h } },
          { point: { x: c.x + c.w, y: c.h } },
          { point: { x: c.x + c.w, y: 0 } },
          { point: { x: width, y: 0 } }
        ];
      } else {
        points.push({ point: { x: width, y: 0 } });
      }
    } else {
      points.push({ point: { x: width, y: 0 } });
    }
    
    points.push({ point: { x: width, y: height } }, { point: { x: 0, y: height } });

    if (mirrorX) points.forEach(p => { p.point.x = width - p.point.x; });
    modelSpace.addLWPolyline([...points, points[0]], { flags: LWPolylineFlags.Closed, layerName: 'PANEL' });
    modelSpace.addText(point3d(width / 2, height / 2, 0), 12, name, { layerName: 'TEXT' });
    holes.forEach(hole => {
      const radius = hole.r;
      const centerX = hole.z + width / 2;
      const centerY = hole.y + height / 2;
      const segments = 32;
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        pts.push({ point: { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) } });
      }
      modelSpace.addLWPolyline(pts, { flags: LWPolylineFlags.Closed, layerName: 'DRILL' });
    });
    if (groove) modelSpace.addLWPolyline([{ point: { x: groove.x, y: groove.y } }, { point: { x: groove.x + groove.w, y: groove.y } }, { point: { x: groove.x + groove.w, y: groove.y + groove.h } }, { point: { x: groove.x, y: groove.y + groove.h } }, { point: { x: groove.x, y: groove.y } }], { flags: LWPolylineFlags.Closed, layerName: 'GROOVE' });
    zip.file(`${name}.dxf`, writer.stringify());
  };

  const nailHoles = [];
  const technicalR = nailHoleDiameter / 2;
  const zBack_DXF = -depth / 2 + panelThickness / 2;

  // Add Stretcher Holes (2 per stretcher)
  if (showBackStretchers) {
    const tSYT = innerHeight / 2 - panelThickness;
    const bSYT = -innerHeight / 2 + panelThickness + settings.wallBottomRecess + 100;
    
    // Top Stretcher: 1/4 and 4/5 of 100mm
    nailHoles.push({ y: tSYT - 25, z: zBack_DXF, r: technicalR, through: true });
    nailHoles.push({ y: tSYT - 80, z: zBack_DXF, r: technicalR, through: true });
    
    // Bottom Stretcher: 1/4 and 4/5 of 100mm
    nailHoles.push({ y: bSYT - 25, z: zBack_DXF, r: technicalR, through: true });
    nailHoles.push({ y: bSYT - 80, z: zBack_DXF, r: technicalR, through: true });
  }

  if (showShelves && numShelves > 0) {
    const availableH = innerHeight - panelThickness * 2;
    const spacing = availableH / (numShelves + 1);
    const sR = settings.shelfHoleDiameter / 2;
    for (let i = 0; i < numShelves; i++) {
      const sy = -innerHeight / 2 + panelThickness + spacing * (i + 1);
      const hy = sy - panelThickness / 2 - settings.nailHoleShelfDistance;
      const szS = -depth / 2 + panelThickness + backPanelThickness;
      nailHoles.push({ y: hy, z: szS + settings.shelfDepth * 0.25, r: sR, through: false }, { y: hy, z: szS + settings.shelfDepth * 0.75, r: sR, through: false });
    }
  }

  const sideW = depth;
  const sideH_Panel = innerHeight - panelThickness * 2;
  const sideGroove = { x: panelThickness, y: 0, w: backPanelThickness + 2, h: sideH_Panel - panelThickness + grooveDepth, depth: grooveDepth };
  
  const leftNotches = undefined;
  const rightNotches = undefined;

  addPanelToZip('Left_Panel', sideW, sideH_Panel, nailHoles, sideGroove, false, leftNotches);
  addPanelToZip('Right_Panel', sideW, sideH_Panel, nailHoles, sideGroove, true, rightNotches);
  const actualBottomDepthDXF = innerDepth;
  const bottomNailHoles = [];
  const u1b = -actualBottomDepthDXF / 2 + actualBottomDepthDXF / 5;
  const u2b = 0;
  const u3b = actualBottomDepthDXF / 2 - actualBottomDepthDXF / 5;
  const vLeftb = -innerWidth / 2 + panelThickness / 2;
  const vRightb = innerWidth / 2 - panelThickness / 2;
  bottomNailHoles.push(
    { y: vLeftb, z: u1b, r: technicalR, through: true },
    { y: vLeftb, z: u2b, r: technicalR, through: true },
    { y: vLeftb, z: u3b, r: technicalR, through: true },
    { y: vRightb, z: u1b, r: technicalR, through: true },
    { y: vRightb, z: u2b, r: technicalR, through: true },
    { y: vRightb, z: u3b, r: technicalR, through: true }
  );
  if (showBackStretchers) {
    const v1 = -innerWidth / 2 + innerWidth / 5;
    const v2 = 0;
    const v3 = innerWidth / 2 - innerWidth / 5;
    const zBackH = -actualBottomDepthDXF / 2 + panelThickness / 2;
    bottomNailHoles.push(
      { y: v1, z: zBackH, r: technicalR, through: true },
      { y: v2, z: zBackH, r: technicalR, through: true },
      { y: v3, z: zBackH, r: technicalR, through: true }
    );
  }

  addPanelToZip('Bottom_Panel', innerWidth, actualBottomDepthDXF, bottomNailHoles, { x: 0, y: panelThickness, w: innerWidth, h: backPanelThickness + 2, depth: grooveDepth });
  addPanelToZip('Top_Panel', innerWidth, innerDepth, bottomNailHoles, { x: 0, y: panelThickness, w: innerWidth, h: backPanelThickness + 2, depth: grooveDepth });


  if (showBackStretchers) {
    addPanelToZip('Top_Stretcher_Back', innerWidth - panelThickness * 2, 100);
    addPanelToZip('Bottom_Stretcher_Back', innerWidth - panelThickness * 2, 100);
  }

  if (showDoors) {
    for (let i = 0; i < actualNumDoors; i++) {
      const hX = actualNumDoors === 1 ? -doorWidth / 2 + hingeHorizontalOffset : (i === 0 ? -doorWidth / 2 + hingeHorizontalOffset : doorWidth / 2 - hingeHorizontalOffset);
      const hingeHoles = [
        { y: doorHeight / 2 - hingeVerticalOffset, z: hX, r: hingeDiameter / 2 }, 
        { y: -doorHeight / 2 + hingeVerticalOffset + (isGolaActive ? settings.doorOverride : 0), z: hX, r: hingeDiameter / 2 }
      ];
      addPanelToZip(`Door_${i + 1}`, doorWidth, doorHeight, hingeHoles);
    }
  }

  if (showShelves && numShelves > 0) {
    const shelfWidth = innerWidth - panelThickness * 2 - 2;
    const shelfDepth = settings.shelfDepth;
    for (let i = 0; i < numShelves; i++) {
       addPanelToZip(`Shelf_${i + 1}`, shelfWidth, shelfDepth);
    }
  }

  if (showBackPanel) {
    addPanelToZip('Back_Panel', innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }
};
