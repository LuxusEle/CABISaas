import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Global Geometry Cache for Performance Optimization
const geometryCache = new Map<string, THREE.BufferGeometry>();

export const clearGeometryCache = () => {
  geometryCache.forEach(geo => geo.dispose());
  geometryCache.clear();
};

export const getCachedGeometry = (type: string, params: any, creator: () => THREE.BufferGeometry) => {
  const key = `${type}-${JSON.stringify(params)}`;
  if (geometryCache.has(key)) {
    return geometryCache.get(key)!;
  }
  const geo = creator();
  geometryCache.set(key, geo);
  return geo;
};

export const woodPalette = {
  carcass: '#b08968',    // Medium wood brown
  door: '#7f5539',       // Darker wood brown (distinct)
  backPanel: '#e6be8a',  // Lighter birch/plywood
  shelf: '#c6ac8f',      // Medium-light wood
  toeKick: '#582f0e',    // Dark wood for base
  internal: '#d4a373',   // Internal dividers
  blindPanel: '#b08968'  // Same as carcass
};

/**
 * Calculates nail hole positions based on panel length.
 * If length < 300mm: 2 holes at 1/4 and 3/4.
 * If length >= 300mm: 3 holes with 50mm offset from ends and one at center.
 * Returns positions relative to the center of the panel (range: -length/2 to length/2).
 */
export const calculateNailHolePositions = (length: number): number[] => {
  if (length < 300) {
    return [-length / 4, length / 4];
  } else {
    return [-length / 2 + 50, 0, length / 2 - 50];
  }
};

export interface TestingSettings {
  width: number;
  height: number;
  depth: number;
  panelThickness: number;
  backPanelThickness: number;
  doorMaterialThickness: number;
  grooveDepth: number;
  doorToDoorGap: number;
  doorToPanelGap: number;
  drawerToDrawerGap: number;
  doorOuterGap: number;
  doorInnerGap: number;
  doorSideClearance: number;
  doorOverride: number;
  toeKickHeight: number;
  backStretcherHeight: number;
  topStretcherWidth: number;
  showBackPanel: boolean;
  showBackStretchers: boolean;
  showDoors: boolean;
  showDrawers: boolean;
  enableGola: boolean;
  showHinges: boolean;
  skeletonView: boolean;
  partsSeparatedView: boolean;
  selectedPart: string;
  numDrawers: number;
  numShelves: number;
  showShelves: boolean;
  cabinetType: 'base' | 'sink' | 'wall' | 'tall' | 'corner' | 'wall_corner';
  blindPanelWidth: number;
  blindCornerSide: 'left' | 'right';
  hingeDiameter: number;
  hingeDepth: number;
  hingeHorizontalOffset: number;
  hingeVerticalOffset: number;
  showDifferentPanelColors: boolean;
  showNailHoles: boolean;
  nailHoleDiameter: number;
  shelfHoleDiameter: number;
  wallBottomRecess: number;
  nailHoleShelfDistance: number;
  nailHoleDepth: number;
  shelfDepth: number;
  drawerSideClearance: number;
  drawerBottomThickness: number;
  drawerBackThickness: number;
  drawerBoxHeightRatio: number;
  drawerBackClearance: number;
  golaCutoutDepth: number;
  opacity: number;
  golaLCutoutDepth: number;
  golaLCutoutHeight: number;
  golaCCutoutHeight: number;
  golaTopGap: number;
  doorOpenAngle: number;
  drawerOpenDistances: number[];
  tallLowerSectionHeight: number;
  tallUpperSectionHeight: number;
  showLowerShelves: boolean;
  numLowerShelves: number;
  showLowerDoors: boolean;
  lowerSectionDrawerStackHeight: number;
  enableTallUpperGola: boolean;
  showUpperDoors: boolean;
  lowerDoorOpenAngle: number;
  isSelected: boolean;
  isStudio?: boolean;
  preset?: string;
  carcassTexture?: THREE.Texture;
  doorTexture?: THREE.Texture;
  shelfTexture?: THREE.Texture;
  elevationOffset?: number;
  enableColumn: boolean;
  columnWidth: number;
  columnDepth: number;
}

