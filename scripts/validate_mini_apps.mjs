import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

const root = process.cwd();
const outputDirectory = path.join(root, "target", "ui-qa");
await fs.mkdir(outputDirectory, { recursive: true });

const apps = [
  {
    kind: "polar",
    productName: "Polar Stream Mini",
    scanLabel: "Polar H10",
    streamName: "Polar-H10-Mini",
    height: 332,
    frameColors: ["rgb(255, 255, 255)", "rgb(0, 0, 0)", "rgb(213, 0, 28)"],
  },
  {
    kind: "vernier",
    productName: "Vernier Stream Mini",
    scanLabel: "Vernier Go Direct",
    streamName: "Vernier-GDX-Mini",
    height: 354,
    frameColors: ["rgb(255, 255, 255)", "rgb(245, 154, 47)", "rgb(0, 124, 122)"],
  },
];

const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
try {
  for (const app of apps) {
    await validateNormalWindow(app);
    await validateEarlyRememberedConnection(app);
    await validateBatteryWindow(app);
    if (app.kind === "vernier") {
      await validatePreferenceMemory(app);
      await validateBluetoothUnavailable(app);
      await validateBluetoothOff(app);
    }
    await validateMockWindow(app, true);
    await validateMockWindow(app, false);
  }
} finally {
  await browser.close();
}

async function validateBluetoothUnavailable(app) {
  const page = await createPage(app, { mockMode: false, lslHealthy: false, scanError: true });
  await page.goto(appUrl(app));
  await page.locator("#scan-button").click();
  await page.locator("#device-scan-status").filter({ hasText: "Bluetooth is unavailable." }).waitFor();
  assert.match(await page.locator("#device-scan-status").textContent(), /Check Windows Bluetooth settings/);
  assert.equal(await page.locator("#device-error-details").isVisible(), true);
  await page.locator("#device-rescan").waitFor({ state: "visible" });
  await assertNoOverflow(page);
  await page.close();
}

async function validateBluetoothOff(app) {
  const page = await createPage(app, { mockMode: false, lslHealthy: true, radioState: "off" });
  await page.goto(appUrl(app));
  await page.locator("#scan-button").click();
  await page.locator("#device-scan-status").filter({ hasText: "Bluetooth is off." }).waitFor();
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("scan_devices")), false);
  await page.locator("#bluetooth-toggle").check();
  await page.locator("#device-results .discovered-device").waitFor();
  assert.equal(await page.locator("#bluetooth-state").textContent(), "On");
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("set_bluetooth_radio")), true);
  await assertNoOverflow(page);
  await page.close();
}

async function validateEarlyRememberedConnection(app) {
  const page = await createPage(app, { mockMode: false, lslHealthy: true, remembered: true });
  await page.goto(appUrl(app));
  await page.locator("#mini-node.connected").waitFor();
  assert.equal(await page.locator("#node-phase").textContent(), app.kind === "vernier" ? "Connected" : "Live");
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("connect_remembered")), true);
  assert.equal(await page.locator("#battery-percent").textContent(), "67%");
  await page.close();
}

