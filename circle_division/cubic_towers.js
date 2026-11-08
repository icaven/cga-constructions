// Towers for divisions that need cubics: the regular 7-, 9-, 13- and 19-gon,
// and by mirroring the 14-, 18-, 26- and 38-gon. Compass and straightedge
// work in CGA2d; the conic steps work in GAC.
//
//   const divisions = CGA2.inline(CircleDivision.cubicTowers)()(K, G);
//
// K is CircleDivision.cga2d run in CGA2d; G is CircleDivision.gac run in
// GAC (ℝ(5,3)). See gac2d.js for how CGA2d sits inside GAC.
//
// Descartes' method for any cubic t³ + a t² + b t + c = 0. On the parabola
// y = x², a circle x² + y² + D x + E y + F = 0 cuts out
// x⁴ + (1 + E) x² + D x + F = 0. Choosing its known fourth root to be t = a
// removes the t³ term:
//
//   (t - a)(t³ + a t² + b t + c) = t⁴ + (b - a²) t² + (c - ab) t - ac,
//
// so the circle has centre M = ((ab - c)/2, (a² - b + 1)/2) and passes
// through P_a = (a, a²), the point of the parabola above a. Its meet with the
// parabola is P_a and the cubic's three roots.
//
//   7:  t³ + t² - 2t - 1 = 0        a = 1:   M = (-1/2, 2),  P_a = S = (1, 1)
//   9:  t³ - 3t + 1 = 0             a = 0:   M = (-1/2, 2),  P_a = O
//   13: η² + η - 3 = 0 (Carlyle), then
//       t³ - η t² - t + (η - 1) = 0             a = -η:  M = (1/2, (η² + 2)/2)
//   19: t³ + t² - 6t - 7 = 0 for η (a = 1: M = (1/2, 4), P_a = S), then
//       t³ - η t² + (η² - 5) t + (η² - 6) = 0   a = -η:  M = ((-η - 1)/2, 3)
//
// The roots are 2cos(2πk/n). 2n-gons use the smallest root of the conjugate
// tower: 2cos(π/n) = -2cos((n - 1)π/n), so mirroring it in the y-axis gives H.

window.CircleDivision = window.CircleDivision || {};