export const DEFAULT_SETTINGS: TestingSettings = {
  width: 600,
  height: 870,
  depth: 560,
  panelThickness: 18,
  backPanelThickness: 6,
  doorMaterialThickness: 18,
  grooveDepth: 5,
  doorToDoorGap: 2.0,
  doorToPanelGap: 2.0,
  drawerToDrawerGap: 2.0,
  doorOuterGap: 2.0,
  doorInnerGap: 2.0,
  doorSideClearance: 2.0,
  doorOverride: 25,
  toeKickHeight: 100,
  backStretcherHeight: 100,
  topStretcherWidth: 100,
  showBackPanel: true,
  showBackStretchers: true,
  showDoors: true,
  showDrawers: false,
  enableGola: false,
  showHinges: false,
  skeletonView: false,
  partsSeparatedView: false,
  selectedPart: 'all',
  numDrawers: 3,
  numShelves: 2,
  showShelves: true,
  cabinetType: 'base',
  hingeDiameter: 16,
  hingeDepth: 7,
  hingeHorizontalOffset: 40,
  hingeVerticalOffset: 60,
  showDifferentPanelColors: false,
  showNailHoles: true,
  nailHoleDiameter: 5,
  shelfHoleDiameter: 5,
  wallBottomRecess: 0,
  nailHoleShelfDistance: 10,
  nailHoleDepth: 5,
  shelfDepth: 560 - 18 - 6,
  drawerSideClearance: 5,
  drawerBottomThickness: 12,
  drawerBackThickness: 12,
  drawerBoxHeightRatio: 0.8,
  drawerBackClearance: 5,
  doorOpenAngle: 0,
  drawerOpenDistances: [0, 0, 0, 0, 0],
  golaCutoutDepth: 26,
  golaLCutoutDepth: 26,
  opacity: 1,
  isSelected: false,
  golaLCutoutHeight: 45,
  golaCCutoutHeight: 45,
  golaTopGap: 45,
  tallLowerSectionHeight: 720,
  tallUpperSectionHeight: 720,
  showLowerShelves: true,
  numLowerShelves: 2,
  showLowerDoors: true,
  lowerDoorOpenAngle: 0,
  lowerSectionDrawerStackHeight: 720,
  enableTallUpperGola: false,
  showUpperDoors: true,
  blindPanelWidth: 400,
  blindCornerSide: 'left',
  enableColumn: false,
  columnWidth: 150,
  columnDepth: 100
};

export const RUBY_DOOR_THRESHOLD = 599.5;

