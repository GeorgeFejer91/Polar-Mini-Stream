# Decision log

Record only durable choices whose rationale future agents would otherwise have
to rediscover. Source and tests remain the authority for implementation facts.

## D-0001 — Minimal control plane before product scaffolding

- Date: 2026-09-24
- Status: Accepted
- Context: The project needs a predictable AI entrypoint without choosing an
  application stack or inventing product structure prematurely.
- Decision: Use a short root `AGENTS.md` that routes to a lowercase `for-ai/`
  control plane. Keep product output outside that folder and add project files,
  skills, and protocols only for current requirements.
- Consequences: New agents get a reliable map and readiness gates. The first
  product task must still choose the smallest suitable output structure.
- Supersedes: None

## D-0002 — Standalone mini streamers own this repository

- Date: 2026-09-24
- Status: Accepted
- Context: The user chose both mini streamers as the primary project in a new
  public repository, while the older Polar Stream checkout contains the large
  controller, browser demo, and extensive uncommitted work.
- Decision: Copy the two mini apps and their existing shared Rust crates into
  `Polar-Mini-Stream` on `main`, preserving app bundle IDs, metric IDs, LSL
  names, and app-local preferences. Leave the larger controller and browser
  surfaces in the original repository.
- Consequences: New work can prioritize the independent mini products. Shared
  crates initially retain some controller-era code to avoid an unsafe protocol
  or metric rewrite during extraction; prune only with separate tests.
- Follow-up: D-0007 supersedes preservation of respiratory IDs only.
- Supersedes: None

## D-0003 — Publish source-derived metric docs and binary releases

- Date: 2026-09-24
- Status: Accepted
- Context: Both applets need public installers and a concise, traceable guide
  to their signal transformations and LSL outputs.
- Decision: Publish Pages from `docs/` on `main`. Generate its Polar metric data
  from the Rust catalog; document Vernier's separate output contract directly.
  Distribute Windows installers as tagged GitHub Release assets with checksums.
- Consequences: Catalog drift has a documented check command. Publications
  are labeled as origins or related methods rather than validation of H10
  adaptations.
- Supersedes: The initial Pages non-goal in `PROJECT.md`.

## D-0004 — Vernier outputs are selected independently of acquisition

- Date: 2026-09-24
- Status: Superseded
- Context: Users need to include any combination of the belt's full channel row,
  Force-only compatibility signal, app-derived breathing waveform, and
  signal-continuity markers without confusing these with separate sensors.
- Decision: Persist any nonempty subset of `rawVernier`, `rawForce`,
  `vernierBreathing`, and `signalStatus`. Select LSL outlets or sparse columns
  using that subset; stage live output changes without reconnecting BLE. Keep
  the device's documented Force, Respiration Rate, Steps, and Step Rate distinct
  from the app-derived waveform. Do not advertise raw ACC from GDX-RB.
- Consequences: Existing preferences default to all four outputs. Outlet
  topology can change while the physical acquisition session stays alive;
  clients must rediscover an outlet whose channel contract changes.
- Supersedes: None; superseded by D-0005 for the selectable output set.

## D-0005 — Expose the two device pedometer variables separately

- Date: 2026-09-24
- Status: Accepted
- Context: The GDX-RB's Go Direct metadata and live samples expose Steps and
  Step Rate, while raw pedometer X/Y/Z axes are not exposed. Users need to
  select and identify these two device variables without selecting the full
  raw channel row.
- Decision: Add optional `steps` and `stepRate` selections to Vernier Mini.
  Preserve the four existing default selections. Forward only metadata-matched
  device samples; include either separate outlets or sparse Single-mode columns.
  Document all GDX-RB channel and recording variable names on Pages.
- Consequences: Existing preferences keep their four selected outputs.
  Enabling either pedometer stream changes LSL outlet or column topology, so
  clients must rediscover the new contract.
- Supersedes: D-0004's four-output selection set; its acquisition and
  live-reconfiguration decisions remain in force.

## D-0006 — Select every belt signal and restore the latest saved state

- Date: 2026-09-26
- Status: Accepted
- Context: Each GDX-RB device variable needs an individual checkbox, and users
  expect their most recent choices to become the next launch's defaults.
