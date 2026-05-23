# 修复 bug：多图“房子图标”Marker 点击后页面卡住（四个时期均出现）

## Summary（摘要）
- 现象：点击带“房子图标”的多图 Marker（例如“天穆村的漕运 / 经房子 / 天穆村的游泳健儿 / 生活用具”）后，页面出现明显卡顿甚至短暂无响应。
- 范围：四个时期（p1–p4）均可复现；点位来源为 CSV 自动生成数据（[csv_points.ts](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/csv_points.ts)），这些点位通常包含多张大图。
- 目标：真实鼠标点击 Marker 时不应导致“假死”；右侧详情正常切换；多图画廊正常滚动与放大；地图交互保持当前“固定不动”的设定。
- 涉及文件（用户指定 & 代码确认）：
  - [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx#L60-L107)（房子图标 icon 创建与缓存）
  - [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx#L259-L279)（Marker click handler）
  - [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx#L286-L291)（MapDisplay memo 导出）
  - [FeatureDetail.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/FeatureDetail.tsx#L32-L81)（多图画廊渲染）

## Current State Analysis（现状分析）
### 1) 触发链路（从点击到渲染）
- Marker 点击：`MapDisplay.tsx` 中 `Marker.eventHandlers.click` 调用 `onFeatureSelect({... images: point.images ...})`，上抛到 [App.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/App.tsx#L12-L49) 的 `setSelectedFeature`，从而切换右侧侧栏为 `FeatureDetail`。
- 右侧详情：`FeatureDetail.tsx` 在 `feature.images.length > 0` 时渲染横向滚动多图画廊，每张图都进入 DOM，并触发浏览器的布局、绘制与图片解码/缩放样式计算。

### 2) 为什么“多图 + 房子图标”更容易卡
- 这些点位数据来自 [csv_points.ts](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/csv_points.ts)，例如：
  - “天穆村的漕运”在 p1/p2 都是多图（2 张以上）
  - “天穆村的游泳健儿”在 p2/p3 多图（2–3 张）
  - “生活用具”在 p4 多图（7 张）
- 相比单图点位，点击后会一次性渲染/开始处理更多 `<img>`，若图片尺寸较大或设备性能一般，就更容易产生主线程长任务，表现为“点击后页面卡住”。

### 3) 地图侧影响的排查结论（基于当前代码）
- 当前 [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx) 已具备两点“降噪”：
  - Marker/Polyline/Polygon 的 click handler 已进行 `stopPropagation/preventDefault`，减少 Leaflet 事件链干扰。
  - `MapDisplay` 通过 `memo` 导出，且 `onFeatureSelect` 在 React 中通常为稳定引用（`setSelectedFeature`），因此点击点位后理论上不应导致地图层频繁重渲染。
- 因此，本次优先从“右侧多图渲染造成的同步压力”方向做针对性止血，同时保留对地图 click 事件处理的安全修正空间。

## Proposed Changes（改动方案）
### A) App.tsx：将“选中要素”的状态更新降级为非阻塞（避免点击瞬间阻塞 UI）
- 文件：[App.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/App.tsx)
- 改动：
  - 引入 `useTransition`，在 Marker 点击触发的 `setSelectedFeature` 上使用 `startTransition(() => setSelectedFeature(...))`
  - 现有写法为 `onFeatureSelect={setSelectedFeature}`；调整为具名回调（保持引用稳定，可 `useCallback`）
- 预期效果：
  - React 将侧栏切换与多图挂载放到可中断的低优先级更新，显著降低“鼠标点击→立刻卡死”的体感概率。

### B) FeatureDetail.tsx：分阶段渲染画廊（先首图，后其余图），将重负载推迟到浏览器空闲时段
- 文件：[FeatureDetail.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/FeatureDetail.tsx#L32-L81)
- 改动：
  - 增加本地 state：`renderAllImages`
  - 在 `feature.id` 或 `feature.title` 变化时，将 `renderAllImages` 先置为 `false`，然后用 `requestIdleCallback`（无则 fallback `setTimeout`）在空闲时置为 `true`
  - JSX 渲染策略：
    - 永远渲染第 1 张（保证画廊“立即可见”）
    - 其余图片仅在 `renderAllImages === true` 时渲染进 DOM
- 预期效果：
  - 将“同时挂载多张大图”从点击同步路径移出，避免一次点击引发主线程长任务。

### C) FeatureDetail.tsx：进一步降低图片加载/解码的争抢（首图优先，其余低优先级）
- 文件：[FeatureDetail.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/FeatureDetail.tsx)
- 改动：
  - 对首图设置 `loading="eager"`、`fetchPriority="high"`
  - 对其余图片设置 `loading="lazy"`、`fetchPriority="low"`、`decoding="async"`
  - 保持现有固定尺寸容器（`aspect-[16/10]`）以避免布局抖动
- 预期效果：
  - 用户看到的第一屏更快稳定，其余资源不会抢占点击后的主线程与网络队列。

### D) MapDisplay.tsx：对 Marker click 的事件处理做一次“最小风险”调整（仅保留 stopPropagation）
- 文件：[MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx#L259-L279)
- 改动：
  - 保留 `stopPropagation`
  - 评估并移除 `preventDefault`（若确认对 Leaflet 内部序列无益时），避免浏览器对默认点击行为的异常处理可能性
- 预期效果：
  - 降低事件副作用风险，确保 click 只做“选中点位”。

## Assumptions & Decisions（假设与决策）
- 本次“卡住”主要来自点击后同步挂载多张大图带来的主线程长任务（布局/绘制/解码/动画初始化），而不是地图自身进入事件循环。
- 允许画廊“其余图片”延迟几十毫秒到数百毫秒出现（在浏览器空闲时加载），但首图必须即时出现，避免体验倒退。
- 不引入新依赖库；用浏览器原生 API（`requestIdleCallback`/`setTimeout`）与 React 内置并发特性（`useTransition`）完成止血。

## Verification（验证步骤）
### 1) 复现回归（重点点位）
- 在每个时期切换后，连续真实鼠标点击以下点位（至少各 10 次）：
  - p1：天穆村的漕运、经房子
  - p2：天穆村的游泳健儿、天穆村的漕运
  - p3：天穆村的游泳健儿
  - p4：生活用具
- 预期：点击后无“假死”；侧栏正常切换；滚动/放大正常。

### 2) 性能验证（Chrome DevTools）
- Performance 录制从“点击 Marker”到“侧栏首图可见”的过程：
  - 预期：无持续数秒的 Long Task；主线程峰值明显降低
  - 预期：其余图片在空闲时段逐步出现，不影响基本交互

### 3) 地图侧验证（防回归）
- 点击上述点位时地图不抖动、不会突然重置视图；拖拽/缩放仍保持禁用状态。

