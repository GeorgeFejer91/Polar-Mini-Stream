# Project contract

## Purpose

Standalone Polar H10 and Vernier Go Direct mini streamers for low-latency BLE-to-LSL publishing.

## Primary goal

Develop and release two independent desktop mini streamers, Polar Stream Mini
and Vernier Stream Mini. Keep their raw BLE-to-LSL paths observable and fast;
keep accelerometer-derived respiration (ADR) candidates explicitly identified
with readiness/quality companions while retaining finite diagnostic values.

## Non-goals

- No large multi-device controller or browser demo in this repository. The
  GitHub Pages site documents these two applets and their metrics.
- No second protocol decoder, metric catalog, or output implementation in the
  WebView.
- No physiological accuracy claim without an independent reference recording.
- Recording policy and Respira consumption belong to external projects.

## Product/control-plane boundary

- Product source and deliverables: `apps/`, `crates/`, `scripts/`, and `docs/`.
- Agent orchestration and durable project memory: `for-ai/`.
- Local generated diagnostics and scratch evidence: `.for-ai-local/` (ignored).

## Architecture and ownership

The Rust 2024 Cargo workspace contains two Tauri v2 applications:
`apps/polar-stream-mini` and `apps/vernier-stream-mini`. Each owns its own
window, BLE session, preferences, executable, and installer. Shared
`crates/stream-mini-runtime` owns one-session lifecycle and LSL publication;
the other crates own Polar and Vernier protocol, timing, metrics, and output
contracts. Raw sensor publication precedes derived metrics and UI delivery.
Polar raw ECG/ACC and Vernier's complete raw numeric row (including force) are
mandatory when available. Four optional continuous ADR candidates use dedicated
scalar LSL outlets; old respiratory IDs have no aliases.
JavaScript is presentation and control, never the authoritative data path.
Both frameless mini windows resize from their visible panel edges; the panels
reflow with window size, and long status text can extend into vertical scroll.
The Polar metric picker overlays the current window without changing its size.
Vernier publishes its raw numeric row continuously and offers optional individual
outlets plus an independent all-in-one sparse outlet; the latter can coexist
with any individual selection.
Polar keeps its raw outlets and selected derived metric outlets, and offers an
independent all-in-one sparse outlet containing raw values and every available
Polar Mini metric, regardless of individual outlet selections.
Its compact UI shows required raw outlets as checked, locked boxes; the
All-in-one box controls only the additional combined outlet. The expanded
picker exposes all Polar Mini-selectable derived metrics.
Saved Single-mode preferences for either app migrate to the additional outlet.
The Pages metric catalog is generated from Rust definitions; the site documents
the separate Vernier force-to-waveform path alongside the Polar catalog.

The standalone apps came from `GeorgeFejer91/Polar-Stream` on 2026-09-24.
That older repository remains separate; this repository is the development
home for the mini products. Existing bundle IDs and app-local preference paths
are retained to preserve installed-user continuity.

## Current verified state

- Fresh Git repository initialized on 2026-09-24.
- AI control plane created and mechanically checked.
- Version 0.6.1 passed Windows host `cargo test --workspace --locked`, Clippy,
  formatting, JS syntax, Mini and Docs Playwright validation, metric catalog
  drift, and the context check on 2026-09-24. Both separate x64 NSIS installers
  built from this checkout, installed into their distinct app folders, and
  launched concurrently. Installed mock instances produced Polar ECG, HR, RR,
  and ACC samples and Vernier samples over LSL. Physical BLE acquisition,
  respiratory accuracy, and non-Windows behavior remain unverified.
- A live GDX-RB (firmware 5.3) exposed Force, Respiration Rate, Steps, and
  Step Rate through Go Direct BLE metadata and samples. It exposed no raw
  X/Y/Z channels across the 32 standard sensor slots. Hardware internals and
  undocumented interfaces remain unverified.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
