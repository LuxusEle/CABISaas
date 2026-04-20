import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, Units, LWPolylineFlags, point3d } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  createDoorWithHingeHoles,
  panelColors,
  woodPalette
} from './CabinetTestingUtils';

interface Props {
  settings: TestingSettings;
}

export const BaseCornerCabinetTesting: React.FC<Props> = ({ settings }) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, toeKickHeight, backStretcherHeight, topStretcherWidth, 
    showBackPanel, showBackStretchers, showShelves, numShelves,
    skeletonView, partsSeparatedView, selectedPart, showDifferentPanelColors,
    blindPanelWidth, blindCornerSide, doorMaterialThickness, doorOuterGap, doorToPanelGap,
    showDoors, doorOpenAngle, showHinges, hingeDiameter, hingeDepth, hingeHorizontalOffset, hingeVerticalOffset,
    showNailHoles, nailHoleDiameter, shelfHoleDiameter, nailHoleShelfDistance, shelfDepth, nailHoleDepth
  } = settings;

  const isSelected = settings.isSelected;
  const baseColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const darkerColor = new THREE.Color(isSelected ? '#3b82f6' : woodPalette.carcass);
  const backPanelColor = new THREE.Color(isSelected ? '#60a5fa' : woodPalette.backPanel);
  const doorColor = new THREE.Color(isSelected ? '#2563eb' : woodPalette.door);
  const toeKickColor = new THREE.Color(isSelected ? '#1e40af' : woodPalette.toeKick);
  const shelfColor = new THREE.Color(isSelected ? '#93c5fd' : woodPalette.shelf);

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height - toeKickHeight;
  const innerDepth = depth;

  const isGolaActive = settings.enableGola && showDoors;
  const isDoorOnLeft = blindCornerSide === 'right';
  const isDoorOnRight = blindCornerSide === 'left';

  const getOffset = (part: string): [number, number, number] => {
    if (!partsSeparatedView || selectedPart !== 'all' && selectedPart !== part) return [0, 0, 0];
    const d = 200;
    const offsets: Record<string, [number, number, number]> = {
      leftPanel: [-d, 0, 0],
      rightPanel: [d, 0, 0],
      bottomPanel: [0, -d * 1.5, 0],
      blindPanelFront: [0, 0, d],
      backPanel: [0, 0, -d],
      topStretcherFront: [0, d, d],
      topStretcherBack: [0, d, -d],
      backStretcherTop: [0, 0, -d],
      backStretcherBottom: [0, 0, -d],
      toeKick: [0, -d * 2, d],
      shelf: [0, 0, d * 2],
    };
    return offsets[part] || [0, 0, 0];
  };

  const sideHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const panelHeight = innerHeight - panelThickness;
    const y = panelHeight / 2 - panelThickness / 2; // Top stretcher connection
    const technicalR = nailHoleDiameter / 2;
    const shelfR = shelfHoleDiameter / 2;
    
    // Top Stretchers Back
    const zBack1 = -depth / 2 + (topStretcherWidth / 4);
    const zBack2 = -depth / 2 + (topStretcherWidth * 3 / 4);

    const positions: { y: number, z: number, r: number, through?: boolean }[] = [
      { y, z: zBack1, r: technicalR, through: true },
      { y, z: zBack2, r: technicalR, through: true }
    ];

    if (showShelves && numShelves > 0) {
      const availableHeight = innerHeight - panelThickness * 2;
      const spacing = availableHeight / (numShelves + 1);
      for (let i = 0; i < numShelves; i++) {
        const shelfYCabinet = -innerHeight / 2 + panelThickness + spacing * (i + 1);
        const yLocalSide = shelfYCabinet - panelThickness / 2;
        const holeY = yLocalSide - panelThickness / 2 - nailHoleShelfDistance;
        const shelfZStart = -depth / 2 + panelThickness + backPanelThickness;
        const frontZ = shelfZStart + shelfDepth * 0.25;
        const backZ = shelfZStart + shelfDepth * 0.75;
        positions.push({ y: holeY, z: frontZ, r: shelfR, through: false });
        positions.push({ y: holeY, z: backZ, r: shelfR, through: false });
      }
    }
 
    if (showBackStretchers) {
      const zBackStretcher = -depth / 2 + panelThickness / 2;
      const yTopBackMax = panelHeight / 2;
      positions.push({ y: yTopBackMax - (backStretcherHeight / 4) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      positions.push({ y: yTopBackMax - (backStretcherHeight * 3 / 4) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      const yBottomBackMin = -panelHeight / 2 + panelThickness;
      positions.push({ y: (yBottomBackMin + (backStretcherHeight / 4)) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
      positions.push({ y: (yBottomBackMin + (backStretcherHeight * 3 / 4)) - panelThickness, z: zBackStretcher, r: technicalR, through: true });
    }
    
    return positions;
  }, [showNailHoles, innerHeight, depth, panelThickness, backPanelThickness, nailHoleDiameter, shelfHoleDiameter, topStretcherWidth, showBackStretchers, backStretcherHeight, numShelves, showShelves, nailHoleShelfDistance, shelfDepth]);

  const topStretcherBackHoles = useMemo(() => {
    if (!showNailHoles || !showBackStretchers) return [];
    
    const length = width - panelThickness * 2;
    const technicalR = nailHoleDiameter / 2;
    const y1 = -length / 2 + length / 5;
    const y2 = 0;
    const y3 = length / 2 - length / 5;
    const z = -topStretcherWidth / 2 + panelThickness / 2;
    return [
      { y: y1, z, r: technicalR, through: true },
      { y: y2, z, r: technicalR, through: true },
      { y: y3, z, r: technicalR, through: true }
    ];
  }, [showNailHoles, showBackStretchers, width, panelThickness, nailHoleDiameter, topStretcherWidth]);

  const uprightX = blindCornerSide === 'left'
    ? -width / 2 + blindPanelWidth + panelThickness / 2
    : width / 2 - blindPanelWidth - panelThickness / 2;

  const topStretcherFrontHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    // Connects the vertical internal upright panel
    const technicalR = nailHoleDiameter / 2;
    return [
      { y: uprightX, z: -topStretcherWidth / 2 + topStretcherWidth / 4, r: technicalR, through: true },
      { y: uprightX, z: topStretcherWidth / 2 - topStretcherWidth / 4, r: technicalR, through: true },
    ];
  }, [showNailHoles, nailHoleDiameter, uprightX, topStretcherWidth]);

  // Side Panels (Separate geometries for inward-facing grooves)
  const leftPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    const notches: any[] = [];
    let golaLDepthOffset = 0;
    if (isGolaActive && isDoorOnLeft) {
      golaLDepthOffset = settings.golaLCutoutDepth;
      notches.push({ u: depth / 2, v: sidePanelHeight / 2, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'top' });
    }
    const panelHoles = [...sideHoles];
    if (showNailHoles) {
      const yStr = sidePanelHeight / 2 - panelThickness / 2;
      const rebatedWidth = topStretcherWidth - golaLDepthOffset;
      const zF1 = depth / 2 - golaLDepthOffset - (rebatedWidth / 4);
      const zF2 = depth / 2 - golaLDepthOffset - (rebatedWidth * 3 / 4);
      panelHoles.push({ y: yStr, z: zF1, r: nailHoleDiameter / 2, through: true });
      panelHoles.push({ y: yStr, z: zF2, r: nailHoleDiameter / 2, through: true });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'px', panelHoles, nailHoleDepth, panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnLeft, settings.golaLCutoutDepth, settings.golaLCutoutHeight, showNailHoles, topStretcherWidth, nailHoleDiameter]);

  const rightPanelGeo = useMemo(() => {
    const sidePanelHeight = innerHeight - panelThickness;
    const notches: any[] = [];
    let golaLDepthOffset = 0;
    if (isGolaActive && isDoorOnRight) {
      golaLDepthOffset = settings.golaLCutoutDepth;
      notches.push({ u: depth / 2, v: sidePanelHeight / 2, width: settings.golaLCutoutDepth, height: settings.golaLCutoutHeight, alignV: 'top' });
    }
    const panelHoles = [...sideHoles];
    if (showNailHoles) {
      const yStr = sidePanelHeight / 2 - panelThickness / 2;
      const rebatedWidth = topStretcherWidth - golaLDepthOffset;
      const zF1 = depth / 2 - golaLDepthOffset - (rebatedWidth / 4);
      const zF2 = depth / 2 - golaLDepthOffset - (rebatedWidth * 3 / 4);
      panelHoles.push({ y: yStr, z: zF1, r: nailHoleDiameter / 2, through: true });
      panelHoles.push({ y: yStr, z: zF2, r: nailHoleDiameter / 2, through: true });
    }
    return createPanelWithHolesGeo(
      panelThickness, sidePanelHeight, depth,
      -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
      grooveDepth, 'nx', panelHoles, nailHoleDepth, panelThickness - grooveDepth, 0,
      notches
    );
  }, [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth, sideHoles, nailHoleDepth, isGolaActive, isDoorOnRight, settings.golaLCutoutDepth, settings.golaLCutoutHeight, showNailHoles, topStretcherWidth, nailHoleDiameter]);

  // Top Back Stretcher (Horizontal with groove)
  const topStretcherBackGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, width - panelThickness * 2, topStretcherWidth,
    -topStretcherWidth / 2 + panelThickness + backPanelThickness, -topStretcherWidth / 2 + panelThickness,
    grooveDepth, 'ny', topStretcherBackHoles, nailHoleDepth, 0, 0
  ), [width, panelThickness, topStretcherWidth, backPanelThickness, grooveDepth, topStretcherBackHoles, nailHoleDepth]);

  const blindWidthFront = blindPanelWidth - doorOuterGap * 2;
  const doorWidth = width - blindPanelWidth - doorOuterGap * 2;

  // Top Front Stretcher (Horizontal)
  const topStretcherFrontGeo = useMemo(() => {
    const stretcherXSize = innerWidth - panelThickness * 2;
    const notches: any[] = [];
    // Calculate full door coverage for the stretcher notch, leaving the vertical support panel covered
    const doorCoverageLength = innerWidth - blindPanelWidth - panelThickness * 2;
    
    if (isGolaActive) {
      notches.push({
        u: topStretcherWidth / 2, 
        v: isDoorOnLeft ? -stretcherXSize / 2 : stretcherXSize / 2,
        width: settings.golaLCutoutDepth, 
        height: doorCoverageLength, 
        alignV: isDoorOnLeft ? 'bottom' : 'top'
      });
    }
    return createPanelWithHolesGeo(
      panelThickness, stretcherXSize, topStretcherWidth,
      0, 0, 0, 'py', topStretcherFrontHoles, nailHoleDepth, 0, 0,
      notches
    );
  }, [innerWidth, panelThickness, topStretcherWidth, topStretcherFrontHoles, nailHoleDepth, isGolaActive, settings.golaLCutoutDepth, doorWidth, doorOuterGap, isDoorOnLeft]);

  const bottomPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    // Toekick (3 holes)
    const tkZ = depth / 2 - 50 - panelThickness / 2;
    holes.push({ y: -innerWidth / 2 + innerWidth / 5, z: tkZ, r: technicalR, through: true });
    holes.push({ y: 0, z: tkZ, r: technicalR, through: true });
    holes.push({ y: innerWidth / 2 - innerWidth / 5, z: tkZ, r: technicalR, through: true });

    // Side Panels
    const lpX = -innerWidth / 2 + panelThickness / 2;
    const rpX = innerWidth / 2 - panelThickness / 2;
    const zDist = [ -innerDepth / 2 + innerDepth / 5, 0, innerDepth / 2 - innerDepth / 5 ];
    zDist.forEach(zVal => {
      holes.push({ y: lpX, z: zVal, r: technicalR, through: true });
      holes.push({ y: rpX, z: zVal, r: technicalR, through: true });
    });

    // Back Bottom Stretcher (3 holes)
    if (showBackStretchers) {
      const bbsZ = -depth / 2 + panelThickness / 2;
      holes.push({ y: -innerWidth / 2 + innerWidth / 5, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: 0, z: bbsZ, r: technicalR, through: true });
      holes.push({ y: innerWidth / 2 - innerWidth / 5, z: bbsZ, r: technicalR, through: true });
    }

    // Vertical Support Panel (2 holes)
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

  const blindPanelHeight = innerHeight - doorOuterGap;
  let doorHeight = innerHeight - doorOuterGap;
  let doorYOffset = 0;
  if (isGolaActive) {
    doorHeight -= settings.doorOverride;
    doorYOffset = -settings.doorOverride / 2;
  }

  const blindPanelHoles = useMemo(() => {
    if (!showNailHoles) return [];
    
    const technicalR = nailHoleDiameter / 2;
    const holes: { y: number, z: number, r: number, through?: boolean }[] = [];
    
    // Top front stretcher
    const yTopStretcher = innerHeight / 2 - panelThickness / 2;
    holes.push({ y: yTopStretcher, z: -blindWidthFront / 2 + blindWidthFront / 5, r: technicalR, through: true });
    holes.push({ y: yTopStretcher, z: 0, r: technicalR, through: true });
    holes.push({ y: yTopStretcher, z: blindWidthFront / 2 - blindWidthFront / 5, r: technicalR, through: true });

    // Bottom panel
    const yBottomPanel = -innerHeight / 2 + panelThickness / 2;
    holes.push({ y: yBottomPanel, z: -blindWidthFront / 2 + blindWidthFront / 5, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: 0, r: technicalR, through: true });
    holes.push({ y: yBottomPanel, z: blindWidthFront / 2 - blindWidthFront / 5, r: technicalR, through: true });

    // Side panel
    const sidePanelLocalX = blindCornerSide === 'left' 
      ? panelThickness / 2 - blindPanelWidth / 2 
      : blindPanelWidth / 2 - panelThickness / 2;
      
    holes.push({ y: -blindPanelHeight / 2 + blindPanelHeight / 5, z: sidePanelLocalX, r: technicalR, through: true });
    holes.push({ y: 0, z: sidePanelLocalX, r: technicalR, through: true });
    holes.push({ y: blindPanelHeight / 2 - blindPanelHeight / 5, z: sidePanelLocalX, r: technicalR, through: true });

    return holes;
  }, [showNailHoles, nailHoleDiameter, innerHeight, panelThickness, blindWidthFront, blindCornerSide, blindPanelWidth, blindPanelHeight]);

  const isLeftDoor = blindCornerSide === 'left'; // If blind is left, door is left hinged (on the upright)
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
    const dividerHeight = innerHeight - panelThickness * 2;
    const dividerDepth = topStretcherWidth;
    return new THREE.BoxGeometry(panelThickness, dividerHeight, dividerDepth);
  }, [innerHeight, panelThickness, topStretcherWidth]);

  // Positions
  const blindPanelFrontX = blindCornerSide === 'left' 
    ? -width / 2 + blindPanelWidth / 2 
    : width / 2 - blindPanelWidth / 2;

  const blindPanelFrontY = 0; // Same vertical base as door

  const doorX = blindCornerSide === 'left'
    ? width / 2 - doorWidth / 2 - doorOuterGap
    : -width / 2 + doorWidth / 2 + doorOuterGap;

  const doorZ = depth / 2 + doorMaterialThickness / 2;

  const shouldShow = (part: string): boolean => {
    if (!partsSeparatedView) return true;
    return selectedPart === 'all' || selectedPart === part;
  };

  return (
    <group position={[width / 2, toeKickHeight + innerHeight / 2, depth / 2]}>
      {/* Bottom Panel */}
      {shouldShow('bottomPanel') && (
        <mesh position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={bottomPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('bottomPanel') && (
        <lineSegments position={[0 + getOffset('bottomPanel')[0], -innerHeight / 2 + panelThickness / 2 + getOffset('bottomPanel')[1], 0 + getOffset('bottomPanel')[2]]}>
          <edgesGeometry args={[bottomPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('bottomPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Left Panel */}
      {shouldShow('leftPanel') && (
        <mesh position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], panelThickness / 2 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={leftPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('leftPanel') && (
        <lineSegments position={[-width / 2 + panelThickness / 2 + getOffset('leftPanel')[0], panelThickness / 2 + getOffset('leftPanel')[1], 0 + getOffset('leftPanel')[2]]}>
          <edgesGeometry args={[leftPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('leftPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Right Panel */}
      {shouldShow('rightPanel') && (
        <mesh position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={rightPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {/* Front Blind Panel */}
      {shouldShow('blindPanelFront') && (
        <mesh position={[blindPanelFrontX + getOffset('blindPanelFront')[0], blindPanelFrontY + getOffset('blindPanelFront')[1], doorZ + getOffset('blindPanelFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={blindPanelFrontGeo} attach="geometry" />
          <meshStandardMaterial color={darkerColor} roughness={0.4} metalness={0} />
        </mesh>
      )}

      {/* Door */}
      {showDoors && shouldShow('door') && (
        <group position={[doorX + getOffset('door')[0], doorYOffset + getOffset('door')[1], doorZ + getOffset('door')[2]]}>
          <group position={[doorPivotX, 0, 0]} rotation={[0, rotationDirection * doorAngleRad, 0]}>
            <mesh position={[-doorPivotX, 0, 0]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={doorGeo} attach="geometry" />
              <meshStandardMaterial color={doorColor} roughness={0.4} metalness={0} />
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
          <meshStandardMaterial color={getPanelColor('blindPanel')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
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
            <meshStandardMaterial color={showDifferentPanelColors ? panelColors.backPanel : backPanelColor} roughness={0.5} metalness={0} side={THREE.DoubleSide} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('backPanel')[0], 0 + getOffset('backPanel')[1], -depth / 2 + panelThickness + backPanelThickness / 2 + getOffset('backPanel')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2, backPanelThickness)]} />
              <lineBasicMaterial color={getPanelColor('backPanel')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Top Stretchers */}
      {shouldShow('topStretcherFront') && (
        <>
          <mesh position={[0 + getOffset('topStretcherFront')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1], depth / 2 - topStretcherWidth / 2 + getOffset('topStretcherFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={topStretcherFrontGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('topStretcherFront')} roughness={0.4} metalness={0} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('topStretcherFront')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1], depth / 2 - topStretcherWidth / 2 + getOffset('topStretcherFront')[2]]}>
              <edgesGeometry args={[topStretcherFrontGeo]} />
              <lineBasicMaterial color={getPanelColor('topStretcherFront')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}
      {showBackStretchers && shouldShow('topStretcherBack') && (
        <>
          <mesh position={[0 + getOffset('topStretcherBack')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1], -depth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={topStretcherBackGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('topStretcherBack')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('topStretcherBack')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1], -depth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]]}>
              <edgesGeometry args={[topStretcherBackGeo]} />
              <lineBasicMaterial color={getPanelColor('topStretcherBack')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}

      {/* Back Stretchers */}
      {showBackStretchers && shouldShow('backStretcherTop') && (
        <>
          <mesh position={[0 + getOffset('backStretcherTop')[0], innerHeight / 2 - panelThickness - backStretcherHeight / 2 + getOffset('backStretcherTop')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherTop')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherTop')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
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
          <mesh position={[0 + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, backStretcherHeight, panelThickness]} />
            <meshStandardMaterial color={getPanelColor('backStretcherBottom')} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('backStretcherBottom')[0], -innerHeight / 2 + panelThickness + backStretcherHeight / 2 + getOffset('backStretcherBottom')[1], -depth / 2 + panelThickness / 2 + getOffset('backStretcherBottom')[2]]}>
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
        
        // Shelf notch logic - centered on uprightX
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
              <meshStandardMaterial color={shelfColor} roughness={0.4} metalness={0} side={THREE.DoubleSide} />
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

      {/* Toe Kick */}
      {toeKickHeight > 0 && shouldShow('toeKick') && (
        <>
          <mesh position={[0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[width, toeKickHeight, panelThickness]} />
            <meshStandardMaterial color={toeKickColor} roughness={0.4} metalness={0} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(width, toeKickHeight, panelThickness)]} />
              <lineBasicMaterial color={getPanelColor('toeKick')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}
    </group>
  );
};

export const exportBaseCornerCabinetDXF = async (settings: TestingSettings, zip: JSZip) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, toeKickHeight, backStretcherHeight, topStretcherWidth, blindPanelWidth, blindCornerSide,
    showBackPanel, showShelves, numShelves, doorOuterGap
  } = settings;

  const innerWidth = width;
  const innerHeight = height - toeKickHeight;
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
      // In this coordinate system for DXF: 
      // w is along X, h is along Y. 
      // Shelf is exported as W x D. 
      // Notch is at front (Y=h).
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

  addPanelToZip('Left_Panel', depth, innerHeight - panelThickness);
  addPanelToZip('Right_Panel', depth, innerHeight - panelThickness);
  addPanelToZip('Bottom_Panel', width, depth);
  addPanelToZip('Front_Blind_Panel', blindPanelWidth - doorOuterGap * 2, innerHeight);
  
  const hingeHoles = [{ y: doorHeight / 2 - settings.hingeVerticalOffset, z: hingeXOffset, r: settings.hingeDiameter / 2 }, { y: -doorHeight / 2 + settings.hingeVerticalOffset, z: hingeXOffset, r: settings.hingeDiameter / 2 }];
  addPanelToZip('Front_Door', doorWidth, doorHeight, undefined, hingeHoles);
  const supportH = innerHeight - panelThickness * 2;
  addPanelToZip('Internal_Support', topStretcherWidth, supportH);
  
  if (showBackPanel) {
    addPanelToZip('Back_Panel', width - panelThickness * 2 + grooveDepth * 2, innerHeight - panelThickness * 2 + grooveDepth * 2);
  }

  const stretcherW = width - panelThickness * 2;
  addPanelToZip('Top_Stretcher_Front', stretcherW, topStretcherWidth);
  addPanelToZip('Top_Stretcher_Back', stretcherW, topStretcherWidth);
  addPanelToZip('Back_Stretcher_Top', stretcherW, backStretcherHeight);
  addPanelToZip('Back_Stretcher_Bottom', stretcherW, backStretcherHeight);

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

  addPanelToZip('Toe_Kick', width, toeKickHeight);
};
