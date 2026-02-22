const RADAR = {
  size: 980,
  outer: 485,
  dotRadius: 12.5,
  coreLabelSafeRadius: 46,
  quadrantAngles: [
    [-Math.PI / 2, 0],
    [-Math.PI, -Math.PI / 2],
    [Math.PI / 2, Math.PI],
    [0, Math.PI / 2]
  ],
  axisPadding: 0.29,
  topLabelGap: 0.44,
  ringInset: 22,
  ringEdgePadding: 6
};

const MODES = {
  earth: { key: "earth", word: "Earth", root: "data/earth" },
  space: { key: "space", word: "Space", root: "data/space" }
};

const FALLBACK_QUADRANT_COLORS = ["#3b82f6", "#14b8a6", "#a855f7", "#f97316"];
const CORE = {
  label: "CORE",
  fallbackColor: "#0f766e"
};
const REQUIRED_ENTRY_FIELDS = [
  "Name",
  "Quadrant",
  "Ring",
  "Link",
  "Moved",
  "Description",
  "Tags",
  "Downloads",
  "Forks",
  "Activity Metric",
  "Languages"
];

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeNewlines = (text) => (text || "").replace(/\r\n?/g, "\n");
const joinPath = (base, part) => `${base.replace(/\/+$/, "")}/${part.replace(/^\/+/, "")}`;

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.text();
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}

function parseEntryTextOverrides(markdown) {
  const overrides = new Map();
  const [entryArea] = normalizeNewlines(markdown).split(/^#\s+Section\s*$/im);
  const sectionPattern = /^##\s+(.+)\n([\s\S]*?)(?=^##\s+|^#\s+|\Z)/gm;
  let match;

  while ((match = sectionPattern.exec(entryArea || "")) !== null) {
    const name = match[1].trim();
    const lines = match[2].trim().split("\n").filter(Boolean);
    let linkName = "";

    if (lines[0]?.toLowerCase().startsWith("linkname:")) {
      linkName = lines.shift().slice("linkname:".length).trim();
    }

    overrides.set(name, {
      linkName,
      description: lines.join("\n").trim()
    });
  }

  return overrides;
}

function normalizeRadarEntry(rawEntry, ringIndexByName, { isCore, expectedQuadrant }) {
  if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
    throw new Error("Invalid entry: each entry must be an object.");
  }

  const missing = REQUIRED_ENTRY_FIELDS.filter(
    (field) => !Object.prototype.hasOwnProperty.call(rawEntry, field)
  );
  if (missing.length) {
    throw new Error(`Invalid entry: missing required fields: ${missing.join(", ")}.`);
  }

  const name = String(rawEntry.Name || "").trim();
  if (!name) throw new Error("Invalid entry: Name is required.");

  const quadrantLabel = String(rawEntry.Quadrant || "").trim();
  if (!quadrantLabel) throw new Error(`Invalid entry "${name}": Quadrant is required.`);

  if (expectedQuadrant && quadrantLabel.toLowerCase() !== String(expectedQuadrant).toLowerCase()) {
    throw new Error(
      `Invalid entry "${name}": Quadrant "${quadrantLabel}" must match "${expectedQuadrant}".`
    );
  }

  if (isCore && quadrantLabel.toUpperCase() !== CORE.label) {
    throw new Error(`Invalid core entry "${name}": Quadrant must be "${CORE.label}".`);
  }

  const ringLabel = String(rawEntry.Ring || "").trim();
  if (!ringLabel) throw new Error(`Invalid entry "${name}": Ring is required.`);

  const ring = ringIndexByName.get(ringLabel.toLowerCase());
  if (ring === undefined) {
    throw new Error(`Invalid entry "${name}": Ring "${ringLabel}" does not exist in config.rings.`);
  }

  if (isCore && ring !== 0) {
    throw new Error(`Invalid core entry "${name}": Ring must be "${CORE.label}".`);
  }
  if (!isCore && ring === 0) {
    throw new Error(`Invalid entry "${name}": non-core entries cannot use Ring "${CORE.label}".`);
  }

  const link = String(rawEntry.Link || "").trim();
  if (!link) throw new Error(`Invalid entry "${name}": Link is required.`);

  const moved = Number(rawEntry.Moved);
  if (!Number.isInteger(moved) || ![-1, 0, 1].includes(moved)) {
    throw new Error(`Invalid entry "${name}": Moved must be -1, 0, or 1.`);
  }

  const description = String(rawEntry.Description || "").trim();
  if (!description) throw new Error(`Invalid entry "${name}": Description is required.`);

  if (!Array.isArray(rawEntry.Tags)) {
    throw new Error(`Invalid entry "${name}": Tags must be an array.`);
  }
  const tags = rawEntry.Tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (!tags.length) throw new Error(`Invalid entry "${name}": Tags must include at least one value.`);

  const downloads = Number(rawEntry.Downloads);
  if (!Number.isFinite(downloads) || downloads < 0) {
    throw new Error(`Invalid entry "${name}": Downloads must be a non-negative number.`);
  }

  const forks = Number(rawEntry.Forks);
  if (!Number.isFinite(forks) || forks < 0) {
    throw new Error(`Invalid entry "${name}": Forks must be a non-negative number.`);
  }

  const activityMetric = Number(rawEntry["Activity Metric"]);
  if (!Number.isFinite(activityMetric) || activityMetric < 0) {
    throw new Error(`Invalid entry "${name}": Activity Metric must be a non-negative number.`);
  }

  const languagesInput = rawEntry.Languages;
  if (!languagesInput || typeof languagesInput !== "object" || Array.isArray(languagesInput)) {
    throw new Error(`Invalid entry "${name}": Languages must be an object.`);
  }

  const languages = {};
  Object.entries(languagesInput).forEach(([language, amount]) => {
    const languageName = String(language).trim();
    const languageAmount = Number(amount);
    if (!languageName) {
      throw new Error(`Invalid entry "${name}": Languages keys must be non-empty strings.`);
    }
    if (!Number.isFinite(languageAmount) || languageAmount < 0) {
      throw new Error(
        `Invalid entry "${name}": Languages["${languageName}"] must be a non-negative number.`
      );
    }
    languages[languageName] = languageAmount;
  });

  return {
    name,
    quadrantLabel,
    ringLabel,
    ring,
    link,
    moved,
    description,
    tags,
    downloads,
    forks,
    activityMetric,
    languages
  };
}