- Decision: Add optional `respirationRate` alongside Force, Steps, and Step Rate.
  Use compact inline checkboxes inside the mini window.
  Retain the four original first-launch selections and existing saved subsets.
  Save every checkbox change through the native preferences owner; serialize
  renderer writes and keep the confirmed snapshot independent of UI edits.
  Reload the last successful state on startup. Mock settings stay session-only.
- Consequences: Separate and Single LSL contracts include the selected signals
  only when the device reports samples. Failed saves restore confirmed UI state.
  Pages documents variable names, units, device schedules, and automatic memory.
- Follow-up: D-0007 makes the full raw row mandatory; other choices remain optional.
- Supersedes: Extends D-0005's optional output set; its acquisition decisions
  remain in force.

## D-0007 — Publish live ADR candidates alongside mandatory raw signals

- Date: 2026-09-27
- Status: Accepted
- Context: Paired Vernier/Polar experiments need recorded evidence of live
  candidate waveform production before future Respira integration.
- Decision: Publish optional signed PCA, Flowborne-style moving-average,
  signed Phan-window, and original rectified Phan waveforms as dedicated scalar
  LSL outlets in both modes. Use ADR method names without old aliases. Include
  selected candidates' readiness/quality companions and immutable provenance.
  Retain finite diagnostic values when invalid; never invent absent raw data.
  Make raw Polar ECG/ACC and Vernier raw channels mandatory when available.
  External projects own recording, markers, and Respira calibration/selection.
- Consequences: Raw selections cannot be disabled. Former respiratory IDs must
  be selected again under their new names. Single mode has dedicated ADR
  outlets in addition to its combined raw/non-ADR outlet. Synthetic online LSL
  checks demonstrate software behavior; participant validation remains separate.
- Supersedes: D-0002's preservation of respiratory IDs and D-0006's optional
  full raw Vernier row. Other acquisition and preference decisions remain.

## D-0008 — Keep individual outlets while offering a recording bundle

- Date: 2026-09-28
- Status: Implemented; target bundle composition superseded by D-0009
- Context: Feedback consumers need individually timed outlets while an LSL
  recorder can take one sparse stream. A mode switch forced a choice between
  those uses.
- Decision: Offer an independent All-in-one outlet in each mini and remove
  the mode switch from both UIs. Polar's bundle contains raw H10 signals,
  signal events, and every available Polar Mini derived metric, including ADR,
  regardless of individual selections; selected ADR values also keep their
  individual outlets. Vernier's bundle contains all
  device channels regardless of individual selections. Keep the mandatory raw
  outlets, including the Respyra-required Vernier raw Force channel. Migrate
  saved Single-mode preferences to separate outlets plus All-in-one.
- Consequences: Sparse bundles use NaN for fields absent on a row. Exact
  per-signal timing remains on individual outlets; external recorders own file
  capture. The legacy Single path remains available internally for old tests.
- Supersedes: D-0007's user-facing Single-mode arrangement. Its raw and ADR
  outlet requirements remain.

## D-0009 — Make scalar outlets primary and bundle the chosen outputs

- Date: 2026-09-29
- Status: Target contract; implementation pending
- Context: The two mini apps should expose everything their devices can deliver
  as easy-to-use, reliable LSL outputs. Users also want one combined stream for
  the outputs they have chosen. Respyra 2.0 is an external use case for breathing
  input from Vernier and potentially Polar.
- Decision: Aim for one single-channel outlet per available device variable,
  axis, and app metric, with clear identity, units, and source timing. Offer one
  optional multi-channel All-in-one outlet per app whose channels correspond to
  the individual outputs selected for publication, including required raw
  outputs.
  Investigate a Polar ACC-derived breathing output compatible with Respyra's
  Vernier input contract; require an explicit transformation and validation
  before treating the inputs as interchangeable. Respyra remains an external
  consumer; `PROJECT.md` links its repository.
- Consequences: The present raw multi-channel outlets and all-metrics bundles
  remain current implementation, not proof of this target. Future output work
  must reconcile their topology, selection, metadata, and compatibility without
  silently changing consumers' existing LSL contracts.
- Supersedes: D-0008's bundle-content policy as a future target; retains its
  independent optional bundle and current implementation history.

## Record format

For later decisions, add one compact entry with:

- identifier and title;
- date and status (`Proposed`, `Accepted`, `Superseded`, or `Rejected`);
- context;
- decision;
- consequences;
- supersession link when applicable.

Do not rewrite accepted history to hide a changed direction. Add a superseding
decision and link both entries.
