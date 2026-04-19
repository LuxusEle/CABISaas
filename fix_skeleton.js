const fs = require('fs');
let code = fs.readFileSync('src/components/CabinetTestingPage.tsx', 'utf8');

// Function to replace material logic and add visible={!skeletonView} to mesh
code = code.replace(/<mesh([^>]*)>\s*<((?:boxGeometry|cylinderGeometry|primitive))([^>]*)>\s*\{skeletonView \? <meshStandardMaterial ([^>]+) wireframe \/> : <meshStandardMaterial ([^>]+)> \}\s*<\/mesh>/g, 
  (match, p1, p2, p3, p4, p5) => {
    // If it already has visible props we skip or just add it.
    let meshProps = p1;
    if (!meshProps.includes('visible=')) {
      meshProps = meshProps + ' visible={!skeletonView}';
    }
    return `<mesh${meshProps}>\n              <${p2}${p3}>\n              <meshStandardMaterial ${p5}>\n            </mesh>`;
  }
);

// We need to add lineSegments for topPanel (isWall)
code = code.replace(
  /(\{isWall && shouldShow\('topPanel'\) && \(\s*)<mesh(.*?)>([\s\S]*?)<\/mesh>(\s*\))/g,
  (match, p1, p2, p3, p4) => {
    return `${p1}<>\n            <mesh${p2}>${p3}</mesh>\n            {skeletonView && (\n              <lineSegments position={[\n                0 + getOffset('topPanel')[0],\n                height / 2 - panelThickness / 2 + getOffset('topPanel')[1],\n                0 + getOffset('topPanel')[2]\n              ]}>\n                <edgesGeometry args={[topPanelGeo]} />\n                <lineBasicMaterial color="#00ff00" linewidth={3} />\n              </lineSegments>\n            )}\n          </>${p4}`;
  }
);

// We need to add lineSegments for topPanel (isTall)
code = code.replace(
  /(\{isTall && shouldShow\('topPanel'\) && \(\s*)<>\s*<mesh(.*?)>([\s\S]*?)<\/mesh>\s*(<\/>\s*\))/g,
  (match, p1, p2, p3, p4) => {
    return `${p1}<>\n            <mesh${p2}>${p3}</mesh>\n            {skeletonView && (\n              <lineSegments position={[\n                0 + getOffset('topPanel')[0],\n                height / 2 - panelThickness / 2 + getOffset('topPanel')[1],\n                0 + getOffset('topPanel')[2]\n              ]}>\n                <edgesGeometry args={[topPanelGeo]} />\n                <lineBasicMaterial color="#00ff00" linewidth={3} />\n              </lineSegments>\n            )}\n          ${p4}`;
  }
);

// We need to add lineSegments for bottomPanel (isTall)
code = code.replace(
  /(\{isTall && shouldShow\('bottomPanel'\) && \(\s*)<mesh(.*?)>([\s\S]*?)<\/mesh>(\s*\))/g,
  (match, p1, p2, p3, p4) => {
    return `${p1}<>\n            <mesh${p2}>${p3}</mesh>\n            {skeletonView && (\n              <lineSegments position={[\n                0 + getOffset('bottomPanel')[0],\n                -height / 2 + panelThickness / 2 + getOffset('bottomPanel')[1],\n                0 + getOffset('bottomPanel')[2]\n              ]}>\n                <edgesGeometry args={[bottomPanelGeo]} />\n                <lineBasicMaterial color="#00ff00" linewidth={3} />\n              </lineSegments>\n            )}\n          </>${p4}`;
  }
);

fs.writeFileSync('src/components/CabinetTestingPage.tsx', code);
console.log('Fixed skeleton view meshes.');
