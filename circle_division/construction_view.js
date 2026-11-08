// The construction viewer: step slider, options, the graph with labels, and the
// operations panel. It expects the page's controls (#division, #step, #titleN,
// the option checkboxes) and the panel (#ops, #opsSteps).
//
//   CGA2.inline(CircleDivision.view)()(K, divisions);
//
// K is the object returned by CircleDivision.cga2d; divisions maps n to
// { tower } (see cga2d_towers.js). viewOptions.scale sets the starting zoom
// (default 1.15).
window.CircleDivision = window.CircleDivision || {};

CircleDivision.view = () => (K, divisions, viewOptions = {}) => {
  const { ni, no, point, normalize, trace, tex, nameOf, named, record, beginOps, endOps, quietly,
          given, lineEnds, lineThrough, circleCenterRadius, circleCenterThrough, centerOf,
          flatPointToPoint, splitPointPair, meet, intersect, linePairs, lineThroughPair,
          pointOfLines, bisect, xOf, yOf, choose, fartherFrom, rotorBetween, rotate, carlyleRoots,
          frame, polygonFromCosine  } = K;
  const regularPolygonConstruction = n => K.regularPolygonConstruction(divisions, n);
  // All colours come from colors.js.
  const colors = CircleDivision.colors;

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  const state = {
    n: 17,
    step: 10,
    showConstruction: true,
    showPrevious: true,
    showPreviousPoints: true,
    showLabels: true,
    labelObjects: false,
    showRotor: true,
    showCompass: true
  };

  const divisionInput = document.getElementById("division");
  const titleN = document.getElementById("titleN");
  const stepInput = document.getElementById("step");
  const stepValue = document.getElementById("stepValue");
  const stepDownButton = document.getElementById("stepDown");
  const stepUpButton = document.getElementById("stepUp");
  const showConstructionInput = document.getElementById("showConstruction");
  const showPreviousInput = document.getElementById("showPrevious");
  const showPreviousPointsInput = document.getElementById("showPreviousPoints");
  const showLabelsInput = document.getElementById("showLabels");
  const labelObjectsInput = document.getElementById("labelObjects");
  const showRotorInput = document.getElementById("showRotor");
  const showCompassInput = document.getElementById("showCompass");

  const updateState = () => {
    state.n = Number(divisionInput.value);
    titleN.textContent = String(state.n);
    state.step = Number(stepInput.value);
    state.showConstruction = showConstructionInput.checked;
    state.showPrevious = showPreviousInput.checked;
    state.showPreviousPoints = showPreviousPointsInput.checked;
    // (Not `!`: inside Algebra(), ganja translates ! to the dual.)
    showPreviousInput.disabled = state.showConstruction === false;
    showPreviousPointsInput.disabled = state.showConstruction === false;
    state.showLabels = showLabelsInput.checked;
    state.labelObjects = labelObjectsInput.checked;
    state.showRotor = showRotorInput.checked;
    state.showCompass = showCompassInput.checked;
    stepValue.textContent = String(state.step);
    // The − and + buttons stop at the first and last steps.
    if (stepDownButton) stepDownButton.disabled = state.step <= 0;
    if (stepUpButton) stepUpButton.disabled = state.step >= Number(stepInput.max);
  };

  updateState();

  // Graph labels and step titles are plain text (ganja draws labels as SVG
  // text), so point names get Unicode subscripts to match the panel:
  // V0 → V₀, A7 → A₇, V16 → V₁₆, QV0 → QV₀.
  const subscriptDigits = "₀₁₂₃₄₅₆₇₈₉";
  const subscript = text => text.replace(/([A-Z][\u0302′]?)(\d+)/g,
    (m, name, digits) => name + digits.split("").map(d => subscriptDigits[Number(d)]).join(""));

  // Labels for lines and circles, from their traced (LaTeX) names.
  //
  // ganja places a label at the position of the object drawn just before it,
  // so each label follows an invisible zero-length segment [P, P] at the
  // chosen point P. ganja inserts label strings into its SVG markup as is,
  // so subscripts become <tspan>s shifted down (dy is in graph units).
  // (Nested subscripts are flattened in numeric.js, outside ganja's
  // translator, which would rewrite the | and ^ in its regular expressions.)
  const svgLabel = texName => {
    const t = CircleDivision.text.flattenNested(texName)
      .replace(/\\lvert\s*/g, "|").replace(/\\rvert/g, "|")
      .replace(/\\hat V/g, "V\u0302")
      .replace(/_\{(\d+)\}/g, (m, d) => d.split("").map(x => subscriptDigits[Number(x)]).join(""))
      .replace(/_(\d)/g, (m, d) => subscriptDigits[Number(d)]);
    const parts = [];
    const re = /_\{([^{}]*)\}|_(.)/g;
    let last = 0, m;
    while ((m = re.exec(t))) {
      if (m.index > last) parts.push({ text: t.slice(last, m.index), sub: false });
      parts.push({ text: m[1] || m[2], sub: true });
      last = re.lastIndex;
    }
    if (last < t.length) parts.push({ text: t.slice(last), sub: false });
    // Baseline text before any subscript stays plain: ganja inserts strings
    // that start with "<" as raw SVG instead of wrapping them in <text>.
    let svg = "", lowered = false;
    parts.forEach(p => {
      if (p.sub === false && lowered === false) {
        svg += p.text;
      } else {
        const dy = p.sub === lowered ? "" : (p.sub ? ' dy="0.03"' : ' dy="-0.03"');
        svg += "<tspan" + dy + (p.sub ? ' font-size="75%"' : "") + ">" + p.text + "</tspan>";
      }
      lowered = p.sub;
    });
    return svg;
  };

  // Label placement. Labels keep their size on screen while the geometry
  // scales with the zoom, so offsets and clearances are in screen terms: u is
  // one unit at the default zoom of the CGA2d page (scale 1.15).
  const unit = () => 1.15 / graphOptions.scale;

  // Labels already placed in the current scene: point labels (labelledAt,
  // their points) and object labels (labelBoxes). A label is a box of text
  // from its spot rightwards and upwards (ganja draws text with its baseline
  // at the spot); a spot is clear when the new label's box overlaps none of
  // the others. Widths are estimated from the number of characters.
  let labelledAt = [], labelBoxes = [];
  const charWidth = () => 0.062 * unit(), textHeight = () => 0.11 * unit();
  const labelWidth = svgText => (CircleDivision.text.visibleLength(svgText) + 2) * charWidth();
  const boxAt = (P, w) => { const Q = normalize(P); return { x: xOf(Q), y: yOf(Q), w }; };
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w
    && a.y < b.y + textHeight() + 0.03*unit() && b.y < a.y + textHeight() + 0.03*unit();
  const isClear = (P, w) => {
    const box = boxAt(P, w);
    return [...labelledAt.map(p => boxAt(p, 3*charWidth())), ...labelBoxes].every(b => overlaps(box, b) === false);
  };
  // The first clear spot of a list of candidates (else the first).
  const clearSpot = (candidates, w) => candidates.find(P => isClear(P, w)) || candidates[0];
  const along = (A, B, t) => point((1 - t)*xOf(A) + t*xOf(B), (1 - t)*yOf(A) + t*yOf(B));

  // Candidate spots for each kind of label, best first.

  // A circle: on the circle 30° below the right of its centre, away from the
  // pairs and bisectors, which lie above; else further round, or just
  // outside a small circle.
  const circleLabelPoints = C => {
    const c = centerOf(C);
    const s = normalize(!C);
    const r = Math.sqrt(Math.max(0, (s | s)[0]));
    const at = (deg, rr) => point(xOf(c) + rr*Math.cos(deg*Math.PI/180), yOf(c) + rr*Math.sin(deg*Math.PI/180));
    return [...[-30, -60, -120, -150, 30, 150].map(deg => at(deg, r)),
            ...[-30, 30, -150, 150, -90].map(deg => at(deg, r + 0.3*unit()))];
  };

  // Label position on a line: from its point nearest O, 1.2 along the line
  // (upwards, or rightwards for a horizontal line). With s = L* = n + δ n∞
  // and |n| = 1, the line is x·n = δ and its point nearest O is δ n.
  const lineFrame = L => {
    const s = !L;
    const k = Math.hypot(s[1], s[2]);
    const nx = s[1]/k, ny = s[2]/k, delta = (s[3] + s[4])/2/k;
    let dx = -ny, dy = nx;
    if (dy < -1E-9 || (Math.abs(dy) < 1E-9 && dx < 0)) { dx = -dx; dy = -dy; }
    return { nx, ny, delta, dx, dy };
  };

  const lineLabelPoints = L => {
    const { nx, ny, delta, dx, dy } = lineFrame(L);
    return [1.2, 0.6, 1.8, -1.2, 2.4].map(k => point(delta*nx + k*dx, delta*ny + k*dy));
  };

  // A line through two points A, B: 75% of the way from A to B, so lines on
  // the same carrier (e.g. L_OA1 and L_OA2) do not collide; else elsewhere
  // along AB.
  const segmentLabelPoints = L => {
    const [A, B] = lineEnds.get(L).map(normalize);
    return [0.75, 0.5, 0.25, 0.9, 0.1].map(t => along(A, B, t));
  };

  // A point pair: just below its upper point (its right point if both are
  // level), clear of that point's own label; else beside or above it.
  const upperPointOf = T => {
    const pts = splitPointPair(T);
    if (pts.length === 0) return null;
    return pts.reduce((a, b) => {
      const dy = yOf(b) - yOf(a);
      return (dy > 1E-6 || (Math.abs(dy) <= 1E-6 && xOf(b) > xOf(a))) ? b : a;
    });
  };

  const pairLabelPoints = T => {
    const P = upperPointOf(T);
    if (P === null) return null;
    const u = unit(), x = xOf(P), y = yOf(P);
    return [[0, -0.18], [0.3, -0.25], [0, 0.25], [-0.6, -0.2], [0.3, 0.2], [0, -0.45], [-0.6, 0.2]]
      .map(([a, b]) => point(x + a*u, y + b*u));
  };

  // A line through a pair (a bisector): just beyond the pair's upper point
  // along the line, so it stays clear of the pair label; else further along.
  const pairLineLabelPoints = L => {
    const P = upperPointOf(linePairs.get(L));
    if (P === null) return lineLabelPoints(L);
    const { dx, dy } = lineFrame(L);
    const u = unit();
    return [0.3, 0.6, 0.9, 1.3, -0.6].map(k => point(xOf(P) + k*u*dx, yOf(P) + k*u*dy));
  };

  // Place a label at the first clear spot of its candidates.
  const placeLabel = (out, color, text, candidates) => {
    if (candidates === null || candidates.length === 0) return;
    const svg = svgLabel(text), w = labelWidth(svg);
    const P = clearSpot(candidates, w);
    out.push(color, [P, P], svg);
    labelBoxes.push(boxAt(P, w));
  };

  const addObjectLabel = (out, color, X, candidates) => {
    const name = nameOf(X);
    if (name === "?") return;
    placeLabel(out, color, name, candidates);
  };

  const addPoints = (out, color, points, withLabels=true) => {
    if (points == null) return;
    out.push(color);
    points.forEach(({p, label}) => {
      out.push(p);
      if (state.showLabels && withLabels && label) out.push(subscript(label));
    });
  };

  const addObjects = (out, color, objects) => {
    if (objects == null) return;
    if (objects.length) out.push(color, ...objects);
  };

  const addSegments = (out, color, segments) => {
    if (segments == null) return;
    if (segments.length) out.push(color, ...segments);
  };

  // Side panel: the ops of steps 0..current, with the current step highlighted.
  const opsPanel = document.getElementById("ops");
  const opsSteps = document.getElementById("opsSteps");

  // Typeset LaTeX with KaTeX; without KaTeX, show the LaTeX source.
  // (KaTeX refuses to render in quirks mode, hence the doctype on this page.)
  let texWarned = false;
  const renderTex = (src, el) => {
    if (window.katex) {
      try {
        window.katex.render(src, el, { throwOnError: false });
        return;
      } catch (e) {
        if (texWarned === false) console.warn("KaTeX could not render, showing LaTeX source:", e);
        texWarned = true;
      }
    } else if (texWarned === false) {
      console.warn("KaTeX is not loaded, showing LaTeX source.");
      texWarned = true;
    }
    el.textContent = src;
    el.classList.add("tex-fallback");
  };

  // The legend's formulas are written as LaTeX in elements of class "tex".
  document.querySelectorAll("#ops .tex").forEach(el => renderTex(el.textContent, el));

  const renderOps = (steps, current) => {
    opsSteps.textContent = "";
    let currentElement = null;
    for (let i = 0; i <= current; i++) {
      const s = steps[i];
      const div = document.createElement("div");
      div.className = i === current ? "step current" : "step";
      const h = document.createElement("h4");
      h.textContent = "Step " + i + ": " + subscript(s.title);
      const lines = document.createElement("div");
      lines.className = "ops-lines";
      (s.ops || []).forEach(op => {
        const line = document.createElement("div");
        renderTex(op, line);
        lines.appendChild(line);
      });
      div.appendChild(h);
      div.appendChild(lines);
      opsSteps.appendChild(div);
      if (i === current) currentElement = div;
    }
    if (currentElement && currentElement.scrollIntoView) {
      currentElement.scrollIntoView({ block: "nearest" });
    }
  };

  // A ring around a point that belongs to a point pair or quadruple, in the
  // colour of that object's label, so its points read apart from plain points.
  // (Raw SVG: ganja draws points with radius 0.03 at (x, -y) times its scale.)
  const hexColor = c => "#" + (c + (1 << 25)).toString(16).slice(-6);
  const ring = (P, color) => {
    const Q = normalize(P), sc = graphOptions.scale;
    const cx = xOf(Q)*sc, cy = -yOf(Q)*sc;
    return '<circle class="ring" cx="' + cx + '" cy="' + cy + '" r="0.065" fill="none" stroke="'
      + hexColor(color) + '" stroke-width="0.012"/>';
  };

  const buildScene = () => {
    const construction = regularPolygonConstruction(state.n);
    const finalStep = construction.steps.length - 1;
    const complete = state.step >= finalStep;
    // Points already labelled on the graph (rotor labels skip these spots).
    labelledAt = [];
    labelBoxes = [];
    const isLabelled = P => labelledAt.some(L => Math.hypot(xOf(normalize(P)) - xOf(normalize(L)),
      yOf(normalize(P)) - yOf(normalize(L))) < 1E-4);
    const out = [];

    const current = construction.steps[Math.min(state.step, finalStep)];
    const currentUses = current.uses || new Set();
    renderOps(construction.steps, Math.min(state.step, finalStep));

    // Base geometry. The y-axis only exists once it is constructed (step 1).
    addObjects(out, colors.axes, state.step >= 1
      ? [construction.base.xAxis, construction.base.yAxis]
      : [construction.base.xAxis]);
    addObjects(out, colors.unitCircle, [construction.base.unit]);

    // O and V0 are labelled by step 0 when it draws them (all its points, or
    // those the current step uses), so label them here only otherwise.
    // (With the construction hidden, step 0's points are always drawn.)
    const step0Shows = p => state.showConstruction === false
      || state.showPreviousPoints || state.step === 0 || currentUses.has(p);
    addPoints(out, colors.givenPoint, [
      { p: construction.base.O, label: step0Shows(construction.base.O) ? null : "O" },
      { p: construction.base.V0, label: step0Shows(construction.base.V0) ? null : "V0" }
    ]);
    // (Labels drawn here count as taken, for placing the other labels.)
    if (state.showLabels) [construction.base.O, construction.base.V0]
      .filter(p => step0Shows(p) === false).forEach(p => labelledAt.push(p));

    // Auxiliary construction revealed by slider (or, when it is hidden, only
    // the constructed points; see the else branch).
    if (state.showConstruction) {
      const fadedCurves = new Set();
      for (let i = 0; i <= state.step; i++) {
        const s = construction.steps[i];
        if (s == null) continue;

        // Earlier steps' lines, circles and point pairs can be hidden; their
        // points stay, since later steps are built on them.
        // The current step's lines are drawn in blue and its circles in orange,
        // with the circles' centres marked in orange, so each step shows where
        // the straightedge and compass were placed.
        const isCurrent = i === state.step;
        if (state.showPrevious || isCurrent) {
          // A given curve (the parabola), like the other objects: in its colour
          // in the step that gives it and in steps that use it (they list it
          // too), faded in earlier steps.
          // (A curve listed by several steps is faded once.)
          if (isCurrent) addSegments(out, colors.curve, s.objects.curves);
          else if (s.objects.curves && fadedCurves.has(s.objects.curves) === false) {
            fadedCurves.add(s.objects.curves);
            addSegments(out, colors.earlierCurve, s.objects.curves);
          }
          addObjects(out, isCurrent ? colors.line : colors.earlierLine, s.objects.lines);
          addObjects(out, isCurrent ? colors.circle : colors.earlierCircle, s.objects.circles);
          addObjects(out, colors.pairPoints, s.objects.pointPairs);
          // Radius segments: where a compass opening was taken from.
          addSegments(out, isCurrent ? colors.radius : colors.earlierRadius, (s.radii || []).map(r => r.ends));
        }
        // The current step's point pairs: a ring around each of their points.
        if (isCurrent) {
          (s.objects.pointPairs || []).forEach(T => splitPointPair(T).forEach(P => out.push(ring(P, colors.pair))));
        }
        // Point quadruples { name, points, at }: their points, ringed in the
        // current step and grey afterwards.
        (s.objects.quads || []).forEach(q => {
          if (isCurrent) {
            addPoints(out, colors.quad, q.points.map(p => ({ p })), false);
            q.points.forEach(P => out.push(ring(P, colors.quad)));
          } else if (state.showPrevious) {
            addPoints(out, colors.earlierQuad, q.points.map(p => ({ p })), false);
          }
        });
        // With earlier points hidden, still show those the current step uses.
        const drawn = (state.showPreviousPoints || isCurrent)
          ? (s.objects.points || [])
          : (s.objects.points || []).filter(q => currentUses.has(q.p));
        addPoints(out, colors.point, drawn);
        if (state.showLabels) drawn.forEach(q => labelledAt.push(q.p));
        if (isCurrent && s.objects.circles) {
          addPoints(out, colors.centre, s.objects.circles.map(c => ({ p: centerOf(c) })), false);
        }
        if (isCurrent && state.labelObjects) {
          (s.objects.lines || []).forEach(L => addObjectLabel(out, colors.line, L,
            lineEnds.has(L) ? segmentLabelPoints(L)
              : linePairs.has(L) ? pairLineLabelPoints(L) : lineLabelPoints(L)));
          (s.objects.circles || []).forEach(C => addObjectLabel(out, colors.circleLabel, C, circleLabelPoints(C)));
          (s.objects.pointPairs || []).forEach(T => addObjectLabel(out, colors.pair, T, pairLabelPoints(T)));
          (s.objects.quads || []).forEach(q => placeLabel(out, colors.quad, q.name, [q.at]));
          // Other objects (a given conic, a point quadruple) label themselves:
          // { name, at, color } in the step's objects.labels.
          (s.objects.labels || []).forEach(l => placeLabel(out, l.color, l.name, [l.at]));
          (s.radii || []).forEach(r => {
            const [A, B] = r.ends.map(normalize);
            // At the segment's midpoint, or just off the segment when a point
            // label is already there (|QV0| has its midpoint at O); failing
            // that, further along the segment, clear of other labels.
            let mx = 0.5*(xOf(A) + xOf(B)), my = 0.5*(yOf(A) + yOf(B));
            if (isLabelled(point(mx, my))) {
              const len = Math.hypot(xOf(B) - xOf(A), yOf(B) - yOf(A));
              mx = mx + 0.18*unit()*(yOf(B) - yOf(A))/len;
              my = my - 0.18*unit()*(xOf(B) - xOf(A))/len;
            }
            placeLabel(out, colors.circleLabel, r.name, [point(mx, my), ...[0.3, 0.7, 0.2, 0.8].map(t => along(A, B, t))]);
          });
        }
      }
    } else {
      // Auxiliary construction hidden: still show the points each step
      // constructs (up to the current one) and the current step's given curve,
      // so stepping changes the drawing. The final step's points (V1 and
      // V(n-1), or the starting edge) are the red markers drawn below.
      for (let i = 0; i <= Math.min(state.step, finalStep - 1); i++) {
        const s = construction.steps[i];
        if (i === state.step) addSegments(out, colors.curve, s.objects.curves);
        const drawn = s.objects.points || [];
        addPoints(out, colors.point, drawn);
        if (state.showLabels) drawn.forEach(q => labelledAt.push(q.p));
      }
    }

    // Compass stepping. This is the straightedge/compass continuation after V1.
    if (state.showCompass && complete) {
      addObjects(out, colors.compassCircle, construction.compass.circles);
      addSegments(out, colors.compassEdge, construction.compass.edges);
      addPoints(out, colors.compassVertex, construction.compass.vertices, false);
    }

    // Rotor stepping. This shows the same repeated chord as a CGA rotor orbit.
    if (state.showRotor && complete) {
      addSegments(out, colors.rotorEdge, construction.rotor.edges);
      // Rotor-stepped vertices can coincide with labelled points: V̂0 with V0,
      // others with construction points (V1, P1, U1, P2, ...) or with the red
      // markers, which are labelled when the construction is hidden. Label
      // only those with a spot of their own.
      if (state.showConstruction === false && state.showLabels) {
        labelledAt.push(construction.constructed.V1, construction.constructed.Vlast);
      }
      addPoints(out, colors.rotorVertex, construction.rotor.vertices.map((v, k) =>
        (k === 0 || isLabelled(v.p)) ? { p: v.p } : v));
    }

    // Emphasize the constructed first non-trivial points.
    if (complete) {
      // The red markers (V1 and V(n-1), or the 15-gon's starting edge) are
      // labelled by the construction when it is shown; they only add a label
      // when it is hidden.
      addPoints(out, colors.firstVertices, [
        { p: construction.constructed.V1, label: construction.constructed.firstLabel },
        { p: construction.constructed.Vlast, label: construction.constructed.lastLabel }
      ], state.showConstruction === false);
    }

    return out;
  };

  let graphElement = null;

  // One options object for every redraw, so the zoom (ganja's scale) persists.
  const defaultScale = viewOptions.scale || 1.15, minScale = 0.2, maxScale = 40;
  const graphOptions = {
    conformal: true,
    grid: true,
    lineWidth: 2,
    scale: defaultScale
  };

  const renderGraph = () => {
    updateState();

    if (graphElement) {
      graphElement.remove();
      graphElement = null;
    }

    graphElement = this.graph(buildScene(), graphOptions);

    graphElement.classList.add("graph-panel");

    // Pan/zoom that survives redraws (see graphView above).
    graphElement.dataset.defaultViewBox = graphElement.getAttribute("viewBox");
    window.graphView.attach(graphElement, {
      clampZoom: f => Math.min(maxScale, Math.max(minScale, graphOptions.scale * f)) / graphOptions.scale,
      applyZoom: k => {
        graphOptions.scale = graphOptions.scale * k;
        renderGraph();
      },
      reset: () => {
        graphOptions.scale = defaultScale;
        renderGraph();
      }
    });
    document.body.appendChild(graphElement);

    // Place the graph and side panel below the controls, whatever their height.
    const top = document.getElementById("controls").offsetHeight;
    graphElement.style.setProperty("top", top + "px", "important");
    graphElement.style.setProperty("height", "calc(100% - " + top + "px)", "important");
    opsPanel.style.top = top + "px";
  };

  // Switching polygon resets the slider to the new construction's final step.
  const onDivisionChange = () => {
    const steps = regularPolygonConstruction(Number(divisionInput.value)).steps.length;
    stepInput.max = String(steps - 1);
    stepInput.value = String(steps - 1);
    renderGraph();
  };
  divisionInput.addEventListener("change", onDivisionChange);

  // − and +: one step back or forward.
  const stepBy = d => {
    stepInput.value = String(Math.min(Number(stepInput.max), Math.max(0, Number(stepInput.value) + d)));
    renderGraph();
  };
  if (stepDownButton) stepDownButton.addEventListener("click", () => stepBy(-1));
  if (stepUpButton) stepUpButton.addEventListener("click", () => stepBy(1));

  [stepInput, showConstructionInput, showPreviousInput, showPreviousPointsInput, showLabelsInput, labelObjectsInput, showRotorInput, showCompassInput]
    .forEach(el => {
      el.addEventListener("input", renderGraph);
      el.addEventListener("change", renderGraph);
    });

  // Also syncs the slider range with a polygon choice the browser restored.
  // An address ending in #n9 (or #n5, #n17, ...) opens that polygon.
  const fromHash = location.hash.match(/^#n(\d+)$/);
  if (fromHash && divisions[fromHash[1]]) divisionInput.value = fromHash[1];
  onDivisionChange();
};
