import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 10000,
  suffix = 'mm'
}) => {
  const handleDecrement = () => onChange(Math.max(min, value - step));
  const handleIncrement = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-slate-400 text-sm font-medium uppercase tracking-wider pl-1">{label}</label>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleDecrement}
          className="h-14 w-14 flex items-center justify-center bg-slate-800 rounded-xl text-slate-300 active:bg-slate-700 touch-manipulation border border-slate-700"
          type="button"
        >
          <Minus size={24} />
        </button>
        
        <div className="flex-1 relative">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-14 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-bold text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all no-spinner"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium pointer-events-none">
            {suffix}
          </span>
        </div>

        <button 
          onClick={handleIncrement}
          className="h-14 w-14 flex items-center justify-center bg-slate-800 rounded-xl text-slate-300 active:bg-slate-700 touch-manipulation border border-slate-700"
          type="button"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
};