const RADAR = {
  size: 980,
  outer: 485,
  dotRadius: 12.5,
  quadrantAngles: [
    [-Math.PI / 2, 0],
    [-Math.PI, -Math.PI / 2],
    [Math.PI / 2, Math.PI],
    [0, Math.PI / 2]
  ],
  axisPadding: 0.29,
  topLabelGap: 0.44,
  ringInset: 22
};

const MODES = {
  earth: { key: "earth", word: "Earth", root: "data/earth" },
  space: { key: "space", word: "Space", root: "data/space" }
};

const FALLBACK_QUADRANT_COLORS = ["#3b82f6", "#14b8a6", "#a855f7", "#f97316"];

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeNewlines = (text) => (text || "").replace(/\r\n?/g, "\n");
const joinPath = (base, part) => `${base.replace(/\/+$/, "")}/${part.replace(/^\/+/, "")}`;

function resolvePath(base, path) {
  if (!path) return path;
  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith("/")) return path;
  if (/^(?:data|content)\//.test(path)) return path;
  return joinPath(base, path);
}

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

async function loadRadarData(mode) {
  const config = await fetchJson(joinPath(mode.root, "radar.config.json"));
  const textPath = config.textFile ? resolvePath(mode.root, config.textFile) : null;
  const quadrantPaths = (config.quadrantFiles || []).map((file) => resolvePath(mode.root, file));

  const [storyMarkdown, quadrantDocs] = await Promise.all([
    textPath ? fetchText(textPath) : Promise.resolve(""),
    Promise.all(quadrantPaths.map(fetchJson))
  ]);

  const textOverrides = parseEntryTextOverrides(storyMarkdown);
  const quadrants = [];
  const quadrantColors = [];
  const entries = [];

  quadrantDocs.forEach((doc) => {
    const q = doc.quadrant;
    if (!q || typeof q.index !== "number" || !q.name) {
      throw new Error("Invalid quadrant config.");
    }

    quadrants[q.index] = q.name;
    quadrantColors[q.index] = q.color || FALLBACK_QUADRANT_COLORS[q.index % FALLBACK_QUADRANT_COLORS.length];

    (doc.entries || []).forEach((entry) => {
      const override = textOverrides.get(entry.name) || {};
      entries.push({
        ...entry,
        quadrant: q.index,
        description: override.description || entry.description || "",
        linkName: override.linkName || entry.linkName || hostname(entry.link)
      });
    });
  });

  return {
    rings: config.rings || [],
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

  function setOnHide(handler) {
    onHide = typeof handler === "function" ? handler : () => {};
  }

  function hide() {
    if (!popup || popup.hidden) return;
    popup.hidden = true;
    onHide();
  }

  function open({ entry, quadrantName, ringName, point }) {
    if (!popup || !title || !meta || !body || !link) return;

    title.textContent = entry.name;
    meta.textContent = `${quadrantName} · ${ringName}`;
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
    isVisible: () => Boolean(popup && !popup.hidden),
    contains: (target) => Boolean(popup && target && popup.contains(target))
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

function buildRows(minRadius, maxRadius, rowCount) {
  if (rowCount <= 1) return [(minRadius + maxRadius) * 0.5];
  return Array.from({ length: rowCount }, (_, index) =>
    minRadius + ((maxRadius - minRadius) * index) / (rowCount - 1)
  );
}

function chooseRows(count, minRadius, maxRadius, angleSpan) {
  const gap = RADAR.dotRadius * 2 + 8;
  const maxRows = Math.max(1, Math.floor((maxRadius - minRadius) / gap) + 1);
  const capacityAt = (radius) => Math.max(1, Math.floor((angleSpan * radius) / gap));

  for (let rowCount = 1; rowCount <= maxRows; rowCount += 1) {
    const radii = buildRows(minRadius, maxRadius, rowCount);
    const capacities = radii.map(capacityAt);
    const total = capacities.reduce((sum, value) => sum + value, 0);
    if (total >= count) return { radii, capacities };
  }

  const radii = buildRows(minRadius, maxRadius, maxRows);
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

function layoutNodes(entries, center, ringStep) {
  const groups = [...d3.group(entries, (entry) => `${entry.quadrant}-${entry.ring}`).entries()]
    .sort(([left], [right]) => {
      const [leftQuadrant, leftRing] = left.split("-").map(Number);
      const [rightQuadrant, rightRing] = right.split("-").map(Number);
      return leftQuadrant - rightQuadrant || leftRing - rightRing;
    });

  const nodes = [];
  let id = 0;

  for (const [key, group] of groups) {
    const [quadrant, ring] = key.split("-").map(Number);
    const [minAngle, maxAngle] = boundsForQuadrant(quadrant);
    const angleSpan = maxAngle - minAngle;

    const minRadius = ring * ringStep + RADAR.ringInset;
    const maxRadius = (ring + 1) * ringStep - RADAR.ringInset;
    const safeMin = Math.min(minRadius, maxRadius);
    const safeMax = Math.max(minRadius, maxRadius);

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
          id: id++,
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius
        });
      }
    });
  }

  return nodes;
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

