import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DxfWriter, Units, LWPolylineFlags, point3d } from '@tarikjabiri/dxf';
import JSZip from 'jszip';
import { 
  TestingSettings, 
  createPanelWithHolesGeo, 
  panelColors 
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
    blindPanelWidth, blindCornerSide
  } = settings;

  const darkerColor = new THREE.Color('#d4a574').multiplyScalar(0.7);
  const backPanelColor = new THREE.Color('#c9a87c');

  const getPanelColor = (panelType: string): THREE.Color => {
    if (!showDifferentPanelColors) return darkerColor;
    return (panelColors as any)[panelType] || darkerColor;
  };

  const innerWidth = width;
  const innerHeight = height - toeKickHeight;
  const innerDepth = depth;

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

  // Side Panels (Separate geometries for inward-facing grooves)
  const leftPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerHeight - panelThickness, depth,
    -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'px', [], 0, panelThickness - grooveDepth, 0
  ), [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth]);

  const rightPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerHeight - panelThickness, depth,
    -depth / 2 + panelThickness, -depth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'nx', [], 0, panelThickness - grooveDepth, 0
  ), [panelThickness, innerHeight, depth, backPanelThickness, grooveDepth]);

  // Top Back Stretcher (Horizontal with groove)
  const topStretcherBackGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, width - panelThickness * 2, topStretcherWidth,
    -topStretcherWidth / 2 + panelThickness + backPanelThickness, -topStretcherWidth / 2 + panelThickness,
    grooveDepth, 'ny', [], 0, 0, 0
  ), [width, panelThickness, topStretcherWidth, backPanelThickness, grooveDepth]);

  // Bottom Panel
  const bottomPanelGeo = useMemo(() => createPanelWithHolesGeo(
    panelThickness, innerWidth, innerDepth,
    -innerDepth / 2 + panelThickness, -innerDepth / 2 + panelThickness + backPanelThickness,
    grooveDepth, 'py', [], 0, panelThickness, panelThickness
  ), [innerWidth, panelThickness, innerDepth, backPanelThickness, grooveDepth]);

  // Blind Panels (Dividers)
  const blindPanelGeo = useMemo(() => {
    const dividerHeight = innerHeight - panelThickness * 2;
    const dividerDepth = topStretcherWidth;
    return new THREE.BoxGeometry(panelThickness, dividerHeight, dividerDepth);
  }, [innerHeight, panelThickness, topStretcherWidth]);

  const blindX = blindCornerSide === 'left' 
    ? -width / 2 + blindPanelWidth 
    : width / 2 - blindPanelWidth;

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
          <meshStandardMaterial color={getPanelColor('bottomPanel')} roughness={0.8} side={THREE.DoubleSide} />
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
          <meshStandardMaterial color={getPanelColor('leftPanel')} roughness={0.8} side={THREE.DoubleSide} />
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
          <meshStandardMaterial color={getPanelColor('rightPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && shouldShow('rightPanel') && (
        <lineSegments position={[width / 2 - panelThickness / 2 + getOffset('rightPanel')[0], panelThickness / 2 + getOffset('rightPanel')[1], 0 + getOffset('rightPanel')[2]]}>
          <edgesGeometry args={[rightPanelGeo]} />
          <lineBasicMaterial color={getPanelColor('rightPanel')} linewidth={2} />
        </lineSegments>
      )}

      {shouldShow('blindPanelFront') && (
        <mesh position={[blindX + getOffset('blindPanelFront')[0], 0 + getOffset('blindPanelFront')[1], depth / 2 - topStretcherWidth / 2 + getOffset('blindPanelFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <primitive object={blindPanelGeo} attach="geometry" />
          <meshStandardMaterial color={getPanelColor('blindPanel')} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skeletonView && (
        <>
          {shouldShow('blindPanelFront') && (
            <lineSegments position={[blindX + getOffset('blindPanelFront')[0], 0 + getOffset('blindPanelFront')[1], depth / 2 - topStretcherWidth / 2 + getOffset('blindPanelFront')[2]]}>
              <edgesGeometry args={[blindPanelGeo]} />
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

      {/* Top Stretchers */}
      {showBackStretchers && shouldShow('topStretcherFront') && (
        <>
          <mesh position={[0 + getOffset('topStretcherFront')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1], depth / 2 - topStretcherWidth / 2 + getOffset('topStretcherFront')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <boxGeometry args={[innerWidth - panelThickness * 2, panelThickness, topStretcherWidth]} />
            <meshStandardMaterial color={getPanelColor('topStretcherFront')} roughness={0.8} />
          </mesh>
          {skeletonView && (
            <lineSegments position={[0 + getOffset('topStretcherFront')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherFront')[1], depth / 2 - topStretcherWidth / 2 + getOffset('topStretcherFront')[2]]}>
              <edgesGeometry args={[new THREE.BoxGeometry(innerWidth - panelThickness * 2, panelThickness, topStretcherWidth)]} />
              <lineBasicMaterial color={getPanelColor('topStretcherFront')} linewidth={2} />
            </lineSegments>
          )}
        </>
      )}
      {showBackStretchers && shouldShow('topStretcherBack') && (
        <>
          <mesh position={[0 + getOffset('topStretcherBack')[0], innerHeight / 2 - panelThickness / 2 + getOffset('topStretcherBack')[1], -depth / 2 + topStretcherWidth / 2 + getOffset('topStretcherBack')[2]]} castShadow receiveShadow visible={!skeletonView}>
            <primitive object={topStretcherBackGeo} attach="geometry" />
            <meshStandardMaterial color={getPanelColor('topStretcherBack')} roughness={0.8} side={THREE.DoubleSide} />
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
            <meshStandardMaterial color={getPanelColor('backStretcherTop')} roughness={0.8} side={THREE.DoubleSide} />
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
            <meshStandardMaterial color={getPanelColor('backStretcherBottom')} roughness={0.8} side={THREE.DoubleSide} />
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
        
        const localBlindX = blindX;
        
        const shelfGeometry = createPanelWithHolesGeo(
          panelThickness, shelfW, shelfD,
          0, 0, 0, 'py', [], 0, 0, 0,
          [{ u: shelfD / 2, v: localBlindX, width: topStretcherWidth, height: panelThickness + 2, alignV: 'center' }]
        );

        return (
          <group key={`shelf-${i}`}>
            <mesh position={[0 + getOffset('shelf')[0], shelfY - panelThickness / 2 + getOffset('shelf')[1], (panelThickness + backPanelThickness) / 2 + getOffset('shelf')[2]]} castShadow receiveShadow visible={!skeletonView}>
              <primitive object={shelfGeometry} attach="geometry" />
              <meshStandardMaterial color={getPanelColor('shelf')} roughness={0.8} side={THREE.DoubleSide} />
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
        <mesh position={[0 + getOffset('toeKick')[0], -innerHeight / 2 - toeKickHeight / 2 + getOffset('toeKick')[1], depth / 2 - 50 - panelThickness / 2 + getOffset('toeKick')[2]]} castShadow receiveShadow visible={!skeletonView}>
          <boxGeometry args={[width, toeKickHeight, panelThickness]} />
          <meshStandardMaterial color={getPanelColor('toeKick')} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
};

export const exportBaseCornerCabinetDXF = async (settings: TestingSettings, zip: JSZip) => {
  const {
    width, height, depth, panelThickness, backPanelThickness,
    grooveDepth, toeKickHeight, backStretcherHeight, topStretcherWidth, blindPanelWidth, blindCornerSide,
    showBackPanel, showShelves, numShelves
  } = settings;

  const innerWidth = width;
  const innerHeight = height - toeKickHeight;
  const innerDepth = depth;

  const addPanelToZip = (name: string, w: number, h: number, notch?: { x: number, y: number, w: number, h: number }) => {
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
    modelSpace.addText(point3d(w/2, h/2, 0), 10, name);
    zip.file(`${name}.dxf`, writer.stringify());
  };

  addPanelToZip('Left_Panel', depth, innerHeight - panelThickness);
  addPanelToZip('Right_Panel', depth, innerHeight - panelThickness);
  addPanelToZip('Bottom_Panel', width, depth);
  const blindH = innerHeight - panelThickness * 2;
  addPanelToZip('Blind_Panel_Front', topStretcherWidth, blindH);
  
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
    const blindX = blindCornerSide === 'left' ? -width / 2 + blindPanelWidth : width / 2 - blindPanelWidth;
    
    for (let i = 0; i < numShelves; i++) {
      addPanelToZip(`Shelf_${i + 1}`, shelfW, shelfD, { 
        x: shelfW / 2 + blindX, 
        y: shelfD, 
        w: panelThickness + 2, 
        h: topStretcherWidth 
      });
    }
  }

  addPanelToZip('Toe_Kick', width, toeKickHeight);
};