export const createDoorWithHingeHoles = (
  doorWidth: number, 
  doorHeight: number, 
  doorThickness: number, 
  hingeXOffset: number, 
  hingeRadius: number,
  hingeDepthVal: number,
  hingeVerticalOffsetTop: number,
  hingeVerticalOffsetBottom: number
) => {
    const hingeDepth = hingeDepthVal;
    const backThickness = doorThickness - hingeDepth;

  const shape = new THREE.Shape();
  shape.moveTo(-doorWidth / 2, -doorHeight / 2);
  shape.lineTo(doorWidth / 2, -doorHeight / 2);
  shape.lineTo(doorWidth / 2, doorHeight / 2);
  shape.lineTo(-doorWidth / 2, doorHeight / 2);
  shape.lineTo(-doorWidth / 2, -doorHeight / 2);

  const hingeHole1 = new THREE.Path();
  hingeHole1.absarc(hingeXOffset, doorHeight / 2 - hingeVerticalOffsetTop, hingeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hingeHole1);

  const hingeHole2 = new THREE.Path();
  hingeHole2.absarc(hingeXOffset, -doorHeight / 2 + hingeVerticalOffsetBottom, hingeRadius, 0, Math.PI * 2, false);
  shape.holes.push(hingeHole2);

  const frontGeo = new THREE.ExtrudeGeometry(shape, { depth: hingeDepth, bevelEnabled: false, curveSegments: 8 });
  frontGeo.translate(0, 0, -doorThickness / 2);

  const backShape = new THREE.Shape();
  backShape.moveTo(-doorWidth / 2, -doorHeight / 2);
  backShape.lineTo(doorWidth / 2, -doorHeight / 2);
  backShape.lineTo(doorWidth / 2, doorHeight / 2);
  backShape.lineTo(-doorWidth / 2, doorHeight / 2);
  backShape.lineTo(-doorWidth / 2, -doorHeight / 2);

  const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: backThickness, bevelEnabled: false, curveSegments: 8 });
  backGeo.translate(0, 0, -doorThickness / 2 + hingeDepth);

  let mergedGeo = BufferGeometryUtils.mergeGeometries([frontGeo, backGeo]);
  mergedGeo.center();

  mergedGeo.computeVertexNormals();
  mergedGeo.computeBoundingBox();
  
  const bbox = mergedGeo.boundingBox;
  if (!bbox) return mergedGeo;

  const newPositions = mergedGeo.attributes.position;
  const normals = mergedGeo.attributes.normal;
  const uvs = new Float32Array(newPositions.count * 2);
  for (let i = 0; i < newPositions.count; i++) {
    const x = newPositions.getX(i) - bbox.min.x;
    const y = newPositions.getY(i) - bbox.min.y;
    const z = newPositions.getZ(i) - bbox.min.z;
    const nx = Math.abs(normals.getX(i));
    const ny = Math.abs(normals.getY(i));
    const nz = Math.abs(normals.getZ(i));

    if (nx > ny && nx > nz) {
      uvs[i * 2] = z;
      uvs[i * 2 + 1] = y;
    } else if (ny > nx && ny > nz) {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = z;
    } else {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = y;
    }
  }
  mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  return mergedGeo;
};

