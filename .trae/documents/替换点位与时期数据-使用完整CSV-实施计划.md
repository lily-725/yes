# /plan 替换原有数据：使用「数据整理 点位 完整.csv」

## Summary（摘要）

- 目标：删去当前站点内“原有的数据输入”（包括时期侧栏内容与点位数据），以 `/Users/liuyi/Desktop/天穆地图终终极/数据整理 点位 完整.csv` 为唯一数据源，重新生成前端使用的数据。
- 你已确认的关键偏好：
  - 替换范围：全量替换 Period 数据（点位 + 右侧“档案老照片”等内容）。
  - CSV 点位类型：统一按 `landmark` 生成。
  - 对 CSV 中“非点位（例如坐标为‘（整个公路）’）”的行：按线/面处理。

## Phase 1：Current State Analysis（现状分析）

### 1) 现有数据入口

- 页面时期数据来自 [data.ts](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/data.ts)：
  - `BASE_HISTORICAL_DATA` 内含 `label/subLabel/evolutionNotes/coverImage/historicalImages/oralHistory/points` 等“时期内容”
  - 最终 `HISTORICAL_DATA` 会把 `CSV_POINTS_BY_PERIOD` 合并进 `p.points`
- CSV 点位数据目前来自 [csv_points.ts](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/csv_points.ts)，注释标明“由 CSV 自动生成”。

### 2) 新 CSV 的结构与特性

- `/Users/liuyi/Desktop/天穆地图终终极/数据整理 点位 完整.csv` 表头为：
  - `所在时段, 点位名称, 点位坐标, 点位解说, 地址, 图片标题, 图片来源, 对应的展览章节`
- 同一“点位”会出现多行（每行一张图片），需要聚合为 `images[]`。
- “点位坐标”多数是 GeoJSON（`FeatureCollection` + `Point`），但存在特殊值：
  - 例如 `民国时期, 京津公路, （整个公路） ...`（无法直接解析为 Point）
  - 这类行目前 CSV 内不包含 LineString/Polygon 坐标（文件中未出现 `LineString/Polygon`），因此“按线/面处理”需要**复用现有地图线几何**（`roadPath/riverPath` 等），只替换其点击弹出的文案/图片。

### 3) 右侧“档案老照片”等内容的来源

