# Project contract

## Purpose

Standalone Polar H10 and Vernier Go Direct mini streamers for low-latency BLE-to-LSL publishing.

## Primary goal

Develop and release two independent desktop mini streamers, Polar Stream Mini
and Vernier Stream Mini. Keep their raw BLE-to-LSL paths observable and fast;
keep derived breathing outputs explicitly identified and quality gated.

## Non-goals

- No large multi-device controller or browser demo in this repository. The
  GitHub Pages site documents these two applets and their metrics.
- No second protocol decoder, metric catalog, or output implementation in the
  WebView.
- No physiological accuracy claim without an independent reference recording.

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
JavaScript is presentation and control, never the authoritative data path.
The Pages metric catalog is generated from Rust definitions; the site documents
the separate Vernier force-to-waveform path alongside the Polar catalog.

The standalone apps came from `GeorgeFejer91/Polar-Stream` on 2026-09-24.
That older repository remains separate; this repository is the development
home for the mini products. Existing bundle IDs and app-local preference paths
are retained to preserve installed-user continuity.

## Current verified state

- Fresh Git repository initialized on 2026-09-24.
- AI control plane created and mechanically checked.
- The extracted workspace passed Windows host `cargo test --workspace
  --locked`, Clippy, formatting, JS syntax, and Mini Playwright validation on
  2026-09-24. Both x64 NSIS installers built from this checkout. Mock processes
  launched from the resulting binaries and advertised distinct Polar and
  Vernier LSL outlets concurrently. These checks do not establish physical
  BLE, respiratory accuracy, non-Windows runtime, or installed-package
  behavior for this repository's artifacts.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