export const createGroovedPanelGeo = (
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  grooveLocalZMin: number,
  grooveLocalZMax: number,
  grooveDepth: number,
  grooveFace: 'px' | 'nx' | 'py' | 'ny',
  grooveStartOffset: number = 0,
  grooveEndOffset: number = 0
) => {
    let shapeWidth, shapeHeight, totalLength;
  
  if (grooveFace === 'px' || grooveFace === 'nx') {
    shapeWidth = sizeZ;
    shapeHeight = sizeX;
    totalLength = sizeY;
  } else {
    shapeWidth = sizeZ;
    shapeHeight = sizeY;
    totalLength = sizeX;
  }
  
  const uMin = -shapeWidth / 2;
  const uMax = shapeWidth / 2;
  const vMin = -shapeHeight / 2;
  const vMax = shapeHeight / 2;

  const getShape = (withGroove: boolean) => {
    const shape = new THREE.Shape();
    if (withGroove) {
      if (grooveFace === 'px' || grooveFace === 'py') {
        shape.moveTo(uMin, vMin);
        shape.lineTo(uMax, vMin);
        shape.lineTo(uMax, vMax);
        shape.lineTo(grooveLocalZMax, vMax);
        shape.lineTo(grooveLocalZMax, vMax - grooveDepth);
        shape.lineTo(grooveLocalZMin, vMax - grooveDepth);
        shape.lineTo(grooveLocalZMin, vMax);
        shape.lineTo(uMin, vMax);
        shape.lineTo(uMin, vMin);
      } else {
        shape.moveTo(uMin, vMax);
        shape.lineTo(uMin, vMin);
        shape.lineTo(grooveLocalZMin, vMin);
        shape.lineTo(grooveLocalZMin, vMin + grooveDepth);
        shape.lineTo(grooveLocalZMax, vMin + grooveDepth);
        shape.lineTo(grooveLocalZMax, vMin);
        shape.lineTo(uMax, vMin);
        shape.lineTo(uMax, vMax);
        shape.lineTo(uMin, vMax);
      }
    } else {
      shape.moveTo(uMin, vMin);
      shape.lineTo(uMax, vMin);
      shape.lineTo(uMax, vMax);
      shape.lineTo(uMin, vMax);
      shape.lineTo(uMin, vMin);
    }
    return shape;
  };

  const segments: THREE.BufferGeometry[] = [];
  let currentZ = 0;

  if (grooveStartOffset > 0) {
    const geo = new THREE.ExtrudeGeometry(getShape(false), { depth: grooveStartOffset, bevelEnabled: false, curveSegments: 6 });
    segments.push(geo);
    currentZ += grooveStartOffset;
  }

  const mainLength = totalLength - grooveStartOffset - grooveEndOffset;
  if (mainLength > 0) {
    const geo = new THREE.ExtrudeGeometry(getShape(true), { depth: mainLength, bevelEnabled: false, curveSegments: 6 });
    if (currentZ > 0) geo.translate(0, 0, currentZ);
    segments.push(geo);
    currentZ += mainLength;
  }

  if (grooveEndOffset > 0) {
    const geo = new THREE.ExtrudeGeometry(getShape(false), { depth: grooveEndOffset, bevelEnabled: false, curveSegments: 6 });
    if (currentZ > 0) geo.translate(0, 0, currentZ);
    segments.push(geo);
  }

  let finalGeo = segments.length > 1 
    ? BufferGeometryUtils.mergeGeometries(segments) 
    : segments[0];

  const positions = finalGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i);
    const v = positions.getY(i);
    const w = positions.getZ(i) - totalLength / 2;

    if (grooveFace === 'px' || grooveFace === 'nx') {
      positions.setXYZ(i, v, w, u);
    } else {
      positions.setXYZ(i, w, v, u);
    }
  }

  finalGeo.computeVertexNormals();
  finalGeo.computeBoundingBox();
  
  const bbox = finalGeo.boundingBox;
  if (!bbox) return finalGeo;
  
  const newPositions = finalGeo.attributes.position;
  const normals = finalGeo.attributes.normal;
  const uvs = new Float32Array(newPositions.count * 2);
  for (let i = 0; i < newPositions.count; i++) {
    const x = newPositions.getX(i) - bbox.min.x;
    const y = newPositions.getY(i) - bbox.min.y;
    const z = newPositions.getZ(i) - bbox.min.z;
    const nx = Math.abs(normals.getX(i));
    const ny = Math.abs(normals.getY(i));
    const nz = Math.abs(normals.getZ(i));

    if (nx > ny && nx > nz) {
      uvs[i * 2] = z;
      uvs[i * 2 + 1] = y;
    } else if (ny > nx && ny > nz) {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = z;
    } else {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = y;
    }
  }
  finalGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  return finalGeo;
};

