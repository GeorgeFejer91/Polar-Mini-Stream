# Polar Mini Stream

Two standalone desktop applets publish sensor data to Lab Streaming Layer
(LSL): **Polar Stream Mini** for a Polar H10 and **Vernier Stream Mini** for a
Go Direct sensor. Each process owns one BLE connection, its own preferences,
LSL outlets, and installer. Open more than one instance to stream more sensors.

The apps came from [Polar Stream](https://github.com/GeorgeFejer91/Polar-Stream).
This repository is their primary development home. It keeps the two mini
apps and the Rust crates they share; the larger controller and browser demo
remain in the original repository. Existing bundle IDs and preference paths
are retained so installed applets can be upgraded without changing identity.

[Metrics and signal-flow guide](https://georgefejer91.github.io/Polar-Mini-Stream/) ·
[Windows installers](https://github.com/GeorgeFejer91/Polar-Mini-Stream/releases/latest)

## Apps

- [Polar Stream Mini](apps/polar-stream-mini/README.md) publishes raw ECG,
  X/Y/Z acceleration, heart rate, RR intervals, and selected derived metrics.
  Raw ECG and acceleration start selected on first launch. Four continuous
  [accelerometer-derived respiration (ADR) waveforms](docs/adr-waveforms.md)
  implement PCA, Flowborne-style moving averages, and two Phan-window variants.
- [Vernier Stream Mini](apps/vernier-stream-mini/README.md) starts with the
  belt's numeric channels, including raw force, selected. Other outputs are a force-only
  copy, app-derived 0–1 breathing waveform, signal-status markers, and individual Steps, Step
  Rate, and Respiration Rate outputs. Every selection change saves automatically
  and becomes the next launch's default. The
  [signal reference](https://georgefejer91.github.io/Polar-Mini-Stream/#vernier-outputs)
  distinguishes device values from app processing.

Both apps publish individual LSL outlets and can add one sparse All-in-one
outlet alongside them. Polar starts with ECG, ACC, native HR/RR, PCA breathing, Phan breathing,
Flowborne phase and required quality/validity companions; All-in-one starts off. Vernier starts with all
eight outlets selected. Users can uncheck any outlet. Selected ADR waveforms and
their diagnostics retain dedicated outlets. These apps create streams;
recording belongs to an external LSL recorder.
Their **Mock** windows publish clearly labeled synthetic data through the
production output path. Derived breathing metrics are research estimates;
physical validation against a respiratory reference remains open.

## Develop

Requirements: Rust 1.88 or newer, Node.js/npm, and the platform tooling for
Tauri v2. The checked-in Windows resources support the Windows host build.
For another OS, stage the pinned liblsl runtime with
`scripts/prepare_lsl.py` into each app's `resources/` directory (use
`--output apps/vernier-stream-mini/resources` for Vernier) before packaging.

```powershell
npm ci
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
npm run validate:minis
npm run validate:docs
cargo run -p polar-h10-metrics --example export_catalog -- docs/metric-catalog.js --check
```

Build each app from its own directory, for example:

```powershell
cd apps/polar-stream-mini
npm exec -- tauri build --bundles nsis --ci
```

Use `apps/vernier-stream-mini` for the Vernier package. After catalog changes,
regenerate the Pages data with:

```powershell
cargo run -p polar-h10-metrics --example export_catalog -- docs/metric-catalog.js
```

The site is published from `docs/` on `main`; installer binaries are GitHub
Release assets, not Git blobs. Agent context starts at
[for-ai/README.md](for-ai/README.md).
