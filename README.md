# Tech Radar

An Earth and Space Observation Tech Radar for Downstream Science, Analytics, and Applications.

To update radar content, edit `config/eo.csv` and/or `config/space.csv`, then commit and push your changes.
The GitHub Actions workflow regenerates the radar config files and redeploys the site automatically.

# Dev

## What It Includes

- Earth and Space toggle
- Interactive radar blips with popup details
- Side entry panels by quadrant
- Markdown-driven story section

## Quadrants

- Core Libraries (inner circle)
- Visualization
- Intelligence
- Data
- Standards

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
- Core Library
- Server-Side
- Web-Tools
- Desktop
- Mobile
- Data Repository
- Database
- Data management
- Spatial analysis
- EO visualization
- Location parsing and EO referencing
- Remote sensing analysis
- Pangeo

## Run Locally

Serve the repository root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Project Structure

- `index.html`: static entry shell
- `app/styles.css`: all styling and responsive rules
- `app/main.js`: data loading, layout, rendering, popup, and mode switching
- `config/earth/*` and `config/space/*`: mode-specific config and narrative text
- `config/eo.csv` and `config/space.csv`: CSV source files
- `scripts/csv_to_radar_config.py`: CSV -> `radar.config.json` generator

## Data Format

Each mode folder contains `radar.config.json` with:

- `textFile`: markdown file rendered below radar
- `rings`: ordered ring definitions (`Core`, `Adopt`, `Trial`, `Assess`, `Hold`)
- `core.entries`: core technologies
- `quadrants`: quadrant definitions with embedded entries

Each entry includes:

- `Name`, `Quadrant`, `Ring`, `Link`, `Moved`, `Description`, `Tags`, `Downloads`, `Forks`, `Activity Metric`, `Languages`

## Generate Config from CSV

```bash
python3 scripts/csv_to_radar_config.py eo config/eo.csv
python3 scripts/csv_to_radar_config.py space config/space.csv
```

## GitHub Actions Automation

Workflow: `.github/workflows/csv-radar.yml`

Behavior:

- Triggers on changes to `config/eo.csv` or `config/space.csv`
- Regenerates:
  - `config/earth/radar.config.json`
  - `config/space/radar.config.json`
- Commits generated config updates to the branch
- Redeploys GitHub Pages on pushes to the default branch

Source of truth:

- Edit only `config/eo.csv` and `config/space.csv` for radar data changes
- Do not manually edit `config/earth/radar.config.json` or `config/space/radar.config.json`

Optional per-entry markdown overrides are supported in `radar-text.md` before `# Section`:

```md
## Entry Name
linkName: docs.example.com
Custom popup description...
```