export const createPanelWithHolesGeo = (
  sizeX: number, // thickness
  sizeY: number, // height
  sizeZ: number, // depth
  grooveLocalZMin: number,
  grooveLocalZMax: number,
  grooveDepth: number,
  grooveFace: 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz' | 'none',
  holes: { y: number, z: number, r: number, through?: boolean }[],
  holeDepth: number,
  grooveStartOffset: number = 0,
  grooveEndOffset: number = 0,
  notches: { u: number, v: number, width: number, height: number, alignV: 'top' | 'bottom' | 'center', side?: 'uMax' | 'uMin' }[] = []
) => {
    const uMin = -sizeZ / 2;
  const uMax = sizeZ / 2;
  const vMin = -sizeY / 2;
  const vMax = sizeY / 2;

  const createBaseShape = (includeGroove: boolean, includePartialHoles: boolean, includeThroughHoles: boolean) => {
    const shape = new THREE.Shape();
    
    const tol = 0.001;
    
    // Separate and clamp notches by side
    const uMaxNotches = notches.filter(n => !n.side || n.side === 'uMax')
      .map(n => {
        const nVMinRaw = n.alignV === 'top' ? n.v - n.height : (n.alignV === 'center' ? n.v - n.height/2 : n.v);
        const nVMaxRaw = nVMinRaw + n.height;
        return {
          ...n,
          nVMin: Math.max(vMin, nVMinRaw),
          nVMax: Math.min(vMax, nVMaxRaw),
          width: Math.min(sizeZ, n.width)
        };
      })
      .filter(n => n.nVMax > n.nVMin + tol)
      .sort((a, b) => a.nVMin - b.nVMin);

    const uMinNotches = notches.filter(n => n.side === 'uMin')
      .map(n => {
        const nVMinRaw = n.alignV === 'top' ? n.v - n.height : (n.alignV === 'center' ? n.v - n.height/2 : n.v);
        const nVMaxRaw = nVMinRaw + n.height;
        return {
          ...n,
          nVMin: Math.max(vMin, nVMinRaw),
          nVMax: Math.min(vMax, nVMaxRaw),
          width: Math.min(sizeZ, n.width)
        };
      })
      .filter(n => n.nVMax > n.nVMin + tol)
      .sort((a, b) => a.nVMin - b.nVMin);
    
    // Start at bottom-left (uMin, vMin) and go around
    // 1. Bottom edge (potentially with a notch at uMin corner)
    let currentV = vMin;
    if (uMinNotches.length > 0 && Math.abs(uMinNotches[0].nVMin - vMin) < tol) {
      const n = uMinNotches[0];
      shape.moveTo(uMin + n.width, vMin);
      currentV = vMin;
    } else {
      shape.moveTo(uMin, vMin);
    }

    // 2. Right edge (uMax side)
    if (uMaxNotches.length > 0 && Math.abs(uMaxNotches[0].nVMin - vMin) < tol) {
       const first = uMaxNotches[0];
       shape.lineTo(uMax - first.width, vMin);
       shape.lineTo(uMax - first.width, first.nVMax);
       currentV = first.nVMax;
       if (currentV < vMax - tol) {
         shape.lineTo(uMax, currentV);
       }
       uMaxNotches.shift();
    } else {
       shape.lineTo(uMax, vMin);
    }
    
    uMaxNotches.forEach(n => {
      const nVMin = n.nVMin;
      const nVMax = n.nVMax;
      if (nVMin > currentV + tol) shape.lineTo(uMax, nVMin);
      shape.lineTo(uMax - n.width, nVMin);
      shape.lineTo(uMax - n.width, nVMax);
      if (nVMax < vMax - tol) {
        shape.lineTo(uMax, nVMax);
        currentV = nVMax;
      } else {
        currentV = vMax;
      }
    });
    if (currentV < vMax - tol) shape.lineTo(uMax, vMax);

    // 3. Top edge (potentially with a notch at uMin or uMax corner)
    currentV = vMax;
    // We are at (uMax, vMax). Go to (uMin, vMax).
    if (uMinNotches.length > 0 && Math.abs(uMinNotches[uMinNotches.length-1].nVMax - vMax) < tol) {
      const last = uMinNotches[uMinNotches.length-1];
      shape.lineTo(uMin + last.width, vMax);
      // Wait, we need to handle the left edge next, so we don't finish the top yet if there's a notch.
    } else {
      shape.lineTo(uMin, vMax);
    }

    // 4. Left edge (uMin side)
    // We are at the top-left area. 
    // uMinNotches are sorted by V. We should go from VMax down to VMin.
    const uMinNotchesRev = [...uMinNotches].reverse();
    currentV = vMax;
    uMinNotchesRev.forEach(n => {
      const nVMax = n.nVMax;
      const nVMin = n.nVMin;
      
      if (nVMax < currentV - tol) shape.lineTo(uMin, nVMax);
      shape.lineTo(uMin + n.width, nVMax);
      shape.lineTo(uMin + n.width, nVMin);
      if (nVMin > vMin + tol) {
        shape.lineTo(uMin, nVMin);
        currentV = nVMin;
      } else {
        currentV = vMin;
      }
    });
    if (currentV > vMin + tol) shape.lineTo(uMin, vMin);

    shape.closePath();

    holes.forEach(h => {
      const shouldInclude = (h.through && includeThroughHoles) || (!h.through && includePartialHoles);
      if (shouldInclude) {
        // Skip holes that fall within any notch
        const isInsideNotch = notches.some(n => {
          const nVMin = n.alignV === 'top' ? n.v - n.height : (n.alignV === 'center' ? n.v - n.height/2 : n.v);
          const nVMax = nVMin + n.height;
          const nUMin = n.side === 'uMin' ? uMin : uMax - n.width;
          const nUMax = n.side === 'uMin' ? uMin + n.width : uMax;

          return h.y >= nVMin - tol && h.y <= nVMax + tol && h.z >= nUMin - tol && h.z <= nUMax + tol;
        });

        if (!isInsideNotch) {
          const path = new THREE.Path();
          path.absarc(h.z, h.y, h.r, 0, Math.PI * 2, true);
          shape.holes.push(path);
        }
      }
    });

    if (includeGroove) {
      // For grooves, we should ideally clip them against notches, but that's complex for THREE.Path.
      // At minimum, ensure the groove doesn't extend into a side that is completely notched out.
      const gZMin = grooveLocalZMin;
      const gZMax = grooveLocalZMax;
      const gYMin = vMin + grooveEndOffset;
      const gYMax = vMax - grooveStartOffset;
      
      const gPath = new THREE.Path();
      gPath.moveTo(gZMin, gYMin);
      gPath.lineTo(gZMax, gYMin);
      gPath.lineTo(gZMax, gYMax);
      gPath.lineTo(gZMin, gYMax);
      gPath.closePath();
      shape.holes.push(gPath);
    }
    
    return shape;
  };

  const layers: THREE.BufferGeometry[] = [];
  const hDepth = Math.min(holeDepth, sizeX);
  const gDepth = Math.min(grooveDepth, sizeX);
  
  const maxD = Math.max(hDepth, gDepth);
  const backThickness = sizeX - maxD;
  
  if (backThickness > 0) {
    layers.push(new THREE.ExtrudeGeometry(createBaseShape(false, false, true), { depth: backThickness, bevelEnabled: false, curveSegments: 6 }));
  }
  
  if (hDepth > gDepth) {
    const midThickness = hDepth - gDepth;
    const midGeo = new THREE.ExtrudeGeometry(createBaseShape(false, true, true), { depth: midThickness, bevelEnabled: false, curveSegments: 6 });
    midGeo.translate(0, 0, backThickness);
    layers.push(midGeo);
    
    if (gDepth > 0) {
      const innerGeo = new THREE.ExtrudeGeometry(createBaseShape(true, true, true), { depth: gDepth, bevelEnabled: false, curveSegments: 6 });
      innerGeo.translate(0, 0, backThickness + midThickness);
      layers.push(innerGeo);
    }
  } else if (gDepth > hDepth) {
    const midThickness = gDepth - hDepth;
    const midGeo = new THREE.ExtrudeGeometry(createBaseShape(true, false, true), { depth: midThickness, bevelEnabled: false, curveSegments: 6 });
    midGeo.translate(0, 0, backThickness);
    layers.push(midGeo);
    
    if (hDepth > 0) {
      const innerGeo = new THREE.ExtrudeGeometry(createBaseShape(true, true, true), { depth: hDepth, bevelEnabled: false, curveSegments: 6 });
      innerGeo.translate(0, 0, backThickness + midThickness);
      layers.push(innerGeo);
    }
  } else {
    if (hDepth > 0) {
      const innerGeo = new THREE.ExtrudeGeometry(createBaseShape(true, true, true), { depth: hDepth, bevelEnabled: false, curveSegments: 6 });
      innerGeo.translate(0, 0, backThickness);
      layers.push(innerGeo);
    }
  }

  let mergedGeo = layers.length > 1 
    ? BufferGeometryUtils.mergeGeometries(layers) 
    : layers[0];
  
  const positions = mergedGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const depthVal = positions.getX(i);
    const heightVal = positions.getY(i);
    const thicknessVal = positions.getZ(i) - sizeX / 2;

    if (grooveFace === 'px') {
      positions.setXYZ(i, thicknessVal, heightVal, depthVal);
    } else if (grooveFace === 'nx') {
      positions.setXYZ(i, -thicknessVal, heightVal, depthVal);
    } else if (grooveFace === 'py') {
      positions.setXYZ(i, heightVal, thicknessVal, depthVal);
    } else if (grooveFace === 'ny') {
      positions.setXYZ(i, heightVal, -thicknessVal, depthVal);
    } else if (grooveFace === 'pz') {
      positions.setXYZ(i, depthVal, heightVal, thicknessVal);
    } else if (grooveFace === 'nz') {
      positions.setXYZ(i, depthVal, heightVal, -thicknessVal);
    } else if (grooveFace === 'none') {
      positions.setXYZ(i, depthVal, heightVal, thicknessVal);
    }
  }
  
  mergedGeo.computeVertexNormals();
  mergedGeo.computeBoundingBox();
  
  const bbox = mergedGeo.boundingBox;
  if (!bbox) return mergedGeo;
  
  // Apply box projection UVs to fix texture mapping after swizzling
  const newPositions = mergedGeo.attributes.position;
  const normals = mergedGeo.attributes.normal;
  const uvs = new Float32Array(newPositions.count * 2);
  for (let i = 0; i < newPositions.count; i++) {
    const x = newPositions.getX(i) - bbox.min.x;
    const y = newPositions.getY(i) - bbox.min.y;
    const z = newPositions.getZ(i) - bbox.min.z;
    const nx = Math.abs(normals.getX(i));
    const ny = Math.abs(normals.getY(i));
    const nz = Math.abs(normals.getZ(i));

    if (nx > ny && nx > nz) {
      uvs[i * 2] = z;
      uvs[i * 2 + 1] = y;
    } else if (ny > nx && ny > nz) {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = z;
    } else {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = y;
    }
  }
  mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  return mergedGeo;
};

