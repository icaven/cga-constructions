// Plain-number helpers for the circle-division pages: polynomial fitting,
// real roots, and tracing the zero set of f(x, y). Not run through Algebra(),
// so ganja does not translate the arithmetic here.

window.CircleDivision = window.CircleDivision || {};

CircleDivision.numeric = (() => {
  // Coefficients [c0, c1, ..., cd] of the degree-d polynomial through the
  // samples (t_i, f(t_i)), t = -d/2 .. d/2, by solving the Vandermonde system.
  const polyFit = (f, d) => {
    const ts = [...Array(d + 1)].map((_, i) => i - d/2);
    const A = ts.map(t => [...Array(d + 1)].map((_, j) => t ** j).concat([f(t)]));
    for (let c = 0; c <= d; c++) {
      let p = c;
      for (let r = c + 1; r <= d; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r <= d; r++) {
        if (r === c) continue;
        const k = A[r][c] / A[c][c];
        for (let j = c; j <= d + 1; j++) A[r][j] -= k * A[c][j];
      }
    }
    return A.map((row, i) => row[d + 1] / row[i]);
  };

  // All roots of the polynomial with coefficients c (c0 first), by the
  // Durand–Kerner iteration; returns the real ones, sorted.
  const realRoots = c => {
    const d = c.length - 1, lead = c[d], a = c.map(x => x / lead);
    const mul = (p, q) => [p[0]*q[0] - p[1]*q[1], p[0]*q[1] + p[1]*q[0]];
    const div = (p, q) => { const m = q[0]*q[0] + q[1]*q[1]; return [(p[0]*q[0] + p[1]*q[1])/m, (p[1]*q[0] - p[0]*q[1])/m]; };
    const evalAt = z => a.slice().reverse().reduce((acc, k) => { const m = mul(acc, z); return [m[0] + k, m[1]]; }, [0, 0]);
    let z = [...Array(d)].map((_, k) => { const r = 1 + Math.max(...a.slice(0, d).map(Math.abs)); return [r*Math.cos(0.4 + 2*Math.PI*k/d), r*Math.sin(0.4 + 2*Math.PI*k/d)]; });
    for (let it = 0; it < 500; it++) {
      z = z.map((zi, i) => {
        let den = [1, 0];
        z.forEach((zj, j) => { if (j !== i) den = mul(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
        const step = div(evalAt(zi), den);
        return [zi[0] - step[0], zi[1] - step[1]];
      });
    }
    return z.filter(r => Math.abs(r[1]) < 1e-7).map(r => r[0]).sort((p, q) => p - q);
  };

  // Marching squares: the zero set of f over [-R, R]², as segments [[x0, y0], [x1, y1]].
  const contour = (f, R, N) => {
    const h = 2*R/N, segments = [];
    let row = [...Array(N + 1)].map((_, i) => f(-R + i*h, -R));
    for (let j = 0; j < N; j++) {
      const y0 = -R + j*h, y1 = y0 + h;
      const next = [...Array(N + 1)].map((_, i) => f(-R + i*h, y1));
      for (let i = 0; i < N; i++) {
        const x0 = -R + i*h, x1 = x0 + h;
        const v = [row[i], row[i + 1], next[i + 1], next[i]];
        const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cut = [];
        for (let k = 0; k < 4; k++) {
          const a = v[k], b = v[(k + 1) % 4];
          if ((a < 0) !== (b < 0)) {
            const t = a / (a - b), p = c[k], q = c[(k + 1) % 4];
            cut.push([p[0] + t*(q[0] - p[0]), p[1] + t*(q[1] - p[1])]);
          }
        }
        for (let k = 0; k + 1 < cut.length; k += 2) segments.push([cut[k], cut[k + 1]]);
      }
      row = next;
    }
    return segments;
  };

  // LaTeX for a polynomial in t with (near-)integer coefficients, c0 first.
  const polyTex = (c, v = "t") => {
    const terms = [];
    for (let j = c.length - 1; j >= 0; j--) {
      const k = Math.abs(c[j] - Math.round(c[j])) < 1e-6 ? Math.round(c[j]) : +c[j].toFixed(4);
      if (k === 0) continue;
      const mono = j === 0 ? "" : j === 1 ? v : v + "^{" + j + "}";
      const mag = Math.abs(k) === 1 && j > 0 ? "" : String(Math.abs(k));
      terms.push((k < 0 ? "-" : terms.length ? "+" : "") + " " + mag + mono);
    }
    return terms.length ? terms.join(" ").replace(/^\+ /, "").trim() : "0";
  };

  return { polyFit, realRoots, contour, polyTex };
})();

// The quadratic A x² + B xy + C y² + D x + E y + F that f is, from six samples.
CircleDivision.numeric.quadraticFit = f => {
  const F = f(0, 0), fx = f(1, 0), gx = f(-1, 0), fy = f(0, 1), gy = f(0, -1);
  const D = (fx - gx)/2, A = (fx + gx)/2 - F, E = (fy - gy)/2, C = (fy + gy)/2 - F;
  const B = f(1, 1) - A - C - D - E - F;
  const m = Math.max(...[A, B, C, D, E, F].map(Math.abs)) || 1;
  const q = [A, B, C, D, E, F].map(v => v/m);
  return (x, y) => q[0]*x*x + q[1]*x*y + q[2]*y*y + q[3]*x + q[4]*y + q[5];
};

// Divide the polynomial c (c0 first) by (t - r).
CircleDivision.numeric.deflate = (c, r) => {
  const out = [];
  let acc = 0;
  for (let j = c.length - 1; j >= 1; j--) { acc = acc*r + c[j]; out.unshift(acc); }
  return out;
};

// Text helpers for graph labels (kept here, outside ganja's translator).
// A subscript inside a subscript (C_{P_{a}}, B_{P_aW}) becomes Unicode
// subscript characters, since SVG text has one level of lowering.
CircleDivision.text = (() => {
  const digits = "₀₁₂₃₄₅₆₇₈₉";
  const letters = { a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ",
                    p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ", "+": "₊", "-": "₋" };
  const toSubscript = text => text.split("").map(c => /\d/.test(c) ? digits[Number(c)] : (letters[c] || c)).join("");
  // Superscripts (G^{+}, G^{-}) become Unicode superscript characters too.
  const supers = { "+": "⁺", "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  const toSuperscript = text => text.split("").map(c => supers[c] || c).join("");
  const flattenNested = text => text
    .replace(/\^\{([^{}]*)\}|\^([+\-\d])/g, (m, a, b) => toSuperscript(a === undefined ? b : a))
    .replace(/_\{((?:[^{}]|\{[^{}]*\})*)\}/g, (m, inner) =>
      "_{" + inner.replace(/_\{([^{}]*)\}|_(.)/g, (mm, a, b) => toSubscript(a === undefined ? b : a)) + "}");
  // The number of characters an SVG label shows (tags and entities removed).
  const visibleLength = svg => svg.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").length;
  return { toSubscript, toSuperscript, flattenNested, visibleLength };
})();