- 右侧默认侧栏 `SidebarDefault` 会优先使用 `activePeriod.historicalImages`，否则用 `coverImage`（见 [SidebarDefault.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/SidebarDefault.tsx#L48-L52)）。
- CSV 不提供 `evolutionNotes / oralHistory` 等字段，因此需要决策：
  - `evolutionNotes` 置空字符串（保留版式但内容为空），或保留原文本（但这不满足“全量替换”）。
  - `oralHistory` 设为 `undefined`（侧栏该 section 自动隐藏）。

## Phase 2：Intent Lock（目标锁定）

### 替换策略（决策已完成）

- 前端展示用的数据以 CSV 为准：
  - 点位 Marker（Point）来自 CSV 聚合生成
  - “档案老照片”来自该时期 CSV 点位图片的去重集合（可限制数量）
  - 河/路等“线要素”的点击详情来自 CSV 中对应行（例如“北运河”“京津公路”），几何线本身继续使用现有 `riverPath/roadPath`
- CSV 未提供的时期字段采用“最小保留”：
  - 时间轴 `label`（如 1402–1912）保留现有（否则时间轴无范围）
  - `subLabel` 改为 CSV 的 `所在时段`（明清时期/民国时期/工业化起步/现代化进程）
  - `evolutionNotes` 统一置空字符串
  - `oralHistory` 移除（undefined）

## Phase 3：Implementation Plan（实现方案，决策完备）

### A) 增加“从 CSV 生成前端数据”的脚本（避免手改 TS）

- 新增脚本：`importer/scripts/generate_frontend_data_from_csv.py`
- 输入：`数据整理 点位 完整.csv`
- 输出（直接写入仓库文件，覆盖旧数据）：
  1. `src/csv_points.ts`
     - `CSV_POINTS_BY_PERIOD: Record<string, HistoricalPoint[]>`
     - 每个 HistoricalPoint：
       - `id`: `p{periodIndex}-csv-{NNN}`（按 CSV 首次出现顺序稳定生成）
       - `position`: `[lat, lon]`（从 GeoJSON Point coordinates 提取；异常行不生成 Marker）
       - `title`: `点位名称`
       - `description`: `点位解说`
       - `images`: 按同一点位聚合 `地址/图片标题/图片来源`
       - `type`: 固定为 `landmark`
  2. 同文件额外导出（用于 Period 级别替换 + 线要素点击详情）：
     - `CSV_GALLERY_IMAGES_BY_PERIOD: Record<string, HistoricalImage[]>`
       - 从该时期所有点位的 `images` 去重（按 url 去重），取前 N（建议 N=12）作为侧栏“档案老照片”
     - `CSV_LINEAR_FEATURES_BY_PERIOD: Record<string, Partial<Record<'river' | 'road', SelectedFeature>>>`
       - 把 CSV 中“无法解析为 Point”的行收集为线要素详情：
         - `点位名称`包含“运河/北运河” → `river`
         - `点位名称`包含“公路/京津公路” → `road`
       - 这些条目不生成 Marker，只用于 `MapDisplay` 点击 Polyline 时展示（几何仍用现有 `riverPath/roadPath`）
- 解析细节（脚本必须覆盖 CSV 的“多行 JSON + 换行引号”情况）：
  - 使用 Python 标准库 `csv` 解析（可正确处理引号内换行）
  - `点位坐标`：
    - 尝试 `json.loads`（清理多余空白）
    - 若解析成功且 geometry.type 为 `Point` → 提取 `(lon, lat)`
    - 否则视为“线要素候选”或“无法处理”，记录到 stdout 汇总，并写入 `importer/out/manual_queue.csv`（可选）

### B) data.ts：Period 数据全量改为由 CSV 导出驱动

- 修改 [data.ts](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/data.ts)：
  - 移除 `BASE_HISTORICAL_DATA` 内手写 `points / coverImage / historicalImages / oralHistory / evolutionNotes`
  - 保留地图几何（`riverPath/railwayPath/roadPath/residentialAreas`）与时间轴范围 `label`
  - `subLabel` 替换为 CSV 时段名（固定映射）：
    - `p1 → 明清时期`
    - `p2 → 民国时期`
    - `p3 → 工业化起步`（对应旧 p3 1949–1978）
    - `p4 → 现代化进程`
  - `points`：直接使用 `CSV_POINTS_BY_PERIOD[p.id] ?? []`（不再与手写点位合并）
  - `historicalImages / coverImage`：使用 `CSV_GALLERY_IMAGES_BY_PERIOD[p.id]`
  - `evolutionNotes`：置为 `''`
  - `oralHistory`：置为 `undefined`

### C) MapDisplay：河/路点击详情改用 CSV（实现“线/面处理”）

- 修改 [MapDisplay.tsx](file:///Users/liuyi/Desktop/%E5%A4%A9%E7%A9%86%E5%9C%B0%E5%9B%BE%E7%BB%88%E7%BB%88%E6%9E%81/src/components/MapDisplay.tsx)
  - Polyline 点击（river/road）不再使用硬编码的 unsplash 图片与文案，而是：
    - 优先从 `CSV_LINEAR_FEATURES_BY_PERIOD[activePeriod.id]` 取 `river/road` 的 `SelectedFeature`
    - 若 CSV 中没有对应条目，则回退到现有硬编码（防止空白）
  - Railway 点击暂不改（CSV 未提供“铁路”条目），仍保持现有逻辑

## Assumptions & Decisions（假设与决策）

- CSV 是唯一可用数据源（当前仓库中没有额外的“时期说明/口述史/封面图”表格），因此这些字段将清空或由 CSV 图片集合推导。
- “按线/面处理”在本 CSV 的前提下只能做到：**线要素的点击详情由 CSV 提供，线几何坐标继续沿用现有 `riverPath/roadPath`**。
- 若你后续提供包含 LineString/Polygon 坐标的表格版本，可进一步把线/面几何也改为 CSV 驱动（届时再扩展脚本与 PeriodData 结构）。

## Verification（验证步骤）

1. 生成数据

- 运行 `python3 importer/scripts/generate_frontend_data_from_csv.py`
- 预期：`src/csv_points.ts` 被覆盖生成；脚本输出汇总包括：
  - 每个 period 生成的 Marker 数
  - 被识别为线要素的条目数（river/road）
  - 无法处理的条目数（若有）

2. 编译检查

- `npm run lint` 通过

3. 功能回归

- 四个时期切换后：Marker 数量与 CSV 相符，点击 Marker 展示对应图片与解说
- 右侧“档案老照片”显示为该时期 CSV 图片集合（去重后）
- 点击河道/道路：弹出内容替换为 CSV 的“北运河/京津公路”文案与图片（若 CSV 提供）
