# Space Tech Radar

An Earth and Space Observation Tech Radar for Downstream Science, Analytics, and Applications.

<!-- <img width="815" height="987" alt="image" src="https://github.com/user-attachments/assets/eebb8447-9cff-48a8-9a7a-e7166983e061" /> -->
<a href="https://sunnydean.github.io/space-tech-radar/">
  <img width="815" height="987" alt="image" src="https://github.com/user-attachments/assets/eebb8447-9cff-48a8-9a7a-e7166983e061" />
</a>

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
