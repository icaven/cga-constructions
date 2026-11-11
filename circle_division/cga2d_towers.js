// Carlyle-circle towers for the regular 3-, 4-, 5-, 6-, 15- and 17-gon, in
// CGA2d. (Divisions that need a cubic, such as the 9-gon, are in
// cubic_towers.js, with a parabola in GAC.)
//
//   const divisions = CGA2.inline(CircleDivision.cga2dTowers)()(K);
//
// K is the object returned by CircleDivision.cga2d (cga2d_constructions.js).
// The result maps n to { tower }, for K.regularPolygonConstruction.
window.CircleDivision = window.CircleDivision || {};

CircleDivision.cga2dTowers = () => K => {
  const { ni, no, point, normalize, trace, tex, nameOf, named, record, beginOps, endOps, quietly,
          given, lineEnds, lineThrough, circleCenterRadius, circleCenterThrough, centerOf,
          flatPointToPoint, splitPointPair, meet, intersect, linePairs, lineThroughPair,
          pointOfLines, bisect, xOf, yOf, choose, fartherFrom, otherThan, mirror, rotorBetween, rotate, carlyleRoots,
          frame, polygonFromCosine, regularPolygonConstruction } = K;

  // Stage 2 for n = 5.
  //
  // The single period equation is
  //
  //   η0 + η1 = -1,  η0 η1 = -1,   i.e.  x² + x - 1 = 0,
  //
  // with η0 = 2cos(2π/5) and η1 = 2cos(4π/5). Here s = -1 and p = -1, so
  // S = (-1, 0) = Q and Y = (0, 1+p) = O: the Carlyle centre is the midpoint
  // Q′ of QO.
  const regular5Tower = F => {
    const { O, Q, A, xAxis } = F;
    const steps = [];

    // Step 1: Q′, the midpoint of QO, is the Carlyle centre.
    beginOps();
    const bisQO = bisect(Q, O, { midpoint: "Q′" });
    const Qp = bisQO.midpoint;

    steps.push({
      title: "Construct Q′, the Carlyle center for x² + x − 1 = 0",
      ...endOps(),
      objects: {
        lines: bisQO.lines,
        circles: bisQO.circles,
        pointPairs: [bisQO.pair],
        points: [{ p: Qp, label: "Q′" }]
      }
    });

    // Step 2: The Carlyle circle centred at Q′ through A gives the roots.
    // The larger one is H = 2cos(2π/5).
    beginOps();
    const r = carlyleRoots(Qp, A, xAxis, "H", "H′");

    steps.push({
      title: "Carlyle circle gives H = 2cos(2π/5)",
      ...endOps(),
      objects: {
        lines: [],
        circles: [r.circle],
        pointPairs: [r.pair],
        points: [
          { p: r.larger, label: "H" },
          { p: r.smaller, label: "H′" }
        ]
      }
    });

    return { steps, H: r.larger };
  };

  // Stage 2 for n = 17 (the construction in the paper).
  const regular17Tower = F => {
    const { O, V0, Q, A, xAxis, yAxis } = F;
    const steps = [];

    // Step 1: Perpendicular bisector of QO locates Q′.
    beginOps();
    const bisQO = bisect(Q, O, { midpoint: "Q′" });
    const Qp = bisQO.midpoint;

    steps.push({
      title: "Construct midpoint Q′ of QO",
      ...endOps(),
      objects: {
        lines: bisQO.lines,
        circles: bisQO.circles,
        pointPairs: [bisQO.pair],
        points: [{ p: Qp, label: "Q′" }]
      }
    });

    // Step 2: Circle centred at Q′ through V0 meets the bisector of QO in M0.
    //
    // |Q′V0| = 3/2, so M0 = (-1/2, -3/2), the Carlyle centre for
    // x² + x - 4 = 0 (s = -1, p = -4, i.e. midpoint of (-1,0) and (0,-3)).
    beginOps();
    const circleQp = circleCenterThrough(Qp, V0);
    const M0meet = intersect(bisQO.line, circleQp);
    const M0 = choose(M0meet.points, "smaller y", "A0");

    steps.push({
      title: "Circle at Q′ through V0 meets the bisector of QO at A0 (M0), the Carlyle center for x² + x − 4 = 0",
      ...endOps(),
      objects: {
        lines: [bisQO.line],
        circles: [circleQp],
        pointPairs: [M0meet.pair],
        points: [{ p: M0, label: "A0" }]
      }
    });

    // Step 3: Carlyle circle for x² + x - 4 = 0. Its roots are η0,2 and η1,2.
    beginOps();
    const r02 = carlyleRoots(M0, A, xAxis, "A1", "A2");
    const H02 = r02.larger;
    const H12 = r02.smaller;

    steps.push({
      title: "Carlyle circle gives A1 and A2",
      ...endOps(),
      objects: {
        lines: [],
        circles: [r02.circle],
        pointPairs: [r02.pair],
        points: [
          { p: H02, label: "A1" },
          { p: H12, label: "A2" }
        ]
      }
    });

    // Step 4: Midpoints of OH0,2 and OH1,2.
    //
    // For p = -1, Y = (0, 1+p) = O, so the Carlyle centre is the midpoint of
    // O and S. These are M0,2 and M1,2 in the paper.
    beginOps();
    const bisOH02 = bisect(O, H02, { midpoint: "A3" });
    const bisOH12 = bisect(O, H12, { midpoint: "A4" });
    const M02 = bisOH02.midpoint;
    const M12 = bisOH12.midpoint;

    steps.push({
      title: "Construct centers A3 and A4 for the next Carlyle circles",
      ...endOps(),
      objects: {
        lines: [...bisOH02.lines, ...bisOH12.lines],
        circles: [...bisOH02.circles, ...bisOH12.circles],
        pointPairs: [bisOH02.pair, bisOH12.pair],
        points: [
          { p: M02, label: "A3" },
          { p: M12, label: "A4" }
        ]
      }
    });

    // Step 5: From equations (10) and (11):
    //
    // η0,4 + η2,4 = η0,2,  η0,4 η2,4 = -1
    // η1,4 + η3,4 = η1,2,  η1,4 η3,4 = -1
    //
    // The construction needs H0,4 and H1,4, the larger roots respectively.
    beginOps();
    const r04 = carlyleRoots(M02, A, xAxis, "A5");
    const r14 = carlyleRoots(M12, A, xAxis, "A6");
    const H04 = r04.larger;
    const H14 = r14.larger;

    steps.push({
      title: "Two Carlyle circles give A5 and A6",
      ...endOps(),
      objects: {
        lines: [],
        circles: [r04.circle, r14.circle],
        pointPairs: [r04.pair, r14.pair],
        points: [
          { p: H04, label: "A5" },
          { p: H14, label: "A6" }
        ]
      }
    });

    // Step 6: Y = (0, 1 + η1,4).
    //
    // Q = (-1,0) and H1,4 = (η1,4, 0), so |QH1,4| = 1 + η1,4. The compass
    // is opened to |QH1,4| (the circle at Q through H1,4), then placed at O;
    // that circle meets the y-axis at Y.
    beginOps();
    const openingQ = circleCenterThrough(Q, H14);
    const circleOY = circleCenterRadius(O, Q, H14);
    const Ymeet = intersect(yAxis, circleOY);
    const Y = choose(Ymeet.points, "larger y", "A7");

    steps.push({
      title: "Compass opened to |Q A6| at Q, placed at O, meets the y-axis at A7 = (0, 1 + η1,4)",
      ...endOps(),
      objects: {
        lines: [],
        circles: [openingQ, circleOY],
        pointPairs: [Ymeet.pair],
        points: [{ p: Y, label: "A7" }]
      }
    });

    // Step 7: Line YH0,4.
    beginOps();
    const lineYH04 = lineThrough(Y, H04);

    steps.push({
      title: "Draw line A7 A5",
      ...endOps(),
      objects: {
        lines: [lineYH04],
        circles: [],
        points: []
      }
    });

    // Step 8: M0,4 = midpoint of Y and H0,4, where the bisector of YH0,4
    // crosses line YH0,4. This is the Carlyle centre for s = η0,4, p = η1,4.
    beginOps();
    const bisYH04 = bisect(Y, H04, { midpoint: "A8" });
    const M04 = bisYH04.midpoint;

    steps.push({
      title: "Construct center A8 for the final Carlyle circle",
      ...endOps(),
      objects: {
        lines: bisYH04.lines,
        circles: bisYH04.circles,
        pointPairs: [bisYH04.pair],
        points: [{ p: M04, label: "A8" }]
      }
    });

    // Step 9: From equation (9):
    //
    // η0,8 + η4,8 = η0,4
    // η0,8 η4,8 = η1,4
    //
    // The larger root is η0,8 = 2 cos(2π/17).
    beginOps();
    const r08 = carlyleRoots(M04, A, xAxis, "A9");

    steps.push({
      title: "Final Carlyle circle gives A9 = 2cos(2π/17)",
      ...endOps(),
      objects: {
        lines: [],
        circles: [r08.circle],
        pointPairs: [r08.pair],
        points: [{ p: r08.larger, label: "A9" }]
      }
    });

    return { steps, H: r08.larger };
  };

  // Stage 2 for n = 3: 2cos(2π/3) = -1, so H is Q, already in the frame.
  const regular3Tower = F => ({
    steps: [],
    H: F.Q,
    hNote: "Q = \\big(2\\cos\\tfrac{2\\pi}{3},\\, 0\\big) = (-1,\\, 0)"
  });

  // Stage 2 for n = 6: 2cos(2π/6) = 1, so H is V0 itself.
  const regular6Tower = F => ({
    steps: [],
    H: F.V0,
    hNote: "V_{0} = \\big(2\\cos\\tfrac{2\\pi}{6},\\, 0\\big) = (1,\\, 0)"
  });

  // Stage 2 for n = 4: 2cos(2π/4) = 0, so H = O, where the usual final step
  // is degenerate. But the frame already has V1: A, where the y-axis meets
  // the unit circle. The y-axis meets it again at V3.
  const regular4Tower = F => ({
    steps: [],
    firstVertices: (F, last) => {
      const { A, yAxis, unit } = F;
      record("V_{1} = A = \\big(\\cos\\tfrac{2\\pi}{4},\\, \\sin\\tfrac{2\\pi}{4}\\big)");
      const meet = intersect(yAxis, unit);
      const Vlast = otherThan(meet.points, A, last);
      return {
        V1: A,
        Vlast,
        title: "A is V1; the y-axis meets the unit circle again at " + last,
        objects: {
          lines: [yAxis],
          circles: [],
          pointPairs: [meet.pair],
          points: [{ p: Vlast, label: last }]
        }
      };
    }
  });

  // Stage 2 for n = 15 (Euclid, Elements IV.16): combine the 5-gon and 3-gon.
  // (The triangle vertex is U1, since T names point pairs.)
  //
  // 2/5 - 1/3 = 1/15, so the arc from the triangle vertex U1 (at 120°) to the
  // second pentagon vertex P2 (at 144°) is 2π/15: U1 P2 is an edge of the
  // 15-gon (V5 V6), and the polygon is stepped from it.
  const regular15Tower = F => {
    const { O, V0, Q, unit } = F;
    const pentagon = regular5Tower(F);
    const steps = [...pentagon.steps];

    // Pentagon vertices: the circle at H (2cos(2π/5)) gives P1 at 72°; the
    // chord |V0 P1| laid off from P1 gives P2 at 144°.
    beginOps();
    const circleAtH = circleCenterRadius(pentagon.H, O, V0);
    const meetP1 = intersect(unit, circleAtH);
    const P1 = choose(meetP1.points, "larger y", "P1");
    const chordAtP1 = circleCenterRadius(P1, V0, P1);
    const meetP2 = intersect(unit, chordAtP1);
    const P2 = fartherFrom(meetP2.points, V0, "P2");

    steps.push({
      title: "Pentagon vertices: unit circle at H gives P1; chord |V0 P1| from P1 gives P2",
      ...endOps(),
      objects: {
        lines: [],
        circles: [circleAtH, chordAtP1],
        pointPairs: [meetP1.pair, meetP2.pair],
        points: [
          { p: P1, label: "P1" },
          { p: P2, label: "P2" }
        ]
      }
    });

    // Triangle vertex: as for n = 3, the circle at Q (2cos(2π/3) = -1) gives
    // U1 at 120°.
    beginOps();
    const circleAtQ = circleCenterRadius(Q, O, V0);
    const meetT1 = intersect(unit, circleAtQ);
    const U1 = choose(meetT1.points, "larger y", "U1");

    steps.push({
      title: "Triangle vertex: unit circle at Q gives U1",
      ...endOps(),
      objects: {
        lines: [],
        circles: [circleAtQ],
        pointPairs: [meetT1.pair],
        points: [{ p: U1, label: "U1" }]
      }
    });

    return {
      steps,
      edge: (F, vertexName) => {
        // U1 (120° = 5·24°) and P2 (144° = 6·24°) are themselves vertices of
        // the 15-gon: U1 P2 is the edge V5 V6. The compass opened to |U1 P2|
        // (the circle at U1 through P2) is the side; stepping it around the
        // circle reaches every vertex, V0 and V1 included.
        record("\\angle U_{1} O P_{2} = 2 \\cdot \\tfrac{2\\pi}{5} - \\tfrac{2\\pi}{3} = \\tfrac{2\\pi}{15}");
        record("U_{1} = " + tex(vertexName(5)) + ",\\quad P_{2} = " + tex(vertexName(6)));
        const opening = circleCenterThrough(U1, P2);
        return {
          edgeFrom: U1,
          edgeTo: P2,
          edgeIndex: 5,
          title: "U1 P2 is the edge V5 V6 (arc 2π/15); the compass opened to |U1 P2| is the side",
          objects: {
            lines: [],
            circles: [opening],
            pointPairs: [],
            points: []
          }
        };
      }
    };
  };

  // The constructible divisions this page knows about.
  const divisions = {
    3: { tower: regular3Tower },
    4: { tower: regular4Tower },
    5: { tower: regular5Tower },
    6: { tower: regular6Tower },
    15: { tower: regular15Tower },
    17: { tower: regular17Tower }
  };

  return divisions;
};
