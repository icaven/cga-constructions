// Pan and zoom for the graph.
//
// Zoom changes ganja's own scale (options.scale): the geometry spreads out
// while text and points keep their size, so crowded labels separate. Pan
// shifts the SVG's viewBox. ganja's 2D graph only zooms about the origin,
// cannot pan, and loses its zoom on every redraw (each slider or option change
// creates a new graph), so attach() replaces its handlers, zooms about the
// cursor, and keeps the pan offset across redraws. ganja's handlers would also
// let points be dragged, changing the construction's points in place.
// Kept outside Algebra() so ganja does not translate its operators.
//
// attach(svg, { clampZoom, applyZoom, reset }) is called for every new graph:
//   clampZoom(f): the zoom factor actually allowed for a requested factor f;
//   applyZoom(k): multiply the scale by k and redraw;
//   reset():      restore the default scale and redraw.
window.graphView = (() => {
  let offset = null;     // viewBox origin [x, y], or null for ganja's default

  const toSvg = (svg, clientX, clientY) => {
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };

  const box = svg => svg.getAttribute("viewBox").split(" ").map(Number);

  const apply = svg => {
    const [, , w, h] = svg.dataset.defaultViewBox.split(" ").map(Number);
    if (offset) svg.setAttribute("viewBox", [offset[0], offset[1], w, h].join(" "));
  };

  const attach = (svg, zoom) => {
    // Replace ganja's handlers (origin-only zoom, point dragging).
    svg.onwheel = null;
    svg.onmousedown = null;
    svg.onmousemove = null;
    svg.style.cursor = "grab";
    svg.style.touchAction = "none";
    apply(svg);

    // Zoom about the cursor: at scale s a world point sits at s·w in SVG
    // units, so scaling by k moves the point under the cursor from p to k·p;
    // shifting the viewBox origin by (k - 1)·p keeps it under the cursor.
    svg.addEventListener("wheel", e => {
      e.preventDefault();
      const k = zoom.clampZoom(Math.exp(-e.deltaY * 0.0015));
      if (k === 1) return;
      const p = toSvg(svg, e.clientX, e.clientY);
      const [x, y] = box(svg);
      offset = [x + (k - 1) * p.x, y + (k - 1) * p.y];
      zoom.applyZoom(k);
    }, { passive: false });

    svg.addEventListener("pointerdown", down => {
      if (down.button !== 0) return;
      down.preventDefault();
      svg.setPointerCapture(down.pointerId);
      svg.style.cursor = "grabbing";
      const grabbed = toSvg(svg, down.clientX, down.clientY);

      // Keep the grabbed point under the cursor.
      const move = e => {
        const p = toSvg(svg, e.clientX, e.clientY);
        const [x, y] = box(svg);
        offset = [x - (p.x - grabbed.x), y - (p.y - grabbed.y)];
        apply(svg);
      };
      const up = () => {
        svg.releasePointerCapture(down.pointerId);
        svg.removeEventListener("pointermove", move);
        svg.removeEventListener("pointerup", up);
        svg.style.cursor = "grab";
      };
      svg.addEventListener("pointermove", move);
      svg.addEventListener("pointerup", up);
    });

    svg.addEventListener("dblclick", () => {
      offset = null;
      zoom.reset();
    });
  };

  return { attach };
})();
