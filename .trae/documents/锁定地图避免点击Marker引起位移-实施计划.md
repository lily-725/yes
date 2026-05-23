# /plan 锁定地图：点击 Marker 不再导致地图位移

## Summary（摘要）
- 现象：地图本身设置为不可拖拽/不可缩放，但点击地图左侧的 Marker 后，底图出现轻微平移（“地图会移动”）。
- 目标：点击任意 Marker（尤其是地图左侧）只更新右侧详情，不应触发底图任何平移/跳动；其余交互保持现状（包括当前旋转功能与 BEARING 固定展示逻辑）。
- 涉及文件：
  - [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx)（Leaflet MapContainer 初始化参数、MapController 锁定逻辑）
  - [index.css](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/index.css)（侧栏滚动条与布局稳定性）

## Current State Analysis（现状分析）
### 1) 地图交互已被禁用，但“位移”仍可能发生
- 当前 `MapController` 已禁用 `dragging / scrollWheelZoom / doubleClickZoom / touchZoom / boxZoom / keyboard / tap`（见 [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx) 顶部 `MapController`）。
- 因为用户交互已禁用，“点击 Marker 导致地图移动”更像是 Leaflet 在 **容器尺寸变化（invalidateSize）** 时为保持中心点做的自动平移，而不是用户拖拽。

### 2) 高概率触发源：点击 Marker 会切换右侧面板，导致布局/滚动条状态变化
- Marker 点击会把右侧从 `SidebarDefault` 切换为 `FeatureDetail`（在 App 的 `selectedFeature` 分支）。
- 两个侧栏内容高度与滚动需求不同：某些点位（尤其多图）会使侧栏出现/消失滚动条，部分浏览器滚动条会占用宽度，导致主布局可用宽度发生 1–数 px 的变化。
- Leaflet 默认开启 `trackResize`，在检测到 map 容器尺寸变化后会执行 `invalidateSize`，并可能伴随一次“为保持中心点”的平移，从而被感知为地图“动了一下”。

## Proposed Changes（改动方案）
### A) MapContainer 禁止自动 resize 跟踪（核心修复）
- 文件：[MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx)
- 改动：
  - 在 `<MapContainer ...>` 上增加 Leaflet 的 `trackResize={false}` 初始化选项（这是 Leaflet 原生 Map option，react-leaflet 会透传给 Map）。
- 为什么：
  - 避免侧栏切换导致的细微布局变动触发 Leaflet 的自动 `invalidateSize` → `pan`，从根源阻断“点击 Marker 导致地图位移”。

### B) 侧栏滚动条“稳定占位”，避免切换时宽度抖动（辅助修复，降低跨浏览器差异）
- 文件：[index.css](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/index.css)
- 改动（二选一或同时上，按兼容性落地）：
  1) 在 `.archive-scrollbar` 增加 `scrollbar-gutter: stable;`（现代 Chromium/Firefox 有效）
  2) 或对右侧滚动容器使用 `overflow-y: scroll;`（强制始终显示滚动条占位，最朴素但最稳定）
- 为什么：
  - 保证侧栏“有无滚动内容”不会改变布局宽度，减少不同系统滚动条策略导致的抖动。

## Assumptions & Decisions（假设与决策）
- 你选择“保持现状”：本次只消除点击 Marker 引发的平移/跳动，不改变当前“不可拖拽/不可缩放/可旋转（固定 bearing）”等既有交互策略。
- `trackResize={false}` 的副作用可接受：窗口尺寸变化时地图不会自动重新计算布局；本项目地图属于固定展示组件，且页面主布局为固定高度容器，该副作用通常不影响使用。

## Verification（验证步骤）
1) 点击回归
   - 任意时期下，连续点击地图左侧多个 Marker（尤其多图点位）；
   - 预期：底图不再发生平移/跳动；右侧详情正常切换。
2) 布局回归（跨面板切换）
   - 点击 Marker 进入 `FeatureDetail` → 点击“返回主页”回到 `SidebarDefault`；
   - 预期：地图视图位置保持不变。
3) 旋转回归（保持现状）
   - 检查初始 bearing 仍按 `MAP_CONFIG.VISUAL.BEARING` 生效；旋转控件仍可见（若当前就是可见）且不影响锁定结果。

