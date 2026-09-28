import { measureLineStats, measureNaturalWidth, prepareWithSegments, setLocale } from "./vendor/pretext/layout.js";

document.fonts.ready.then(() => {
  const node = document.getElementById("mini-node");
  const labels = document.querySelectorAll(
    ".mini-option-row .check-row > span, .signal-option > span, #product-name, #node-phase, #mock-source, .readout dd, .device-row button, .patch-node footer button, #metrics-button",
  );
  const cache = new WeakMap();
  setLocale(document.documentElement.lang || "en");

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      for (const label of labels) {
        if (!label.clientWidth) continue;
        try {
          const style = getComputedStyle(label);
          const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
          const key = `${label.textContent}|${font}|${letterSpacing}`;
          let entry = cache.get(label);
          if (entry?.key !== key) {
            entry = { key, prepared: prepareWithSegments(label.textContent, font, { letterSpacing }) };
            cache.set(label, entry);
          }
          const width = label.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
          const height = label.clientHeight - (Number.parseFloat(style.paddingTop) || 0) - (Number.parseFloat(style.paddingBottom) || 0);
          const fits = width > 0 && measureLineStats(entry.prepared, width + 1).lineCount === 1
            && measureNaturalWidth(entry.prepared) <= width + 1
            && Number.parseFloat(style.lineHeight) <= height + 1;
          label.dataset.textFit = fits ? "fit" : "reflow";
        } catch (_error) {
          label.dataset.textFit = "unavailable";
        }
      }
    });
  };

  const observer = new ResizeObserver(schedule);
  observer.observe(node);
  for (const label of labels) observer.observe(label);
  new MutationObserver(schedule).observe(node, { childList: true, characterData: true, subtree: true });
  schedule();
});
