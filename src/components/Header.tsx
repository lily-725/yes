import { motion } from 'motion/react';

interface HeaderProps {
  activePeriodTitle: string;
  activePeriodId: string;
}

export const Header = ({ activePeriodTitle, activePeriodId }: HeaderProps) => {
  return (
    <header className="px-10 py-4 border-b border-archive-border bg-archive-surface flex justify-between items-center z-50 shadow-sm">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[4px] text-archive-dark font-serif">
            地图里的天穆村
          </h1>
          <div className="flex items-center gap-3 mt-2 underline-offset-4">
            <span className="text-[10px] uppercase tracking-[0.5em] text-archive-accent font-sans font-bold opacity-70">
              Digital Evolution Archive • Tianmu Discovery
            </span>
            <div className="h-[0.5px] flex-1 min-w-[60px] bg-archive-accent/20"></div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-10">
        <div className="flex flex-col items-end">
          {/* Audio controls removed */}
        </div>
      </div>
    </header>
  );
};