function renderRadar(data, popupController) {
  popupController.hide();
  renderStory(data.storyMarkdown);

  const center = RADAR.size * 0.5;
  const ringCount = Math.max(1, data.rings.length);
  const ringStep = RADAR.outer / ringCount;
  const colorByQuadrant = (index) => data.quadrantColors[index] || "#0f5e96";
  const quadrantName = (index) => data.quadrants[index] || `Quadrant ${index + 1}`;

  const svg = d3.select("#radar").attr("viewBox", `0 0 ${RADAR.size} ${RADAR.size}`);
  svg.selectAll("*").remove();
  const layer = svg.append("g");
  const cornerSections = clearQuadrantLists();

  data.rings.forEach((ring, index) => {
    layer.append("circle")
      .attr("class", "ring")
      .attr("cx", center)
      .attr("cy", center)
      .attr("r", ringStep * (index + 1));

    const ringCenter = index * ringStep + ringStep * 0.5;
    layer.append("text")
      .attr("class", "ring-label")
      .attr("x", center)
      .attr("y", center - ringCenter)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((ring.name || "").toUpperCase());
  });

  layer.append("line")
    .attr("class", "axis")
    .attr("x1", center - RADAR.outer)
    .attr("y1", center)
    .attr("x2", center + RADAR.outer)
    .attr("y2", center);
  layer.append("line")
    .attr("class", "axis")
    .attr("x1", center)
    .attr("y1", center - RADAR.outer)
    .attr("x2", center)
    .attr("y2", center + RADAR.outer);

  const nodes = layoutNodes(data.entries, center, ringStep);
  const byQuadrant = d3.group(nodes, (entry) => entry.quadrant);

  const blips = layer.selectAll(".blip")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", "blip")
    .attr("cx", (entry) => entry.x)
    .attr("cy", (entry) => entry.y)
    .attr("r", RADAR.dotRadius)
    .attr("fill", (entry) => colorByQuadrant(entry.quadrant))
    .attr("fill-opacity", (entry) => ringOpacity(entry.ring, ringCount))
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (entry) => `${entry.name}: ${entry.description || "No description available."}`);

  layer.selectAll(".ring-label").raise();

  let activeId = null;
  let hoverId = null;
  const entryButtons = new Map();

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
    syncHighlight();
  };

  const openEntryPopup = (entry, point) => {
    popupController.open({
      entry,
      quadrantName: quadrantName(entry.quadrant),
      ringName: data.rings[entry.ring]?.name || "",
      point
    });
    activeId = entry.id;
    syncHighlight();
  };

  popupController.setOnHide(() => {
    activeId = null;
    hoverId = null;
    syncHighlight();
  });

  blips.on("click", (event, entry) => {
    event.stopPropagation();
    openEntryPopup(entry, { x: event.clientX, y: event.clientY });
  });

  blips.on("mouseenter", (_event, entry) => setHover(entry.id));
  blips.on("mouseleave", () => setHover(null));
  blips.on("focus", (_event, entry) => setHover(entry.id));
  blips.on("blur", () => setHover(null));

  blips.on("keydown", (event, entry) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEntryPopup(entry, nodePoint(svg, entry));
    }
  });

  cornerSections.forEach((section) => {
    const q = Number(section.dataset.q);
    const title = section.querySelector(".quad-title");
    const wrap = section.querySelector(".quad-entries");
    if (!title || !wrap) return;

    title.textContent = quadrantName(q).toUpperCase();
    title.style.color = colorByQuadrant(q);

    (byQuadrant.get(q) || [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "entry-btn";
        button.dataset.id = String(entry.id);

        const dot = document.createElement("span");
        dot.className = "entry-dot";
        dot.style.background = colorByQuadrant(entry.quadrant);

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

        entryButtons.set(entry.id, button);
        wrap.appendChild(button);
      });
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
    subtitle.textContent = "Failed to load radar files. Start a local server and verify data files.";
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