async function validateBatteryWindow(app) {
  const page = await createPage(app, { mockMode: false, lslHealthy: true });
  await page.goto(appUrl(app));
  await page.locator("#node-phase").filter({ hasText: "Ready" }).waitFor();
  const battery = page.locator("#device-battery");
  const percent = page.locator("#battery-percent");
  assert.equal(await battery.isVisible(), true);
  assert.equal(await percent.textContent(), "—");
  assert.match(await battery.getAttribute("aria-label"), /disconnected/);

  const colors = {
    light: { low: "rgb(198, 40, 40)", medium: "rgb(182, 92, 0)", high: "rgb(22, 129, 62)" },
    dark: { low: "rgb(255, 105, 113)", medium: "rgb(255, 173, 71)", high: "rgb(89, 206, 134)" },
  };
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
    for (const value of [0, 20, 21, 50, 51, 83, 100, null, -1, 101, 255, 83.5, "83"]) {
      await page.evaluate((batteryPercent) => window.__emitMiniEvent({
        kind: "connection", connected: true, deviceName: "Battery test sensor", batteryPercent,
      }), value);
      const valid = Number.isInteger(value) && value >= 0 && value <= 100;
      const level = !valid ? "unknown" : value <= 20 ? "low" : value <= 50 ? "medium" : "high";
      assert.equal(await percent.textContent(), valid ? `${value}%` : "—");
      assert.equal(await battery.getAttribute("data-level"), level);
      const color = await page.locator(".battery-icon").evaluate((node) => getComputedStyle(node).color);
      assert.equal(color, valid ? colors[theme][level] : await battery.evaluate((node) => getComputedStyle(node).color));
      assert.equal(Number(await page.locator("#battery-fill").getAttribute("width")), valid ? value * 0.16 : 0);
      assert.match(await battery.getAttribute("aria-label"), valid ? new RegExp(`${value}%`) : /unavailable/);
    }
  }

  await page.evaluate(() => {
    window.__emitMiniEvent({ kind: "connection", connected: true, deviceName: "Long sensor name ".repeat(12), batteryPercent: 100 });
    window.__emitMiniEvent({ kind: "samples", ecgSamples: 39, vernierRows: 6, lsl: "Publishing 4 LSL streams" });
  });
  assert.equal(await percent.textContent(), "100%");
  for (const width of [320, 330, 388, 640]) {
    await page.setViewportSize({ width, height: app.height });
    await page.locator('#battery-percent[data-text-fit="fit"]').waitFor();
    await assertBatteryTitlebar(page);
    await assertNoOverflow(page);
  }
  await page.setViewportSize({ width: 388, height: app.height });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
    for (const value of [20, 50, 100]) {
      await page.evaluate((batteryPercent) => window.__emitMiniEvent({ kind: "connection", connected: true, batteryPercent }), value);
      await page.screenshot({ path: path.join(outputDirectory, `${app.kind}-mini-battery-${theme}-${value}.png`), omitBackground: true });
    }
  }
  await page.setViewportSize({ width: 320, height: app.height });
  await percent.evaluate((node) => {
    node.style.fontSize = "20px";
    node.style.lineHeight = "30px";
    node.style.letterSpacing = "0.12em";
    node.style.wordSpacing = "0.16em";
  });
  await page.locator('#battery-percent[data-text-fit="fit"]').waitFor();
  assert.equal(await percent.evaluate((node) => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight), true);
  await assertBatteryTitlebar(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Enlarged text may grow the applet; controls must remain reachable by scrolling.
  assert.equal(await page.locator("body").evaluate((node) => getComputedStyle(node).overflowY), "auto");
  await page.locator("#disconnect-button").scrollIntoViewIfNeeded();
  assert.ok((await page.locator("#disconnect-button").boundingBox()).y < app.height);

  await page.evaluate(() => window.__emitMiniEvent({ kind: "connection", connected: false, batteryPercent: 100 }));
  assert.equal(await percent.textContent(), "—");
  assert.match(await battery.getAttribute("aria-label"), /disconnected/);
  assert.equal(await battery.getAttribute("data-level"), "unknown");
  await page.evaluate(() => window.__emitMiniEvent({ kind: "connection", connected: true }));
  assert.equal(await percent.textContent(), "—");
  await page.close();
}

async function assertBatteryTitlebar(page) {
  const geometry = await page.locator("#device-battery").evaluate((node) => {
    const box = node.getBoundingClientRect();
    const header = node.closest("header").getBoundingClientRect();
    const add = document.getElementById("new-node-top").getBoundingClientRect();
    const minimize = document.getElementById("minimize-button").getBoundingClientRect();
    const close = document.getElementById("close-button").getBoundingClientRect();
    const title = document.getElementById("product-name");
    const label = document.getElementById("battery-percent");
    return {
      beforeControls: add.right <= box.left && box.right <= minimize.left && minimize.right <= close.left,
      aligned: Math.abs(box.y + box.height / 2 - minimize.y - minimize.height / 2) <= 1,
      inside: box.left >= header.left && box.right <= header.right && box.top >= header.top && box.bottom <= header.bottom,
      titleReadable: title.getBoundingClientRect().right <= add.left && title.scrollWidth <= title.clientWidth + 1 && title.scrollHeight <= title.clientHeight + 1,
      readable: label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1,
    };
  });
  assert.deepEqual(geometry, { beforeControls: true, aligned: true, inside: true, titleReadable: true, readable: true });
}

