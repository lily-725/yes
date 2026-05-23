# importer 使用说明

本目录用于把你上传的 CSV 点位数据清洗后，逐条填写到网页表单（后台/新增页）。

## 已生成的输出
- `out/cleaned_records.jsonl`：清洗后可直接用于录入的记录（已抽取 lon/lat、章节去换行）
- `out/validation_report.csv`：每条记录的校验结果
- `out/manual_queue.csv`：无法自动解析坐标的记录（当前仅 2 条）

## 1) 先配置 mapping 和 run_config
1. 编辑 `mapping.yaml`，把每个字段的 `selector` 填上（建议优先用 `data-testid`/`name`/`id`）。
2. 编辑 `run_config.json`：
   - `targetUrl`：目标表单页面 URL
   - `input.imageBaseDir`：如果需要文件上传图片，这里填“图片根目录”（用于把 CSV 里的 `/shuru/xxx.jpg` 解析成真实文件路径）

## 2) 运行清洗脚本（如需重新生成 out/*）
清洗脚本在“我的工作目录”里（执行阶段生成），会覆盖 `out/` 下的同名文件。

## 3) 运行 Playwright 录入脚本（模板）
脚本：`scripts/fill_form_playwright.mjs`

安装依赖：
```bash
npm i -D playwright yaml
```

运行：
```bash
node importer/scripts/fill_form_playwright.mjs
```

说明：
- 目前脚本完成“打开页面并填写字段”的框架，但**保存按钮点击与成功判定**仍需根据页面实际情况补齐（在脚本里有 TODO 标注）。
- 在补齐保存逻辑前，脚本不会写入 `checkpoint.json`，避免误判已成功录入。

