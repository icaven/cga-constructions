# Compass constructions in conformal geometric algebra

Ian Cavén, with Claude Opus 5.5 · 2026-11-07, updated 2026-11-10

**Site:** https://icaven.github.io/cga-constructions/

How joins, meets and spheres in conformal geometric algebra (CGA) construct regular polygons and the
Platonic solids, with live [ganja.js](https://github.com/enkimute/ganja.js) demos and the constructibility
theory behind them.

| Page | Content |
|---|---|
| [`index.html`](index.html) | The explainer: a primer on geometric algebra, the CGA dictionary for compass and straightedge, Carlyle-circle polygons, lifted spheres, the Platonic solids, what can be constructed, and polygons by a parabola in the geometric algebra for conics (GAC) |
| [`polygons.html`](polygons.html) | CGA2D: the regular 3-, 4-, 5-, 6-, 15- and 17-gons by Carlyle circles |
| [`gac-polygons.html`](gac-polygons.html) | GAC ℝ<sup>5,3</sup>: the regular 7-, 9-, 13- and 19-gons (and 14, 18, 26, 38) by Descartes' parabola |
| [`gac-operations.html`](gac-operations.html) | GAC examples: conics through five points, rotors, reflections and translators acting on conics |
| [`pentagon-lift.html`](pentagon-lift.html) | CGA3D: the 5-gon, with the Carlyle circle cut from a lifted sphere |
| [`platonic-solids.html`](platonic-solids.html) | CGA3D: the five Platonic solids from stood-up lengths |
| [`trilateration.html`](trilateration.html) | CGA3D: the tetrahedron and octahedron by trilateration stepping, three spheres at a time |
| [`reflections.html`](reflections.html) | CGA3D: the five Platonic solids as orbits of a seed point under the reflection groups A₃, B₃ and H₃ |

Each demo lists the CGA (or GAC) operations it runs, step by step. The polygon pages share the modules in
[`circle_division/`](circle_division): the constructions, the towers, the GAC algebra and the viewer. The pages load ganja.js 1.0.204 and KaTeX 0.16.11
from jsDelivr; the 3D demos need WebGL. The Carlyle-circle constructions follow D. W. DeTemple, "Carlyle
Circles and the Lemoine Simplicity of Polygon Constructions", *The American Mathematical Monthly* 98 (1991),
97–108; the explainer lists the other references.

The demo pages are developed as examples in the `cga-compass-constructions` branch of
[icaven/ganja.js](https://github.com/icaven/ganja.js/tree/cga-compass-constructions) and copied here.
