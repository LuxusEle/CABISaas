import React, { useRef, useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface CabinetSpanSliderProps {
  totalLength: number;
  fromLeft: number;
  width: number;
  onChange: (updates: { fromLeft?: number; width?: number }) => void;
  onDragEnd?: () => void;
}

const NudgeInput = ({ label, value, onNudge, colorClass, subtitle }: any) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      onNudge(delta);
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeWheel);
  }, [onNudge]);

  const startNudging = (delta: number) => {
    onNudge(delta);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onNudge(delta);
      }, 40);
    }, 250);
  };

  const stopNudging = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div className="space-y-1">
      <label className={`text-[8px] font-black uppercase tracking-widest block ${colorClass}`}>{label}</label>
      <div 
        ref={scrollRef}
        className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden focus-within:border-amber-500 transition-colors"
      >
        <button 
          onMouseDown={() => startNudging(-1)}
          onMouseUp={stopNudging}
          onMouseLeave={stopNudging}
          onTouchStart={() => startNudging(-1)}
          onTouchEnd={stopNudging}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition-colors border-r dark:border-slate-700 select-none"
        >
          <Minus size={12} />
        </button>
        <input 
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            onNudge(val - value);
          }}
          className="w-full bg-transparent py-1.5 px-1 text-[11px] font-mono font-bold text-slate-900 dark:text-white outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-ns-resize"
        />
        <button 
          onMouseDown={() => startNudging(1)}
          onMouseUp={stopNudging}
          onMouseLeave={stopNudging}
          onTouchStart={() => startNudging(1)}
          onTouchEnd={stopNudging}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition-colors border-l dark:border-slate-700 select-none"
        >
          <Plus size={12} />
        </button>
      </div>
      <p className="text-[7px] text-slate-400 font-medium italic">{subtitle}</p>
    </div>
  );
};

export const CabinetSpanSlider: React.FC<CabinetSpanSliderProps> = ({
  totalLength,
  fromLeft,
  width,
  onChange,
  onDragEnd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | 'middle' | null>(null);
  const [startX, setStartX] = useState(0);
  const [startFromLeft, setStartFromLeft] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent, handle: 'left' | 'right' | 'middle') => {
    e.preventDefault();
    setActiveHandle(handle);
    setStartX(e.clientX);
    setStartFromLeft(fromLeft);
    setStartWidth(width);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeHandle || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const pixelsPerMm = rect.width / totalLength;
      const dx = (e.clientX - startX) / pixelsPerMm;

      if (activeHandle === 'left') {
        const newFromLeft = Math.max(0, Math.min(startFromLeft + startWidth - 150, startFromLeft + dx));
        const newWidth = startWidth - (newFromLeft - startFromLeft);
        onChange({ fromLeft: Math.round(newFromLeft), width: Math.round(newWidth) });
      } else if (activeHandle === 'right') {
        const newWidth = Math.max(150, Math.min(totalLength - startFromLeft, startWidth + dx));
        onChange({ width: Math.round(newWidth) });
      } else if (activeHandle === 'middle') {
        const newFromLeft = Math.max(0, Math.min(totalLength - startWidth, startFromLeft + dx));
        onChange({ fromLeft: Math.round(newFromLeft) });
      }
    };

    const handleMouseUp = () => {
      if (activeHandle) {
        setActiveHandle(null);
        onDragEnd?.();
      }
    };

    if (activeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle, startX, startFromLeft, startWidth, totalLength, onChange, onDragEnd]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent, handle: 'left' | 'right' | 'middle') => {
    setActiveHandle(handle);
    setStartX(e.touches[0].clientX);
    setStartFromLeft(fromLeft);
    setStartWidth(width);
  };

  const leftPercent = (fromLeft / totalLength) * 100;
  const widthPercent = (width / totalLength) * 100;

  return (
    <div className="space-y-2 py-4 px-1">
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>0mm</span>
        <span className="text-amber-500 font-mono">{width}mm wide</span>
        <span>{totalLength}mm</span>
      </div>
      
      <div 
        ref={containerRef}
        className="relative h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Background Track */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, #64748b 1px, transparent 1px)', backgroundSize: '10%' }}></div>

        {/* Selected Area */}
        <div 
          className={`absolute top-0 bottom-0 bg-amber-500/10 border-x-2 border-amber-500 transition-colors cursor-grab active:cursor-grabbing ${activeHandle === 'middle' ? 'bg-amber-500/20' : ''}`}
          style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'middle')}
          onTouchStart={(e) => handleTouchStart(e, 'middle')}
        >
          {/* Middle Pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-4 bg-amber-500 rounded-full"></div>)}
            </div>
          </div>
        </div>

        {/* Left Handle */}
        <div 
          className={`absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize flex items-center justify-center group z-10`}
          style={{ left: `${leftPercent}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'left')}
          onTouchStart={(e) => handleTouchStart(e, 'left')}
        >
          <div className={`w-2 h-8 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 group-hover:scale-y-110 transition-transform ${activeHandle === 'left' ? 'scale-y-125' : ''}`}></div>
        </div>

        {/* Right Handle */}
        <div 
          className={`absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize flex items-center justify-center group z-10`}
          style={{ left: `${leftPercent + widthPercent}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          onTouchStart={(e) => handleTouchStart(e, 'right')}
        >
          <div className={`w-2 h-8 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 group-hover:scale-y-110 transition-transform ${activeHandle === 'right' ? 'scale-y-125' : ''}`}></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <NudgeInput 
          label="Left Edge" 
          value={fromLeft} 
          colorClass="text-amber-500"
          subtitle="Moves left"
          onNudge={(delta: number) => {
            const rightEdge = fromLeft + width;
            const newFromLeft = Math.max(0, Math.min(rightEdge - 150, fromLeft + delta));
            const newWidth = rightEdge - newFromLeft;
            onChange({ fromLeft: newFromLeft, width: newWidth });
          }}
        />

        <NudgeInput 
          label="Width" 
          value={width} 
          colorClass="text-slate-400"
          subtitle="Pins left"
          onNudge={(delta: number) => {
            onChange({ width: Math.max(150, Math.min(totalLength - fromLeft, width + delta)) });
          }}
        />

        <NudgeInput 
          label="Right Edge" 
          value={fromLeft + width} 
          colorClass="text-blue-500"
          subtitle="Moves right"
          onNudge={(delta: number) => {
            const newWidth = Math.max(150, Math.min(totalLength - fromLeft, (fromLeft + width + delta) - fromLeft));
            onChange({ width: newWidth });
          }}
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-2 border-t dark:border-slate-800 mt-2">
        <span>Wall Start: 0</span>
        <span className="text-amber-500 font-black italic">Precision Control</span>
        <span>End: {totalLength}</span>
      </div>
    </div>
  );
};
