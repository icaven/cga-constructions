// The colours of the circle-division pages, in one place. Loaded before the
// other circle_division modules; values are ganja colours (0xRRGGBB).

window.CircleDivision = window.CircleDivision || {};

CircleDivision.colors = {
  // The frame: axes, unit circle, and the given points O and V0.
  axes: 0xBBBBBB,
  unitCircle: 0x222222,
  givenPoint: 0x111111,

  // Construction objects: the current step's, and earlier steps' (fainter).
  line: 0x4062BB,          // lines and their labels
  earlierLine: 0xCCCCCC,
  circle: 0xF0A860,
  earlierCircle: 0xDDDDDD,
  circleLabel: 0xB05A00,   // circle and radius labels (a darker orange, for legibility)
  centre: 0xE07000,        // centres of the current step's circles
  radius: 0xE07000,        // segments a compass opening was taken from
  earlierRadius: 0xDDDDDD,
  point: 0x666666,
  curve: 0x2A9D8F,         // a given conic (the parabola) and its label
  earlierCurve: 0xBFE3DE,

  // Point pairs and point quadruples: ganja's pair markers, and the rings and
  // labels of the current step's pairs and quadruples.
  pairPoints: 0xC9A3DD,
  pair: 0x8E44AD,
  quad: 0xC2185B,
  earlierQuad: 0xBBBBBB,

  // The finished polygon.
  compassCircle: 0xE2E2E2,
  compassEdge: 0x88BBBB,
  compassVertex: 0x337788,
  rotorEdge: 0x2277DD,
  rotorVertex: 0x0033CC,
  firstVertices: 0xCC2222  // V1 and V(n-1), or the starting edge
};
