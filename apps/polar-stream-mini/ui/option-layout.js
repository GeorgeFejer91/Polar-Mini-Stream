import { measureLineStats, measureNaturalWidth, prepareWithSegments, setLocale } from "./vendor/pretext/layout.js";

document.fonts.ready.then(() => {
  const row = document.querySelector(".mini-option-row");
  const signals = document.getElementById("signal-list");
  const labels = document.querySelectorAll(".mini-option-row .check-row > span, .signal-option > span");
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
          const prepared = prepareWithSegments(label.textContent, font, {
            letterSpacing: Number.parseFloat(style.letterSpacing) || 0,
          });
          const fits = measureLineStats(prepared, label.clientWidth + 1).lineCount === 1
            && measureNaturalWidth(prepared) <= label.clientWidth + 1
            && Number.parseFloat(style.lineHeight) <= label.clientHeight + 1;
          label.dataset.textFit = fits ? "fit" : "reflow";
        } catch (_error) {
          label.dataset.textFit = "unavailable";
        }
      }
    });
  };

  const observer = new ResizeObserver(schedule);
  observer.observe(row);
  observer.observe(signals);
  schedule();
});