async function validateNormalWindow(app) {
  const page = await createPage(app, { mockMode: false, lslHealthy: true });
  await page.goto(appUrl(app));
  await page.locator("#node-phase").filter({ hasText: "Ready" }).waitFor();

  const frame = await frameState(page);
  assert.equal(frame.radius, "16px");
  assert.equal(frame.border, app.frameColors[0]);
  assert.ok(frame.shadow.includes(app.frameColors[1]));
  assert.ok(frame.shadow.includes(app.frameColors[2]));
  assert.equal(frame.animation, "none");
  assert.equal(await page.locator("#device-row").isVisible(), true);
  assert.equal(await page.locator("#mock-source").isVisible(), false);
  assert.equal(await page.getByRole("button", { name: "Open mock" }).isVisible(), true);
  await assertNoOverflow(page);

  if (app.kind === "vernier") {
    assert.equal(await page.locator("#connection-feedback").textContent(), "Ready");
    await page.locator('#connection-feedback[data-text-fit="fit"]').waitFor();
    await assertInlineOutputs(page);
    assert.equal(await page.locator("#metric-options input").count(), 7);
    assert.equal(await page.locator("#metric-count").textContent(), "4/7");
    assert.equal(await page.locator('#metric-options input[value="steps"]').isChecked(), false);
    assert.equal(await page.locator('#metric-options input[value="stepRate"]').isChecked(), false);
    assert.equal(await page.locator('#metric-options input[value="respirationRate"]').isChecked(), false);
    const forceLabel = page.locator('#metric-options label:has(input[value="rawForce"]) span');
    await forceLabel.click();
    await page.waitForFunction(() => !window.__miniSaves.at(-1)?.vernierOutputs.includes("rawForce"));
    assert.equal(await page.locator('#metric-options input[value="rawForce"]').isChecked(), false);
    await forceLabel.click();
    await page.waitForFunction(() => window.__miniSaves.at(-1)?.vernierOutputs.includes("rawForce"));
    await page.locator('#metric-options input[value="steps"]').check();
    await page.locator('#metric-options input[value="stepRate"]').check();
    await page.locator('#metric-options input[value="respirationRate"]').check();
    await page.waitForFunction(() => window.__miniSaves.at(-1)?.vernierOutputs?.length === 7);
    assert.equal(await page.locator("#metric-count").textContent(), "7/7");
    assert.equal(await page.locator('#metric-options input[value="rawVernier"]').isDisabled(), true);
    await page.locator('#metric-options input[value="vernierBreathing"]').uncheck();
    await page.waitForFunction(() => window.__miniSaves.at(-1)?.vernierOutputs?.length === 6);
    assert.equal(await page.locator("#metric-count").textContent(), "6/7");
    assert.equal(await page.locator('#metric-options input[value="rawVernier"]').isChecked(), true);
    assert.equal(await page.evaluate(() => window.__miniCalls.includes("disconnect_device")), false);
    const savedPreferences = await page.evaluate(() => window.__miniSaves.at(-1));
    const reopened = await createPage(app, { mockMode: false, lslHealthy: true, savedPreferences });
    await reopened.goto(appUrl(app));
    assert.equal(await reopened.locator('#metric-options input[value="rawVernier"]').isChecked(), true);
    assert.equal(await reopened.locator('#metric-options input[value="rawVernier"]').isDisabled(), true);
    assert.equal(await reopened.locator('#metric-options input[value="steps"]').isChecked(), true);
    assert.equal(await reopened.locator('#metric-options input[value="stepRate"]').isChecked(), true);
    assert.equal(await reopened.locator('#metric-options input[value="respirationRate"]').isChecked(), true);
    await reopened.setViewportSize({ width: 320, height: app.height });
    await assertInlineOutputs(reopened);
    await assertNoOverflow(reopened);
    await reopened.screenshot({ path: path.join(outputDirectory, "vernier-mini-outputs.png"), omitBackground: true });
    await reopened.locator('#metric-options input[value="rawForce"]').uncheck();
    await reopened.locator('#metric-options input[value="steps"]').uncheck();
    await reopened.locator('#metric-options input[value="stepRate"]').uncheck();
    await reopened.locator('#metric-options input[value="respirationRate"]').uncheck();
    await reopened.locator('#metric-options input[value="signalStatus"]').click();
    assert.equal(await reopened.locator('#metric-options input[value="signalStatus"]').isChecked(), false);
    assert.equal(await reopened.locator("#metric-count").textContent(), "1/7");
    await reopened.evaluate(() => {
      window.__emitMiniEvent({ kind: "connection", connected: true, deviceName: "Test belt" });
      window.__emitMiniEvent({ kind: "samples", vernierRows: 20, metricSamples: 20, lsl: "Publishing 1 stream(s)" });
    });
    assert.equal(await reopened.locator("#mini-node").evaluate((node) => node.classList.contains("streaming")), true);
    await reopened.close();
    assert.equal(await page.locator("#device-select option").count(), 1);
    await page.locator("#scan-button").click();
    await page.locator("#device-results .discovered-device").waitFor();
    assert.match(await page.locator("#device-scan-status").textContent(), /1 Go Direct device found/);
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".bluetooth-track span")).transform.endsWith("16, 0)"));
    await page.screenshot({ path: path.join(outputDirectory, "vernier-mini-device-discovery.png"), omitBackground: true });
    await page.locator("#device-results .discovered-device").click();
    await page.waitForFunction(() => window.__miniCalls.includes("connect_device"));
    assert.equal(await page.locator("#device-select option").count(), 2);
    assert.match(await page.locator("#device-select option").nth(1).textContent(), /GDX-RB/);
    assert.equal(await page.locator("#connection-feedback").textContent(), "Connected; waiting for fresh LSL samples");
    await page.evaluate(() => window.__emitMiniEvent({ kind: "samples", vernierRows: 20, metricSamples: 20, lsl: "Publishing 3 LSL streams" }));
    assert.equal(await page.locator("#connection-feedback").textContent(), "Live: sensor samples reaching LSL");
    await page.evaluate(() => window.__emitMiniEvent({ kind: "connection", connected: false, message: "Disconnected" }));
  }

  if (app.kind === "polar") {
    const accIds = [
      "adr_pca_waveform", "adr_pca_phase", "adr_pca_rate",
      "adr_interval_mean", "adr_axis_difference_event", "adr_axis_difference_rate",
      "adr_moving_average_phase", "adr_moving_average_difference",
      "adr_axis_mean_difference", "adr_axis_difference_magnitude",
    ];
    await page.locator("#metrics-button").click();
    for (const id of accIds) {
      const option = page.locator(`#metric-options input[value="${id}"]`);
      assert.equal(await option.count(), 1);
      assert.match(await option.locator("xpath=../../..").textContent(), /ACC derived/);
      await option.check();
    }
    await page.waitForFunction(() => window.__miniSaves.some((save) =>
      ["adr_pca_waveform", "adr_pca_phase", "adr_pca_rate", "adr_interval_mean", "adr_axis_difference_event", "adr_axis_difference_rate", "adr_moving_average_phase", "adr_moving_average_difference", "adr_axis_mean_difference", "adr_axis_difference_magnitude"].every((id) => save.polarOutputs?.includes(id))));
    for (const id of ["adr_pca_quality", "adr_pca_valid", "adr_moving_average_valid", "adr_axis_difference_valid"]) {
      const companion = page.locator(`#metric-options input[value="${id}"]`);
      assert.equal(await companion.isChecked(), true);
      assert.equal(await companion.isDisabled(), true);
    }
    const savedPreferences = await page.evaluate(() => window.__miniSaves.at(-1));
    const reopened = await createPage(app, { mockMode: false, lslHealthy: true, savedPreferences });
    await reopened.goto(appUrl(app));
    await reopened.locator("#metrics-button").click();
    for (const id of accIds) {
      assert.equal(await reopened.locator(`#metric-options input[value="${id}"]`).isChecked(), true);
    }
    await reopened.setViewportSize({ width: 320, height: 560 });
    await assertNoOverflow(reopened);
    await reopened.screenshot({
      path: path.join(outputDirectory, "polar-mini-metrics-reset.png"),
      omitBackground: true,
    });
    await reopened.locator("#reset-metrics").click();
    await reopened.waitForFunction(() => window.__miniSaves.some((save) =>
      save.polarOutputs?.length === 4 && !save.polarOutputs.includes("adr_axis_difference_event")));
    assert.equal(await reopened.locator("#reset-metrics").isDisabled(), true);
    assert.equal(await reopened.evaluate(() => window.__miniCalls.includes("disconnect_device")), false);
    const resetPreferences = await reopened.evaluate(() => window.__miniSaves.at(-1));
    await reopened.close();
    const resetReopened = await createPage(app, { mockMode: false, lslHealthy: true, savedPreferences: resetPreferences });
    await resetReopened.goto(appUrl(app));
    await resetReopened.locator("#metrics-button").click();
    assert.equal(await resetReopened.locator('#metric-options input[value="adr_axis_difference_event"]').isChecked(), false);
    await resetReopened.close();
    await page.locator("#metrics-close").click();
  }

  await page.locator("#stream-mode-toggle").check();
  await page.waitForFunction(() => window.__miniSaves.some((save) => save.outputMode === "singleStream"));
  assert.equal(await page.locator("#stream-mode-toggle").isChecked(), true);
  if (app.kind === "polar") {
    assert.match(await page.locator("#signal-list").textContent(), /single \+ ADR LSL/);
  } else {
    await assertInlineOutputs(page);
  }
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("disconnect_device")), false);

  await page.evaluate(() => window.__emitMiniEvent({
    kind: "connection",
    connected: true,
    deviceName: "Connected sensor",
    message: "Connected",
  }));
  assert.equal(await page.locator("#mock-button").isEnabled(), true);
  await page.locator("#mock-button").click();
  await page.waitForFunction(() => window.__miniCalls.includes("open_mock_node"));
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("start_mock_stream")), false);
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("disconnect_device")), false);
  await page.screenshot({
    path: path.join(outputDirectory, `${app.kind}-stream-mini-mock-action.png`),
    omitBackground: true,
  });
  await page.setViewportSize({ width: 330, height: app.height });
  await assertNoOverflow(page);
  assert.equal(await page.locator("#mock-button").evaluate((button) => button.scrollWidth <= button.clientWidth), true);
  await page.close();
}

