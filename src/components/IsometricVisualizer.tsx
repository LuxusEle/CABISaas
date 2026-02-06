
import React from 'react';
import { Project, CabinetType, CabinetUnit, PresetType } from '../types';

interface Props {
    project: Project;
}

export const IsometricVisualizer: React.FC<Props> = ({ project }) => {
    // Simple isometric projection constants
    const isoX = (x: number, y: number) => (x - y) * Math.cos(Math.PI / 6);
    const isoY = (x: number, y: number, z: number) => (x + y) * Math.sin(Math.PI / 6) - z;

    const renderCabinet = (unit: CabinetUnit, wallOrigin: { x: number, y: number }, wallAngle: number) => {
        const isWall = unit.type === CabinetType.WALL;
        const isTall = unit.type === CabinetType.TALL;

        const w = unit.width;
        const d = isWall ? 300 : isTall ? 600 : 600;
        const h = isTall ? 2100 : 720;
        const zBase = isWall ? 1400 : 0;

        // Local coordinates for the box corners
        const corners = [
            { x: 0, y: 0, z: 0 }, { x: w, y: 0, z: 0 }, { x: w, y: d, z: 0 }, { x: 0, y: d, z: 0 },
            { x: 0, y: 0, z: h }, { x: w, y: 0, z: h }, { x: w, y: d, z: h }, { x: 0, y: d, z: h }
        ];

        // Transform and project
        const projected = corners.map(c => {
            // Rotate local x/y to match wall angle
            const rx = c.x * Math.cos(wallAngle) - c.y * Math.sin(wallAngle);
            const ry = c.x * Math.sin(wallAngle) + c.y * Math.cos(wallAngle);

            // Offset by wall origin and unit position
            const worldX = wallOrigin.x + (unit.fromLeft * Math.cos(wallAngle)) + rx;
            const worldY = wallOrigin.y + (unit.fromLeft * Math.sin(wallAngle)) + ry;
            const worldZ = zBase + c.z;

            return { x: isoX(worldX, worldY), y: isoY(worldX, worldY, worldZ) };
        });

        const faces = [
            [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7] // Front, Right, Back, Left, Top
        ];

        return (
            <g key={unit.id} opacity="0.8">
                {faces.map((face, fi) => (
                    <polygon
                        key={fi}
                        points={face.map(i => `${projected[i].x},${projected[i].y}`).join(' ')}
                        fill={fi === 4 ? '#fef3c7' : fi === 1 ? '#d97706' : '#f59e0b'}
                        stroke="#b45309"
                        strokeWidth="1"
                    />
                ))}
            </g>
        );
    };

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative border border-slate-800 rounded-xl">
            <div className="absolute top-4 left-4 text-amber-500 font-black text-xs uppercase tracking-widest">3D ISO VIEW</div>
            <svg viewBox="-1000 -1000 2000 2000" className="w-full h-full">
                <g transform="translate(0, 400) scale(0.5)">
                    {/* Wall A (Left) */}
                    {project.zones[0]?.cabinets.map(c => renderCabinet(c, { x: 0, y: 0 }, 0))}
                    {/* Wall B (Right - 90 deg) */}
                    {project.zones[1]?.cabinets.map(c => renderCabinet(c, { x: 0, y: 0 }, Math.PI / 2))}
                </g>
            </svg>
        </div>
    );
};
