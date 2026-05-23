import { useCallback, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HISTORICAL_DATA } from './data';
import { SelectedFeature, HistoricalImage } from './types';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { MapDisplay } from './components/MapDisplay';
import { SidebarDefault } from './components/SidebarDefault';
import { FeatureDetail } from './components/FeatureDetail';
import { X } from 'lucide-react';

export default function App() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [zoomedImage, setZoomedImage] = useState<HistoricalImage | null>(null);
  const [, startTransition] = useTransition();

  const activePeriod = HISTORICAL_DATA[currentIdx];
  const handleFeatureSelect = useCallback(
    (feature: SelectedFeature) => {
      startTransition(() => {
        setSelectedFeature(feature);
      });
    },
    [startTransition]
  );

  return (
    <div className="min-h-screen w-full bg-archive-dark flex items-center justify-center">
      <div className="flex flex-col h-screen w-full max-w-[1920px] overflow-hidden bg-archive-bg text-archive-text font-serif select-none paper-texture relative shadow-[0_0_100px_rgba(0,0,0,0.3)]">
        <Header 
          activePeriodTitle={activePeriod.subLabel} 
          activePeriodId={activePeriod.id} 
        />

      <div className="flex-1 flex overflow-hidden">
        <Timeline 
          data={HISTORICAL_DATA} 
          currentIndex={currentIdx} 
          onSelect={(idx) => {
            setCurrentIdx(idx);
            setSelectedFeature(null); // Switch period, clear selection
          }} 
          activePeriod={activePeriod}
        />

        <MapDisplay 
          activePeriod={activePeriod} 
          onFeatureSelect={handleFeatureSelect} 
        />

        <aside className="w-[450px] border-l border-archive-border bg-archive-surface z-[60] flex flex-col relative overflow-hidden shadow-sm shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
          {!selectedFeature ? (
            <SidebarDefault activePeriod={activePeriod} onImageZoom={setZoomedImage} />
          ) : (
            <FeatureDetail feature={selectedFeature} onBack={() => setSelectedFeature(null)} onImageZoom={setZoomedImage} />
          )}
        </aside>
      </div>

      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-archive-dark/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-20"
            onClick={() => setZoomedImage(null)}
          >
            <div className="absolute top-10 right-10 text-white/50 hover:text-white cursor-pointer group">
              <X className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
            </div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex flex-col items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={zoomedImage.url} 
                alt={zoomedImage.name}
                className="max-w-full max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5"
              />
              <div className="mt-6 text-center">
                <h3 className="text-white text-xl font-bold tracking-widest uppercase mb-1">{zoomedImage.name}</h3>
                <p className="text-white/60 text-[12px] uppercase tracking-[0.2em]">来源：{zoomedImage.source}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
