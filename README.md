
# todo:
add tagging
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

- `index.html`: static entry shell.
- `app/styles.css`: all styling and responsive rules.
- `app/main.js`: app logic (data loading, layout, rendering, popup, mode switching).
- `config/earth/*` and `config/space/*`: mode-specific radar config and narrative text.
- `config/eo.csv` and `config/space.csv`: CSV sources for config generation.
- `scripts/csv_to_radar_config.py`: CLI to build `radar.config.json` from CSV.

## Data format

Each mode folder has:

- `radar.config.json`
  - `rings`: ordered ring definitions (`Core`, `Adopt`, `Trial`, `Assess`, `Hold`).
  - `core.entries`: core technologies.
  - `quadrants`: list of quadrants with embedded entries.
  - `textFile`: markdown file rendered below radar.

Each entry includes:

- `Name`, `Quadrant`, `Ring`, `Link`, `Moved`, `Description`, `Tags`, `Downloads`, `Forks`, `Activity Metric`, `Languages`

## CSV to config

Generate configs from CSV:

```bash
python3 scripts/csv_to_radar_config.py eo config/eo.csv
python3 scripts/csv_to_radar_config.py space config/space.csv
```

## GitHub Actions automation

Workflow: `.github/workflows/csv-radar.yml`

What it does:

- Triggers on changes to `config/eo.csv` or `config/space.csv`.
- Runs `scripts/csv_to_radar_config.py` to regenerate:
  - `config/earth/radar.config.json`
  - `config/space/radar.config.json`
- Commits generated config changes back to the branch.
- Redeploys the GitHub Pages site on pushes to the default branch.

Source of truth rule:

- For radar data changes, edit only:
  - `config/eo.csv`
  - `config/space.csv`
- Do not manually edit `config/earth/radar.config.json` or `config/space/radar.config.json`; they are generated and will be overwritten by the workflow.

Optional per-entry markdown overrides are supported in `radar-text.md` before `# Section`:

```md
## Entry Name
linkName: docs.example.com
Custom popup description...
```