async function loadRadarData(mode) {
  const configPath = joinPath(mode.root, "radar.config.json");
  const config = await fetchJson(configPath);
  const rings = Array.isArray(config.rings) ? config.rings : [];
  const hasCoreRing = String(rings[0]?.name || "").trim().toLowerCase() === "core";
  if (!hasCoreRing) throw new Error(`Invalid ${configPath}: first ring must be "Core".`);
  const ringIndexByName = new Map(
    rings.map((ring, index) => [String(ring?.name || "").trim().toLowerCase(), index])
  );

  const textPath = config.textFile ? joinPath(mode.root, config.textFile) : null;
  const coreEntries = Array.isArray(config?.core?.entries) ? config.core.entries : [];
  const quadrantDocs = Array.isArray(config?.quadrants) ? config.quadrants : [];

  const storyMarkdown = textPath ? await fetchText(textPath) : "";

  const textOverrides = parseEntryTextOverrides(storyMarkdown);
  const quadrants = [];
  const quadrantColors = [];
  const entries = [];

  coreEntries.forEach((entry) => {
    const normalized = normalizeRadarEntry(entry, ringIndexByName, {
      isCore: true,
      expectedQuadrant: CORE.label
    });
    const override = textOverrides.get(normalized.name) || {};
    entries.push({
      name: normalized.name,
      ring: 0,
      quadrant: null,
      isCore: true,
      link: normalized.link,
      moved: normalized.moved,
      description: override.description || normalized.description,
      linkName: override.linkName || hostname(normalized.link),
      tags: normalized.tags,
      downloads: normalized.downloads,
      forks: normalized.forks,
      activityMetric: normalized.activityMetric,
      languages: normalized.languages
    });
  });

  quadrantDocs.forEach((doc) => {
    const q = doc.quadrant;
    if (!q || typeof q.index !== "number" || !q.name) {
      throw new Error("Invalid quadrant config.");
    }

    quadrants[q.index] = q.name;
    quadrantColors[q.index] = q.color || FALLBACK_QUADRANT_COLORS[q.index % FALLBACK_QUADRANT_COLORS.length];

    (doc.entries || []).forEach((entry) => {
      const normalized = normalizeRadarEntry(entry, ringIndexByName, {
        isCore: false,
        expectedQuadrant: q.name
      });
      const override = textOverrides.get(normalized.name) || {};
      entries.push({
        name: normalized.name,
        ring: normalized.ring,
        quadrant: q.index,
        isCore: false,
        link: normalized.link,
        moved: normalized.moved,
        description: override.description || normalized.description,
        linkName: override.linkName || hostname(normalized.link),
        tags: normalized.tags,
        downloads: normalized.downloads,
        forks: normalized.forks,
        activityMetric: normalized.activityMetric,
        languages: normalized.languages
      });
    });
  });

  return {
    rings,
    quadrants,
    quadrantColors,
    entries,
    storyMarkdown
  };
}

