import csv
import json
import os
import re
from collections import OrderedDict, defaultdict


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_PATH = os.path.join(ROOT_DIR, "数据整理 点位 完整.csv")
OUT_TS_PATH = os.path.join(ROOT_DIR, "src", "csv_points.ts")

PERIOD_TO_ID = {
    "明清时期": "p1",
    "民国时期": "p2",
    "工业化起步": "p3",
    "现代化进程": "p4",
}

GALLERY_LIMIT = 12


def _normalize_chapter(raw: str) -> str:
    if raw is None:
        return ""
    return re.sub(r"\s+", "", raw)


def _extract_lon_lat(raw: str):
    if not raw:
        return None
    m = re.search(
        r"coordinates[^0-9\-]*(-?\d+(?:\.\d+)?)[^0-9\-]+(-?\d+(?:\.\d+)?)",
        raw,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return None
    lon = float(m.group(1))
    lat = float(m.group(2))
    if not (100 <= lon <= 140 and 30 <= lat <= 50):
        return None
    return lon, lat


def _safe_ts_string(s: str) -> str:
    if s is None:
        s = ""
    return json.dumps(s, ensure_ascii=False)


def main():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(CSV_PATH)

    points_by_period = defaultdict(lambda: OrderedDict())
    linear_by_period = defaultdict(lambda: defaultdict(lambda: OrderedDict()))

    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            period = (row.get("所在时段") or "").strip()
            name = (row.get("点位名称") or "").strip()
            coord_raw = (row.get("点位坐标") or "").strip()
            desc = (row.get("点位解说") or "").strip()
            img_url = (row.get("地址") or "").strip()
            img_title = (row.get("图片标题") or "").strip()
            img_source = (row.get("图片来源") or "").strip()
            chapter = _normalize_chapter(row.get("对应的展览章节") or "")

            period_id = PERIOD_TO_ID.get(period)
            if not period_id:
                continue

            lon_lat = _extract_lon_lat(coord_raw)
            image_obj = None
            if img_url or img_title or img_source:
                image_obj = {"url": img_url, "name": img_title or img_url, "source": img_source}

            if lon_lat:
                lon, lat = lon_lat
                key = f"{period_id}|{name}|{lon:.10f}|{lat:.10f}"
                if key not in points_by_period[period_id]:
                    points_by_period[period_id][key] = {
                        "period_id": period_id,
                        "title": name,
                        "description": desc,
                        "lat": lat,
                        "lon": lon,
                        "images": [],
                    }
                if desc and not points_by_period[period_id][key]["description"]:
                    points_by_period[period_id][key]["description"] = desc
                if image_obj:
                    points_by_period[period_id][key]["images"].append(image_obj)
                continue

            feature_type = None
            if "运河" in name or "北运河" in name:
                feature_type = "river"
            elif "公路" in name or "京津公路" in name:
                feature_type = "road"

            if not feature_type:
                continue

            lkey = f"{period_id}|{feature_type}|{name}"
            if lkey not in linear_by_period[period_id][feature_type]:
                linear_by_period[period_id][feature_type][lkey] = {
                    "title": name,
                    "description": desc,
                    "images": [],
                    "chapter": chapter,
                }
            if desc and not linear_by_period[period_id][feature_type][lkey]["description"]:
                linear_by_period[period_id][feature_type][lkey]["description"] = desc
            if image_obj:
                linear_by_period[period_id][feature_type][lkey]["images"].append(image_obj)

    lines = []
    lines.append("import type { HistoricalPoint, HistoricalImage, SelectedFeature } from './types';")
    lines.append("")

    lines.append("export const CSV_POINTS_BY_PERIOD: Record<string, HistoricalPoint[]> = {")
    for period_id in ["p1", "p2", "p3", "p4"]:
        items = list(points_by_period.get(period_id, {}).values())
        lines.append(f"  {period_id}: [")
        for idx, item in enumerate(items, start=1):
            pid_num = period_id[1:]
            point_id = f"{period_id}-csv-{idx:03d}"
            images = item["images"]
            lines.append("    {")
            lines.append(f"      id: {_safe_ts_string(point_id)},")
            lines.append(f"      position: [{item['lat']}, {item['lon']}],")
            lines.append(f"      title: {_safe_ts_string(item['title'])},")
            lines.append(f"      description: {_safe_ts_string(item['description'])},")
            lines.append("      images: [")
            for im in images:
                lines.append(
                    "        { "
                    + f"url: {_safe_ts_string(im['url'])}, "
                    + f"name: {_safe_ts_string(im['name'])}, "
                    + f"source: {_safe_ts_string(im['source'])} "
                    + "},"
                )
            lines.append("      ],")
            lines.append("      type: 'landmark',")
            lines.append("    },")
        lines.append("  ],")
    lines.append("};")
    lines.append("")

    lines.append("export const CSV_GALLERY_IMAGES_BY_PERIOD: Record<string, HistoricalImage[]> = {")
    for period_id in ["p1", "p2", "p3", "p4"]:
        seen = set()
        gallery = []
        for item in points_by_period.get(period_id, {}).values():
            for im in item["images"]:
                url = im["url"]
                if not url or url in seen:
                    continue
                seen.add(url)
                gallery.append(im)
        gallery = gallery[:GALLERY_LIMIT]
        lines.append(f"  {period_id}: [")
        for im in gallery:
            lines.append(
                "    { "
                + f"url: {_safe_ts_string(im['url'])}, "
                + f"name: {_safe_ts_string(im['name'])}, "
                + f"source: {_safe_ts_string(im['source'])} "
                + "},"
            )
        lines.append("  ],")
    lines.append("};")
    lines.append("")

    lines.append(
        "export const CSV_LINEAR_FEATURES_BY_PERIOD: Record<string, Partial<Record<'river' | 'road', SelectedFeature>>> = {"
    )
    for period_id in ["p1", "p2", "p3", "p4"]:
        river = list(linear_by_period.get(period_id, {}).get("river", {}).values())
        road = list(linear_by_period.get(period_id, {}).get("road", {}).values())

        def to_feature(ftype: str, items: list):
            if not items:
                return None
            merged = {"title": items[0]["title"], "description": items[0]["description"], "images": []}
            for it in items:
                for im in it["images"]:
                    merged["images"].append(im)
            return merged

        river_feat = to_feature("river", river)
        road_feat = to_feature("road", road)

        lines.append(f"  {period_id}: {{")
        if river_feat:
            lines.append("    river: {")
            lines.append("      type: 'river',")
            lines.append(f"      title: {_safe_ts_string(river_feat['title'])},")
            lines.append(f"      description: {_safe_ts_string(river_feat['description'])},")
            lines.append("      images: [")
            for im in river_feat["images"]:
                lines.append(
                    "        { "
                    + f"url: {_safe_ts_string(im['url'])}, "
                    + f"name: {_safe_ts_string(im['name'])}, "
                    + f"source: {_safe_ts_string(im['source'])} "
                    + "},"
                )
            lines.append("      ],")
            lines.append("    },")
        if road_feat:
            lines.append("    road: {")
            lines.append("      type: 'road',")
            lines.append(f"      title: {_safe_ts_string(road_feat['title'])},")
            lines.append(f"      description: {_safe_ts_string(road_feat['description'])},")
            lines.append("      images: [")
            for im in road_feat["images"]:
                lines.append(
                    "        { "
                    + f"url: {_safe_ts_string(im['url'])}, "
                    + f"name: {_safe_ts_string(im['name'])}, "
                    + f"source: {_safe_ts_string(im['source'])} "
                    + "},"
                )
            lines.append("      ],")
            lines.append("    },")
        lines.append("  },")
    lines.append("};")
    lines.append("")

    content = "\n".join(lines)
    with open(OUT_TS_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    counts = {pid: len(points_by_period.get(pid, {})) for pid in ["p1", "p2", "p3", "p4"]}
    print("Generated src/csv_points.ts")
    print("Marker counts:", counts)
    print(
        "Linear features:",
        {
            pid: {
                "river": len(linear_by_period.get(pid, {}).get("river", {})),
                "road": len(linear_by_period.get(pid, {}).get("road", {})),
            }
            for pid in ["p1", "p2", "p3", "p4"]
        },
    )


if __name__ == "__main__":
    main()
