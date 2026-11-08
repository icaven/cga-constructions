// Resizable operations panel. Kept outside Algebra() so ganja does not
// translate its operators. The width is a CSS variable; the panel's font size
// and the graph's width follow it. The chosen width is remembered per browser.
(() => {
  const root = document.documentElement;
  const handle = document.getElementById("opsResize");
  const storageKey = "cga-circle-division-ops-width";
  const minWidth = 260;

  const setWidth = w => {
    const maxWidth = Math.max(minWidth, window.innerWidth * 0.7);
    const width = Math.round(Math.min(maxWidth, Math.max(minWidth, w)));
    root.style.setProperty("--ops-width", width + "px");
    return width;
  };

  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (saved > 0) setWidth(saved);
  } catch (e) { /* storage unavailable: keep the default width */ }

  handle.addEventListener("pointerdown", down => {
    down.preventDefault();
    handle.setPointerCapture(down.pointerId);
    document.body.classList.add("resizing");

    const move = e => setWidth(window.innerWidth - e.clientX);
    const up = e => {
      const width = setWidth(window.innerWidth - e.clientX);
      handle.releasePointerCapture(down.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      document.body.classList.remove("resizing");
      try { localStorage.setItem(storageKey, String(width)); } catch (err) { /* ignore */ }
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });

  handle.addEventListener("dblclick", () => {
    root.style.removeProperty("--ops-width");
    try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
  });
})();
