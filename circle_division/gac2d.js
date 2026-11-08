// GAC, the geometric algebra for conics, ℝ(5,3) (Hrdina, Návrat, Vašík 2018).
//
//   const GAC = Algebra(5,3);
//   const G = GAC.inline(CircleDivision.gac)();
//
// Basis as in ganja's example_csga2d_opns.html: e1, e2 Euclidean;
// p1..p3 = e3..e5 square to +1, m1..m3 = e6..e8 to -1. Three null pairs:
//
//   n∞ = m1 - p1,  n₋ = m2 - p2,  n× = m3 - p3
//   o  = ½(m1 + p1), ō₋ = ½(m2 + p2), ō× = ½(m3 + p3)
//
// A point carries the quadratic monomials of its coordinates:
//
//   P̂(x, y) = o + x e1 + y e2 + ½(x²+y²) n∞ + ½(x²−y²) n₋ + xy n×
//
// A conic through five points is P̂1 ∧ … ∧ P̂5 ∧ ō₋ ∧ ō× (grade 7), and the
// meet of two conics is their four common points (a "point quadruple").
//
// CGA2d sits inside GAC: ι maps its vectors (e1, e2, e3, e4) to
// (e1, e2, −p1, m1), which takes its n∞ and n_o to GAC's n∞ and o. A CGA2d
// circle or line with dual vector s becomes the GAC conic ι(s) I (I the
// pseudoscalar), and π, the inverse of ι on that subspace, takes a GAC point
// back to CGA2d (dropping its n₋ and n× parts).
//
// GAC elements cross to CGA2d as plain coefficient arrays [e1, e2, e3, e4],
// since the two algebras have separate element types.

window.CircleDivision = window.CircleDivision || {};

CircleDivision.gac = () => {
  const [p1, p2, p3] = [1e3, 1e4, 1e5];
  const [m1, m2, m3] = [1e6, 1e7, 1e8];
  const ni = m1 - p1, nm = m2 - p2, nt = m3 - p3;
  const o = 0.5*(m1 + p1), om = 0.5*(m2 + p2), ot = 0.5*(m3 + p3);
  const I = 1e12345678;

  const up = (x, y) => o + x*1e1 + y*1e2 + 0.5*(x*x + y*y)*ni + 0.5*(x*x - y*y)*nm + x*y*nt;

  // Scale a point so that -P̂·n∞ = 1.
  const normalize = P => P * (1 / -(P | ni).s);
  const coords = P => {
    const w = -(P | ni).s;
    return [(P | 1e1).s / w, (P | 1e2).s / w];
  };

  // The conic through five points.
  const conicThrough = (A, B, C, D, E) => A ^ B ^ C ^ D ^ E ^ om ^ ot;

  // ι: a CGA2d vector's coefficients [e1, e2, e3, e4] to a GAC vector.
  const fromCGA2 = c => c[0]*1e1 + c[1]*1e2 - c[2]*p1 + c[3]*m1;

  // π: a GAC vector to CGA2d coefficients (its n₋, n× parts dropped).
  // For a vector X, X·p1 is its p1 coefficient and X·m1 minus its m1 coefficient.
  const toCGA2 = X => [(X | 1e1).s, (X | 1e2).s, -(X | p1).s, -(X | m1).s];

  // A CGA2d circle or line, given by its dual vector's coefficients, as a GAC conic.
  const conicFromDual = c => fromCGA2(c) * I;

  // Meet of two conics: their common points (and ō₋ ∧ ō× when both contain it).
  const meet = (X, Y) => X & Y;

  // f(x, y) = (P̂(x, y) ∧ X) / I: zero exactly on the conic X; a quadratic.
  const incidence = X => (x, y) => ((up(x, y) ^ X) * I).s;

  // Is P̂ on X (or in the span X represents)? Relative size of P̂ ∧ X.
  const offBy = (P, X) => (P ^ X).Length / (normalize(P).Length * X.Length);

  return { ni, nm, nt, o, om, ot, I, up, normalize, coords, conicThrough, fromCGA2, toCGA2, conicFromDual, meet, incidence, offBy };
};
