import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SelectedFeature, HistoricalImage } from '../types';
import { X, ZoomIn } from 'lucide-react';

interface FeatureDetailProps {
  feature: SelectedFeature;
  onBack: () => void;
  onImageZoom: (image: HistoricalImage) => void;
}

export const FeatureDetail = ({ feature, onBack, onImageZoom }: FeatureDetailProps) => {
  const images = useMemo(() => feature.images ?? [], [feature.images]);
  const [renderAllImages, setRenderAllImages] = useState(false);

  useEffect(() => {
    setRenderAllImages(false);
    if (images.length <= 1) return;

    let disposed = false;

    const schedule = () => {
      if (disposed) return;
      setRenderAllImages(true);
    };

    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(schedule, { timeout: 500 });
      return () => {
        disposed = true;
        if (typeof w.cancelIdleCallback === 'function') {
          w.cancelIdleCallback(id);
        }
      };
    }

    const timeoutId = window.setTimeout(schedule, 0);
    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [feature.id, feature.title, images.length]);

  return (
    <div 
      className="flex flex-col h-full bg-archive-surface z-50 p-12 overflow-y-scroll archive-scrollbar"
    >
      <button 
        onClick={onBack}
        className="group flex items-center gap-3 mb-4 text-[10px] uppercase font-sans font-extrabold tracking-[0.3em] text-archive-accent hover:text-archive-dark transition-colors self-start"
      >
        <span className="text-lg transition-transform group-hover:-translate-x-1">←</span>
        <span>[ 返回主页 ]</span>
      </button>

      <div className="flex-1">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-archive-dark leading-tight tracking-tight">
            {feature.title}
          </h2>
        </div>

        {images.length > 0 && (
          <div className="mb-10 group/gallery">
            <div className="relative">
              {/* Horizontal Scroll Gallery */}
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
                {images.map((img, i) => {
                  const isFirst = i === 0;
                  if (!isFirst && !renderAllImages) return null;

                  return (
                    <div 
                      key={i} 
                      className="snap-center shrink-0 w-[88%] relative aspect-[16/10] border border-archive-border bg-archive-map-bg overflow-hidden shadow-sm cursor-zoom-in group"
                      onClick={() => onImageZoom(img)}
                    >
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        referrerPolicy="no-referrer"
                        loading={isFirst ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={isFirst ? 'high' : 'low'}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      
                      {/* Zoom Icon Overlay - subtle indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                        <ZoomIn className="text-white w-8 h-8 drop-shadow-md" />
                      </div>

                      {/* Metadata Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                        <div className="text-white text-[11px] font-bold tracking-widest uppercase mb-1">{img.name}</div>
                        <div className="text-white/70 text-[9px] uppercase tracking-tighter font-medium">来源：{img.source || '档案记录 / AI 修复'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Scroll Hint (only if > 1 image) */}
              {images.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-archive-accent' : 'bg-archive-border'}`} />
                  ))}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <p className="text-[8px] uppercase tracking-[0.3em] text-archive-accent text-right mt-3 font-bold opacity-60">
                PLATES_COUNT: {images.length} / 档案图像
              </p>
            )}
          </div>
        )}

        <div className="prose prose-sm prose-archive max-w-none">
          <p className="text-[16px] leading-[1.7] text-archive-text/90 font-serif selection:bg-archive-accent/20">
            {feature.description}
          </p>
        </div>

        <div className="mt-4 pt-4">
          <a 
            href="#" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between group py-1 hover:translate-x-1 transition-transform duration-300"
          >
            <span className="text-base font-bold text-archive-dark tracking-tight">查看更多 —— 天穆的故事</span>
            <motion.span 
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-archive-accent text-lg"
            >
              →
            </motion.span>
          </a>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-archive-border/20 flex justify-center">
         <div className="text-[9px] uppercase tracking-[0.4em] text-archive-accent font-sans font-extrabold opacity-40">
            Tianmu Historical Survey Project
         </div>
      </div>
    </div>
  );
};