function renderStory(markdown) {
  const section = $("story-section");
  const body = $("story-body");
  if (!section || !body) return;

  if (!markdown || !markdown.trim()) {
    body.innerHTML = "";
    section.hidden = true;
    return;
  }

  body.innerHTML = marked.parse(markdown);
  section.hidden = false;
}

function createPopupController() {
  const popup = $("popup");
  const title = $("popup-title");
  const meta = $("popup-meta");
  const body = $("popup-body");
  const link = $("popup-link");

  let onHide = () => {};
  let onLeave = () => {};
  let pointerInside = false;

  if (popup) {
    popup.addEventListener("mouseenter", () => {
      pointerInside = true;
    });
    popup.addEventListener("mouseleave", () => {
      pointerInside = false;
      onLeave();
    });
  }

  function setOnHide(handler) {
    onHide = typeof handler === "function" ? handler : () => {};
  }

  function setOnLeave(handler) {
    onLeave = typeof handler === "function" ? handler : () => {};
  }

  function hide() {
    if (!popup || popup.hidden) return;
    popup.hidden = true;
    pointerInside = false;
    onHide();
  }

  function open({ entry, quadrantName, ringName, point }) {
    if (!popup || !title || !meta || !body || !link) return;

    title.textContent = entry.name;
    const metaParts = [quadrantName, ringName, ...(Array.isArray(entry.tags) ? entry.tags : [])]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    meta.textContent = [...new Set(metaParts)].join(" · ");
    body.textContent = entry.description || "No description available.";

    if (entry.link) {
      link.hidden = false;
      link.href = entry.link;
      link.title = entry.link;
      link.textContent = entry.linkName || entry.link;
    } else {
      link.hidden = true;
      link.removeAttribute("href");
      link.textContent = "";
    }

    popup.hidden = false;

    const width = Math.min(320, window.innerWidth - 24);
    popup.style.width = `${width}px`;
    popup.style.left = `${clamp(point.x + 14, 12, window.innerWidth - width - 12)}px`;
    popup.style.top = `${clamp(point.y - 24, 12, window.innerHeight - popup.offsetHeight - 12)}px`;
  }

  return {
    open,
    hide,
    setOnHide,
    setOnLeave,
    isVisible: () => Boolean(popup && !popup.hidden),
    contains: (target) => Boolean(popup && target && popup.contains(target)),
    isPointerInside: () => pointerInside
  };
}

function distribute(total, capacities) {
  const counts = capacities.map(() => 0);
  let remaining = total;

  while (remaining > 0) {
    for (let i = 0; i < capacities.length && remaining > 0; i += 1) {
      if (counts[i] < capacities[i]) {
        counts[i] += 1;
        remaining -= 1;
      }
    }
    if (capacities.every((cap, index) => counts[index] >= cap)) break;
  }

  return counts;
}

