# Simple Tech Radar

Minimal D3 tech radar with clickable dots and a small pop-up description.

## What this includes
- Editable data in JSON files per quadrant (`data/quadrants/*.json`)
- Editable copy in Markdown (`content/radar-text.md`)

## Run it
Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Customize
- Global config lives in `data/radar.config.json` (`rings`, `quadrantFiles`, `textFile`).
- Each quadrant file in `data/quadrants/*.json` contains:
  - `quadrant` config (`index`, `name`)
  - `entries` list
- Each entry supports:
  - `name`
  - `link` (href URL)
  - `ring` (`0..3`)
- Editable text lives in `content/radar-text.md`:
  - top-level `title:` and `subtitle:`
  - narrative content under `# Section` (rendered below the radar)
  - section per entry (`## Entry Name`)
  - optional `linkName:` inside a section
  - section body becomes popup description
- Update ring names/colors in `data/radar.config.json`.
- Adjust styling in `styles.css`.