export const panelColors = {
  leftPanel: new THREE.Color('#e74c3c'),
  rightPanel: new THREE.Color('#3498db'),
  bottomPanel: new THREE.Color('#2ecc71'),
  topPanel: new THREE.Color('#9b59b6'),
  backPanel: new THREE.Color('#f39c12'),
  backStretcherTop: new THREE.Color('#1abc9c'),
  backStretcherBottom: new THREE.Color('#e67e22'),
  topStretcherFront: new THREE.Color('#34495e'),
  topStretcherBack: new THREE.Color('#16a085'),
  toeKick: new THREE.Color('#c0392b'),
  shelf: new THREE.Color('#8e44ad'),
  drawerFront: new THREE.Color('#f1c40f'),
  drawerSide: new THREE.Color('#e67e22'),
  drawerBack: new THREE.Color('#d35400'),
  drawerBottom: new THREE.Color('#7f8c8d'),
  blindPanel: new THREE.Color('#e0e0e0'),
};

/**
 * Utility to merge global project settings and unit-specific advanced settings
 * into a single TestingSettings object for rendering components.
 */
export const getCabinetTestingSettings = (
  unit: any,
  globalSettings: any,
  widthOverride?: number,
  heightOverride?: number,
  depthOverride?: number
): TestingSettings => {
  const typeStr = unit.type.toLowerCase() as 'base' | 'wall' | 'tall';
  
  // 1. Determine base dimensions from global settings if not overridden
  const initialHeight = heightOverride ?? (typeStr === 'tall' ? globalSettings.tallHeight : typeStr === 'wall' ? globalSettings.wallHeight : globalSettings.baseHeight);
  const initialDepth = depthOverride ?? (typeStr === 'tall' ? globalSettings.depthTall : typeStr === 'wall' ? globalSettings.depthWall : globalSettings.depthBase);
  const initialToeKick = (typeStr === 'base' || typeStr === 'tall') ? (globalSettings.toeKickHeight ?? 100) : 0;
  
  // 2. Map basic cabinet properties + global defaults to TestingSettings
  const baseSettings: TestingSettings = {
    ...DEFAULT_SETTINGS,
    cabinetType: typeStr,
    width: widthOverride ?? unit.width,
    height: initialHeight,
    depth: initialDepth,
    toeKickHeight: initialToeKick,
    panelThickness: globalSettings.thickness || 18,
    doorOuterGap: globalSettings.doorOuterGap ?? 2,
    doorInnerGap: globalSettings.doorInnerGap ?? 2,
    doorToDoorGap: globalSettings.doorToDoorGap ?? 2,
    doorToPanelGap: globalSettings.doorToPanelGap ?? 2,
    drawerToDrawerGap: globalSettings.drawerToDrawerGap ?? 2,
    doorSideClearance: globalSettings.doorSideClearance ?? 2,
    grooveDepth: globalSettings.grooveDepth ?? 5,
    backPanelThickness: globalSettings.backPanelThickness ?? 6,
    doorMaterialThickness: globalSettings.doorMaterialThickness ?? 18,
    tallLowerSectionHeight: globalSettings.baseHeight ? (globalSettings.baseHeight - (globalSettings.toeKickHeight ?? 100)) : DEFAULT_SETTINGS.tallLowerSectionHeight,
    tallUpperSectionHeight: globalSettings.wallHeight || DEFAULT_SETTINGS.tallUpperSectionHeight,
    lowerSectionDrawerStackHeight: globalSettings.baseHeight ? (globalSettings.baseHeight - (globalSettings.toeKickHeight ?? 100)) : DEFAULT_SETTINGS.lowerSectionDrawerStackHeight,
    wallBottomRecess: globalSettings.wallBottomRecess ?? 0,
  };

  // 3. Override with global advancedTestingSettings if present
  let merged: TestingSettings = { ...baseSettings };
  if (globalSettings.advancedTestingSettings) {
    merged = { ...merged, ...globalSettings.advancedTestingSettings };
    // Ensure width/height/depth/type are preserved from unit context unless explicitly intended
    merged.width = baseSettings.width;
    merged.height = baseSettings.height;
    merged.depth = baseSettings.depth;
    merged.cabinetType = baseSettings.cabinetType;
    merged.toeKickHeight = baseSettings.toeKickHeight;
    // Special handling for Global Gola - if global is on, it should generally win
    if (globalSettings.advancedTestingSettings.enableGola) {
      merged.enableGola = true;
    }
  }

  // 4. Preset-specific defaults
  if (unit.preset === 'Sink Unit') {
    merged.showBackPanel = false;
    merged.showShelves = false;
    merged.showDrawers = false;
    merged.numShelves = 0;
  }

  // 5. Override with previously saved unit-specific advancedSettings
  if (unit.advancedSettings) {
    merged = { ...merged, ...unit.advancedSettings };
    // Always respect the current width from the layout
    merged.width = widthOverride ?? unit.width;
    merged.height = unit.advancedSettings.height ?? initialHeight;
    merged.depth = initialDepth;
  } else {
    // Default visibility logic for new units
    if (typeStr === 'wall') {
      merged.showDrawers = false;
      merged.showDoors = true;
      merged.shelfDepth = initialDepth - merged.panelThickness - merged.backPanelThickness;
    } else if (typeStr === 'tall') {
      merged.showDrawers = false;
      merged.showDoors = true;
      merged.showLowerDoors = true;
      merged.showLowerShelves = true;
      merged.numLowerShelves = 2;
      merged.shelfDepth = initialDepth - merged.panelThickness - merged.backPanelThickness;
    }
  }

  merged.preset = unit.preset;

  // 6. Ensure shelf depth is sane relative to current cabinet depth
  // This prevents shelves sticking out when depth is reduced in sidebar or moving between zones
  const minClearance = 2;
  const doorSpace = merged.showDoors ? (merged.doorMaterialThickness + 2) : 0;
  const maxShelfDepth = Math.max(50, merged.depth - merged.panelThickness - merged.backPanelThickness - doorSpace - minClearance);
  
  if (!unit.advancedSettings?.shelfDepth || merged.shelfDepth > maxShelfDepth) {
    merged.shelfDepth = maxShelfDepth;
  }



  return merged;
};
