# Radar Text

title: Earth Observation Tech Radar
subtitle: Space Tech Radar for Earth Observation and Geospatial Technologies

# Section

This radar captures where we should place our bets over the next 12-18 months. It is opinionated by design: the goal is to reduce decision friction, align teams quickly, and make tradeoffs explicit.

## What this radar optimizes for

- Faster delivery of reliable geospatial products
- Lower operational complexity across data pipelines
- Better interoperability through open standards
- Clear guidance on what to adopt now versus monitor

## Key themes this cycle

### 1) Cloud-native data foundations
COG, GeoParquet, and STAC API continue to move from "good idea" to default architecture. These choices reduce storage friction, simplify catalog search, and improve portability across tools.

### 2) Practical AI workflows
We prioritize repeatable ML operations over novelty. Human-in-the-loop QA and active learning remain central because they improve model quality while controlling annotation cost.

### 3) Standards-first interoperability
Adopting standards like OGC API - Features and PMTiles keeps integration flexible and protects us from platform lock-in.

## How to use this in planning

- Start with **Adopt** when selecting tools for net-new projects.
- Use **Trial** for bounded pilots with clear success criteria.
- Use **Assess** only when there is strategic upside and a team can absorb risk.
- Avoid adding new **Hold** technologies unless there is a hard legacy constraint.

## Decision rule of thumb

If two options solve the same problem, prefer the one that:
- has stronger open ecosystem support
- fits cloud-native patterns
- has lower long-term operational burden

Treat this radar as a living artifact: update it as evidence changes.
