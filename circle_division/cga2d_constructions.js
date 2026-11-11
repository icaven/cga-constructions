// Compass and straightedge in CGA2d, with an operation trace.
//
// Loaded as a plain script; ganja translates the operators when the page runs
// the factory through its algebra:
//
//   const CGA2 = Algebra(3,1);
//   const K = CGA2.inline(CircleDivision.cga2d)();
//
// Every module of a page must be run through the same algebra class (one
// Algebra(3,1) call), since each call creates its own element type.
window.CircleDivision = window.CircleDivision || {};

CircleDivision.cga2d = () => {

  // ---------------------------------------------------------------------------
  // CGA2d model
  // ---------------------------------------------------------------------------
  //
  // We use the conformal model with two null vectors:
  //
  //   n∞ = e4 + e3
  //   no = 1/2(e4 - e3)
  //
  // Euclidean points are embedded as
  //
  //   P(x,y) = no + x e1 + y e2 + 1/2(x²+y²)n∞,
  //
  // so that for normalized points P·Q = -1/2|p - q|².
  //
  // Only O and V0 are given as coordinates. Everything else is constructed
  // from them with CGA joins, meets, and the compass constructions below.
  // Lines and circles are kept in outer (OPNS) form, X ∧ Y ∧ Z, which is what
  // ganja draws and what the meet & expects.

  const ni = 1e4 + 1e3;
  const no = 0.5 * (1e4 - 1e3);

  const point = (x, y) => no + x*1e1 + y*1e2 + 0.5*(x*x + y*y)*ni;

  // Scale a point so that -P·n∞ = 1 (the no coefficient is 1).
  const normalize = P => P * (1 / -(P | ni)[0]);

  // ---------------------------------------------------------------------------
  // Operation trace
  // ---------------------------------------------------------------------------
  //
  // Every construction helper below records the CGA operation it performs,
  // as LaTeX that the side panel renders with KaTeX:
  //
  //   \wedge join (^)   \vee meet (&)   X^{*} dual (!X)   \cdot inner product (|)
  //   split(T): the two points of a point pair    pt(F): point of a flat point
  //
  // Values are named in a WeakMap: given points and chosen points get the
  // caller's name (O, Q, A0, ... converted to LaTeX by tex()), other objects
  // get a name built from their inputs (C_{O}(V_{0}) is the circle centred at O
  // through V0). A step's ops are
  // whatever was recorded between beginOps() and endOps().

  const trace = { ops: null, uses: null, radii: null, paused: false, names: new WeakMap(), pairs: 0 };

  // LaTeX for a plain name: V16 → V_{16}, Q′ → Q'. LaTeX names pass through.
  const tex = n => n.replace(/^([A-Za-z]+)(\d+)$/, "$1_{$2}").replace(/′/g, "'");

  // Looking up a name during a step also records the value as used by it;
  // every helper names its inputs, so this collects the step's inputs.
  const nameOf = X => {
    if (trace.uses) trace.uses.add(X);
    return trace.names.get(X) || "?";
  };
  const named = (X, n) => {
    if (n) trace.names.set(X, tex(n));
    return X;
  };
  const record = s => {
    if (trace.ops && trace.paused === false) trace.ops.push(s);
  };
  const beginOps = () => {
    trace.ops = [];
    trace.uses = new Set();
    trace.radii = [];
    trace.pairs = 0;
  };
  // A step's recorded ops, the set of values it used, and its radius
  // segments (where a compass took a length from two other points).
  const endOps = () => {
    const recorded = { ops: trace.ops, uses: trace.uses, radii: trace.radii };
    trace.ops = null;
    trace.uses = null;
    trace.radii = null;
    return recorded;
  };

  // Run f without recording (for loops whose first pass has been recorded).
  const quietly = f => {
    trace.paused = true;
    try { return f(); } finally { trace.paused = false; }
  };

  // ---------------------------------------------------------------------------
  // Straightedge and compass in CGA
  // ---------------------------------------------------------------------------

  // A given point, P(x, y) = no + x e1 + y e2 + 1/2(x²+y²) n∞.
  const given = (x, y, n) => {
    record(tex(n) + " = P(" + x + ",\\, " + y + ")");
    return named(point(x, y), n);
  };

  // Straightedge: the line through A and B.
  // The two points each line was drawn through (for placing its label).
  const lineEnds = new WeakMap();

  const lineThrough = (A, B, n) => {
    const name = tex(n || ("L_{" + nameOf(A) + nameOf(B) + "}"));
    record(name + " = " + nameOf(A) + " \\wedge " + nameOf(B) + " \\wedge n_\\infty");
    const L = named(A ^ B ^ ni, name);
    lineEnds.set(L, [A, B]);
    return L;
  };

  // Compass: the circle centred at C with radius |P1 P2|.
  //
  // The dual circle with centre C and radius r is C - 1/2 r² n∞, and
  // P1·P2 = -1/2|p1 - p2|², so the radius is carried over by an inner product
  // without ever being measured.
  const circleCenterRadius = (C, P1, P2, n) => {
    const through = P1 === C;
    const radius = "\\lvert " + nameOf(P1) + nameOf(P2) + "\\rvert";
    const name = tex(n || ("C_{" + nameOf(C) + "}(" + (through ? nameOf(P2) : radius) + ")"));
    record(name + " = \\big(" + nameOf(C) + " + (" + nameOf(P1) + " \\cdot " + nameOf(P2) + ")\\, n_\\infty\\big)^{*}"
      + (through ? "" : "\\qquad \\text{radius } " + radius));
    // A radius taken from elsewhere: keep the segment P1 P2 (the compass
    // opening) so the step can draw where the length comes from.
    if (through === false && trace.radii
        && trace.radii.some(r => r.ends[0] === P1 && r.ends[1] === P2) === false) {
      trace.radii.push({ ends: [P1, P2], name: radius });
    }
    return named(!(C + (P1 | P2)[0]*ni), name);
  };

  // Compass: the circle centred at C through P.
  const circleCenterThrough = (C, P, n) => circleCenterRadius(C, C, P, n);

  // Centre of a circle X (outer form): with s = !X its dual vector, the centre
  // is the sandwich s n∞ s, i.e. n∞ reflected in the circle.
  const centerOf = X => {
    const s = !X;
    return normalize(s * ni * s).Grade(1);
  };

  // Convert a flat point F = M ∧ n∞ (the meet of two lines) to the point M.
  //
  // no ⌋ (M ∧ n∞) = M - 1/2|m|² n∞ once normalized; call this Y. M is null,
  // so Y·Y = |m|², and M = Y + 1/2(Y·Y) n∞.
  const flatPointToPoint = F => {
    const Y = normalize(no << F);
    return Y + 0.5*(Y | Y)[0]*ni;
  };

  // Split a point pair T into its two normalized points.
  //
  //   P± = (T ± sqrt(T·T)) (n∞ ⌋ T)
  //
  // T·T < 0 means the pair is imaginary (the objects do not meet).
  const splitPointPair = T => {
    const s2 = (T*T)[0];
    if (s2 < -1E-10) return [];
    const s = Math.sqrt(Math.max(0, s2));
    const D = ni << T;
    return [((T + s)*D).Grade(1), ((T - s)*D).Grade(1)].map(normalize);
  };

  // The meet X & Y of two lines or circles: a point pair.
  const meet = (X, Y, n) => {
    if (n === undefined) trace.pairs = trace.pairs + 1;
    const name = tex(n || ("T_{" + trace.pairs + "}"));
    record(name + " = " + nameOf(X) + " \\vee " + nameOf(Y));
    return named(X & Y, name);
  };

  // Intersection of two lines or circles: the pair, for drawing, and its two
  // points (named split(T) until one is chosen).
  const intersect = (X, Y, n) => {
    const pair = meet(X, Y, n);
    const points = splitPointPair(pair).map(P => named(P, "\\operatorname{split}(" + nameOf(pair) + ")"));
    return { pair, points };
  };

  // The line through the two points of a point pair T.
  // (Lines through a pair remember it, for placing their label.)
  const linePairs = new WeakMap();

  const lineThroughPair = (T, n) => {
    record(tex(n) + " = " + nameOf(T) + " \\wedge n_\\infty");
    const L = named(T ^ ni, n);
    linePairs.set(L, T);
    return L;
  };

  // The point where two lines cross (their meet is a flat point).
  const pointOfLines = (L1, L2, n) => {
    record(tex(n) + " = \\operatorname{pt}(" + nameOf(L1) + " \\vee " + nameOf(L2) + ")");
    return named(flatPointToPoint(L1 & L2), n);
  };

  // Classical bisection of segment AB with compass and straightedge.
  //
  //   1. circles centred at A through B and centred at B through A;
  //   2. their meet is a point pair T;
  //   3. the perpendicular bisector is the line through T, T ∧ n∞;
  //   4. the midpoint M is where it crosses line AB (a flat point M ∧ n∞).
  //
  // names.line names the bisector (default B_AB); the midpoint (and line AB,
  // L_AB, which it is found on) is only constructed when names.midpoint is
  // given. names.on: an existing line through A and B to find it on instead.
  const bisect = (A, B, names) => {
    const ab = nameOf(A) + nameOf(B);
    const circles = [circleCenterThrough(A, B), circleCenterThrough(B, A)];
    const pair = meet(circles[0], circles[1], "T_{" + ab + "}");
    const line = lineThroughPair(pair, (names && names.line) || ("B_{" + ab + "}"));
    // The midpoint is found on line AB: names.on when that line already
    // exists (e.g. the x-axis), otherwise A ∧ B ∧ n∞.
    const on = names && names.on;
    const segment = names && names.midpoint ? (on || lineThrough(A, B)) : null;
    const midpoint = segment ? pointOfLines(line, segment, names.midpoint) : null;
    // lines: the bisector, plus line AB when it was constructed here.
    const lines = segment && on == null ? [line, segment] : [line];
    return { circles, pair, line, segment, lines, midpoint };
  };

  // ---------------------------------------------------------------------------
  // Branch choice
  // ---------------------------------------------------------------------------
  //
  // A meet gives two points; choosing one of them is the only place the
  // construction looks at orientation. For a normalized point, P·e1 and P·e2
  // are its x and y coordinates.

  const xOf = P => (P | 1e1)[0];
  const yOf = P => (P | 1e2)[0];

  // Choose by "larger x", "smaller x", "larger y" or "smaller y", and name
  // the chosen point n (recorded only when n is given).
  const choose = (points, by, n) => {
    const f = by.endsWith("x") ? xOf : yOf;
    const larger = by.startsWith("larger");
    const P = points.reduce((a, b) => (larger ? f(b) > f(a) : f(b) < f(a)) ? b : a);
    const [word, axis] = by.split(" ");
    if (n) record(tex(n) + " = " + nameOf(P) + "\\qquad \\text{" + word + " } " + axis);
    return named(P, n);
  };

  // The point of a pair that is farther from P (larger -X·P).
  const fartherFrom = (points, P, n) => {
    const X = points.reduce((a, b) => -(b | P)[0] > -(a | P)[0] ? b : a);
    if (n) record(tex(n) + " = " + nameOf(X) + "\\qquad \\text{farther from } " + nameOf(P));
    return named(X, n);
  };

  // The point of a pair that is not P (the pair is P and one other point).
  const otherThan = (points, P, n) => {
    const X = points.reduce((a, b) => -(b | P)[0] > -(a | P)[0] ? b : a);
    if (n) record(tex(n) + " = " + nameOf(X) + "\\qquad \\text{the point that is not } " + nameOf(P));
    return named(X, n);
  };

  // The mirror image of X in the line through A and B, by compass.
  //
  //   1. circles centred at A and at B, both through X;
  //   2. their meet is the pair T = {X, X′}, symmetric about line AB;
  //   3. X′ is the point of T farther from X;
  //   4. the line through the pair, T ∧ n∞, is perpendicular to AB.
  //
  // (Algebraically X′ = L* X L*, the reflection versor of L = A ∧ B ∧ n∞.)
  // names: { image, pair, line } name X′, T and the perpendicular.
  const mirror = (X, A, B, names) => {
    const circles = [circleCenterThrough(A, X), circleCenterThrough(B, X)];
    const { pair, points } = intersect(circles[0], circles[1], names.pair);
    const image = fartherFrom(points, X, names.image);
    const line = lineThroughPair(pair, names.line);
    return { circles, pair, image, line };
  };

  // ---------------------------------------------------------------------------
  // Rotors
  // ---------------------------------------------------------------------------

  // The rotor about O taking V0 to V1, as the product of two reflections:
  // in the line L = O V0, then in the bisector of V0 V1 (the vector V0 - V1).
  const rotorBetween = (V0, V1, L, n) => {
    record(n + " = (" + nameOf(V0) + " - " + nameOf(V1) + ")\\, " + nameOf(L) + "^{*},\\qquad "
      + n + " \\leftarrow " + n + " / \\sqrt{" + n + " \\tilde " + n + "}");
    const R0 = (V0 - V1) * !L;
    return named(R0 * (1 / Math.sqrt((R0 * ~R0)[0])), n);
  };

  // Apply rotor R to X: R X R̃.
  const rotate = (R, X, n) => {
    record(tex(n) + " = " + nameOf(R) + "\\, " + nameOf(X) + "\\, \\tilde " + nameOf(R));
    return named(R >>> X, n);
  };

  // ---------------------------------------------------------------------------
  // Carlyle circle
  // ---------------------------------------------------------------------------
  //
  // For a quadratic
  //
  //   x² - s x + p = 0
  //
  // with roots of sum s and product p, the Carlyle circle has diameter
  // A = (0, 1) to B = (s, p) and meets the x-axis at the two roots.
  //
  // Its centre is
  //
  //   M = (s/2, (1+p)/2) = midpoint of S = (s, 0) and Y = (0, 1+p),
  //
  // so a Carlyle step only needs S on the x-axis and Y on the y-axis. Each
  // quadratic in a Gauss-period tower (17, 257, 65537, ...) is one such step;
  // what differs between divisions is how the S and Y points are obtained from
  // earlier roots. The circle itself is the circle centred at M through A.
  //
  // largerName / smallerName name (and record) the chosen roots.
  const carlyleRoots = (M, A, xAxis, largerName, smallerName) => {
    const m = nameOf(M);
    const circle = circleCenterThrough(M, A, "K_{" + m + "}");
    const roots = intersect(xAxis, circle, "T_{" + m + "}");
    return {
      circle,
      pair: roots.pair,
      larger: choose(roots.points, "larger x", largerName),
      smaller: choose(roots.points, "smaller x", smallerName)
    };
  };

  // ---------------------------------------------------------------------------
  // Construction modules
  // ---------------------------------------------------------------------------
  //
  // A division of the circle into n parts is built in three stages:
  //
  //   1. frame(): the shared frame (axes, unit circle, Q, A) from O and V0.
  //   2. a per-n tower of Carlyle steps ending at H = (2cos(2π/n), 0).
  //      Each step solves one quadratic x² - s x + p = 0 of Gauss periods.
  //   3. polygonFromCosine(): from H, the vertices V1 and V(n-1), followed by
  //      rotor stepping and compass chord stepping around the circle.
  //
  // Only stage 2 depends on n. Adding another constructible n (for example
  // 257) means adding another tower to `divisions`.

  // Stage 1: the frame, shared by every division.
  const frame = () => {
    const steps = [];

    // Frame step 0: given O and V0, the x-axis OV0 and the unit circle
    // centred at O through V0. They meet again at Q = (-1, 0).
    beginOps();
    const O = given(0, 0, "O");
    const V0 = given(1, 0, "V0");
    const xAxis = lineThrough(O, V0, "L_x");
    const unit = circleCenterThrough(O, V0, "C_u");
    const Qmeet = intersect(xAxis, unit);
    const Q = otherThan(Qmeet.points, V0, "Q");

    steps.push({
      title: "Given O and V0: the x-axis and unit circle meet again at Q",
      ...endOps(),
      objects: {
        lines: [xAxis],
        circles: [unit],
        pointPairs: [Qmeet.pair],
        points: [
          { p: O, label: "O" },
          { p: V0, label: "V0" },
          { p: Q, label: "Q" }
        ]
      }
    });

    // Frame step 1: the y-axis is the perpendicular bisector of QV0 (O is
    // the midpoint of QV0). It meets the unit circle at A = (0, 1).
    beginOps();
    const bisQV0 = bisect(Q, V0, { line: "L_y" });
    const yAxis = bisQV0.line;
    const Ameet = intersect(yAxis, unit);
    const A = choose(Ameet.points, "larger y", "A");

    steps.push({
      title: "Bisect QV0 for the y-axis; it meets the unit circle at A",
      ...endOps(),
      objects: {
        lines: [yAxis],
        circles: bisQV0.circles,
        pointPairs: [bisQV0.pair, Ameet.pair],
        points: [{ p: A, label: "A" }]
      }
    });

    return { O, V0, Q, A, xAxis, yAxis, unit, steps };
  };

  // Stage 3: from H = (2cos(2π/n), 0) to the full n-gon.
  //
  // The tower gives H (and optionally hNote, a LaTeX line recorded first, for
  // when H is a point the frame already has). The circle centred at H with
  // radius |OV0| then meets the unit circle in V1 and V(n-1), the points with
  // x = cos(2π/n).
  //
  // When H = O (n = 4) that circle is the unit circle itself and the meet is
  // degenerate, so the tower instead supplies firstVertices(F, last), which
  // returns { V1, Vlast, title, objects } directly.
  //
  // A tower can also supply edge(F, vertexName): an edge it already has,
  // { edgeFrom, edgeTo, edgeIndex, title, objects }, with edgeFrom =
  // V(edgeIndex). The polygon is then stepped from that edge (the 15-gon).
  const polygonFromCosine = (F, tower, n) => {
    const { O, V0, unit, xAxis } = F;
    const last = "V" + (n - 1);
    const vertexName = k => "V" + (((k % n) + n) % n);
    beginOps();

    // The edge the polygon is stepped from: edgeFrom = V(edgeIndex) and
    // edgeTo = V(edgeIndex + 1). Usually V0 V1; the 15-gon uses U1 P2 = V5 V6.
    let edgeFrom, edgeTo, edgeIndex, title, objects, marked;
    if (tower.edge) {
      ({ edgeFrom, edgeTo, edgeIndex, title, objects } = tower.edge(F, vertexName));
      marked = { first: edgeFrom, second: edgeTo,
                 firstLabel: vertexName(edgeIndex), secondLabel: vertexName(edgeIndex + 1) };
    } else {
      let V1, Vlast;
      if (tower.firstVertices) {
        ({ V1, Vlast, title, objects } = tower.firstVertices(F, last));
      } else {
        const H = tower.H;
        if (tower.hNote) record(tower.hNote);
        const circleAtH = circleCenterRadius(H, O, V0);
        const finalMeet = intersect(unit, circleAtH);
        V1 = choose(finalMeet.points, "larger y", "V1");
        Vlast = choose(finalMeet.points, "smaller y", last);
        title = "Unit circle at " + nameOf(H).replace(/[_{}]/g, "") + " locates V1 and " + last;
        objects = {
          lines: [],
          circles: [circleAtH],
          pointPairs: [finalMeet.pair],
          points: [
            { p: V1, label: "V1" },
            { p: Vlast, label: last }
          ]
        };
      }
      edgeFrom = V0;
      edgeTo = V1;
      edgeIndex = 0;
      marked = { first: V1, second: Vlast, firstLabel: "V1", secondLabel: last };
    }

    // Rotor stepping.
    //
    // The rotor R taking edgeFrom to edgeTo about O is a product of two
    // reflections:
    //
    //   a = line O edgeFrom (as a vector)
    //   b = edgeFrom - edgeTo  (perpendicular bisector of the edge, which
    //                           passes through O as both ends lie on the unit
    //                           circle)
    //
    //   R = b a / |b a|,   V(k+1) = R V(k) R̃
    //
    // R is the rotation by 2π/n whichever edge defines it, so the rotor-stepped
    // vertices always start from V0. The first rotation is recorded; the rest
    // repeat it.
    const edgeLine = edgeIndex === 0 ? xAxis : lineThrough(O, edgeFrom);
    const R = rotorBetween(edgeFrom, edgeTo, edgeLine, "R");

    const rotorPoints = [V0];
    rotorPoints.push(rotate(R, V0, "\\hat V_{1}"));
    quietly(() => {
      for (let k = 2; k < n; k++) rotorPoints.push(rotate(R, rotorPoints[k - 1], "\\hat V_{" + k + "}"));
    });
    if (n > 3) record("\\dots\\quad \\hat V_{k+1} = R\\, \\hat V_{k}\\, \\tilde R \\qquad \\text{for } k = 1, \\dots, " + (n - 2));

    const rotorVertices = rotorPoints.map((p, k) => ({ p, label: "V̂" + k }));
    const rotorEdges = rotorPoints.map((p, k) => [p, rotorPoints[(k + 1) % n]]);

    // Compass chord stepping.
    //
    // Lay off the edge's length around the unit circle, starting from the
    // edge itself. The circle centred at the current vertex with that radius
    // meets the unit circle in the previous vertex and the next one; the next
    // one is the point farther from the previous vertex. The first pass is
    // recorded; the rest repeat it.
    const stepped = [edgeFrom, edgeTo];
    // (For a given edge this circle is the compass opening already recorded.)
    const firstChord = () => circleCenterRadius(edgeFrom, edgeFrom, edgeTo);
    const chordCircles = [tower.edge ? quietly(firstChord) : firstChord()];

    const compassStep = k => {
      const current = stepped[k];
      const chordCircle = circleCenterRadius(current, edgeFrom, edgeTo);
      const candidates = intersect(unit, chordCircle).points;
      stepped.push(fartherFrom(candidates, stepped[k - 1], vertexName(edgeIndex + k + 1)));
      chordCircles.push(chordCircle);
    };

    compassStep(1);
    quietly(() => {
      for (let k = 2; k < n - 1; k++) compassStep(k);
    });
    const third = tex(vertexName(edgeIndex + 3)), lastStepped = tex(vertexName(edgeIndex + n - 1));
    const wraps = edgeIndex + 3 < n && edgeIndex > 0;
    if (n > 4) record("\\dots\\quad \\text{repeated for } " + third + " \\text{ to } " + lastStepped
      + (wraps ? " \\text{ (through } V_{0}\\text{)}" : ""));
    if (n === 4) record("\\dots\\quad \\text{repeated for } " + third);

    // Index the stepped vertices by their place in the polygon (V0 first).
    const compassVertices = [];
    stepped.forEach((p, j) => { compassVertices[(edgeIndex + j) % n] = p; });

    const compassPoints = compassVertices.map((p, i) => ({ p, label: "C" + i }));
    const compassEdges = compassVertices.map((p, k) => [p, compassVertices[(k + 1) % n]]);

    const step = {
      title: title + "; rotor and compass stepping",
      ...endOps(),
      objects
    };

    return {
      step,
      constructed: { V1: marked.first, Vlast: marked.second, firstLabel: marked.firstLabel, lastLabel: marked.secondLabel },
      rotor: { vertices: rotorVertices, edges: rotorEdges },
      compass: { vertices: compassPoints, edges: compassEdges, circles: chordCircles }
    };
  };

  const regularPolygonConstruction = (divisions, n) => {
    const F = frame();
    const tower = divisions[n].tower(F);
    const finish = polygonFromCosine(F, tower, n);

    return {
      n,
      steps: [...F.steps, ...tower.steps, finish.step],
      base: F,
      constructed: finish.constructed,
      rotor: finish.rotor,
      compass: finish.compass
    };
  };

  return { ni, no, point, normalize, trace, tex, nameOf, named, record, beginOps, endOps, quietly, given, lineEnds, lineThrough, circleCenterRadius, circleCenterThrough, centerOf, flatPointToPoint, splitPointPair, meet, intersect, linePairs, lineThroughPair, pointOfLines, bisect, xOf, yOf, choose, fartherFrom, otherThan, mirror, rotorBetween, rotate, carlyleRoots, frame, polygonFromCosine, regularPolygonConstruction };
};
