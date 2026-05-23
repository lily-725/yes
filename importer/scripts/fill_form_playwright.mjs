/**
 * 用 Playwright 把 cleaned_records.jsonl 逐条填写到网页表单。
 *
 * 前置：
 * 1) 在 importer/mapping.yaml 填好 selector / 枚举映射 / 成功判定
 * 2) 在 importer/run_config.json 填好 targetUrl、imageBaseDir（如需要上传）
 * 3) npm i -D playwright yaml
 *
 * 运行：
 * node importer/scripts/fill_form_playwright.mjs
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";
import { parse as parseYaml } from "yaml";

const WORKSPACE_ROOT = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readYaml(filePath) {
  return parseYaml(fs.readFileSync(filePath, "utf-8"));
}

function readJsonl(filePath) {
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function appendJsonl(filePath, obj) {
  fs.appendFileSync(filePath, JSON.stringify(obj, null, 0) + "\n", "utf-8");
}

function loadCheckpoint(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data && typeof data === "object" ? data : { done: {} };
  } catch {
    return { done: {} };
  }
}

function saveCheckpoint(filePath, cp) {
  fs.writeFileSync(filePath, JSON.stringify(cp, null, 2), "utf-8");
}

function assertNonEmpty(val, msg) {
  if (!val || String(val).trim() === "") {
    throw new Error(msg);
  }
}

async function fillText(page, selector, value) {
  await page.waitForSelector(selector, { state: "visible" });
  await page.fill(selector, value ?? "");
}

async function fillTextarea(page, selector, value) {
  await page.waitForSelector(selector, { state: "visible" });
  await page.fill(selector, value ?? "");
}

async function selectOption(page, selector, valueOrLabel) {
  await page.waitForSelector(selector, { state: "visible" });
  // 尽量走原生 select；若是自定义组件，需要改成“点击展开+点击选项”的逻辑
  await page.selectOption(selector, { label: valueOrLabel });
}

async function setFile(page, selector, filePath) {
  await page.waitForSelector(selector, { state: "attached" });
  await page.setInputFiles(selector, filePath);
}

function resolveImagePath(imageBaseDir, csvValue) {
  const v = (csvValue || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  // CSV 里常见形如 /shuru/xxx.jpg
  const relative = v.replace(/^\/+/, "");
  return path.resolve(imageBaseDir || WORKSPACE_ROOT, relative);
}

function validateMapping(mapping) {
  const f = mapping?.fields || {};
  // 必需字段至少要有 selector
  assertNonEmpty(f?.["所在时段"]?.selector, "mapping.yaml: 所在时段.selector 不能为空");
  assertNonEmpty(f?.["点位名称"]?.selector, "mapping.yaml: 点位名称.selector 不能为空");
  assertNonEmpty(f?.["点位解说"]?.selector, "mapping.yaml: 点位解说.selector 不能为空");

  // 坐标模式检查
  if (f?.["坐标"]?.mode === "lon_lat_inputs") {
    assertNonEmpty(f?.["坐标"]?.lon_selector, "mapping.yaml: 坐标.lon_selector 不能为空");
    assertNonEmpty(f?.["坐标"]?.lat_selector, "mapping.yaml: 坐标.lat_selector 不能为空");
  }

  // 图片模式检查
  if (f?.["图片"]?.mode === "file_upload") {
    assertNonEmpty(f?.["图片"]?.file_input_selector, "mapping.yaml: 图片.file_input_selector 不能为空");
  }
}

async function main() {
  const mappingPath = path.resolve(WORKSPACE_ROOT, "importer/mapping.yaml");
  const configPath = path.resolve(WORKSPACE_ROOT, "importer/run_config.json");
  const outDir = path.resolve(WORKSPACE_ROOT, "importer/out");

  const mapping = readYaml(mappingPath);
  const config = readJson(configPath);

  validateMapping(mapping);
  assertNonEmpty(config.targetUrl, "run_config.json: targetUrl 不能为空");

  ensureDir(outDir);
  ensureDir(path.resolve(outDir, "screenshots"));

  const cleanedPath = path.resolve(outDir, "cleaned_records.jsonl");
  const records = readJsonl(cleanedPath);

  const checkpointPath = path.resolve(WORKSPACE_ROOT, "importer/out/checkpoint.json");
  const logPath = path.resolve(WORKSPACE_ROOT, "importer/out/run_log.jsonl");

  const checkpoint = loadCheckpoint(checkpointPath);
  checkpoint.done ||= {};

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const rec of records) {
    const rowKey = rec.row_key;
    if (checkpoint.done[rowKey]) continue;

    const baseLog = { ts: nowIso(), row_key: rowKey, row_number: rec.row_number };

    try {
      appendJsonl(logPath, { ...baseLog, step: "goto", url: config.targetUrl });
      await page.goto(config.targetUrl, { timeout: config.timeouts?.navigationMs ?? 30000, waitUntil: "domcontentloaded" });

      // 所在时段
      {
        const enumMap = mapping.fields?.["所在时段"]?.enum_map || {};
        const raw = rec["所在时段"];
        const mapped = enumMap[raw] || raw;
        await selectOption(page, mapping.fields["所在时段"].selector, mapped);
      }

      await fillText(page, mapping.fields["点位名称"].selector, rec["点位名称"]);
      await fillTextarea(page, mapping.fields["点位解说"].selector, rec["点位解说"]);

      // 地址（注意：你的 CSV 样例里该列目前看更像“图片路径”，若网页确有地址字段请在 mapping 中改 selector）
      if (mapping.fields?.["地址"]?.selector) {
        await fillText(page, mapping.fields["地址"].selector, rec["地址"]);
      }

      // 坐标
      if (mapping.fields?.["坐标"]?.mode === "lon_lat_inputs") {
        await fillText(page, mapping.fields["坐标"].lon_selector, String(rec.lon ?? ""));
        await fillText(page, mapping.fields["坐标"].lat_selector, String(rec.lat ?? ""));
      }

      // 图片（以 CSV 的“地址”列作为路径输入源；若你后续确认不是，则需要改这里）
      if (mapping.fields?.["图片"]?.mode === "file_upload") {
        const imgPath = resolveImagePath(config.input?.imageBaseDir, rec["地址"]);
        if (!imgPath) throw new Error("图片路径为空（当前使用 CSV 的“地址”列作为图片路径）");
        if (!fs.existsSync(imgPath)) throw new Error(`图片文件不存在：${imgPath}`);
        await setFile(page, mapping.fields["图片"].file_input_selector, imgPath);
      }

      if (mapping.fields?.["图片标题"]?.selector) {
        await fillText(page, mapping.fields["图片标题"].selector, rec["图片标题"]);
      }
      if (mapping.fields?.["图片来源"]?.selector) {
        await fillText(page, mapping.fields["图片来源"].selector, rec["图片来源"]);
      }

      // 展览章节
      const chapterMode = mapping.fields?.["对应的展览章节"]?.mode || "text";
      if (chapterMode === "text" && mapping.fields?.["对应的展览章节"]?.selector) {
        await fillText(page, mapping.fields["对应的展览章节"].selector, rec["对应的展览章节"]);
      }

      // TODO：点击保存按钮 & 成功判定（需要你补齐 selector/文案）
      // appendJsonl(logPath, { ...baseLog, step: "save" });
      // await page.click(mapping.actions.save_button_selector);
      // await assertSuccess(page, mapping.success_criteria);

      // 临时：未接入保存逻辑前，不写入 checkpoint.done，避免误判成功
      appendJsonl(logPath, { ...baseLog, step: "filled_not_saved", note: "已填表但未执行保存（需补齐保存按钮与成功判定）" });
      await page.waitForTimeout(500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendJsonl(logPath, { ...baseLog, status: "failed", error: msg });
      const shot = path.resolve(outDir, "screenshots", `${rec.row_number}_${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      // 不可重试的错误直接继续下一条；需要重试可在这里扩展
    }
  }

  saveCheckpoint(checkpointPath, checkpoint);
  await browser.close();
}

await main();

