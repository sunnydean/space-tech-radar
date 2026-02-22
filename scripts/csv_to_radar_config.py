#!/usr/bin/env python3
import csv, json, pathlib, sys

RINGS = [
    {"name": "Core", "color": "#0f766e"},
    {"name": "Adopt", "color": "#1e9f5b"},
    {"name": "Trial", "color": "#1f83c2"},
    {"name": "Assess", "color": "#d79a00"},
    {"name": "Hold", "color": "#c8553d"},
]
QUADS = ["Mapping", "Intelligence", "Data", "Standards"]
RMAP = {k.lower(): k for k in ["Core", "Adopt", "Trial", "Assess", "Hold"]}
MODE = {
    "space": {
        "out": pathlib.Path("config/space/radar.config.json"),
        "colors": ["#3b82f6", "#14b8a6", "#a855f7", "#f97316"],
    },
    "eo": {
        "out": pathlib.Path("config/earth/radar.config.json"),
        "colors": ["#16a34a", "#0ea5e9", "#eab308", "#dc2626"],
    },
}


def parse_tags(raw):
    t = (raw or "").strip()
    if not t:
        return []
    if t.startswith("["):
        return [str(x).strip() for x in json.loads(t) if str(x).strip()]
    for sep in ("|", ";", ","):
        if sep in t:
            return [p.strip() for p in t.split(sep) if p.strip()]
    return [t]


if len(sys.argv) != 3:
    raise SystemExit(
        "Usage: python3 scripts/csv_to_radar_config.py [space|eo] input.csv"
    )
try:
    m, p = sys.argv[1].lower(), pathlib.Path(sys.argv[2])
    meta = MODE[m]
    grouped = {q: [] for q in QUADS}
    core = []
    with p.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if not any((v or "").strip() for v in row.values()):
                continue
            q = (row["Quadrant"] or "").strip()
            ring = RMAP[(row["Ring"] or "").strip().lower()]
            e = {
                "Name": row["Name"].strip(),
                "Quadrant": q,
                "Ring": ring,
                "Link": row["Link"].strip(),
                "Moved": int(row["Moved"]),
                "Description": row["Description"].strip(),
                "Tags": parse_tags(row["Tags"]),
                "Downloads": float(row["Downloads"]),
                "Forks": float(row["Forks"]),
                "Activity Metric": float(row["Activity Metric"]),
                "Languages": json.loads((row["Languages"] or "{}").strip() or "{}"),
            }
            (core if q == "CORE" else grouped[q]).append(e)
    out = {
        "textFile": "radar-text.md",
        "rings": RINGS,
        "core": {"entries": core},
        "quadrants": [
            {
                "quadrant": {"index": i, "name": q, "color": meta["colors"][i]},
                "entries": grouped[q],
            }
            for i, q in enumerate(QUADS)
        ],
    }
    meta["out"].parent.mkdir(parents=True, exist_ok=True)
    meta["out"].write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {meta['out']} from {p}")
except Exception as e:
    raise SystemExit(f"Error: {e}")