function buildRows(minRadius, maxRadius, rowCount, singlePlacement = "mid") {
  if (rowCount <= 1) {
    return [singlePlacement === "outer" ? maxRadius : (minRadius + maxRadius) * 0.5];
  }
  return Array.from({ length: rowCount }, (_, index) =>
    minRadius + ((maxRadius - minRadius) * index) / (rowCount - 1)
  );
}

function chooseRows(count, minRadius, maxRadius, angleSpan, options = {}) {
  const { minRows = 1, singlePlacement = "mid" } = options;
  const gap = RADAR.dotRadius * 2 + 8;
  const maxRows = Math.max(1, Math.floor((maxRadius - minRadius) / gap) + 1);
  const capacityAt = (radius) => Math.max(1, Math.floor((angleSpan * radius) / gap));

  for (let rowCount = 1; rowCount <= maxRows; rowCount += 1) {
    const radii = buildRows(minRadius, maxRadius, rowCount, singlePlacement);
    const capacities = radii.map(capacityAt);
    const total = capacities.reduce((sum, value) => sum + value, 0);
    if (total >= count && rowCount >= minRows) return { radii, capacities };
  }

  const fallbackRows = Math.max(maxRows, minRows);
  const radii = buildRows(minRadius, maxRadius, fallbackRows, singlePlacement);
  const capacities = radii.map(capacityAt);
  const total = capacities.reduce((sum, value) => sum + value, 0);
  if (total < count) capacities[capacities.length - 1] += count - total;
  return { radii, capacities };
}

function boundsForQuadrant(quadrant) {
  const [start, end] = RADAR.quadrantAngles[quadrant];
  let minAngle = start + RADAR.axisPadding;
  let maxAngle = end - RADAR.axisPadding;

  if (quadrant === 0) minAngle = Math.max(minAngle, -Math.PI / 2 + RADAR.topLabelGap);
  if (quadrant === 1) maxAngle = Math.min(maxAngle, -Math.PI / 2 - RADAR.topLabelGap);

  if (maxAngle <= minAngle) {
    const mid = (start + end) * 0.5;
    minAngle = mid - 0.04;
    maxAngle = mid + 0.04;
  }

  return [minAngle, maxAngle];
}

function ringRadiusBounds(ring, ringStep) {
  const coreInset = RADAR.dotRadius + 4 + RADAR.ringEdgePadding;
  const ringInset = RADAR.ringInset + RADAR.ringEdgePadding;
  const innerInset = ring === 0 ? coreInset : ringInset;
  const outerInset = ring === 0 ? coreInset : ringInset;
  const minRadius = ring * ringStep + innerInset;
  const maxRadius = (ring + 1) * ringStep - outerInset;
  return [Math.min(minRadius, maxRadius), Math.max(minRadius, maxRadius)];
}

function layoutQuadrantNodes(entries, center, ringStep) {
  const groups = [...d3.group(entries, (entry) => `${entry.quadrant}-${entry.ring}`).entries()]
    .sort(([left], [right]) => {
      const [leftQuadrant, leftRing] = left.split("-").map(Number);
      const [rightQuadrant, rightRing] = right.split("-").map(Number);
      return leftQuadrant - rightQuadrant || leftRing - rightRing;
    });

  const nodes = [];

  for (const [key, group] of groups) {
    const [quadrant, ring] = key.split("-").map(Number);
    const [minAngle, maxAngle] = boundsForQuadrant(quadrant);
    const angleSpan = maxAngle - minAngle;
    const [safeMin, safeMax] = ringRadiusBounds(ring, ringStep);

    const rowPlan = chooseRows(group.length, safeMin, safeMax, angleSpan);
    const perRow = distribute(group.length, rowPlan.capacities);
    const ordered = group.slice().sort((a, b) => a.name.localeCompare(b.name));

    let cursor = 0;
    rowPlan.radii.forEach((radius, rowIndex) => {
      const count = perRow[rowIndex];
      for (let column = 0; column < count; column += 1) {
        const entry = ordered[cursor++];
        const ratio = count === 1 ? 0.5 : (column + 1) / (count + 1);
        const angle = minAngle + angleSpan * ratio;

        nodes.push({
          ...entry,
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius
        });
      }
    });
  }

  return nodes;
}

