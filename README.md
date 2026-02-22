
# todo:
add tagging
add core - section or center+section?
change categories
when i hover over a ball the name should show up
add an arrow



# Tech Radar

Minimal D3 radar with Earth/Space mode switching, clickable blips, quadrant entry panels, and Markdown narrative rendering.

# Quadrants
- Core Libraries as an inner circle
- Mapping
- Intelligence
- Data
- Standards

# Dev and Contributing

## Standards Sections

- Narrative
- Fast Adopters
- Open Data
- Commonalities
- Core Open Source Libraries
- Future


## Tagging

- Techniques
- Platform
- Pangeo
- Data Repository
- Database
- Core Library
- Server-Side
- Desktop
- Mobile
- Web-Tools
- Data management
- Spatial analysis
- Cartography and visualisation
- Geocoding and georeferencing
- Remote sensing analysis
- 3D modeling
- Mobile data collection

## Run locally

Serve the repository root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Project structure

- `index.html`: static shell.
- `styles.css`: all styling and responsive rules.
- `main.js`: app logic (data loading, layout, rendering, popup, mode switching).
- `data/earth/*` and `data/space/*`: mode-specific config, quadrants, and narrative text.

## Data format

Each mode folder has:

- `radar.config.json`
  - `rings`: ordered ring names.
  - `quadrantFiles`: list of quadrant JSON files.
  - `textFile`: markdown file rendered below radar.
- `quadrants/*.json`
  - `quadrant`: `{ index, name, color }`
  - `entries`: `{ name, ring, link, description }[]`

Optional per-entry markdown overrides are supported in `radar-text.md` before `# Section`:

```md
## Entry Name
linkName: docs.example.com
Custom popup description...
```

