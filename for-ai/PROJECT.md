# Project contract

## Purpose

Standalone Polar H10 and Vernier Go Direct mini streamers for low-latency BLE-to-LSL publishing.

## Primary goal

Develop and release two independent desktop mini streamers, Polar Stream Mini
and Vernier Stream Mini. Publish experimental variables in identifiable LSL
streams, bundling same-timestamp quality/readiness and acquisition diagnostics.
Fresh Polar preferences select ECG/ACC/HR/RR, signed PCA and detrended chest
motion with their intrinsic supporting channels, breath phase and Link events.
Fresh Vernier preferences select the complete raw measurement row and Link
events. Other metrics, scalar copies and All-in-one remain optional. Preserve
operator opt-outs and keep the raw BLE-to-LSL paths observable and fast.

Respyra 2.0 consumes Vernier Force in newtons or either supported signed Polar
chest-motion waveform in g. Preserve physical units, source identity and
processing/readiness metadata; Respyra owns polarity and range calibration.
Reference: [Respyra 2.0](https://github.com/GeorgeFejer91/respyra-2.0).

Make published numeric outlets usable in Respyra's recorded XDF through PyXDF
and MNE and through its separate BIDS export. Preserve original timestamps,
channel order, labels, roles, physical or explicit unitless units, sample format,
nominal rate (zero when irregular) and processing provenance. XDF is the archive
and direct MNE import target; separate BIDS files use the export contract. Do
not invent physiology across missing samples or irregular acquisition.

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
LSL variable bundles; old respiratory IDs have no aliases.
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
Flowborne phase with quality/readiness bundled inside the waveform outlets; All-in-one and other derived
metrics start off. The picker's Use study defaults action explicitly restores
this selection; fresh Vernier preferences select `rawVernier` and `signalStatus`.
The other six outputs remain optional. Standalone Mini upgrades preserve saved
choices; the Respyra suite installer resets output choices to study defaults.
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

Factory stream prefixes in the updated source are Polar and Vernier. D-0011 retains the essential default selection; D-0012 fixes visible producer prefixes, rawECG/rawACC names and custom identifiers after the producer prefix. D-0014 names the full Vernier row rawForce and its optional scalar copy rawForceOnly. Historical factory source IDs and metric IDs stay stable. Mini 0.6.11 is the candidate that ships this naming/bundle contract; verify the exact installed artifact before promotion.