function layoutCoreNodes(entries, center, ringStep) {
  const groups = [...d3.group(entries, (entry) => entry.ring).entries()]
    .sort(([leftRing], [rightRing]) => leftRing - rightRing);
  const nodes = [];
  const fullCircle = Math.PI * 2;

  for (const [ring, group] of groups) {
    const ordered = group.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!ordered.length) continue;

    const [baseMin, safeMax] = ringRadiusBounds(ring, ringStep);
    const safeMin = Math.min(safeMax, Math.max(baseMin, RADAR.coreLabelSafeRadius));
    const preferredRows = ordered.length > 8 ? 2 : 1;
    const rowPlan = chooseRows(ordered.length, safeMin, safeMax, fullCircle, {
      minRows: preferredRows,
      singlePlacement: "outer"
    });
    const counts = distribute(ordered.length, rowPlan.capacities);

    let cursor = 0;
    rowPlan.radii.forEach((radius, rowIndex) => {
      const count = counts[rowIndex] || 0;
      if (!count) return;
      const row = ordered.slice(cursor, cursor + count);
      cursor += count;

      const step = fullCircle / count;
      for (let column = 0; column < count; column += 1) {
        const entry = row[column];
        const rowOffset = rowIndex % 2 ? 0.5 : 0;
        const angle = count === 1 ? -Math.PI / 2 : -Math.PI / 2 + step * (column + rowOffset);

        nodes.push({
          ...entry,
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius
        });
      }
    });
  }

  return nodes;
}

function layoutNodes(entries, center, ringStep) {
  const coreNodes = layoutCoreNodes(entries.filter((entry) => entry.isCore), center, ringStep);
  const quadrantNodes = layoutQuadrantNodes(entries.filter((entry) => !entry.isCore), center, ringStep);
  return [...coreNodes, ...quadrantNodes].map((entry, id) => ({
    ...entry,
    id
  }));
}

function ringOpacity(ringIndex, ringCount) {
  const maxRing = Math.max(1, ringCount - 1);
  const ratio = 1 - clamp(ringIndex, 0, maxRing) / maxRing;
  const minOpacity = 0.2;
  return minOpacity + (1 - minOpacity) * ratio;
}

function nodePoint(svg, entry) {
  const rect = svg.node().getBoundingClientRect();
  return {
    x: rect.left + (entry.x / RADAR.size) * rect.width,
    y: rect.top + (entry.y / RADAR.size) * rect.height
  };
}

function clearQuadrantLists() {
  const sections = [...document.querySelectorAll(".quad-list")];
  sections.forEach((section) => {
    const title = section.querySelector(".quad-title");
    const entries = section.querySelector(".quad-entries");
    if (title) {
      title.textContent = "";
      title.style.color = "";
    }
    entries?.replaceChildren();
  });
  return sections;
}

function clearCoreList() {
  const section = $("core-list");
  const entries = $("core-entries");
  if (!section || !entries) return null;
  entries.replaceChildren();
  section.hidden = true;
  section.style.removeProperty("--core-list-color");
  return { section, entries };
}

function createEntryButton(entry, color, openEntryPopup, setHover) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "entry-btn";
  button.dataset.id = String(entry.id);

  const dot = document.createElement("span");
  dot.className = "entry-dot";
  dot.style.background = color;

  const text = document.createElement("span");
  text.textContent = entry.name;

  button.append(dot, text);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openEntryPopup(entry, { x: event.clientX, y: event.clientY });
  });
  button.addEventListener("mouseenter", () => setHover(entry.id));
  button.addEventListener("mouseleave", () => setHover(null));
  button.addEventListener("focus", () => setHover(entry.id));
  button.addEventListener("blur", () => setHover(null));

  return button;
}

function appendEntryButtons(entries, container, color, openEntryPopup, setHover, entryButtons) {
  const colorFor = typeof color === "function" ? color : () => color;

  entries
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((entry) => {
      const button = createEntryButton(entry, colorFor(entry), openEntryPopup, setHover);
      entryButtons.set(entry.id, button);
      container.appendChild(button);
    });
}

