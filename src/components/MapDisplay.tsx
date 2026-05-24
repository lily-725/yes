import { useEffect, memo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-rotate';
import { ARCHIVE_BOUNDS, MAP_CONFIG } from '../config';
import { PeriodData, SelectedFeature } from '../types';

interface MapDisplayProps {
  activePeriod: PeriodData;
  onFeatureSelect: (feature: SelectedFeature) => void;
}

function MapController() {
  const map = useMap() as any;
  useEffect(() => {
    if (!map) return;
    
    try {
      const lockBearing = MAP_CONFIG.VISUAL.BEARING;
      if (map.setBearing) {
        map.setBearing(lockBearing);
      }

      map.fitBounds(ARCHIVE_BOUNDS, { padding: [0, 0], animate: false });
      
      const baseZoom = map.getBoundsZoom(ARCHIVE_BOUNDS, false);
      const finalZoom = baseZoom + MAP_CONFIG.VISUAL.ZOOM_OFFSET;
      
      map.setZoom(finalZoom);
      map.setMinZoom(finalZoom); 
      map.setMaxZoom(finalZoom);
      
      const center = ARCHIVE_BOUNDS.getCenter();
      const adjustedCenter: [number, number] = [
        center.lat + MAP_CONFIG.VISUAL.LAT_OFFSET, 
        center.lng + MAP_CONFIG.VISUAL.LNG_OFFSET
      ];
      
      map.setView(adjustedCenter, finalZoom, { animate: false });

      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.touchRotate?.disable?.();
      map.shiftKeyRotate?.disable?.();
      map.compassBearing?.disable?.();
      if (map.tap) map.tap.disable();

      // 防止惯性造成尾部位移（进一步确保“完全固定”）
      if (map.options) {
        map.options.inertia = false;
      }

      const lockBounds = map.getBounds?.();
      if (lockBounds && map.setMaxBounds) {
        map.setMaxBounds(lockBounds);
      }
      if (map.options) {
        map.options.maxBoundsViscosity = 1;
      }

      const handleMapClick = (e: any) => {
        e?.originalEvent?.stopPropagation?.();
        e?.originalEvent?.preventDefault?.();
        map.stop?.();
      };
      map.on('click', handleMapClick);

      return () => {
        map.off('click', handleMapClick);
      };
      
    } catch (e) {
      console.warn('Map lock-down fail...', e);
    }
  }, [map]);
  return null;
}

const ICON_CACHE = new Map<string, L.DivIcon>();

const createCustomIcon = (type: string) => {
  const colors: Record<string, string> = MAP_CONFIG.COLORS.MARKERS;
  const color = colors[type] || '#4a4538';
  
  let svgContent = '';
  if (type === 'heritage') {
    svgContent = `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" stroke-width="1.5"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" stroke-width="1.5"/><path d="M8 7h8m-8 4h8" stroke="white" stroke-width="1.5"/>`;
  } else if (type === 'incident') {
    svgContent = `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="white" stroke-width="1.5" fill="none"/>`;
  } else {
    svgContent = `<path d="M3 21h18M3 10l9-7 9 7v11H3V10z" stroke="white" stroke-width="1.5" fill="none"/><path d="M9 21v-4a3 3 0 0 1 6 0v4" stroke="white" stroke-width="1.5"/>`;
  }

  return L.divIcon({
    className: 'archive-marker-icon',
    html: `
      <div style="
        background-color: ${color}; 
        width: 32px; 
        height: 32px; 
        border: 2.5px solid white; 
        border-radius: 4px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.4); 
        display: flex; 
        align-items: center; 
        justify-content: center;
        transform: rotate(45deg);
        cursor: pointer;
      ">
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; transform: rotate(-45deg);" fill="none" stroke="currentColor">
          ${svgContent}
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const getMarkerIcon = (type: string) => {
  const cached = ICON_CACHE.get(type);
  if (cached) return cached;
  const icon = createCustomIcon(type);
  ICON_CACHE.set(type, icon);
  return icon;
};

const MapDisplayImpl = ({ activePeriod, onFeatureSelect }: MapDisplayProps) => {
  return (
    <main className="flex-1 relative archive-map overflow-hidden bg-archive-surface p-4 shadow-2xl border-r border-archive-border/30">
      <div className="w-full h-full relative shadow-[0_0_40px_rgba(0,0,0,0.1)] border-4 border-white/50">
        {/* 跨浏览器颜色一致性遮罩：确保所有引擎下的色调统一 */}
        <div className="absolute inset-0 z-[450] pointer-events-none bg-archive-accent/5 mix-blend-multiply opacity-60"></div>
        
        <MapContainer 
          center={MAP_CONFIG.INITIAL_CENTER}
          zoom={15} 
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          trackResize={false}
          attributionControl={false}
          rotate={true}
          zoomSnap={0}
        >
          <TileLayer url={MAP_CONFIG.TILE_LAYER_URL} />
          <MapController />
          
          <Polyline 
            eventHandlers={{
              click: (e) => {
                e?.originalEvent?.stopPropagation?.();
                e?.originalEvent?.preventDefault?.();
                onFeatureSelect({
                type: 'river',
                title: '北运河天穆段',
                tag: 'River Way',
                images: [
                  { url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=1000&auto=format&fit=crop', name: '运河漕运旧刻图', source: '天穆村史志' },
                  { url: 'https://images.unsplash.com/photo-1493246507139-91e8bef99c1a?q=80&w=1000&auto=format&fit=crop', name: '历史河道实地勘察', source: '地理研究所' }
                ],
                description: activePeriod.id === 'p1' || activePeriod.id === 'p2' 
                  ? '此时期的河道保持着原始的曲折形态，是天穆先民生存的关键水系。它是漕运文化的载体，见证了无数商船与纤夫的足迹。' 
                  : '经过截弯取直工程后的新河道，大幅提升了排涝与航运能力。截弯取直不仅是水利工程，更是地理格局的现代重塑。'
                });
              }
            }}
            pathOptions={{ color: MAP_CONFIG.COLORS.RIVER, weight: 20, opacity: 0.3, lineCap: 'round', cursor: 'pointer' }} 
            positions={activePeriod.riverPath} 
          />

          <Polyline 
            className="river-flow-animation"
            pathOptions={{ 
              color: MAP_CONFIG.COLORS.RIVER, 
              weight: 14, 
              opacity: 0.4, 
              lineCap: 'round',
              dashArray: '20 40',
              interactive: false 
            }} 
            positions={activePeriod.riverPath} 
          />

          {activePeriod.railwayPath && (
            <Polyline 
              eventHandlers={{
                click: (e) => {
                  e?.originalEvent?.stopPropagation?.();
                  e?.originalEvent?.preventDefault?.();
                  onFeatureSelect({
                  type: 'railway',
                  title: '京津铁路旧线',
                  tag: 'Railway',
                  images: [
                    { url: 'https://images.unsplash.com/photo-1515165562839-978bbad18241?q=80&w=1000&auto=format&fit=crop', name: '20世纪初铁路实录', source: '北方铁路档案' },
                    { url: 'https://images.unsplash.com/photo-1532102235608-dc8fc689c9ab?q=80&w=1000&auto=format&fit=crop', name: '铁路桥梁工程资料', source: '近代路政史' }
                  ],
                  description: '标志着天穆地区进入铁路文明的重要交通动脉，连接北京与天津的历史轨道。这条铁路不仅带来了物资，更带来了现代观念的冲击。'
                  });
                }
              }}
              pathOptions={{ color: MAP_CONFIG.COLORS.RAILWAY, weight: 8, dashArray: '8, 8', opacity: 0.6, cursor: 'pointer' }} 
              positions={activePeriod.railwayPath} 
            />
          )}
          
          {activePeriod.roadPath && (
            <Polyline 
              eventHandlers={{
                click: (e) => {
                  e?.originalEvent?.stopPropagation?.();
                  e?.originalEvent?.preventDefault?.();
                  onFeatureSelect({
                  type: 'road',
                  title: '京津古道',
                  tag: 'Highway',
                  images: [
                    { url: 'https://images.unsplash.com/photo-1505672678657-cc7037095e60?q=80&w=1000&auto=format&fit=crop', name: '驿道遗迹考察', source: '地理探测数据' },
                    { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop', name: '古道沿线地貌', source: '清末舆图研究' }
                  ],
                  description: '连接京津两地的咽喉要道，见证了百年来天穆村的繁荣与变迁。它是明清两代官员述职、商旅往来的必经之路。'
                  });
                }
              }}
              pathOptions={{ color: MAP_CONFIG.COLORS.ROAD, weight: 10, opacity: 0.35, cursor: 'pointer' }} 
              positions={activePeriod.roadPath} 
            />
          )}

          {activePeriod.roadPath && (
            <Polyline 
              className="road-flow-animation"
              pathOptions={{ 
                color: MAP_CONFIG.COLORS.ROAD, 
                weight: 4, 
                opacity: 0.5,
                dashArray: '8 20',
                interactive: false
              }} 
              positions={activePeriod.roadPath} 
            />
          )}

          {activePeriod.residentialAreas?.map(area => (
            <Polygon
              key={area.id}
              eventHandlers={{
                click: (e) => {
                  e?.originalEvent?.stopPropagation?.();
                  e?.originalEvent?.preventDefault?.();
                  onFeatureSelect({
                  type: 'area',
                  title: area.name,
                  tag: 'Residential Area',
                  images: area.images || [
                    { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop', name: `${area.name}概貌`, source: '实地调研资料' }
                  ],
                  description: area.description
                  });
                }
              }}
              positions={area.points}
              pathOptions={{ 
                color: MAP_CONFIG.COLORS.AREA, 
                fillColor: MAP_CONFIG.COLORS.AREA, 
                fillOpacity: 0.15, 
                weight: 1.5, 
                dashArray: area.id === 'area-dongyuan' ? '2, 5' : '5, 5',
                cursor: 'pointer'
              }}
            />
          ))}

          {activePeriod.points.map(point => (
            <Marker
              key={point.id}
              position={point.position}
              icon={getMarkerIcon(point.type)}
              keyboard={false}
              autoPanOnFocus={false}
              eventHandlers={{
                click: (e) => {
                  e?.originalEvent?.stopPropagation?.();
                  onFeatureSelect({
                  type: point.type,
                  title: point.title,
                  description: point.description,
                  images: point.images,
                  id: point.id,
                  tag: `Point Ref #${point.id}`
                  });
                }
              }}
            />
          ))}
        </MapContainer>
      </div>
    </main>
  );
};

export const MapDisplay = memo(
  MapDisplayImpl,
  (prev, next) =>
    prev.activePeriod.id === next.activePeriod.id &&
    prev.onFeatureSelect === next.onFeatureSelect
);
