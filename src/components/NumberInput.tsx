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
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 10000,
  suffix = 'mm',
  className = ''
}) => {
  const handleDecrement = () => onChange(Math.max(min, value - step));
  const handleIncrement = () => onChange(Math.min(max, value + step));

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <label className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider pl-1">{label}</label>
      <div className="flex items-stretch gap-1 h-12 md:h-14">
        {/* Decrement */}
        <button 
          onClick={handleDecrement}
          className="w-12 md:w-14 flex-none flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          type="button"
          tabIndex={-1}
        >
          <Minus size={20} />
        </button>
        
        {/* Input Area */}
        <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden px-3 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent transition-all">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 bg-transparent text-center text-lg md:text-xl font-bold text-slate-900 dark:text-white outline-none min-w-0"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <span className="text-slate-400 text-xs font-medium ml-1 flex-none select-none">
            {suffix}
          </span>
        </div>

        {/* Increment */}
        <button 
          onClick={handleIncrement}
          className="w-12 md:w-14 flex-none flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          type="button"
          tabIndex={-1}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
};