function renderRadar(data, popupController) {
  popupController.hide();
  renderStory(data.storyMarkdown);

  const center = RADAR.size * 0.5;
  const ringCount = Math.max(1, data.rings.length);
  const ringStep = RADAR.outer / ringCount;
  const colorByQuadrant = (index) => data.quadrantColors[index] || "#0f5e96";
  const quadrantName = (index) => data.quadrants[index] || `Quadrant ${index + 1}`;
  const coreColor = data.rings[0]?.color || CORE.fallbackColor;
  const colorForEntry = (entry) => (entry.isCore ? coreColor : colorByQuadrant(entry.quadrant));

  const svg = d3.select("#radar").attr("viewBox", `0 0 ${RADAR.size} ${RADAR.size}`);
  svg.selectAll("*").remove();
  const layer = svg.append("g");
  const cornerSections = clearQuadrantLists();
  const coreList = clearCoreList();

  layer.append("circle")
    .attr("class", "core-area")
    .attr("cx", center)
    .attr("cy", center)
    .attr("r", ringStep)
    .attr("fill", coreColor);

  data.rings.forEach((ring, index) => {
    layer.append("circle")
      .attr("class", "ring")
      .attr("cx", center)
      .attr("cy", center)
      .attr("r", ringStep * (index + 1));

    const ringCenter = index === 0 ? 0 : index * ringStep + ringStep * 0.5;
    layer.append("text")
      .attr("class", "ring-label")
      .attr("x", center)
      .attr("y", center - ringCenter)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((ring.name || "").toUpperCase());
  });

  const coreBoundary = ringStep;
  const axisSegments = [
    [center - RADAR.outer, center, center - coreBoundary, center],
    [center + coreBoundary, center, center + RADAR.outer, center],
    [center, center - RADAR.outer, center, center - coreBoundary],
    [center, center + coreBoundary, center, center + RADAR.outer]
  ];
  axisSegments.forEach(([x1, y1, x2, y2]) => {
    layer.append("line")
      .attr("class", "axis")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2);
  });

  const nodes = layoutNodes(data.entries, center, ringStep);
  const coreNodes = nodes.filter((entry) => entry.isCore);
  const byQuadrant = d3.group(
    nodes.filter((entry) => !entry.isCore),
    (entry) => entry.quadrant
  );

  const blips = layer.selectAll(".blip")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", "blip")
    .attr("cx", (entry) => entry.x)
    .attr("cy", (entry) => entry.y)
    .attr("r", RADAR.dotRadius)
    .attr("fill", (entry) => colorForEntry(entry))
    .attr("fill-opacity", (entry) => ringOpacity(entry.ring, ringCount))
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (entry) => `${entry.name}: ${entry.description || "No description available."}`);

  layer.selectAll(".ring-label").raise();

  let activeId = null;
  let hoverId = null;
  const entryButtons = new Map();
  let hideTimer = null;

  const clearHideTimer = () => {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const schedulePopupHide = () => {
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      if (hoverId !== null || popupController.isPointerInside()) return;
      popupController.hide();
    }, 90);
  };

  const syncHighlight = () => {
    blips
      .classed("active", (entry) => entry.id === activeId)
      .classed("hovered", (entry) => entry.id === hoverId);

    entryButtons.forEach((button, id) => {
      button.classList.toggle("active", id === activeId);
      button.classList.toggle("hovered", id === hoverId);
    });
  };

  const setHover = (id) => {
    hoverId = id;
    if (id !== null) clearHideTimer();
    syncHighlight();
  };

  const openEntryPopup = (entry, point) => {
    clearHideTimer();
    popupController.open({
      entry,
      quadrantName: entry.isCore ? CORE.label : quadrantName(entry.quadrant),
      ringName: data.rings[entry.ring]?.name || "",
      point
    });
    activeId = entry.id;
    syncHighlight();
  };

  popupController.setOnHide(() => {
    clearHideTimer();
    activeId = null;
    hoverId = null;
    syncHighlight();
  });
  popupController.setOnLeave(() => {
    if (hoverId === null) schedulePopupHide();
  });

  blips.on("mouseenter", (_event, entry) => {
    setHover(entry.id);
    openEntryPopup(entry, nodePoint(svg, entry));
  });
  blips.on("mouseleave", (_event, entry) => {
    setHover(null);
    if (activeId === entry.id) schedulePopupHide();
  });
  blips.on("focus", (_event, entry) => {
    setHover(entry.id);
    openEntryPopup(entry, nodePoint(svg, entry));
  });
  blips.on("blur", (_event, entry) => {
    setHover(null);
    if (activeId === entry.id) schedulePopupHide();
  });

  blips.on("keydown", (event, entry) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEntryPopup(entry, nodePoint(svg, entry));
    }
  });

  if (coreList) {
    coreList.section.style.setProperty("--core-list-color", coreColor);
    coreList.section.hidden = !coreNodes.length;
    appendEntryButtons(coreNodes, coreList.entries, coreColor, openEntryPopup, setHover, entryButtons);
  }

  cornerSections.forEach((section) => {
    const q = Number(section.dataset.q);
    const title = section.querySelector(".quad-title");
    const wrap = section.querySelector(".quad-entries");
    if (!title || !wrap) return;

    title.textContent = quadrantName(q).toUpperCase();
    title.style.color = colorByQuadrant(q);

    appendEntryButtons(
      byQuadrant.get(q) || [],
      wrap,
      (entry) => colorByQuadrant(entry.quadrant),
      openEntryPopup,
      setHover,
      entryButtons
    );
  });
}

