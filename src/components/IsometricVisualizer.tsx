
import React from 'react';
import { Project, CabinetType, CabinetUnit, PresetType, Zone } from '../types';
import { getActiveColor } from '../services/cabinetColors';

interface Props {
    project: Project;
}

export const IsometricVisualizer: React.FC<Props> = ({ project }) => {
    // Simple isometric projection constants
    const isoX = (x: number, y: number) => (x - y) * Math.cos(Math.PI / 6);
    const isoY = (x: number, y: number, z: number) => (x + y) * Math.sin(Math.PI / 6) - z;

    const renderCabinet = (unit: CabinetUnit, zone: Zone, wallOrigin: { x: number, y: number }, wallAngle: number) => {
        const isWall = unit.type === CabinetType.WALL;
        const isTall = unit.type === CabinetType.TALL;

        const w = unit.width;
        const d = isWall ? 300 : isTall ? 600 : 600;
        const h = isTall ? 2100 : isWall ? 720 : 720;
        const zBase = isWall ? 1400 : 0;

        // Local coordinates for the box corners
        const corners = [
            { x: 0, y: 0, z: 0 }, { x: w, y: 0, z: 0 }, { x: w, y: d, z: 0 }, { x: 0, y: d, z: 0 },
            { x: 0, y: 0, z: h }, { x: w, y: 0, z: h }, { x: w, y: d, z: h }, { x: 0, y: d, z: h }
        ];

        // Transform and project
        const projected = corners.map(c => {
            const rx = c.x * Math.cos(wallAngle) - c.y * Math.sin(wallAngle);
            const ry = c.x * Math.sin(wallAngle) + c.y * Math.cos(wallAngle);
            const worldX = wallOrigin.x + (unit.fromLeft * Math.cos(wallAngle)) + rx;
            const worldY = wallOrigin.y + (unit.fromLeft * Math.sin(wallAngle)) + ry;
            const worldZ = zBase + c.z;
            return { x: isoX(worldX, worldY), y: isoY(worldX, worldY, worldZ) };
        });

        // Define faces with proper depth ordering for lighting
        const faces = [
            { indices: [4, 5, 6, 7], name: 'top', brightness: 1.0 },      // Top
            { indices: [1, 2, 6, 5], name: 'right', brightness: 0.7 },   // Right
            { indices: [3, 0, 4, 7], name: 'left', brightness: 0.5 },    // Left
        ];

        const activeColor = getActiveColor(unit.preset);
        const getFaceColor = (brightness: number) => {
            const baseColor = activeColor.rgb;
            const r = Math.round(baseColor[0] * brightness);
            const g = Math.round(baseColor[1] * brightness);
            const b = Math.round(baseColor[2] * brightness);
            return `rgb(${r}, ${g}, ${b})`;
        };

        const centerX = (projected[0].x + projected[6].x) / 2;
        const centerY = (projected[0].y + projected[6].y) / 2;

        return (
            <g key={unit.id}>
                {/* Cabinet faces with shading */}
                {faces.map((face, fi) => (
                    <polygon
                        key={fi}
                        points={face.indices.map(i => `${projected[i].x},${projected[i].y}`).join(' ')}
                        fill={getFaceColor(face.brightness)}
                        stroke="#92400e"
                        strokeWidth="1.5"
                    />
                ))}
                {/* Cabinet Label */}
                {unit.label && (
                    <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        fontSize="40"
                        fill="#78350f"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                    >
                        {unit.label}
                    </text>
                )}
                {/* Width label */}
                <text
                    x={centerX}
                    y={centerY + 45}
                    textAnchor="middle"
                    fontSize="30"
                    fill="#92400e"
                    style={{ pointerEvents: 'none' }}
                >
                    {unit.width}
                </text>
            </g>
        );
    };

    const renderWall = (zone: Zone, wallOrigin: { x: number, y: number }, wallAngle: number) => {
        const wallLength = zone.totalLength;
        const wallHeight = zone.wallHeight || 2400;
        const wallThick = 100;

        // Wall corners
        const corners = [
            { x: 0, y: -wallThick, z: 0 }, { x: wallLength, y: -wallThick, z: 0 },
            { x: wallLength, y: 0, z: 0 }, { x: 0, y: 0, z: 0 },
            { x: 0, y: -wallThick, z: wallHeight }, { x: wallLength, y: -wallThick, z: wallHeight },
            { x: wallLength, y: 0, z: wallHeight }, { x: 0, y: 0, z: wallHeight }
        ];

        const projected = corners.map(c => {
            const rx = c.x * Math.cos(wallAngle) - c.y * Math.sin(wallAngle);
            const ry = c.x * Math.sin(wallAngle) + c.y * Math.cos(wallAngle);
            const worldX = wallOrigin.x + rx;
            const worldY = wallOrigin.y + ry;
            return { x: isoX(worldX, worldY), y: isoY(worldX, worldY, c.z) };
        });

        return (
            <g key={`wall-${zone.id}`} opacity="0.6">
                {/* Wall face */}
                <polygon
                    points={[3, 2, 6, 7].map(i => `${projected[i].x},${projected[i].y}`).join(' ')}
                    fill="#e2e8f0"
                    stroke="#64748b"
                    strokeWidth="2"
                />
                {/* Wall top */}
                <polygon
                    points={[4, 5, 6, 7].map(i => `${projected[i].x},${projected[i].y}`).join(' ')}
                    fill="#f1f5f9"
                    stroke="#94a3b8"
                    strokeWidth="1"
                />
            </g>
        );
    };

    const renderObstacle = (obs: any, wallOrigin: { x: number, y: number }, wallAngle: number, zone: Zone) => {
        const obsHeight = obs.height || 2100;
        const obsElevation = obs.elevation || 0;
        const obsWidth = obs.width;
        const obsDepth = obs.type === 'window' ? 100 : 150;
        const wallHeight = zone.wallHeight || 2400;

        // Window opening - render as transparent/blue
        if (obs.type === 'window') {
            const corners = [
                { x: obs.fromLeft, y: 0, z: obsElevation },
                { x: obs.fromLeft + obsWidth, y: 0, z: obsElevation },
                { x: obs.fromLeft + obsWidth, y: obsDepth, z: obsElevation },
                { x: obs.fromLeft, y: obsDepth, z: obsElevation },
                { x: obs.fromLeft, y: 0, z: obsElevation + obsHeight },
                { x: obs.fromLeft + obsWidth, y: 0, z: obsElevation + obsHeight },
                { x: obs.fromLeft + obsWidth, y: obsDepth, z: obsElevation + obsHeight },
                { x: obs.fromLeft, y: obsDepth, z: obsElevation + obsHeight }
            ];

            const projected = corners.map(c => {
                const rx = c.x * Math.cos(wallAngle) - c.y * Math.sin(wallAngle);
                const ry = c.x * Math.sin(wallAngle) + c.y * Math.cos(wallAngle);
                const worldX = wallOrigin.x + rx;
                const worldY = wallOrigin.y + ry - 100; // Offset behind wall
                return { x: isoX(worldX, worldY), y: isoY(worldX, worldY, c.z) };
            });

            return (
                <g key={`obs-${obs.id}`}>
                    {/* Window frame */}
                    <polygon
                        points={[0, 1, 5, 4].map(i => `${projected[i].x},${projected[i].y}`).join(' ')}
                        fill="#93c5fd"
                        fillOpacity="0.4"
                        stroke="#3b82f6"
                        strokeWidth="2"
                    />
                    <text
                        x={(projected[0].x + projected[1].x) / 2}
                        y={(projected[0].y + projected[4].y) / 2}
                        textAnchor="middle"
                        fontSize="30"
                        fill="#1e40af"
                    >
                        WINDOW
                    </text>
                </g>
            );
        }

        return null;
    };

    // Sort cabinets by depth (back to front for proper rendering)
    const allCabinets: { unit: CabinetUnit; zone: Zone; offsetX: number; offsetY: number; angle: number; index: number }[] = [];
    
    project.zones.filter(z => z.active).forEach((zone, zoneIndex) => {
        const offsetX = zoneIndex === 1 ? zone.totalLength + 200 : 0;
        const offsetY = zoneIndex === 1 ? 0 : 0;
        const angle = zoneIndex === 1 ? Math.PI / 2 : 0;
        
        zone.cabinets.forEach((cab, cabIndex) => {
            allCabinets.push({ unit: cab, zone, offsetX, offsetY, angle, index: cabIndex });
        });
    });

    return (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden relative border border-slate-700 rounded-xl">
            {/* Lighting effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
            
            <div className="absolute top-4 left-4 text-amber-400 font-black text-xs uppercase tracking-widest z-10">
                3D ISO VIEW
            </div>
            
            {/* Floor grid */}
            <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '100px 100px'
            }} />

            <svg viewBox="-1200 -800 2400 1600" className="w-full h-full">
                <defs>
                    {/* Gradients for lighting effect */}
                    <linearGradient id="wallGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.6" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
                    </filter>
                </defs>
                
                <g transform="translate(0, 300) scale(0.45)">
                    {/* Render zones - walls and obstacles first (background) */}
                    {project.zones.filter(z => z.active).map((zone, index) => {
                        const offsetX = index === 1 ? zone.totalLength + 200 : 0;
                        const offsetY = index === 1 ? 0 : 0;
                        const angle = index === 1 ? Math.PI / 2 : 0;
                        
                        return (
                            <g key={`bg-${zone.id}`}>
                                {/* Wall */}
                                {renderWall(zone, { x: offsetX, y: offsetY }, angle)}
                                
                                {/* Obstacles */}
                                {zone.obstacles.map(obs => 
                                    renderObstacle(obs, { x: offsetX, y: offsetY }, angle, zone)
                                )}
                            </g>
                        );
                    })}
                    
                    {/* Render all cabinets sorted by depth */}
                    {allCabinets.map(({ unit, zone, offsetX, offsetY, angle }) => 
                        renderCabinet(unit, zone, { x: offsetX, y: offsetY }, angle)
                    )}
                </g>
            </svg>
        </div>
    );
};
