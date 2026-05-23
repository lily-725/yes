# 《天穆地理进化志》数字档案系统 - 详细设计与功能文稿

## 1. 项目概述
本系统是一个交互式地理历史档案系统，旨在通过数字化的方式展现天穆村及其周边北运河水系的地理变迁。系统采用“数字档案馆”的设计隐喻，融合了现代地图技术与复古档案美学。

## 2. 核心设计美学 (Design Aesthetics)

### 2.1 视觉风格
*   **色调 (Palette)**: 采用这种名为 "Archival Old Paper" 的低饱和度暖色调。
    *   背景色: `#f4f1ea` (模拟旧纸张)
    *   边框/线条: `#dcd7ce` 
    *   强调色: `#8c7b63` (古铜/褐色)
    *   深色文字: `#2c2a26` (模拟浓墨)
*   **质感 (Texture)**: 使用 `handmade-paper.png` 叠加层，透明度控制在 5%，模拟真实纸张的手感。
*   **地图滤镜**: 地图层经过 grayscale(100%) 和 sepia(30%) 滤镜处理，使其看起来像是一张老式地籍图。

### 2.2 字体排版
*   **衬线体 (Serif)**: 使用 `Crimson Pro`，用于正文和感性的描述文字，体现历史感。
*   **无衬线体 (Sans)**: 使用 `Inter`，用于 UI 控件和标签，确保可读性。
*   **等宽体 (Mono)**: 使用 `JetBrains Mono`，用于地理坐标、序列号，增加科学精准感。

---

## 3. 页面布局与架构 (Layout Architecture)

系统采用典型的三栏式布局，确保信息密度高且不拥挤：

1.  **左侧导航栏 (Timeline View)**: 
    *   垂直时间轴，列出不同的历史时期（如元明清时期、铁路修建时期、运河截弯取直时期、现代景观时期）。
    *   下方集成图例 (Legend)，说明地图上线条和点位的含义。
2.  **中间地图展示区 (The Map Vault)**: 
    *   占据 60% 以上的面积。
    *   具有旋转角度（顺时针 35 度）以模拟特定的测绘视角。
    *   边框采用厚实的 20px `#fdfcf8` 边框，增加“画框”或“台面”感。
3.  **右侧档案详情区 (File Reference)**: 
    *   展示当前选中时期的详细元数据：案例编号、测绘机构、地理演变论要。
    *   地理网格空间：展示精确的经纬度范围。

---

## 4. 关键功能与技术实现 (Functional Specs)

### 4.1 地图锁定与导航约束 (Map Locking)
系统为了确保用户聚焦于特定研究区域，对地图操作进行了极致约束：
*   **固定范围**: 使用 `L.latLngBounds` 定义一个严格的地理多边形范围。
*   **禁用手势**: 禁用拖拽、滚动缩放、双击缩放、键盘导航。
*   **动态缩放计算**: 使用 `map.getBoundsZoom(ARCHIVE_BOUNDS, true)` 自动计算最适合该多边形的缩放级别并锁定。
*   **地图旋转**: 使用 `leaflet-rotate` 插件，设置 `setBearing(35)`，创造独特的视觉非对称感。

### 4.2 动态地理要素 (Geo-Animation)
*   **河流流动**: 使用 `Polyline` 结合 CSS 动画（`stroke-dashoffset`），模拟动态水流。
*   **道路流向**: 类似的动画效果用于模拟历史交通线路。
*   **平滑过渡**: 切换不同时期时，河流和道路的路径会通过 Leaflet 的 `path.leaflet-interactive` 过渡特性平滑变形。

### 4.3 档案弹窗 (Archival Popups)
*   **多图轮播**: 弹窗左侧支持横向滑动（Snap Scroll）展示多张历史照片。
*   **灰度处理**: 默认展示灰度照片，悬停或激活时恢复色彩，寓意“唤醒记忆”。
*   **分类标记**: 使用不同的 SVG 图标区分“文化遗产”、“重大事件”和“地标建筑”。

### 4.4 声音档案 (Ambient Audio)
*   每个历史时期关联一个特定的音频 URL。
*   顶部提供“AMBIENT”开关，模拟在档案馆中听取实地录音或背景音效的互动体验。

---

## 5. 数据结构参考 (Data Schema)

要完全复刻本系统，需要构建如下结构的 `data.ts`:

```typescript
interface PeriodData {
  id: string; // 标识符
  label: string; // 显示年份 (1400-1912)
  subLabel: string; // 时期名称 (元明清漕运时期)
  audioUrl: string; // 关联音频
  audioLabel: string; // 音频描述
  evolutionNotes: string; // 长段描述文字
  surveyorName: string; // 测绘机构/人
  riverPath: [number, number][]; // 河流坐标点数组
  railwayPath?: [number, number][]; // (可选) 铁路坐标
  roadPath?: [number, number][]; // (可选) 道路坐标
  points: {
    id: string;
    position: [number, number];
    title: string;
    description: string;
    images: { name: string; url: string }[];
    type: 'heritage' | 'incident' | 'landmark';
  }[];
}
```

## 6. 复刻逻辑要点 (Key Checklist)

1.  **MapContainer 配置**: `zoomSnap={0}` 以支持微调缩放，`rotate={true}` 开启旋转支持。
2.  **CSS 变量**: 在 `@theme` 中定义上述配色方案。
3.  **动画**: 使用 `framer-motion` 处理文字入场（`y: 15` 向上浮动且渐显）。
4.  **地图限制器**: 在 `useEffect` 中通过 `map.fitBounds(ARCHIVE_BOUNDS)` 配合 `padding: [0, 0]` 强制区域全屏显示。
5.  **交互封锁**: 确保调用 `map.dragging.disable()` 等 API。

---
*该文稿库由数字档案馆系统自动生成，作为复刻与分发的技术依据。*