const popupController = createPopupController();
const toggleWordButton = $("mode-toggle");
const toggleVisualButton = $("mode-visual");
const modeWord = $("radar-mode-word");
let currentMode = MODES.earth.key;
let loadTicket = 0;

function modeFor(key) {
  return MODES[key] || MODES.earth;
}

function setModeUI(modeKey) {
  const isSpace = modeKey === MODES.space.key;
  const mode = modeFor(modeKey);
  const switchLabel = isSpace
    ? "Switch to Earth Observation Tech Radar"
    : "Switch to Space Observation Tech Radar";

  if (modeWord) modeWord.textContent = mode.word;

  if (toggleVisualButton) {
    toggleVisualButton.classList.toggle("is-space", isSpace);
    toggleVisualButton.setAttribute("aria-pressed", String(isSpace));
    toggleVisualButton.setAttribute("aria-label", switchLabel);
  }

  if (toggleWordButton) {
    toggleWordButton.classList.toggle("is-space", isSpace);
    toggleWordButton.setAttribute("aria-pressed", String(isSpace));
    toggleWordButton.setAttribute("aria-label", switchLabel);
  }
}

function setToggleDisabled(disabled) {
  if (toggleWordButton) toggleWordButton.disabled = disabled;
  if (toggleVisualButton) toggleVisualButton.disabled = disabled;
}

function showLoadError(error) {
  console.error(error);
  const subtitle = $("radar-subtitle");
  if (subtitle) {
    subtitle.textContent = `Failed to load radar files: ${error?.message || "Unknown error."}`;
  }
}

async function loadAndRender(modeKey) {
  const ticket = ++loadTicket;
  const data = await loadRadarData(modeFor(modeKey));
  if (ticket !== loadTicket) return;
  renderRadar(data, popupController);
}

async function toggleMode() {
  if (toggleWordButton?.disabled || toggleVisualButton?.disabled) return;

  const previousMode = currentMode;
  currentMode = currentMode === MODES.earth.key ? MODES.space.key : MODES.earth.key;
  setModeUI(currentMode);
  setToggleDisabled(true);

  try {
    await loadAndRender(currentMode);
  } catch (error) {
    currentMode = previousMode;
    setModeUI(currentMode);
    showLoadError(error);
  } finally {
    setToggleDisabled(false);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!popupController.isVisible()) return;
  if (!(target instanceof Element)) {
    popupController.hide();
    return;
  }
  if (popupController.contains(target)) return;
  if (target.closest(".blip") || target.closest(".entry-btn")) return;
  popupController.hide();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") popupController.hide();
});

toggleWordButton?.addEventListener("click", toggleMode);
toggleVisualButton?.addEventListener("click", toggleMode);

setModeUI(currentMode);
loadAndRender(currentMode).catch(showLoadError);
