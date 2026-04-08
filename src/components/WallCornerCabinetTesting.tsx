import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, Units, LWPolylineFlags, point3d } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles,
  panelColors 
} from './CabinetTestingUtils';

interface Props {
  settings: TestingSettings;
}

export const WallCornerCabinetTesting: React.FC<Props> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, backStretcherHeight, topStretcherWidth,
    showBackPanel, showBackStretchers, showShelves, numShelves,
    skeletonView, partsSeparatedView, selectedPart, showDifferentPanelColors,
    blindPanelWidth, blindCornerSide, doorMaterialThickness, doorOuterGap, doorToPanelGap,
    showDoors, doorOpenAngle, showHinges, hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset,
    showNailHoles, nailHoleDiameter, shelfHoleDiameter, nailHoleShelfDistance, shelfDepth, nailHoleDepth,
    wallBottomRecess
  } = settings;

  const darkerColor = new THREE.Color('#d4a574').multiplyScalar(0.7);
  const backPanelColor = new THREE.Color('#c9a87c');

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height; // No toe kick for wall cabinets
  const innerDepth = depth;

  const getOffset = (part: string, index: number = 0): [number, number, number] => {
    if (!partsSeparatedView || selectedPart !== 'all' && selectedPart !== part) return [0, 0, 0];
    const d = 200;
    const offsets: Record<string, [number, number, number]> = {
      leftPanel: [-d, 0, 0],
      rightPanel: [d, 0, 0],
      bottomPanel: [0, -d * 1.5, 0],
      topPanel: [0, d * 1.5, 0],
      blindPanelFront: [0, 0, d],
      backPanel: [0, 0, -d],
      backStretcherTop: [0, 0, -d],
      backStretcherBottom: [0, 0, -d],
      door: [(index % 2 === 0 ? -1 : 1) * Math.ceil((index + 1) / 2) * d * 0.75, 0, d * 1.5],
      shelf: [0, 0, d * 2],
      upright: [0, 0, d]
    };
    return offsets[part] || [0, 0, 0];
  };

  const sidePanelHeight = innerHeight - panelThickness * 2;

  const sideHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const positions: { y: number, z: number, r: number, through?: boolean }[] = [];
    const technicalR = nailHoleDiameter / 2;
    const shelfR = shelfHoleDiameter / 2;
    const zBack = -depth / 2 + panelThickness / 2;

    if (showBackStretchers) {
      const topStretcherYTop = sidePanelHeight / 2;
      const bottomStretcherYTop = -sidePanelHeight / 2 + wallBottomRecess + 100;
      
      positions.push({ y: topStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: topStretcherYTop - 80, z: zBack, r: technicalR, through: true });
      
      positions.push({ y: bottomStretcherYTop - 25, z: zBack, r: technicalR, through: true });
      positions.push({ y: bottomStretcherYTop - 80, z: zBack, r: technicalR, through: true });
    }

    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const yLocalSide = shelfYCabinet; // Local Y goes from -sidePanelHeight/2 to +sidePanelHeight/2
        const holeY = yLocalSide - panelThickness / 2 - nailHoleShelfDistance;
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const localShelfDepth = depth - panelThickness - backPanelThickness;
        const frontZ = shelfZStart + localShelfDepth * 0.25;
        const backZ = shelfZStart + localShelfDepth * 0.75;
        positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: backZ, r: shelfR, through: false });
      }
    }
    
    return positions;
  }, [showNailHoles, innerHeight, depth, panelThickness, backPanelThickness, nailHoleDiameter, shelfHoleDiameter, showBackStretchers, numShelves, showShelves, nailHoleShelfDistance, shelfDepth, wallBottomRecess, sidePanelHeight]);

  const uprightX = blindCornerSide === 'left'
    ? -width / 2 + blindPanelWidth + panelThickness / 2
    : width / 2 - blindPanelWidth - panelThickness / 2;

  const isGolaActive = settings.enableGola && showDoors;
  const isDoorOnLeft = blindCornerSide === 'right';
  const isDoorOnRight = blindCornerSide === 'left';
  const isLeftDoor = isDoorOnRight; // Hinges on the internal upright

  // Side Panels (Separate geometries for inward-facing grooves)
  const leftPanelGeo = useMemo(() => {
    const notches: any[] = [];
    if (isGolaActive && isDoorOnLeft) {
      notches.push({ u: depth / 2, v: -sidePanelHeight / 2, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'bottom' });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'px', sideHoles, nailHoleDepth, panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, sidePanelHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnLeft, settings.golaLCutoutDepth, settings.golaLCutoutHeight]);

  const rightPanelGeo = useMemo(() => {
    const notches: any[] = [];
    if (isGolaActive && isDoorOnRight) {
      notches.push({ u: depth / 2, v: -sidePanelHeight / 2, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'bottom' });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'nx', sideHoles, nailHoleDepth, panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, sidePanelHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnRight, settings.golaLCutoutDepth, settings.golaLCutoutHeight]);

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    const zDist = [ -innerDepth / 2 + innerDepth / 5, 0, innerDepth / 2 - innerDepth / 5 ];
    zDist.forEach(zVal => {
      holes.push({ y: lpX, z: zVal, r: technicalR, through: true });
      holes.push({ y: rpX, z: zVal, r: technicalR, through: true });
    });

    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      holes.push({ y: -innerWidth / 2 + innerWidth / 5, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: 0, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: innerWidth / 2 - innerWidth / 5, z: bbsZ, r: technicalR, through: true });
    }

    const upZ1 = depth / 2 - topStretcherWidth * 1/4;
    const upZ2 = depth / 2 - topStretcherWidth * 3/4;
    holes.push({ y: uprightX, z: upZ1, r: technicalR, through: true });
    holes.push({ y: uprightX, z: upZ2, r: technicalR, through: true });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerWidth, innerDepth, depth, panelThickness, showBackStretchers, uprightX, topStretcherWidth]);

  const topPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    const zDist = [ -innerDepth / 2 + innerDepth / 5, 0, innerDepth / 2 - innerDepth / 5 ];
    zDist.forEach(zVal => {
      holes.push({ y: lpX, z: zVal, r: technicalR, through: true });
      holes.push({ y: rpX, z: zVal, r: technicalR, through: true });
    });

    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      holes.push({ y: -innerWidth / 2 + innerWidth / 5, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: 0, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: innerWidth / 2 - innerWidth / 5, z: bbsZ, r: technicalR, through: true });
    }

    const upZ1 = depth / 2 - topStretcherWidth * 1/4;
    const upZ2 = depth / 2 - topStretcherWidth * 3/4;
    holes.push({ y: uprightX, z: upZ1, r: technicalR, through: true });
    holes.push({ y: uprightX, z: upZ2, r: technicalR, through: true });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerWidth, innerDepth, depth, panelThickness, showBackStretchers, uprightX, topStretcherWidth]);

  // Bottom Panel
  const bottomPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py', bottomPanelHoles, nailHoleDepth, panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, bottomPanelHoles, nailHoleDepth]);

  // Top Panel
  const topPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'ny', topPanelHoles, nailHoleDepth, panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth, topPanelHoles, nailHoleDepth]);

  const blindWidthFront = blindPanelWidth - doorOuterGap * 2;
  const doorWidth = width - blindPanelWidth - doorOuterGap * 2;
  
  const blindPanelHeight = innerHeight;
  let doorHeight = innerHeight;
  let doorYOffset = 0;
  if (isGolaActive) {
    doorHeight -= settings.doorOverride;
    doorYOffset = settings.doorOverride / 2;
  }

  const blindPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    // Top Panel hit points
    const yTopPanel = innerHeight / 2 - panelThickness / 2;
    holes.push({ y: yTopPanel, z: -blindWidthFront / 2 + blindWidthFront / 5, r: technicalR, through: true });
    holes.push({ y: yTopPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yTopPanel, z: blindWidthFront / 2 - blindWidthFront / 5, r: technicalR, through: true });

    // Bottom panel hit points
    const yBottomPanel = -innerHeight / 2 + panelThickness / 2 + wallBottomRecess;
    holes.push({ y: yBottomPanel, z: -blindWidthFront / 2 + blindWidthFront / 5, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: blindWidthFront / 2 - blindWidthFront / 5, r: technicalR, through: true });

    // Side panel hit points
    const sidePanelLocalX = blindCornerSide === 'left' 
      ? panelThickness / 2 - blindPanelWidth / 2 
      : blindPanelWidth / 2 - panelThickness / 2;
      
    holes.push({ y: -blindPanelHeight / 2 + blindPanelHeight / 5, z: sidePanelLocalX, r: technicalR, through: true });
    holes.push({ y: 0, z: sidePanelLocalX, r: technicalR, through: true });
    holes.push({ y: blindPanelHeight / 2 - blindPanelHeight / 5, z: sidePanelLocalX, r: technicalR, through: true });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerHeight, panelThickness, blindWidthFront, blindCornerSide, blindPanelWidth, blindPanelHeight, wallBottomRecess]);


  const rotationDirection = isLeftDoor ? -1 : 1;
  const doorPivotX = isLeftDoor ? -doorWidth / 2 : doorWidth / 2;
  const doorAngleRad = THREE.MathUtils.degToRad(doorOpenAngle || 0);

  const hingeXOffset = isLeftDoor 
    ? -doorWidth / 2 + hingeHorizontalOffset 
    : doorWidth / 2 - hingeHorizontalOffset;

  const topHingeVerticalOffset = hingeVerticalOffset;
  const bottomHingeVerticalOffset = hingeVerticalOffset;

  // Front Blind Panel (Overlay)
  const blindPanelFrontGeo = useMemo(() => createPanelWithHolesGeo(
    doorMaterialThickness, blindPanelHeight, blindWidthFront,  
    0, 0, 0, 'pz', blindPanelHoles, doorMaterialThickness
  ), [doorMaterialThickness, blindPanelHeight, blindWidthFront, blindPanelHoles]);

  // Door
  const doorGeo = useMemo(() => {
    return createDoorWithHingeHoles(
      doorWidth, doorHeight, doorMaterialThickness,
      hingeXOffset, hingeDiameter / 2, hingeDepth,
      topHingeVerticalOffset, bottomHingeVerticalOffset
    );
  }, [doorWidth, doorHeight, doorMaterialThickness, hingeXOffset, hingeDiameter, hingeDepth, topHingeVerticalOffset, bottomHingeVerticalOffset]);

  // Internal Upright (The divider)
  const uprightGeo = useMemo(() => {
    const dividerHeight = sidePanelHeight;
    const dividerDepth = topStretcherWidth; // Usually top stretchers absent in wall cabinet, but the parameter acts as upright width
    return new THREE.BoxGeometry(panelThickness, dividerHeight, dividerDepth);
  }, [sidePanelHeight, panelThickness, topStretcherWidth]);

  // Positions
  const blindPanelFrontX = blindCornerSide === 'left' 
    ? -width / 2 + blindPanelWidth / 2 
    : width / 2 - blindPanelWidth / 2;

  const blindPanelFrontY = 0; 

  const doorX = blindCornerSide === 'left'
    ? width / 2 - doorWidth / 2 - doorOuterGap
    : -width / 2 + doorWidth / 2 + doorOuterGap;

  const doorZ = depth / 2 + doorMaterialThickness / 2;

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    return selectedPart === 'all' || selectedPart === part;
  };

  return (
    <group position={[width / 2, innerHeight / 2, depth / 2]}>
      {/* Bottom Panel */}
      {shouldShow('bottomPanel') && (
        <mesh position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + wallBottomRecess + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('bottomPanel') && (
        <lineSegments position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + wallBottomRecess + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]}>
          <edgesGeometry args={[bottomPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('bottomPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Top Panel */}
      {shouldShow('topPanel') && (
        <mesh position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={topPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('topPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('topPanel') && (
        <lineSegments position={[0 + getOffset('topPanel')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topPanel')[1], 0 + getOffset('topPanel')[2]]}>
          <edgesGeometry args={[topPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('topPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Left Panel */}
      {shouldShow('leftPanel') && (
        <mesh position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], 0 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Right Panel */}
      {shouldShow('rightPanel') && (
        <mesh position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], 0 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Front Blind Panel */}
      {shouldShow('blindPanelFront') && (
        <mesh position={[blindPanelFrontX + getOffset('blindPanelFront')[0], blindPanelFrontY + getOffset('blindPanelFront')[1], doorZ + getOffset('blindPanelFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={blindPanelFrontGeo} attach="geometry" />
          <meshStandardMaterial color={darkerColor} roughness={0.8} />
        </mesh>
      )}

      {/* Door */}
      {showDoors && shouldShow('door') && (
        <group position={[doorX + getOffset('door')[0], doorYOffset + getOffset('door')[1], doorZ + getOffset('door')[2]]}>
          <group position={[doorPivotX, 0, 0]} rotation={[0, rotationDirection * doorAngleRad, 0]}>
            <mesh position={[-doorPivotX, 0, 0]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={doorGeo} attach="geometry" />
              <meshStandardMaterial color={getPanelColor('door')} roughness={0.6} />
            </mesh>
            {skeletonView && (
              <lineSegments position={[-doorPivotX, 0, 0]}>
                <edgesGeometry args={[doorGeo]} />
                <lineBasicMaterial color={getPanelColor('door')} linewidth={2} />
              </lineSegments>
            )}
            {showHinges && !skeletonView && (
              <group position={[-doorPivotX, 0, 0]}>
                <mesh position={[hingeXOffset, doorHeight / 2 - topHingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                  <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[hingeXOffset, -doorHeight / 2 + bottomHingeVerticalOffset, -hingeDepth / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[hingeDiameter / 2, hingeDiameter / 2, hingeDepth, 16]} />
                  <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      )}

      {/* Internal Upright (Support) */}
      {shouldShow('upright') && (
        <mesh position={[uprightX + getOffset('upright')[0], 0 + getOffset('upright')[1], depth / 2 - topStretcherWidth / 2 + getOffset('upright')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={uprightGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('blindPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && (
        <>
          {shouldShow('blindPanelFront') && (
            <lineSegments position={[blindPanelFrontX + getOffset('blindPanelFront')[0], blindPanelFrontY + getOffset('blindPanelFront')[1], doorZ + getOffset('blindPanelFront')[2]]}>
              <edgesGeometry args={[blindPanelFrontGeo]} />
              <lineBasicMaterial color={darkerColor} linewidth={2} />
            </lineSegments>
          )}
          {shouldShow('upright') && (
            <lineSegments position={[uprightX + getOffset('upright')[0], 0 + getOffset('upright')[1], depth / 2 - topStretcherWidth / 2 + getOffset('upright')[2]]}>
              <edgesGeometry args={[uprightGeo]} />
              <lineBasicMaterial color={getPanelColor('blindPanel')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Back Panel */}
      {showBackPanel && shouldShow('backPanel') && (
        <>
          <mesh position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -depth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness]} />
            <meshStandardMaterial color={showDifferentPanelColors ? panelColors.backPanel : backPanelColor} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -depth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Back Stretchers */}
      {showBackStretchers && shouldShow('backStretcherTop') && (
        <>
          <mesh position={[0 + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherTop')} roughness={0.8} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backStretcherTop')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}
      {showBackStretchers && shouldShow('backStretcherBottom') && (
        <>
          <mesh position={[0 + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + wallBottomRecess + getOffset('backStretcherBottom')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherBottom')} roughness={0.8} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + wallBottomRecess + getOffset('backStretcherBottom')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, backStretcherHeight, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backStretcherBottom')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Shelves */}
      {showShelves && numShelves > 0 && Array.from({ length: numShelves }).map((_, i) => {
        const availableHeight = innerHeight - panelThickness * 2;
        const spacing = availableHeight / (numShelves + 1);
        const shelfY = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        
        const shelfW = width - panelThickness * 2 - 2;
        const shelfD = depth - panelThickness - backPanelThickness - 2;
        
        const shelfNotchX = uprightX; 
       
        const shelfGeometry = createPanelWithHolesGeo(
          panelThickness, shelfW, shelfD,
          0, 0, 0, 'py', [], 0, 0, 0,
          [{ u: shelfD / 2, v: shelfNotchX, width: topStretcherWidth, height: panelThickness + 2, alignV: 'center' }]
       );

        return (
          <group key={`shelf-${i}`}>
            <mesh position={[0 + getOffset('shelf')[0], shelfY - panelThickness / 2 + getOffset('shelf')[1], (panelThickness + backPanelThickness) / 2 + getOffset('shelf')[2]]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={shelfGeometry} attach="geometry" />
              <meshStandardMaterial color={getPanelColor('shelf')} roughness={0.8} />
            </mesh>
            {skeletonView && (
              <lineSegments position={[0 + getOffset('shelf')[0], shelfY - panelThickness / 2 + getOffset('shelf')[1], (panelThickness + backPanelThickness) / 2 + getOffset('shelf')[2]]}>
                <edgesGeometry args={[shelfGeometry]} />
                <lineBasicMaterial color={getPanelColor('shelf')} linewidth={2} />
              </lineSegments>
            )}
          </group>
        );
      })}
    </group>
  );
};

export const exportWallCornerCabinetDXF = async (settings: TestingSettings, zip: JSZip) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, backStretcherHeight, topStretcherWidth, blindPanelWidth, blindCornerSide,
    showBackPanel, showBackStretchers, showShelves, numShelves, doorOuterGap
  } = settings;

  const innerWidth = width;
  const innerHeight = height;
  const innerDepth = depth;

  const doorWidth = width - blindPanelWidth - doorOuterGap * 2;
  const doorHeight = innerHeight;
  const isLeftDoor = blindCornerSide === 'left';
  const hingeXOffset = isLeftDoor 
    ? -doorWidth / 2 + settings.hingeHorizontalOffset 
    : doorWidth / 2 - settings.hingeHorizontalOffset;

  const addPanelToZip = (name: string, w: number, h: number, notch?: { x: number, y: number, w: number, h: number }, holesInput?: { y: number, z: number, r: number }[]) => {
    const writer = new DxfWriter();
    writer.setUnits(Units.Millimeters);
    const modelSpace = writer.modelSpace;
    
    const points = [
      { point: { x: 0, y: 0 } },
      { point: { x: w, y: 0 } }
    ];

    if (notch) {
      points.push({ point: { x: w, y: notch.y } });
      points.push({ point: { x: notch.x + notch.w / 2, y: notch.y } });
      points.push({ point: { x: notch.x + notch.w / 2, y: h - notch.h } });
      points.push({ point: { x: notch.x - notch.w / 2, y: h - notch.h } });
      points.push({ point: { x: notch.x - notch.w / 2, y: notch.y } });
    }

    points.push({ point: { x: 0, y: h } });
    points.push({ point: { x: 0, y: 0 } });

    modelSpace.addLWPolyline(points, { flags: LWPolylineFlags.Closed });

    if (holesInput) {
      writer.addLayer('HOLES', 4, 'CONTINUOUS');
      holesInput.forEach(hole => {
        modelSpace.addCircle(point3d(w/2 + hole.z, h/2 + hole.y, 0), hole.r, { layerName: 'HOLES' });
      });
    }

    modelSpace.addText(point3d(w/2, h/2, 0), 10, name);
    zip.file(`${name}.dxf`, writer.stringify());
  };

  const sidePanelHeight = innerHeight - panelThickness * 2;
  
  addPanelToZip('Left_Panel', depth, sidePanelHeight);
  addPanelToZip('Right_Panel', depth, sidePanelHeight);
  addPanelToZip('Bottom_Panel', width, depth);
  addPanelToZip('Top_Panel', width, depth);
  addPanelToZip('Front_Blind_Panel', blindPanelWidth - doorOuterGap * 2, innerHeight);
  
  const hingeHoles = [{ y: doorHeight / 2 - settings.hingeVerticalOffset, z: hingeXOffset, r: settings.hingeDiameter / 2 }, { y: -doorHeight / 2 + settings.hingeVerticalOffset, z: hingeXOffset, r: settings.hingeDiameter / 2 }];
  addPanelToZip('Front_Door', doorWidth, doorHeight, undefined, hingeHoles);
  
  const supportH = sidePanelHeight;
  addPanelToZip('Internal_Support', topStretcherWidth, supportH);
  
  if (showBackPanel) {
    addPanelToZip('Back_Panel', width - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }

  const stretcherW = width - panelThickness * 2;
  if(showBackStretchers) {
    addPanelToZip('Back_Stretcher_Top', stretcherW, backStretcherHeight);
    addPanelToZip('Back_Stretcher_Bottom', stretcherW, backStretcherHeight);
  }

  if (showShelves && numShelves > 0) {
    const shelfW = width - panelThickness * 2 - 2;
    const shelfD = depth - panelThickness - backPanelThickness - 2;
    const notchV = blindCornerSide === 'left' ? -shelfW / 2 + blindPanelWidth : shelfW / 2 - blindPanelWidth;
    
    for (let i = 0; i < numShelves; i++) {
      addPanelToZip(`Shelf_${i + 1}`, shelfW, shelfD, { 
        x: shelfW / 2 + notchV, 
        y: shelfD, 
        w: panelThickness + 2, 
        h: topStretcherWidth 
      });
    }
  }
};
