import { motion, AnimatePresence } from 'motion/react';
import { PeriodData } from '../types';

interface TimelineProps {
  data: PeriodData[];
  currentIndex: number;
  onSelect: (index: number) => void;
  activePeriod: PeriodData;
}

export const Timeline = ({ data, currentIndex, onSelect, activePeriod }: TimelineProps) => {
  return (
    <nav className="w-56 bg-archive-surface border-r border-archive-border flex flex-col items-center py-8 z-50 shadow-[6px_0_20px_rgba(0,0,0,0.03)] paper-texture">
      <div className="flex-1 flex flex-col justify-center gap-8 w-full py-4 min-h-0">
        {data.map((period, idx) => (
          <button 
            key={period.id}
            onClick={() => onSelect(idx)}
            className={`flex items-center gap-5 px-8 w-full group relative ${currentIndex === idx ? 'opacity-100 scale-[1.02]' : 'opacity-30 hover:opacity-100'}`}
          >
            <div className="relative flex items-center justify-center">
              <div className={`w-4 h-4 rounded-full border-2 border-archive-bg shadow-md ${currentIndex === idx ? 'bg-archive-dark scale-125 ring-4 ring-archive-accent/20' : 'bg-archive-accent/30 group-hover:bg-archive-accent/60'}`}></div>
              {currentIndex === idx && (
                <div 
                  className="absolute -inset-2.5 border-2 border-archive-accent/30 rounded-full"
                />
              )}
            </div>

            <div className="flex flex-col items-start min-w-0">
              <span className={`font-black tracking-tight truncate w-full font-serif ${currentIndex === idx ? 'text-archive-dark text-[20px]' : 'text-archive-text text-[18px]'}`}>
                {period.label}
              </span>
              <span className={`text-[10px] uppercase tracking-[0.3em] block -mt-0.5 truncate w-full font-sans ${currentIndex === idx ? 'text-archive-accent font-black' : 'text-gray-400 font-bold'}`}>
                {period.subLabel}
              </span>
            </div>

            {currentIndex === idx && (
              <div 
                className="absolute left-0 w-1.5 h-10 bg-archive-accent rounded-r-full"
              />
            )}
          </button>
        ))}
      </div>
      
      <div 
        className="w-full px-6 py-10 border-t border-archive-border/30 bg-archive-bg/5 mt-auto"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-1.5 h-1.5 bg-archive-accent/80 rotate-45"></div>
          <h4 className="font-bold text-archive-dark uppercase tracking-[0.25em] text-[11px] opacity-90"> 地图图例 </h4>
        </div>
        
        <div className="space-y-4 font-sans font-bold text-archive-text/75 text-[10px]">
          <div className="flex items-center gap-3.5">
            <div className="w-5 h-2.5 bg-[#6a7d85] opacity-20 rounded-xs border border-archive-dark/10"></div>
            <span className="uppercase tracking-widest leading-tight truncate">北运河水系演变</span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-5 h-0.5 border-t border-dashed border-[#2c2823] opacity-30"></div>
            <span className="uppercase tracking-widest leading-tight truncate">京津铁路主要干线</span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-5 h-1 bg-[#8b4513] opacity-25"></div>
            <span className="uppercase tracking-widest leading-tight truncate">历史交通道路遗迹</span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-3.5 h-3.5 bg-[#5a5a40] border border-white/80 rotate-45 flex items-center justify-center shadow-xs shrink-0">
               <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
            <span className="uppercase tracking-widest leading-tight truncate">核心历史调查点位</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
