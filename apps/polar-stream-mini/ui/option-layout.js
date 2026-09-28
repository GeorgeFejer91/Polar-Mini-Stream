import { measureLineStats, measureNaturalWidth, prepareWithSegments, setLocale } from "./vendor/pretext/layout.js";

document.fonts.ready.then(() => {
  const node = document.getElementById("mini-node");
  const surface = node.querySelector(".node-surface");
  const actionButtons = node.querySelectorAll("footer button");
  const labels = document.querySelectorAll(
    ".mini-option-row .check-row > span, .signal-option > span, #product-name, #node-phase, #mock-source, .readout dd, .device-row button, .patch-node footer button, #metrics-button",
  );
  const cache = new WeakMap();
  setLocale(document.documentElement.lang || "en");

  let pending = false;
  const fitTypeSize = () => {
    try {
      const preferred = Math.max(10, Math.min(15, Math.floor(Math.min(innerWidth * .023, innerHeight * .025))));
      let size = preferred;
      for (; size > 10; size--) {
        if ([...actionButtons].every((button) => {
          const style = getComputedStyle(button);
          const width = button.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 1;
          const font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
          const prepared = prepareWithSegments(button.textContent, font, {
            letterSpacing: Number.parseFloat(style.letterSpacing) || 0,
          });
          return measureLineStats(prepared, width).lineCount === 1 && measureNaturalWidth(prepared) <= width;
        })) break;
      }
      if (surface.style.getPropertyValue("--accordion-type") !== `${size}px`) {
        surface.style.setProperty("--accordion-type", `${size}px`);
      }
    } catch (_error) {
      surface.style.removeProperty("--accordion-type");
    }
  };
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      fitTypeSize();
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
          const canReveal = label.matches("#product-name, #node-phase, #mock-source, .readout dd");
          label.dataset.textFit = fits ? "fit" : canReveal ? "reveal" : "reflow";
          if (canReveal) {
            label.title = fits ? "" : label.textContent;
            label.tabIndex = fits ? -1 : 0;
          }
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
