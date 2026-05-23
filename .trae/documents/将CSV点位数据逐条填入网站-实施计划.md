# 将表格（CSV）点位数据逐条填入网站：实施计划

## Summary（摘要）
目标：把用户上传的 CSV（点位信息）按“每行一条记录”的方式，自动/半自动逐条填写到用户提供的网页表单中，并具备**字段映射可配置**、**校验与清洗**、**失败重试**、**断点续跑**、**可审计日志**能力，避免批量写错与重复提交。

输入文件（用户已上传）：[数据整理 点位 完整.csv](computer:///sessions/6a0bebc96ee444f972258019/uploads/cbbf56da-1df1-44b3-9dce-fd12ae0bc8ca_%E6%95%B0%E6%8D%AE%E6%95%B4%E7%90%86%20%E7%82%B9%E4%BD%8D%20%E5%AE%8C%E6%95%B4.csv)

---

## Current State Analysis（现状分析）
1. **数据结构（CSV 表头）**（来自文件第 1 行）：
   - `所在时段, 点位名称, 点位坐标, 点位解说, 地址, 图片标题, 图片来源, 对应的展览章节`
2. **CSV 复杂点**（已从文件样例读取确认）：
   - `点位坐标`列是被双引号包裹的多行 JSON/GeoJSON（字段内部有换行与 `""` 转义）。
   - `对应的展览章节`字段也可能跨行（示例类似 `"ex-02\n/\nu02-01"`）。
   - 部分行的坐标 JSON 可能不完整/格式不一致（例如缺少最外层 `{}` 或只剩 Feature 片段），如果直接按普通“逐行 split(',')”解析会错位。
3. **工作区代码现状**：
   - 工作区包含一个 Vite + React 应用（`/workspace/src/...`），但本任务按用户已确认的输入（“我提供 URL、无需登录、逐条表单录入”）以**外部网页表单录入**为主，不默认改动现有前端代码。

---

## Proposed Changes（方案与改动点）
> 约定：仅在执行阶段落地文件与脚本。本计划阶段不做任何实现改动。

### A. 新增“可配置字段映射”与运行配置（工作区新增文件）
**目标**：把“CSV 列 → 网页字段（选择器/控件类型/枚举映射/清洗规则）”固化，避免每次运行靠临时人工判断。

拟新增（最终落地路径在执行阶段确定，均放在用户可见工作区中）：
1. `workspace/importer/mapping.yaml`
   - 内容：
     - CSV 列名到网页字段的映射（字段 label、CSS selector、控件类型 text/textarea/select/upload 等）
     - 枚举映射（例如：`所在时段` 文本 → 下拉选项 value）
     - 清洗规则（trim、章节字段去换行、空值策略等）
2. `workspace/importer/run_config.json`
   - 内容：
     - 目标 URL（用户提供）
     - 运行模式（create / update；默认 create）
     - 重试次数、超时、是否启用断点续跑、是否开启截图等

**为什么**：网页表单自动化最容易失败在“元素定位不稳定/枚举值不一致”。用 mapping 固化 selector 和枚举映射是稳定性的核心。

---

### B. CSV 解析、清洗与校验（新增一次性处理脚本 + 输出清洗结果）
**目标**：把原始 CSV 解析成“规范记录”（canonical records），并提前识别不可自动化的数据问题（缺坐标、章节格式异常、枚举不匹配等），减少在网页端失败次数。

拟新增（执行阶段）：
1. `work/parse_and_validate_csv.py`（中间脚本，执行后不必保留到工作区）
2. `workspace/importer/out/cleaned_records.jsonl`（可选输出，便于断点/审计）
3. `workspace/importer/out/validation_report.csv`（必需输出）

**关键实现要点**：
1. CSV 解析必须支持 **quoted field 含换行**（RFC4180 语义）：
   - 正确处理双引号包裹字段内的换行
   - 正确把 `""` 还原为 `"`
2. `对应的展览章节`规范化：
   - 将换行与分隔符规范化为单行格式（例如把 `ex-02\n/\nu02-01` 归一为 `ex-02/u02-01`）
3. `点位坐标`（GeoJSON/JSON）归一化与经纬度抽取：
   - 若为 `FeatureCollection`：取首个 feature 的 `geometry.coordinates=[lon,lat]`
   - 若为 `Feature`：用确定性方式包一层 FeatureCollection（用于统一结构）
   - 若疑似缺少最外层 `{}` 且开头是 `"type"`：仅做“补花括号”这种确定性修复；其他损坏进入人工队列
   - 校验 lon/lat 范围（lon ∈ [-180,180], lat ∈ [-90,90]）
4. 生成 `row_key`（幂等键）：
   - 建议：`所在时段|点位名称|图片路径(或图片标题)`，用于断点续跑与去重

---

### C. 网页自动化录入（推荐 Playwright 脚本；备选 MCP 浏览器工具）
**目标**：对 `cleaned_records` 逐条执行：打开表单页 → 填字段/上传图片 → 保存 → 判定成功 → 写入 checkpoint。

#### 方案 C1（推荐）：Playwright 自动化脚本（更适合大量数据）
拟新增（执行阶段）：
1. `work/fill_form_playwright.(ts|js)`：主自动化脚本（中间文件）
2. `workspace/importer/out/checkpoint.json`：断点文件（必需）
3. `workspace/importer/out/run_log.jsonl`：逐条结构化日志（必需）
4. `workspace/importer/out/screenshots/`：失败截图（建议）

自动化步骤（每条记录）：
1. `page.goto(targetUrl)`
2. 依据 `mapping.yaml` 定位并填入：
   - 文本/多行文本（点位名称、点位解说、地址、图片标题/来源等）
   - 下拉/枚举（所在时段、展览章节等；按枚举映射选择）
   - 坐标：
     - 若有 lon/lat 输入框：直接填入
     - 若为地图选点控件：优先寻找隐藏 input（很多地图组件最终会同步到 input value）；否则再考虑点击地图（不稳定，需单独评估）
   - 图片：
     - 若为 `<input type="file">`：用文件路径上传（需要用户提供图片所在本地文件夹）
     - 若为“图片 URL”字段：直接填 URL（需要可访问 URL）
3. 点击保存/提交
4. 成功判定（至少具备一种，写入 mapping）：
   - 成功 toast 文案
   - URL 跳转出现新 id
   - 页面出现“保存成功/提交成功”等可见文本
5. 成功后写入 `checkpoint.json`（只在确认成功后落盘）

重试与失败分桶：
- 可重试：超时、偶发元素未加载、网络错误（重试 N 次）
- 不可重试/需人工：枚举不存在、必填缺失、坐标无法解析、页面校验失败（写入 `manual_queue.csv`）

#### 方案 C2（备选）：使用 integrated_browser MCP 工具半自动执行（适合小批量）
如果数据量很小或页面极不稳定、需要人工介入，可在执行阶段用 MCP 浏览器工具逐条执行：
- `browser_navigate / browser_snapshot / browser_click / browser_type / browser_select_option ...`
- 仍然沿用同一份 `mapping.yaml` 与 `checkpoint.json`，只替换“执行器”为工具调用循环。

---

### D. 与现有前端代码的关系（可选分支，需用户确认）
如果用户最终提供的 URL 指向的就是本工作区的 Vite/React 应用，且需求是“把 CSV 导入为站点展示数据（而非录入后台表单）”，则改为：
- 新增 `workspace/scripts/csv_to_app_data.(ts|py)`：把 CSV 转成 `src/data.ts` 所需结构或生成 `src/data/points.json`
- 修改 `src/data.ts` 或新增数据加载逻辑（此分支不在默认执行范围内，除非用户确认目标就是该站点的数据文件导入）。

---

## Assumptions & Decisions（假设与决策）
1. 以用户已确认信息为准：**用户将提供目标 URL**、页面**无需登录**、录入方式为**逐条表单提交**、字段映射由我先分析 CSV 后再确定。
2. 默认“一行 CSV = 一条记录提交”。若同名点位多行（可能是多图），在执行前必须确认：
   - 是创建多条记录，还是同一记录追加多图/多来源；否则会造成重复或覆盖。
3. 图片字段：
   - 若网页为文件上传控件，必须由用户提供图片在本机（所选文件夹内）的实际路径；CSV 中形如 `/shuru/*.jpg` 的路径不保证可直接上传。
4. 坐标字段：
   - 仅做确定性修复（补 `{}`、Feature→FeatureCollection 包装）；无法确定的损坏数据进入人工队列，不“猜测修复”。

---

## Verification（验证步骤）
### 1) 数据侧验证
1. 解析后统计：
   - 总记录数、可自动化记录数、进入人工队列数（缺坐标/JSON 损坏/枚举缺失等）
2. 抽样检查 5 条 `cleaned_records.jsonl`：
   - `chapter_norm` 已去换行
   - lon/lat 合理且与原 JSON 一致

### 2) 网页侧小样本试跑（强制）
1. 先只跑 3–5 条覆盖不同情况（坐标正常/坐标缺失/章节跨行等）
2. 每条提交后校验：
   - 成功提示出现
   - 页面回显值与输入一致（至少核对：点位名称、所在时段、章节、经纬度）
3. 小样本通过后再全量运行

### 3) 断点与幂等验证
1. 人为中断后重跑：
   - 已完成的 `row_key` 必须跳过
   - 不应产生重复记录（若页面天然不幂等，则需要“创建前搜索/去重”步骤，写入 mapping）

