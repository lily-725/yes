import L from 'leaflet';

/**
 * 核心地理配置 - 非开发人员可在此调整地图显示逻辑
 */
export const MAP_CONFIG = {
  // 地图初始中心点
  INITIAL_CENTER: [39.19586, 117.145525] as [number, number],
  
  // 锁定区域的地理边界 (GeoJSON 多边形)
  ARCHIVE_POLYGON: [
    [39.20785117405143, 117.14949302571694],
    [39.19844673806901, 117.12968018588214],
    [39.18374223587114, 117.14211033303917],
    [39.19341904867133, 117.16082340449486],
    [39.20785117405143, 117.14949302571694]
  ] as [number, number][],

  // 视觉控制参数
  VISUAL: {
    BEARING: 35,          // 旋转角度 (顺时针度数)
    ZOOM_OFFSET: 0.4,      // 缩放偏移量 (值越大越近)
    LAT_OFFSET: 0.0,       // 经纬度垂直偏移量 (用于微调视窗焦点)
    LNG_OFFSET: 0.0,       // 经纬向水平偏移量
  },

  // 底图服务配置
  TILE_LAYER_URL: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
  
  // 颜色配置
  COLORS: {
    RIVER: '#6a7d85',
    RAILWAY: '#2c2823',
    ROAD: '#8b4513',
    AREA: '#d4a373',
    MARKERS: {
      heritage: '#8c7b63',
      incident: '#4a3728',
      landmark: '#5a5a40'
    }
  }
};

export const ARCHIVE_BOUNDS = L.latLngBounds(MAP_CONFIG.ARCHIVE_POLYGON);
