import { measureLineStats, measureNaturalWidth, prepareWithSegments, setLocale } from "./vendor/pretext/layout.js";

document.fonts.ready.then(() => {
  const element = document.getElementById("battery-percent");
  setLocale(document.documentElement.lang || "en");
  let cachedKey = "";
  let prepared;
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (!element.clientWidth) return;
      try {
        const style = getComputedStyle(element);
        const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
        const key = `${element.textContent}|${font}|${letterSpacing}`;
        if (cachedKey !== key) {
          prepared = prepareWithSegments(element.textContent, font, { letterSpacing, whiteSpace: "pre-wrap" });
          cachedKey = key;
        }
        const fits = measureLineStats(prepared, element.clientWidth).lineCount === 1
          && measureNaturalWidth(prepared) <= element.clientWidth + 1
          && parseFloat(style.lineHeight) <= element.clientHeight + 1;
        element.dataset.textFit = fits ? "fit" : "reflow";
      } catch (_error) {
        element.dataset.textFit = "unavailable";
      }
    });
  };
  new MutationObserver(schedule).observe(element, { childList: true, characterData: true, subtree: true });
  new ResizeObserver(schedule).observe(element);
  schedule();
});
