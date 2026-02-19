(() => {
  const RADAR = {
    size: 980,
    outer: 485,
    dotRadius: 13,
    quadrantAngles: [
      [-Math.PI / 2, 0],
      [-Math.PI, -Math.PI / 2],
      [Math.PI / 2, Math.PI],
      [0, Math.PI / 2]
    ]
  };

  const MODES = {
    earth: { word: "Earth", root: "data/earth" },
    space: { word: "Space", root: "data/space" }
  };

  const $ = (id) => document.getElementById(id);
  const norm = (s) => s.replace(/\r\n?/g, "\n");
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const joinPath = (base, part) => `${base.replace(/\/+$/, "")}/${part.replace(/^\/+/, "")}`;

  let currentMode = "earth";
  let loadTicket = 0;
  let closePopupRequest = () => {};

  async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  async function fetchText(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.text();
  }

  function resolvePath(base, path) {
    if (!path) return path;
    if (/^(?:https?:)?\/\//i.test(path) || path.startsWith("/")) return path;
    if (/^(?:data|content)\//.test(path)) return path;
    return joinPath(base, path);
  }

  function parseEntryTextOverrides(markdown) {
    const overrides = new Map();
    const entryArea = norm(markdown).split(/^#\s+Section\s*$/im)[0] || "";
    const rx = /^##\s+(.+)\n([\s\S]*?)(?=^##\s+|^#\s+|\Z)/gm;
    let m;

    while ((m = rx.exec(entryArea)) !== null) {
      const name = m[1].trim();
      const block = m[2].trim();
      const lines = block ? block.split("\n") : [];
      let linkName;
      if (lines[0]) {
        const k = lines[0].trim().match(/^linkName:\s*(.+)$/i);
        if (k) {
          linkName = k[1].trim();
          lines.shift();
        }
      }
      overrides.set(name, {
        linkName,
        description: lines.join("\n").trim()
      });
    }
    return overrides;
  }

  function hostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url || "";
    }
  }

  async function loadData(modeKey) {
    const mode = MODES[modeKey] || MODES.earth;
    const configPath = joinPath(mode.root, "radar.config.json");
    const config = await fetchJson(configPath);

    const textPath = config.textFile ? resolvePath(mode.root, config.textFile) : null;
    const quadrantPaths = (config.quadrantFiles || []).map((path) => resolvePath(mode.root, path));

    const [textMarkdown, quadrantDocs] = await Promise.all([
      textPath ? fetchText(textPath) : Promise.resolve(""),
      Promise.all(quadrantPaths.map(fetchJson))
    ]);

    const textOverrides = parseEntryTextOverrides(textMarkdown);
    const quadrants = [];
    const quadrantColors = [];
    const entries = [];
    const defaultQuadrantColors = ["#3b82f6", "#14b8a6", "#a855f7", "#f97316"];

    quadrantDocs.forEach((doc) => {
      const q = doc.quadrant;
      if (!q || typeof q.index !== "number" || !q.name) {
        throw new Error("Invalid quadrant config in JSON file.");
      }
      quadrants[q.index] = q.name;
      quadrantColors[q.index] = q.color || defaultQuadrantColors[q.index % defaultQuadrantColors.length];
      (doc.entries || []).forEach((entry) => {
        const text = textOverrides.get(entry.name) || {};
        entries.push({
          ...entry,
          quadrant: q.index,
          description: text.description || entry.description || "",
          linkName: text.linkName || entry.linkName || hostname(entry.link)
        });
      });
    });

    return {
      storyMarkdown: textMarkdown,
      rings: config.rings || [],
      quadrants,
      quadrantColors,
      entries
    };
  }

  function renderStory(data) {
    const section = $("story-section");
    const body = $("story-body");
    if (!section || !body) return;
    if (!data.storyMarkdown) {
      body.innerHTML = "";
      section.hidden = true;
      return;
    }
    body.innerHTML = marked.parse(data.storyMarkdown);
    section.hidden = false;
  }

  function distribute(total, capacities) {
    const counts = capacities.map(() => 0);
    let remaining = total;
    while (remaining > 0) {
      for (let i = 0; i < capacities.length && remaining > 0; i++) {
        if (counts[i] < capacities[i]) {
          counts[i] += 1;
          remaining -= 1;
        }
      }
      if (capacities.every((cap, i) => counts[i] >= cap)) break;
    }
    return counts;
  }

  function buildRows(minRadius, maxRadius, rowCount) {
    if (rowCount <= 1) return [(minRadius + maxRadius) / 2];
    return Array.from({ length: rowCount }, (_, i) =>
      minRadius + ((maxRadius - minRadius) * i) / (rowCount - 1)
    );
  }

  function chooseRows(count, minRadius, maxRadius, angleSpan) {
    const pitch = RADAR.dotRadius * 2 + 8;
    const maxRows = Math.max(1, Math.floor((maxRadius - minRadius) / pitch) + 1);
    const capacityAt = (radius) => Math.max(1, Math.floor((angleSpan * radius) / pitch));

    for (let rowCount = 1; rowCount <= maxRows; rowCount++) {
      const radii = buildRows(minRadius, maxRadius, rowCount);
      const capacities = radii.map(capacityAt);
      const total = capacities.reduce((sum, n) => sum + n, 0);
      if (total >= count) return { radii, capacities };
    }

    const radii = buildRows(minRadius, maxRadius, maxRows);
    const capacities = radii.map(capacityAt);
    const total = capacities.reduce((sum, n) => sum + n, 0);
    if (total < count) capacities[capacities.length - 1] += count - total;
    return { radii, capacities };
  }

  function layoutNodes(entries, center, ringStep) {
    const groups = [...d3.group(entries, (d) => `${d.quadrant}-${d.ring}`).entries()]
      .sort(([a], [b]) => {
        const [aq, ar] = a.split("-").map(Number);
        const [bq, br] = b.split("-").map(Number);
        return aq - bq || ar - br;
      });
    const nodes = [];
    let id = 0;

    for (const [key, group] of groups) {
      const [quadrant, ring] = key.split("-").map(Number);
      const [a0, a1] = RADAR.quadrantAngles[quadrant];
      const axisPadding = 0.3;
      let minAngle = a0 + axisPadding;
      let maxAngle = a1 - axisPadding;
      const topGap = 0.34;
      if (quadrant === 0) minAngle = Math.max(minAngle, -Math.PI / 2 + topGap);
      if (quadrant === 1) maxAngle = Math.min(maxAngle, -Math.PI / 2 - topGap);
      if (maxAngle <= minAngle) {
        const mid = (a0 + a1) / 2;
        minAngle = mid - 0.04;
        maxAngle = mid + 0.04;
      }
      const ringPadding = RADAR.dotRadius + 8;
      const minRadius = ring * ringStep + ringPadding;
      const maxRadius = (ring + 1) * ringStep - ringPadding;
      const safeMinRadius = Math.min(minRadius, maxRadius);
      const safeMaxRadius = Math.max(minRadius, maxRadius);
      const angleSpan = maxAngle - minAngle;
      const rowPlan = chooseRows(group.length, safeMinRadius, safeMaxRadius, angleSpan);
      const perRow = distribute(group.length, rowPlan.capacities);
      const ordered = group.slice().sort((a, b) => a.name.localeCompare(b.name));

      let cursor = 0;
      rowPlan.radii.forEach((radius, rowIndex) => {
        const count = perRow[rowIndex];
        for (let col = 0; col < count; col++) {
          const entry = ordered[cursor++];
          const t = count === 1 ? 0.5 : (col + 1) / (count + 1);
          const angle = minAngle + angleSpan * t;
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

  function render(data) {
    const popup = $("popup");
    const popupTitle = $("popup-title");
    const popupMeta = $("popup-meta");
    const popupBody = $("popup-body");
    const popupLink = $("popup-link");
    const cornerSections = [...document.querySelectorAll(".quad-list")];

    popup.hidden = true;
    renderStory(data);

    const center = RADAR.size / 2;
    const ringStep = RADAR.outer / data.rings.length;
    const svg = d3.select("#radar").attr("viewBox", `0 0 ${RADAR.size} ${RADAR.size}`);
    svg.selectAll("*").remove();
    const g = svg.append("g");

    cornerSections.forEach((section) => {
      const title = section.querySelector(".quad-title");
      const wrap = section.querySelector(".quad-entries");
      title.textContent = "";
      title.style.color = "";
      wrap.replaceChildren();
    });

    data.rings.forEach((ring, i) => {
      g.append("circle")
        .attr("class", "ring")
        .attr("cx", center)
        .attr("cy", center)
        .attr("r", ringStep * (i + 1));
      const r = i * ringStep + ringStep * 0.5;
      g.append("text")
        .attr("class", "ring-label")
        .attr("x", center)
        .attr("y", center - r)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(ring.name.toUpperCase());
    });

    g.append("line")
      .attr("class", "axis")
      .attr("x1", center - RADAR.outer)
      .attr("y1", center)
      .attr("x2", center + RADAR.outer)
      .attr("y2", center);
    g.append("line")
      .attr("class", "axis")
      .attr("x1", center)
      .attr("y1", center - RADAR.outer)
      .attr("x2", center)
      .attr("y2", center + RADAR.outer);

    const nodes = layoutNodes(data.entries, center, ringStep);
    const ringOpacity = (ringIndex) => {
      const maxRing = Math.max(1, data.rings.length - 1);
      const t = 1 - clamp(ringIndex, 0, maxRing) / maxRing;
      const outerOpacity = 0.24;
      return outerOpacity + (1 - outerOpacity) * t;
    };
    const colorByQuadrant = (quadrantIndex) =>
      data.quadrantColors?.[quadrantIndex] || "#0f5e96";
    const byQuadrant = d3.group(nodes, (d) => d.quadrant);
    const blips = g.selectAll(".blip")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "blip")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", RADAR.dotRadius)
      .attr("fill", (d) => colorByQuadrant(d.quadrant))
      .attr("fill-opacity", (d) => ringOpacity(d.ring))
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.name}: ${d.description}`);

    g.selectAll(".ring-label").raise();

    let activeId = null;
    let hoverId = null;
    const entryButtons = new Map();

    const syncHighlight = () => {
      blips
        .classed("active", (d) => d.id === activeId)
        .classed("hovered", (d) => d.id === hoverId);

      entryButtons.forEach((btn, id) => {
        btn.classList.toggle("active", id === activeId);
        btn.classList.toggle("hovered", id === hoverId);
      });
    };

    const setActive = (id) => {
      activeId = id;
      syncHighlight();
    };

    const setHover = (id) => {
      hoverId = id;
      syncHighlight();
    };

    const hidePopup = () => {
      popup.hidden = true;
      setActive(null);
      setHover(null);
    };

    const openPopup = (entry, point) => {
      popupTitle.textContent = entry.name;
      popupMeta.textContent = `${data.quadrants[entry.quadrant]} · ${data.rings[entry.ring].name}`;
      popupBody.textContent = entry.description || "No description available.";
      if (entry.link) {
        popupLink.hidden = false;
        popupLink.href = entry.link;
        popupLink.title = entry.link;
        popupLink.textContent = entry.linkName || hostname(entry.link);
      } else {
        popupLink.hidden = true;
      }
      popup.hidden = false;
      setActive(entry.id);

      const width = Math.min(320, window.innerWidth - 24);
      popup.style.width = `${width}px`;
      popup.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, point.x + 14))}px`;
      popup.style.top = `${Math.max(12, Math.min(window.innerHeight - popup.offsetHeight - 12, point.y - 22))}px`;
    };

    closePopupRequest = (event, force = false) => {
      if (force) {
        hidePopup();
        return;
      }
      if (popup.hidden) return;
      const target = event.target;
      if (!popup.contains(target) && !target.closest(".blip") && !target.closest(".entry-btn")) {
        hidePopup();
      }
    };

    const nodePoint = (entry) => {
      const rect = svg.node().getBoundingClientRect();
      return {
        x: rect.left + (entry.x / RADAR.size) * rect.width,
        y: rect.top + (entry.y / RADAR.size) * rect.height
      };
    };

    blips.on("click", (event, d) => {
      event.stopPropagation();
      openPopup(d, { x: event.clientX, y: event.clientY });
    });
    blips.on("mouseenter", (_event, d) => setHover(d.id));
    blips.on("mouseleave", () => setHover(null));
    blips.on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPopup(d, nodePoint(d));
      }
    });
    blips.on("focus", (_event, d) => setHover(d.id));
    blips.on("blur", () => setHover(null));

    cornerSections.forEach((section) => {
      const q = Number(section.dataset.q);
      const title = section.querySelector(".quad-title");
      title.textContent = data.quadrants[q].toUpperCase();
      title.style.color = colorByQuadrant(q);
      const wrap = section.querySelector(".quad-entries");
      (byQuadrant.get(q) || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((entry) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "entry-btn";
          btn.dataset.id = String(entry.id);
          btn.innerHTML = `<span class="entry-dot" style="background:${colorByQuadrant(entry.quadrant)}"></span><span>${entry.name}</span>`;
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            openPopup(entry, { x: event.clientX, y: event.clientY });
          });
          btn.addEventListener("mouseenter", () => setHover(entry.id));
          btn.addEventListener("mouseleave", () => setHover(null));
          btn.addEventListener("focus", () => setHover(entry.id));
          btn.addEventListener("blur", () => setHover(null));
          entryButtons.set(entry.id, btn);
          wrap.appendChild(btn);
        });
    });
  }

  function setModeUI(modeKey) {
    const mode = MODES[modeKey] || MODES.earth;
    const word = $("radar-mode-word");
    const visual = $("mode-visual");
    const toggle = $("mode-toggle");
    const body = document.body;
    const isSpace = modeKey === "space";
    const switchLabel = isSpace
      ? "Switch to Earth Observation Tech Radar"
      : "Switch to Space Observation Tech Radar";

    if (body) {
      body.classList.toggle("mode-space", isSpace);
      body.classList.toggle("mode-earth", !isSpace);
    }
    if (word) word.textContent = mode.word;
    if (visual) {
      visual.classList.toggle("is-space", isSpace);
      visual.setAttribute("aria-pressed", String(isSpace));
      visual.setAttribute("aria-label", switchLabel);
    }
    if (!toggle) return;

    toggle.classList.toggle("is-space", isSpace);
    toggle.setAttribute("aria-pressed", String(isSpace));
    toggle.setAttribute("aria-label", switchLabel);
  }

  function showLoadError(error) {
    console.error(error);
    const subtitle = $("radar-subtitle");
    if (subtitle) {
      subtitle.textContent = "Failed to load radar files. Run a local server and check data/content files.";
    }
  }

  async function loadAndRender(modeKey) {
    const ticket = ++loadTicket;
    const data = await loadData(modeKey);
    if (ticket !== loadTicket) return;
    render(data);
  }

  async function toggleMode() {
    const toggle = $("mode-toggle");
    const visualToggle = $("mode-visual");
    if ((!toggle && !visualToggle) || toggle?.disabled || visualToggle?.disabled) return;

    const previousMode = currentMode;
    const nextMode = currentMode === "earth" ? "space" : "earth";

    if (toggle) toggle.disabled = true;
    if (visualToggle) visualToggle.disabled = true;
    currentMode = nextMode;
    setModeUI(currentMode);

    try {
      await loadAndRender(currentMode);
    } catch (error) {
      currentMode = previousMode;
      setModeUI(currentMode);
      showLoadError(error);
    } finally {
      if (toggle) toggle.disabled = false;
      if (visualToggle) visualToggle.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    closePopupRequest(event, false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopupRequest(event, true);
  });

  const toggle = $("mode-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      toggleMode();
    });
  }
  const visualToggle = $("mode-visual");
  if (visualToggle) {
    visualToggle.addEventListener("click", () => {
      toggleMode();
    });
  }

  setModeUI(currentMode);
  loadAndRender(currentMode).catch(showLoadError);
})();