async function validateMockWindow(app, lslHealthy) {
  const page = await createPage(app, { mockMode: true, lslHealthy });
  await page.goto(appUrl(app));
  await page.locator("#product-name").filter({ hasText: "Mock" }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector("#sample-status")?.textContent?.match(/\d+/)?.[0]) > 0);

  assert.equal(await page.locator("#device-row").isVisible(), false);
  assert.equal(await page.locator("#mock-source").isVisible(), true);
  assert.equal(await page.locator("#mock-button").isVisible(), false);
  assert.equal(await page.locator("#node-kind").textContent(), "MOCK");
  assert.equal(await page.locator("#device-battery").isVisible(), false);
  const frame = await frameState(page);
  assert.equal(frame.animation, lslHealthy ? "stream-beacon" : "none");
  assert.equal(await page.locator("#mini-node").evaluate((node) => node.classList.contains("streaming")), lslHealthy);
  await assertNoOverflow(page);

  await page.locator("#stream-mode-toggle").check();
  await page.waitForFunction(() => window.__miniSaves.some((save) => save.outputMode === "singleStream"));
  assert.equal(await page.locator("#stream-mode-toggle").isChecked(), true);
  assert.equal(await page.evaluate(() => window.__miniCalls.includes("disconnect_device")), false);

  if (lslHealthy) {
    await page.screenshot({
      path: path.join(outputDirectory, `${app.kind}-stream-mini-mock-live.png`),
      omitBackground: true,
    });
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("#mini-node").evaluate((node) => node.classList.contains("streaming")), false);
    await page.evaluate(({ kind, lsl }) => window.__emitMiniEvent({
      kind: "samples",
      ecgSamples: kind === "polar" ? 78 : 0,
      accSamples: kind === "polar" ? 120 : 0,
      vernierRows: kind === "vernier" ? 12 : 0,
      metricSamples: kind === "vernier" ? 12 : 0,
      lsl,
    }), { kind: app.kind, lsl: "Publishing 1 LSL stream" });
    await page.waitForFunction(() => document.querySelector("#mini-node")?.classList.contains("streaming"));
  }
  await page.close();
}

