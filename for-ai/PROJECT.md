# Project contract

## Purpose

Standalone Polar H10 and Vernier Go Direct mini streamers for low-latency BLE-to-LSL publishing.

## Primary goal

Develop and release two independent desktop mini streamers, Polar Stream Mini
and Vernier Stream Mini that make it easy and reliable to select and publish
every available device measurement, axis, and app metric through an
individually identifiable, single-channel LSL outlet. Each app should also
offer one optional multi-channel All-in-one outlet that bundles the individual
outputs the user has chosen to send. Fresh Polar preferences select direct ECG/ACC/HR/RR, the two Respyra-compatible
PCA and signed Phan waveforms, Flowborne phase and required validity/quality
companions, without All-in-one; Vernier keeps every outlet selected. Respect
later user opt-outs. Keep the
raw BLE-to-LSL paths observable and fast. Keep accelerometer-derived
respiration (ADR) candidates explicitly identified with readiness/quality
companions while retaining finite diagnostic values. This is the product
goal; the current output topology below is not yet fully aligned with it.

Respyra 2.0 is a downstream use case, not part of this repository. Its present
study input is Vernier raw Force in newtons. Preserve that compatibility and
investigate whether a Polar accelerometer-derived breathing signal can meet
the same consumer contract for units, channel metadata, sample format, and
timing. Do not present raw acceleration as Vernier Force or claim
interchangeability before a defined conversion and validation. Reference:
[Respyra 2.0](https://github.com/GeorgeFejer91/respyra-2.0).

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
Fresh preferences enable Polar raw ECG/ACC, heart rate and RR, and Vernier's
complete raw numeric row (including force). Operators can uncheck any outlet.
Four continuous ADR candidates use dedicated
scalar LSL outlets; old respiratory IDs have no aliases.
JavaScript is presentation and control, never the authoritative data path.
Both frameless mini windows resize from their visible panel edges. Their control
groups retain their order while spacing and type scale with width and height;
Pretext checks the type fit. The document stays within the window; Polar's
control area scrolls if its selected metrics exceed the screen or the user
shrinks the window. Overlong status
values open in a full-text dialog instead of enlarging the panel.
The Polar metric picker overlays the current window without changing its size.
Vernier offers its raw numeric row, individual outlets and an independent
all-in-one sparse outlet; the
latter can coexist with any individual selection.
Polar offers raw outlets and selected derived metric outlets, and an
independent all-in-one sparse outlet containing raw values and the selected
derived metrics.
Its compact UI shows raw outlets checked on first launch and editable, the
selected derived streams, and the All-in-one option. The panel grows when
selected streams need more room, up to the available screen height; manual
resizing remains possible. The All-in-one box controls only the
additional combined outlet. The expanded picker exposes all Polar
Mini-selectable derived metrics. Fresh Polar
preferences select the four direct SDK outputs, Chest Motion, Chest Motion DT,
Flowborne phase and their required companions; All-in-one and other derived
metrics start off. The picker's Use study defaults action explicitly restores
this selection; fresh Vernier preferences select every available outlet;
saved choices remain authoritative after an upgrade.
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
