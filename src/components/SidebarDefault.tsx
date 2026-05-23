import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { PeriodData, HistoricalImage } from '../types';
import { ZoomIn, Mic, Play, Pause, Headphones, Volume2 } from 'lucide-react';

interface SidebarDefaultProps {
  activePeriod: PeriodData;
  onImageZoom: (image: HistoricalImage) => void;
}

export const SidebarDefault = ({ activePeriod, onImageZoom }: SidebarDefaultProps) => {
  const [isOralPlaying, setIsOralPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset audio when period changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsOralPlaying(false);
      setProgress(0);
      audioRef.current.src = activePeriod.oralHistory?.url || '';
    }
  }, [activePeriod.id]);

  const toggleOralAudio = () => {
    if (!audioRef.current) return;
    if (isOralPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsOralPlaying(!isOralPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleEnded = () => {
    setIsOralPlaying(false);
    setProgress(0);
  };

  const galleryImages = activePeriod.historicalImages || (activePeriod.coverImage ? [activePeriod.coverImage] : []);

  return (
    <div 
      className="flex flex-col h-full p-10 overflow-y-scroll archive-scrollbar"
    >
      <div className="flex-1 space-y-8">
        {/* Section 1: 历史老照片 */}
        <section>
          <h3 className="text-[17px] font-normal text-archive-dark uppercase tracking-[0.4em] mb-6 flex items-center gap-3 font-sans">
            <div className="w-1.5 h-6 bg-archive-accent"></div>
            档案老照片
          </h3>
          <div className="relative group" key={activePeriod.id}>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth">
              {galleryImages.map((img, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative shrink-0 w-[85%] snap-center cursor-zoom-in overflow-hidden rounded-sm border border-archive-border shadow-lg aspect-[16/10]"
                  onClick={() => onImageZoom(img)}
                >
                  <img 
                    src={img.url} 
                    alt={img.name}
                    className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white w-8 h-8 drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <div className="text-white text-[10px] font-bold tracking-widest uppercase">{img.name}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Visual indicator for horizontal scroll */}
            <div className="flex justify-center gap-1.5 mt-2">
               {galleryImages.map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-archive-accent' : 'bg-archive-border'}`} />
               ))}
            </div>
          </div>
        </section>

        {/* Section 2: 村民说 */}
        {activePeriod.oralHistory && (
          <section>
            <h3 className="text-[17px] font-normal text-archive-dark uppercase tracking-[0.4em] mb-6 flex items-center gap-3 font-sans">
              <div className="w-1.5 h-6 bg-archive-accent"></div>
              口述史
            </h3>
            <div className="p-6 border border-archive-border bg-archive-surface shadow-sm relative overflow-hidden group hover:border-archive-accent/30 transition-colors">
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-12 h-12 rounded-full border border-archive-accent/30 flex items-center justify-center shrink-0">
                  <Mic className="text-archive-accent w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-archive-dark text-[15px] font-bold truncate mb-0.5">{activePeriod.oralHistory.name}</h4>
                  <div className="text-archive-dark/60 text-[11px] font-medium">
                    讲述者: <span className="italic">{activePeriod.oralHistory.narrator}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4 relative z-10">
                <button 
                  onClick={toggleOralAudio}
                  className="w-10 h-10 rounded-full bg-archive-accent hover:bg-archive-dark flex items-center justify-center transition-all shadow-md active:scale-95"
                >
                  {isOralPlaying ? (
                    <Pause className="text-white w-4 h-4 fill-current" />
                  ) : (
                    <Play className="text-white w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="h-[1px] bg-archive-border w-full relative">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-archive-accent"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-archive-dark/40 uppercase tracking-widest mt-2 font-mono">
                    <span>{isOralPlaying ? 'Playing' : 'Paused'}</span>
                    <span>{activePeriod.oralHistory.duration || '00:00'}</span>
                  </div>
                </div>
              </div>

              <audio 
                ref={audioRef}
                src={activePeriod.oralHistory.url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className="hidden"
              />
            </div>
          </section>
        )}

        {/* Section 3: 地理演变概要 */}
        <section className="cursor-default">
          <h3 className="text-[17px] font-normal text-archive-dark uppercase tracking-[0.4em] mb-8 flex items-center gap-3 font-sans">
            <div className="w-1.5 h-6 bg-archive-accent"></div>
            地理演变
          </h3>
          <div
            className="text-[16px] leading-[1.8] text-archive-text/90 indent-[2em] font-serif tracking-normal"
          >
            {activePeriod.evolutionNotes}
          </div>
        </section>

        {/* Section 4: 查看展览 (Removed) */}
      </div>
    </div>
  );
};