async function validatePreferenceMemory(app) {
  const page = await createPage(app, { mockMode: false, lslHealthy: true, saveDelayMs: 80 });
  await page.goto(appUrl(app));
  // Faster than the save response: old responses must not overwrite later edits.
  await page.evaluate(() => {
    for (const [id, checked] of [
      ["steps", true], ["stepRate", true], ["respirationRate", true],
      ["rawForce", false], ["vernierBreathing", false],
    ]) {
      const input = document.querySelector(`#metric-options input[value="${id}"]`);
      input.checked = checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.waitForFunction(() => window.__miniSaves.length === 5);
  assert.equal(await page.locator("#metric-count").textContent(), "5/7");
  await page.locator("#stream-mode-toggle").check();
  await page.locator("#auto-connect").check();
  await page.locator("#stream-name").fill("Remembered-Vernier");
  await page.waitForFunction(() => window.__miniSaves.at(-1)?.streamName === "Remembered-Vernier");
  const savedPreferences = await page.evaluate(() => window.__miniSaves.at(-1));
  assert.deepEqual(savedPreferences.vernierOutputs, ["rawVernier", "signalStatus", "steps", "stepRate", "respirationRate"]);
  assert.equal(savedPreferences.outputMode, "singleStream");
  assert.equal(savedPreferences.autoConnect, true);
  await page.close();

  const reopened = await createPage(app, { mockMode: false, lslHealthy: true, savedPreferences });
  await reopened.goto(appUrl(app));
  assert.equal(await reopened.locator("#stream-name").inputValue(), "Remembered-Vernier");
  assert.equal(await reopened.locator("#stream-mode-toggle").isChecked(), true);
  assert.equal(await reopened.locator("#auto-connect").isChecked(), true);
  for (const input of await reopened.locator("#metric-options input").all()) {
    assert.equal(await input.isChecked(), savedPreferences.vernierOutputs.includes(await input.inputValue()));
  }
  // A failed write must restore the last confirmed snapshot, including after a
  // successful save. Editing the UI must never mutate that snapshot.
  await reopened.evaluate(() => {
    const input = document.querySelector('#metric-options input[value="rawForce"]');
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await reopened.waitForFunction(() => window.__miniSaves.length === 1);
  await reopened.evaluate(() => {
    window.__miniRejectNextSave = true;
    const input = document.querySelector('#metric-options input[value="rawForce"]');
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await reopened.waitForFunction(() => document.querySelector("#node-phase").textContent === "Attention");
  assert.equal(await reopened.locator('#metric-options input[value="rawForce"]').isChecked(), true);
  assert.equal(await reopened.evaluate(() => window.__miniSaves.length), 1);
  await reopened.close();
}

async function assertInlineOutputs(page) {
  assert.equal(await page.locator("#metrics-dialog, #metrics-button").count(), 0);
  const inputs = page.locator("#mini-node #metric-options input");
  assert.equal(await inputs.count(), 7);
  for (const input of await inputs.all()) {
    assert.equal(await input.isVisible(), true);
    const box = await input.boundingBox();
    assert.equal(box.width, 10);
    assert.equal(box.height, 10);
    assert.ok(box.y + box.height <= await page.evaluate(() => innerHeight));
  }
  await page.waitForFunction(() => [...document.querySelectorAll(".metric-options span")]
    .every((label) => label.dataset.textFit === "fit"));
  assert.equal(await page.locator(".metric-options span").evaluateAll((labels) =>
    labels.every((label) => label.scrollWidth <= label.clientWidth + 1)), true);
}

async function createPage(app, options) {
  const page = await browser.newPage({ viewport: { width: 388, height: app.height } });
  await page.addInitScript(
    ({ app, options }) => {
      const calls = [];
      const saves = [];
      let eventChannel = null;
      let radioState = options.radioState || "on";
      window.__miniCalls = calls;
      window.__miniSaves = saves;
      window.__emitMiniEvent = (event) => eventChannel?.onmessage?.(event);

      class Channel {
        onmessage = null;
      }

      const preferences = {
        schema: "polar.stream.mini.preferences.v1",
        streamName: `${app.streamName}${options.mockMode ? "-Mock-1234" : ""}`,
        outputMode: "separateStreams",
        autoConnect: Boolean(options.remembered),
        polarOutputs: ["raw_ecg", "raw_acc", "heart_rate", "rr_interval"],
        vernierOutputs: ["rawVernier", "rawForce", "vernierBreathing", "signalStatus"],
        lastDevice: options.remembered ? { id: "saved-device", name: `Saved ${app.scanLabel}` } : null,
        ...options.savedPreferences,
      };
      const lsl = options.lslHealthy ? "Publishing 4 LSL streams" : "LSL unavailable";
      const session = {
        connected: true,
        deviceId: `mock://${app.kind}-1234`,
        deviceName: `Mock ${app.scanLabel}`,
        streamName: preferences.streamName,
        outputMode: preferences.outputMode,
        lsl,
      };

      async function invoke(command, payload = {}) {
        calls.push(command);
        if (command === "attach_events") {
          eventChannel = payload.events;
          return null;
        }
        if (command === "get_bootstrap") {
          return {
            kind: app.kind,
            productName: app.productName,
            scanLabel: app.scanLabel,
            preferences,
            metrics: app.kind === "polar" ? [
              { id: "adr_pca_waveform", streamSuffix: "adrPcaWaveform", label: "ADR PCA waveform", detail: "Signed ACC projection", category: "Breathing", direct: false },
              { id: "adr_pca_quality", streamSuffix: "adrPcaQuality", label: "ADR PCA quality", detail: "Motion quality", category: "Breathing", direct: false },
              { id: "adr_pca_valid", streamSuffix: "adrPcaValid", label: "ADR PCA validity", detail: "Readiness flag", category: "Breathing", direct: false },
              { id: "adr_pca_phase", streamSuffix: "adrPcaPhase", label: "Breathing phase", detail: "Three-state classifier", category: "Breathing", direct: false },
              { id: "adr_pca_rate", streamSuffix: "adrPcaRate", label: "Breathing rate", detail: "Cycle rate", category: "Breathing", direct: false },
              { id: "adr_interval_mean", streamSuffix: "adrIntervalMean", label: "Breath interval mean", detail: "Cycle interval", category: "Breathing dynamics", direct: false },
              { id: "adr_axis_difference_event", streamSuffix: "adrAxisDifferenceEvent", label: "Phan ACC breath event", detail: "Detected breath pulse", category: "Breathing", direct: false },
              { id: "adr_axis_difference_rate", streamSuffix: "adrAxisDifferenceRate", label: "Phan ACC breath count rate", detail: "Rolling count", category: "Breathing", direct: false },
              { id: "adr_moving_average_phase", streamSuffix: "adrMovingAveragePhase", label: "Flowborne ACC phase", detail: "Four-state classifier", category: "Breathing", direct: false },
              { id: "adr_moving_average_difference", streamSuffix: "adrMovingAverageDifference", label: "ADR moving-average waveform", detail: "Signed contrast", category: "Breathing", direct: false },
              { id: "adr_moving_average_valid", streamSuffix: "adrMovingAverageValid", label: "ADR moving-average validity", detail: "Readiness flag", category: "Breathing", direct: false },
              { id: "adr_axis_mean_difference", streamSuffix: "adrAxisMeanDifference", label: "ADR signed axis-mean difference", detail: "Signed Phan-window adaptation", category: "Breathing", direct: false },
              { id: "adr_axis_difference_magnitude", streamSuffix: "adrAxisDifferenceMagnitude", label: "ADR rectified axis difference", detail: "Original Phan continuous score", category: "Breathing", direct: false },
              { id: "adr_axis_difference_valid", streamSuffix: "adrAxisDifferenceValid", label: "ADR axis-difference validity", detail: "Readiness flag", category: "Breathing", direct: false },
            ] : [],
            session: null,
            mockMode: options.mockMode,
            lslResourcePresent: true,
          };
        }
        if (command === "get_autostart") return false;
        if (command === "get_bluetooth_radio") return { state: radioState };
        if (command === "set_bluetooth_radio") {
          radioState = payload.enabled ? "on" : "off";
          return { state: radioState };
        }
        if (command === "connect_remembered") {
          eventChannel?.onmessage?.({
            kind: "connection", connected: true, deviceName: `Saved ${app.scanLabel}`,
            batteryPercent: 67,
            message: "Streaming",
          });
          return { ...session, connected: false, deviceId: "saved-device", deviceName: null };
        }
        if (command === "open_mock_node" || command === "open_new_node") {
          return { launched: true, message: "Opened" };
        }
        if (command === "save_preferences") {
          if (options.saveDelayMs) await new Promise((resolve) => setTimeout(resolve, options.saveDelayMs));
          if (window.__miniRejectNextSave) {
            window.__miniRejectNextSave = false;
            throw new Error("Test save failed");
          }
          saves.push(payload.preferences);
          return { preferences: { ...preferences, ...payload.preferences }, applied: true, reconnectRequired: false, message: "Saved and applied." };
        }
        if (command === "start_mock_stream") {
          window.setTimeout(() => {
            eventChannel?.onmessage?.({
              kind: "connection",
              connected: true,
              streaming: options.lslHealthy,
              deviceName: session.deviceName,
              modelCode: "MOCK",
              message: "Publishing synthetic data",
            });
          }, 0);
          window.setTimeout(() => {
            eventChannel?.onmessage?.({
              kind: "samples",
              ecgSamples: app.kind === "polar" ? 39 : 0,
              accSamples: app.kind === "polar" ? 60 : 0,
              heartRatePackets: app.kind === "polar" ? 1 : 0,
              metricSamples: app.kind === "vernier" ? 6 : 0,
              vernierRows: app.kind === "vernier" ? 6 : 0,
              droppedBatches: 0,
              queueHighWater: 0,
              lsl,
            });
          }, 40);
          return session;
        }
        if (command === "disconnect_device") return { ...session, connected: false, lsl: "Off" };
        if (command === "scan_devices") {
          if (options.scanError) throw { code: "BLUETOOTH_UNAVAILABLE", message: "No Bluetooth Low Energy adapter was found.", retryable: true };
          return app.kind === "vernier"
            ? [{ id: "gdx-rb-1", name: "GDX-RB 1234", modelCode: "GDX-RB", rssi: -52 }]
            : [];
        }
        if (command === "connect_device") {
          eventChannel?.onmessage?.({ kind: "connection", connected: true, deviceName: "GDX-RB 1234", message: "Publishing Vernier" });
          return { ...session, connected: true, deviceId: payload.deviceId, deviceName: "GDX-RB 1234" };
        }
        return null;
      }

      window.__TAURI__ = {
        core: { Channel, invoke },
        window: { getCurrentWindow: () => ({ minimize: async () => {} }) },
      };
    },
    { app, options },
  );
  return page;
}

function appUrl(app) {
  return pathToFileURL(path.join(root, "apps", `${app.kind}-stream-mini`, "ui", "index.html")).href;
}

async function frameState(page) {
  return page.locator(".node-surface").evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      animation: style.animationName,
      border: style.borderTopColor,
      radius: style.borderTopLeftRadius,
      shadow: style.boxShadow,
    };
  });
}

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - window.innerWidth,
    vertical: document.documentElement.scrollHeight - window.innerHeight,
  }));
  if (overflow.horizontal > 0 || overflow.vertical > 0) {
    await page.screenshot({ path: path.join(outputDirectory, "mini-overflow.png"), fullPage: true });
  }
  assert.ok(overflow.horizontal <= 0, `horizontal overflow: ${overflow.horizontal}px`);
  assert.ok(overflow.vertical <= 0, `vertical overflow: ${overflow.vertical}px`);
}
