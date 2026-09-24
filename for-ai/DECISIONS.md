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
- Status: Accepted
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
- Supersedes: None

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