CircleDivision.cubicTowers = () => (K, G) => {
  const { point, normalize, record, named, nameOf, beginOps, endOps, given, bisect,
          circleCenterRadius, circleCenterThrough, intersect, choose, fartherFrom, lineThrough,
          pointOfLines, mirror, carlyleRoots, xOf, yOf } = K;
  const N = CircleDivision.numeric;
  const curveColor = CircleDivision.colors.curve;

  // CGA2d coefficients [e1, e2, e3, e4] of a vector, and back.
  const coeffs = s => [s[1], s[2], s[3], s[4]];
  const vector = c => c[0]*1e1 + c[1]*1e2 + c[2]*1e3 + c[3]*1e4;
  const fromGAC = P => normalize(vector(G.toCGA2(P)));

  // ---------------------------------------------------------------------------
  // Compass helpers
  // ---------------------------------------------------------------------------

  // The perpendicular to line L (the x- or y-axis, axis "x" or "y") at its
  // point P: the circle at P with radius |OV0| meets L in a pair P⁻, P⁺, and
  // the bisector of that pair passes through P.
  const perpendicularAt = (F, P, L, axis, name) => {
    const around = circleCenterRadius(P, F.O, F.V0);
    const ends = intersect(L, around);
    const p = nameOf(P);
    const U = choose(ends.points, "smaller " + axis, p + "^{-}"), W = choose(ends.points, "larger " + axis, p + "^{+}");
    const bis = bisect(U, W, { line: name });
    return { line: bis.line, circles: [around, ...bis.circles], pairs: [ends.pair, bis.pair] };
  };

  // The point -P on the x-axis: the circle at O through P meets it again.
  const opposite = (F, P, name) => {
    const around = circleCenterThrough(F.O, P);
    const meet = intersect(F.xAxis, around);
    return { point: fartherFrom(meet.points, P, name), circle: around, pair: meet.pair };
  };

  // ---------------------------------------------------------------------------
  // The parabola, and points on it
  // ---------------------------------------------------------------------------

  // Descartes' parabola y = x², given by five of its points.
  const parabola = F => {
    // Five given points of y = x²: O (from the frame), S and three more.
    const S = given(1, 1, "S");
    const Pm2 = given(-2, 4, "P_{-2}"), Pm1 = given(-1, 1, "P_{-1}"), P2 = given(2, 4, "P_{2}");
    const pts = [[-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4]];
    const P = named(G.conicThrough(...pts.map(p => G.up(...p))), "\\mathcal{P}");
    record("\\mathcal{P} = \\hat P_{-2} \\wedge \\hat P_{-1} \\wedge \\hat O \\wedge \\hat S \\wedge \\hat P_{2} \\wedge \\bar o_{-} \\wedge \\bar o_{\\times}");
    record("\\hat P(t, t^2) \\wedge \\mathcal{P} = 0 \\ \\text{for all } t\\text{: the parabola } y = x^2");
    // Drawn from the GAC object: the zero set of (P̂(x, y) ∧ 𝒫)/I, traced over
    // |x|, |y| < 6.4, far enough for the 26- and 38-gons' circles.
    const f = N.quadraticFit(G.incidence(P));
    const curve = N.contour(f, 6.4, 640).map(([a, b]) => [point(...a), point(...b)]);
    const extra = [{ p: Pm2, label: "P₋₂" }, { p: Pm1, label: "P₋₁" }, { p: P2, label: "P₂" }];
    return { P, S, curve, extra };
  };
  const parabolaLabel = { name: "𝒫", at: point(-1.55, 2.1), color: curveColor };

  // The point of 𝒫 above the point Gx of the x-axis: the vertical through Gx,
  // carried into GAC, meets 𝒫 once (and again at infinity), so splitting
  // that meet is linear.
  const aboveOnParabola = (F, par, Gx, n) => {
    const vert = perpendicularAt(F, Gx, F.xAxis, "x", "L_{" + nameOf(Gx) + "}");
    const Lhat = named(G.conicFromDual(coeffs(!vert.line)), "\\hat L_{" + nameOf(Gx) + "}");
    record(nameOf(Lhat) + " = \\iota\\big(" + nameOf(vert.line) + "^{*}\\big)\\, I");
    const pairHat = named(G.meet(par.P, Lhat), "\\hat T_{" + nameOf(Gx) + "}");
    record(nameOf(pairHat) + " = \\mathcal{P} \\vee " + nameOf(Lhat) + " \\qquad \\text{one point, and one at infinity}");
    const lin = N.polyFit(t => G.incidence(Lhat)(t, t*t), 2);
    const t = -lin[0] / lin[1];
    const Phat = G.up(t, t*t);
    record("\\hat P(t, t^2) \\wedge " + nameOf(Lhat) + " = 0 \\iff t = " + t.toFixed(6) + " \\qquad \\text{(linear)}");
    const P = named(fromGAC(Phat), n);
    record(nameOf(P) + " = \\pi\\big(\\hat P(t, t^2)\\big)");
    return { P, vert };
  };

  // ---------------------------------------------------------------------------
  // The Descartes step
  // ---------------------------------------------------------------------------

  // The circle at M through P_a (a point of 𝒫), carried into GAC; its meet
  // with 𝒫 is four points: P_a and the roots of the cubic. Returns the root
  // spec.root ("largest", "middle" or "smallest") as the point X of 𝒫.
  //
  // spec: { quad (name of the meet), name (of X), label, knownTex (P_a's
  //         t, as LaTeX), cubicTex, root }
  const descartes = (par, M, Pa, spec) => {
    const circle = circleCenterThrough(M, Pa);
    const C = named(G.conicFromDual(coeffs(!circle)), "\\hat C_{" + nameOf(M) + "}");
    record(nameOf(C) + " = \\iota\\big(" + nameOf(circle) + "^{*}\\big)\\, I \\qquad \\text{the same circle, as a GAC conic}");
    const Q4 = named(G.meet(par.P, C), spec.quad);
    record(spec.quad + " = \\mathcal{P} \\vee " + nameOf(C) + " \\qquad \\text{grade 6: four points}");
    // split₄: the points P̂(t, t²) of 𝒫 that also lie on Ĉ. P_a is one of
    // them; the other three are the roots of the cubic.
    const quartic = N.polyFit(t => G.incidence(C)(t, t*t), 4).map((c, i, a) => c / a[4]);
    const a = xOf(Pa);
    const cubic = N.deflate(quartic, a);
    const factor = spec.knownTex === "0" ? "t"
      : spec.knownTex[0] === "-" ? "(t + " + spec.knownTex.slice(1) + ")" : "(t - " + spec.knownTex + ")";
    record("\\operatorname{split}_4(" + spec.quad + "):\\ \\hat P(t, t^2) \\wedge " + nameOf(C) + " = 0 \\iff " + N.polyTex(quartic) + " = 0");
    record("\\phantom{\\operatorname{split}_4(Q):}\\ " + factor + "\\,(" + spec.cubicTex + ") = 0");
    record("t = " + spec.knownTex + " \\text{ is } " + nameOf(Pa) + "\\text{; the cubic's roots are the other three}");
    const roots = N.realRoots(cubic);
    const t = spec.root === "largest" ? roots[2] : spec.root === "middle" ? roots[1] : roots[0];
    const Xhat = G.up(t, t*t);
    const X = named(fromGAC(Xhat), spec.name);
    record("\\hat " + spec.name + " = \\hat P(t, t^2),\\ t = " + t.toFixed(6) + " \\ \\text{(" + spec.root + " root of the cubic)}");
    // Why numerically: splitting Q₄ is solving a cubic, as splitting a pair is
    // taking a square root. A closed form does not avoid it: with three real
    // roots, Cardano's formula needs complex cube roots, which is trisection.
    record("\\text{found numerically, as } \\operatorname{split}(T) \\text{ uses a } \\sqrt{\\ }\\text{;}");
    record("\\operatorname{split}_4 \\text{ needs a root of a cubic instead}");
    record("\\text{(three real roots: Cardano takes complex cube roots,}");
    record("\\text{e.g. } \\sqrt[3]{e^{2\\pi i/3}} = e^{2\\pi i/9}\\text{, which is trisection)}");
    record(spec.name + " = \\pi(\\hat " + spec.name + ") \\qquad \\text{back to CGA2d}");
    return {
      X, Xhat, Q4,
      objects: {
        lines: [], circles: [circle], pointPairs: [], curves: par.curve,
        points: [{ p: X, label: spec.label }],
        // The meet's four points; it is named just below X.
        quads: [{ name: spec.quad, points: [Pa, ...roots.map(r => r === t ? X : point(r, r*r))],
                  at: point(t + 0.05, t*t - 0.3) }],
        labels: [parabolaLabel]
      }
    };
  };

  // ---------------------------------------------------------------------------
  // From the root X = (t, t²) to H = (2cos(2π/n), 0)
  // ---------------------------------------------------------------------------

  // The circles centred at O and V0 through X meet again at its mirror image
  // X′; the line through the pair meets the x-axis below X. For a 2n-gon that
  // foot, H0, is negative: the circle at O through H0 meets the x-axis again
  // at H = -H0.
  const finish = (F, X, spec) => {
    const { O, xAxis } = F;
    beginOps();
    const mir = mirror(X, O, F.V0, { image: "X′", pair: "T_{X}", line: "L_{XX'}" });
    record("\\text{equivalently } X' = L_x^{*}\\, X\\, L_x^{*} \\qquad \\text{reflection in the x-axis}");
    const foot = pointOfLines(mir.line, xAxis, spec.mirror ? "H0" : "H");
    const points = [{ p: mir.image, label: "X′" }, { p: foot, label: spec.mirror ? "H0" : "H" }];
    const circles = [...mir.circles], pairs = [mir.pair];
    let H = foot;
    if (spec.mirror) {
      const around = circleCenterThrough(O, foot);
      const back = intersect(xAxis, around, "T_{H_0}");
      H = choose(back.points, "larger x", "H");
      record("\\text{equivalently } H = L_y^{*}\\, H_0\\, L_y^{*} \\qquad \\text{reflection in the y-axis}");
      circles.push(around);
      pairs.push(back.pair);
      points.push({ p: H, label: "H" });
    }
    record("H = \\big(" + spec.angle + ",\\, 0\\big)");
    return {
      H,
      step: {
        title: spec.mirror
          ? "H = (" + spec.angleText + ", 0): circles at O and V0 through X give X′ and the foot H0; the circle at O through H0 meets the x-axis again at H"
          : "H = (" + spec.angleText + ", 0): the circles at O and V0 through X meet again at its mirror image X′; the line XX′ meets the x-axis",
        ...endOps(),
        objects: { lines: [mir.line], circles, pointPairs: pairs, points }
      }
    };
  };

  const angleSpec = (n, twice) => twice
    ? { mirror: true, angle: "2\\cos\\tfrac{2\\pi}{" + (2*n) + "} = -2\\cos\\tfrac{" + (n - 1) + "\\pi}{" + n + "}", angleText: "2cos(2π/" + (2*n) + ")" }
    : { angle: "2\\cos\\tfrac{2\\pi}{" + n + "}", angleText: "2cos(2π/" + n + ")" };

  // Step: the given parabola, with notes on why it is needed.
  const givenParabola = (F, notes) => {
    beginOps();
    const par = parabola(F);
    notes.forEach(record);
    return {
      par,
      step: {
        title: "Given: the parabola y = x² through five points, a GAC conic (Descartes' method for cubics)",
        ...endOps(),
        objects: { lines: [], circles: [], pointPairs: [], curves: par.curve, labels: [parabolaLabel],
                   points: [{ p: par.S, label: "S" }, ...par.extra] }
      }
    };
  };

  // ---------------------------------------------------------------------------
  // 7, 9 (and 14, 18): one cubic, centre M = (-1/2, 2)
  // ---------------------------------------------------------------------------

  // M = (-1/2, 2), as in the CGA2d 9-gon: bisect QO for Q′, then lay
  // |QV0| = 2 along the bisector.
  const centreHalf2 = F => {
    const { O, V0, Q } = F;
    const bisQO = bisect(Q, O, { midpoint: "Q′", on: F.xAxis });
    const Qp = bisQO.midpoint;
    const circleQp = circleCenterRadius(Qp, Q, V0);
    const meetM = intersect(bisQO.line, circleQp);
    const M = choose(meetM.points, "larger y", "M");
    return {
      M,
      objects: { lines: bisQO.lines, circles: [...bisQO.circles, circleQp], pointPairs: [bisQO.pair, meetM.pair],
                 points: [{ p: Qp, label: "Q′" }, { p: M, label: "M" }] }
    };
  };

  // spec: { n, through: "O" | "S", knownTex, cubicTex, root, twice }
  const oneCubic = spec => F => {
    const steps = [];
    const n = spec.n;
    const g = givenParabola(F, [
      spec.cubicTex + " = 0 \\ \\text{has root } 2\\cos\\tfrac{2\\pi}{" + n + "}",
      "\\text{it is irreducible, so no chain of square roots reaches it}"]);
    steps.push(g.step);

    beginOps();
    const cen = centreHalf2(F);
    steps.push({ title: "Centre M = (−½, 2): bisect QO for Q′, then lay |QV₀| = 2 along the bisector", ...endOps(), objects: cen.objects });

    beginOps();
    const Pa = spec.through === "S" ? g.par.S : F.O;
    const d = descartes(g.par, cen.M, Pa, { quad: "Q_{4}", name: "X", label: "X", knownTex: spec.knownTex, cubicTex: spec.cubicTex, root: spec.root });
    steps.push({
      title: "The circle at M through " + spec.through + " meets the parabola in four points (a GAC meet); X is the " + spec.root + " root",
      ...endOps(), check: { Xhat: d.Xhat, Q4: d.Q4 }, objects: d.objects
    });

    const h = finish(F, d.X, angleSpec(n, spec.twice));
    steps.push(h.step);
    return { steps, H: h.H };
  };

  // ---------------------------------------------------------------------------
  // 13 (and 26): a quadratic, then a cubic over Q(√13)
  // ---------------------------------------------------------------------------

  // twice: false for 13 (η = (-1 + √13)/2, largest root), true for 26
  // (η = (-1 - √13)/2, smallest root, mirrored).
  const thirteen = twice => F => {
    const { O, V0, Q, A, xAxis } = F;
    const steps = [];
    const etaTex = twice ? "\\tfrac{-1 - \\sqrt{13}}{2}" : "\\tfrac{-1 + \\sqrt{13}}{2}";
    const g = givenParabola(F, [
      "2\\cos\\tfrac{2\\pi}{13} \\text{ has degree 6: a quadratic, then a cubic over } \\mathbb{Q}(\\sqrt{13})"]);
    steps.push(g.step);

    // K = (-1/2, -1), the centre of the Carlyle circle for η² + η - 3 = 0:
    // bisect QO for Q′, then |OV0| down the bisector.
    beginOps();
    const bisQO = bisect(Q, O, { midpoint: "Q′", on: xAxis });
    const Qp = bisQO.midpoint;
    const down = circleCenterRadius(Qp, O, V0);
    const meetK = intersect(bisQO.line, down);
    const Kc = choose(meetK.points, "smaller y", "K");
    record("K = \\big(\\tfrac{s}{2},\\ \\tfrac{1 + p}{2}\\big) = \\big(-\\tfrac12,\\ -1\\big) \\qquad \\text{roots' sum } s = -1,\\ \\text{product } p = -3");
    steps.push({
      title: "Carlyle centre K = (−½, −1): bisect QO for Q′, then lay |OV₀| = 1 down the bisector",
      ...endOps(),
      objects: { lines: bisQO.lines, circles: [...bisQO.circles, down], pointPairs: [bisQO.pair, meetK.pair],
                 points: [{ p: Qp, label: "Q′" }, { p: Kc, label: "K" }] }
    });

    // η: the Carlyle circle at K through A meets the x-axis at the two roots.
    beginOps();
    const carl = carlyleRoots(Kc, A, xAxis, twice ? undefined : "E", twice ? "E" : undefined);
    const E = twice ? carl.smaller : carl.larger;
    record("E = (\\eta, 0),\\quad \\eta = " + etaTex + " \\qquad \\eta^2 + \\eta - 3 = 0");
    steps.push({
      title: "The Carlyle circle at K through A meets the x-axis at the roots of η² + η − 3 = 0; E = (η, 0)",
      ...endOps(),
      objects: { lines: [], circles: [carl.circle], pointPairs: [carl.pair], points: [{ p: E, label: "E" }] }
    });

    // G = (-η, 0): the circle at O through E meets the x-axis again.
    beginOps();
    const Gm = opposite(F, E, "G");
    steps.push({
      title: "G = (−η, 0): the circle at O through E meets the x-axis again",
      ...endOps(),
      objects: { lines: [], circles: [Gm.circle], pointPairs: [Gm.pair], points: [{ p: Gm.point, label: "G" }] }
    });

    // P_a = (-η, η²): the point of 𝒫 above G.
    beginOps();
    const above = aboveOnParabola(F, g.par, Gm.point, "P_{a}");
    const Pa = above.P;
    steps.push({
      title: "Pₐ = (−η, η²): the vertical through G (bisecting G⁻G⁺) meets the parabola at Pₐ (a GAC meet)",
      ...endOps(),
      objects: { lines: [above.vert.line], circles: above.vert.circles, pointPairs: above.vert.pairs,
                 curves: g.par.curve, labels: [parabolaLabel],
                 points: [{ p: Pa, label: "Pₐ" }] }
    });

    // M = (1/2, (η² + 2)/2): on the bisector of P_a and W = (-η, 2), which is
    // horizontal, and on the bisector of OV0. Two steps.
    beginOps();
    const up2 = circleCenterRadius(Gm.point, Q, V0);
    const meetW = intersect(above.vert.line, up2);
    const W = choose(meetW.points, "larger y", "W");
    const level = bisect(Pa, W, { line: "B_{P_aW}" });
    steps.push({
      title: "W = (−η, 2) is |QV₀| above G; bisecting PₐW gives the horizontal y = (η² + 2)/2",
      ...endOps(),
      // (The vertical through G from the step before: W lies on it.)
      objects: { lines: [level.line, above.vert.line], circles: [up2, ...level.circles], pointPairs: [meetW.pair, level.pair],
                 points: [{ p: W, label: "W" }] }
    });

    beginOps();
    const half = bisect(O, V0);
    const M = pointOfLines(half.line, level.line, "M");
    record("M = \\big(\\tfrac12,\\ \\tfrac{\\eta^2 + 2}{2}\\big) = \\big(\\tfrac{ab - c}{2},\\ \\tfrac{a^2 - b + 1}{2}\\big),\\quad a = -\\eta,\\ b = -1,\\ c = \\eta - 1");
    steps.push({
      title: "Centre M = (½, (η² + 2)/2): the bisector of OV₀ meets the horizontal",
      ...endOps(),
      // (The horizontal from the step before is listed again: M lies on it.)
      objects: { lines: [half.line, level.line], circles: half.circles, pointPairs: [half.pair],
                 points: [{ p: M, label: "M" }] }
    });

    beginOps();
    const root = twice ? "smallest" : "largest";
    const d = descartes(g.par, M, Pa, { quad: "Q_{4}", name: "X", label: "X", knownTex: "-\\eta", cubicTex: "t^3 - \\eta t^2 - t + \\eta - 1", root });
    steps.push({
      title: "The circle at M through Pₐ meets the parabola in four points (a GAC meet); X is the " + root + " root",
      ...endOps(), check: { Xhat: d.Xhat, Q4: d.Q4 }, objects: d.objects
    });

    const h = finish(F, d.X, angleSpec(13, twice));
    steps.push(h.step);
    return { steps, H: h.H };
  };

  // ---------------------------------------------------------------------------
  // 19 (and 38): two cubics
  // ---------------------------------------------------------------------------

  // twice: false for 19 (η the middle root of the first cubic, then the
  // largest root), true for 38 (η the smallest root, then the smallest root,
  // mirrored).
  const nineteen = twice => F => {
    const { O, V0, Q, A, xAxis, yAxis } = F;
    const steps = [];
    const g = givenParabola(F, [
      "2\\cos\\tfrac{2\\pi}{19} \\text{ has degree 9: a cubic, then a cubic over } \\mathbb{Q}(\\eta)"]);
    steps.push(g.step);

    // M1 = (1/2, 4): on the bisector of OV0, |P₋₂P₂| = 4 above its midpoint.
    beginOps();
    const half = bisect(O, V0, { midpoint: "O′", on: xAxis });
    const Pm2 = g.par.extra[0].p, P2 = g.par.extra[2].p;
    const up4 = circleCenterRadius(half.midpoint, Pm2, P2);
    const meetM1 = intersect(half.line, up4);
    const M1 = choose(meetM1.points, "larger y", "M1");
    record("M_{1} = (\\tfrac12,\\ 4) = \\big(\\tfrac{ab - c}{2},\\ \\tfrac{a^2 - b + 1}{2}\\big),\\quad a = 1,\\ b = -6,\\ c = -7");
    steps.push({
      title: "Centre M₁ = (½, 4): the bisector of OV₀, and |P₋₂P₂| = 4 above its midpoint O′",
      ...endOps(),
      objects: { lines: half.lines, circles: [...half.circles, up4], pointPairs: [half.pair, meetM1.pair],
                 points: [{ p: half.midpoint, label: "O′" }, { p: M1, label: "M₁" }] }
    });

    // First cubic: the periods of length 6.
    beginOps();
    const root1 = twice ? "smallest" : "middle";
    const d1 = descartes(g.par, M1, g.par.S, { quad: "Q_{4}", name: "X_{1}", label: "X₁", knownTex: "1", cubicTex: "t^3 + t^2 - 6t - 7", root: root1 });
    record("\\eta = \\text{the } t \\text{ of } X_{1} \\qquad \\text{(a period of length 6)}");
    steps.push({
      title: "The circle at M₁ through S meets the parabola in four points; X₁ = (η, η²) is the " + root1 + " root",
      ...endOps(), objects: d1.objects
    });

    // P_a = (-η, η²): X1 mirrored in the y-axis.
    beginOps();
    const mirY = mirror(d1.X, O, A, { image: "P_{a}", pair: "T_{X_1}", line: "L_{X_1P_a}" });
    record("\\text{equivalently } P_{a} = L_y^{*}\\, X_{1}\\, L_y^{*}");
    steps.push({
      title: "Pₐ = (−η, η²): the circles at O and A through X₁ meet again at its mirror image in the y-axis",
      ...endOps(),
      objects: { lines: [mirY.line], circles: mirY.circles, pointPairs: [mirY.pair], points: [{ p: mirY.image, label: "Pₐ" }] }
    });

    // M2 = ((-η - 1)/2, 3): on the bisector of Q and G = (-η, 0), and on the
    // bisector of A = (0, 1) and Y5 = (0, 5), the horizontal y = 3. Built in
    // three steps, so that each shows only a few circles.
    beginOps();
    const mirX = mirror(d1.X, O, V0, { image: "X_{1}′", pair: "T_{X_1}′", line: "L_{X_1}" });
    const H1 = pointOfLines(mirX.line, xAxis, "H1");
    steps.push({
      title: "H₁ = (η, 0): the circles at O and V₀ through X₁ meet again at X₁′; the line X₁X₁′ meets the x-axis",
      ...endOps(),
      objects: { lines: [mirX.line], circles: mirX.circles, pointPairs: [mirX.pair],
                 points: [{ p: mirX.image, label: "X₁′" }, { p: H1, label: "H₁" }] }
    });

    beginOps();
    const Gm = opposite(F, H1, "G");
    const vertical = bisect(Q, Gm.point, { line: "B_{QG}" });
    steps.push({
      title: "G = (−η, 0): the circle at O through H₁ meets the x-axis again; bisecting QG gives the vertical x = (−η − 1)/2",
      ...endOps(),
      objects: { lines: [vertical.line], circles: [Gm.circle, ...vertical.circles], pointPairs: [Gm.pair, vertical.pair],
                 points: [{ p: Gm.point, label: "G" }] }
    });

    beginOps();
    const up5 = circleCenterRadius(A, Pm2, P2);
    const meet5 = intersect(yAxis, up5);
    const Y5 = choose(meet5.points, "larger y", "Y5");
    const level = bisect(A, Y5, { line: "L_{3}" });
    const M2 = pointOfLines(vertical.line, level.line, "M2");
    record("M_{2} = \\big(\\tfrac{-\\eta - 1}{2},\\ 3\\big) = \\big(\\tfrac{ab - c}{2},\\ \\tfrac{a^2 - b + 1}{2}\\big),\\quad a = -\\eta,\\ b = \\eta^2 - 5,\\ c = \\eta^2 - 6");
    steps.push({
      title: "Centre M₂ = ((−η − 1)/2, 3): Y₅ = (0, 5) is |P₋₂P₂| above A; bisecting AY₅ gives y = 3, which meets the vertical at M₂",
      ...endOps(),
      // (B_QG from the step before is listed again: M₂ lies on it.)
      objects: { lines: [level.line, vertical.line], circles: [up5, ...level.circles], pointPairs: [meet5.pair, level.pair],
                 points: [{ p: Y5, label: "Y₅" }, { p: M2, label: "M₂" }] }
    });

    beginOps();
    const root2 = twice ? "smallest" : "largest";
    const d2 = descartes(g.par, M2, mirY.image, { quad: "Q_{4}'", name: "X", label: "X", knownTex: "-\\eta", cubicTex: "t^3 - \\eta t^2 + (\\eta^2 - 5) t + \\eta^2 - 6", root: root2 });
    steps.push({
      title: "The circle at M₂ through Pₐ meets the parabola in four points; X is the " + root2 + " root",
      ...endOps(), check: { Xhat: d2.Xhat, Q4: d2.Q4 }, objects: d2.objects
    });

    const h = finish(F, d2.X, angleSpec(19, twice));
    steps.push(h.step);
    return { steps, H: h.H };
  };

  const seven = { n: 7, through: "S", knownTex: "1", cubicTex: "t^3 + t^2 - 2t - 1" };
  const nine = { n: 9, through: "O", knownTex: "0", cubicTex: "t^3 - 3t + 1" };

  return {
    7: { tower: oneCubic({ ...seven, root: "largest" }) },
    9: { tower: oneCubic({ ...nine, root: "largest" }) },
    13: { tower: thirteen(false) },
    19: { tower: nineteen(false) },
    14: { tower: oneCubic({ ...seven, root: "smallest", twice: true }) },
    18: { tower: oneCubic({ ...nine, root: "smallest", twice: true }) },
    26: { tower: thirteen(true) },
    38: { tower: nineteen(true) }
  };
};
