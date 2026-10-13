# Verification and readiness gates

Evidence must match the claim. Missing dependencies, credentials, hardware, or
runtime access produce `BLOCKED` or `NOT RUN`, never `VERIFIED`.

## Result vocabulary

- `VERIFIED`: the named check directly observed the claimed surface and passed.
- `PARTIAL`: some required evidence passed and the missing scope is named.
- `BLOCKED`: a concrete external or authority blocker prevented the check.
- `NOT RUN`: the check was intentionally not applicable or not attempted, with
  the reason stated.

## Gate 0: bootstrap readiness

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File for-ai/scripts/check-context.ps1 -ProjectRoot . -RequireRemote
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Pass when the context checker succeeds, the intended tree is clean, and local
`HEAD` equals `origin/main`.

## Gate 1: task contract

Before implementation, name:

- the observable user outcome;
- affected product surface and owner;
- acceptance criteria;
- focused check that can fail for the requested behavior;
- broader checks required by affected boundaries;
- explicitly deferred work.

## Gate 2: focused change

Run the narrowest real check for the change. A syntax check proves syntax; a
unit test proves its tested logic; neither proves UI, deployment, hardware,
performance, safety, or scientific validity unless it directly observes that
surface.

```powershell
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
node --check apps/polar-stream-mini/ui/app.js
node --check apps/vernier-stream-mini/ui/app.js
npm run validate:minis
npm run validate:docs
cargo run -p polar-h10-metrics --example export_catalog -- docs/metric-catalog.js --check
```

Mini UI validation must check width-only and height-only resizing at the
minimum and large sizes: control groups keep their order while spacing and
Pretext-checked type scale with both dimensions. Neither main window may show
a page or status scrollbar, and overlong status values must remain reachable in
the full-text dialog. The metric picker and device-search dialogs have their
own layout gate.

## Gate 3: integrated readiness

For ADR processing/output changes, build `verify_adr_lsl` in
`polar-h10-output` and run it against the bundled liblsl in `separate`,
`single`, and `both` modes. Concurrently run `scripts/verify_adr_lsl.py` in the
matching mode using official pylsl. This observes wall-clock-paced metric
generation, selected candidate outlets, companion/raw streams, the optional
combined outlet with selected metrics alongside individual outlets, metadata,
and source timestamps.
It does not establish physical respiratory agreement. See
[`docs/adr-waveforms.md`](../docs/adr-waveforms.md) for commands and contracts.

Run proportionate build, test, lint, type, runtime, visual, device, security,
and compatibility checks for every affected boundary. Do not run an expensive
or irrelevant full matrix for a documentation-only edit.

For LSL output or metadata changes, independently read representative Polar and
Vernier outlets with pylsl and check source timestamps, channel count/order,
labels, units, format, nominal rate, source identity, and processing/validity
metadata. Include raw, derived, quality, and sparse combined outlets. For a
cross-project compatibility claim, make short Polar and Vernier mock recordings
with Respyra's bundled recorder in an isolated desktop; retain each XDF, its
matching BIDS output, producer/recorder revisions, and XDF hash outside Git.
First run Respyra's `tests/check_xdf_mne_compatibility.py` on each actual XDF
with `--xdf`, `--resample-hz`, `--require-metadata`,
`--require-run-metadata`, and `--mnelab`, using the pinned command in
Respyra's verification contract. This must open
every nonempty numeric Mini and Respyra stream directly as MNE Raw from XDF,
check ordered channel labels/units and source timestamps, parse Respyra
markers as MNE annotations, and open the selected raw stream through MNELAB's
XDF importer. Irregular streams require an explicit analysis grid; keep their
exact timestamps in XDF. Do not treat a BIDS-export pass as
proof that the XDF itself was opened by MNE.
Run Respyra's `tests/check_bids_compatibility.py` for each XDF and matching
`_events.tsv` using the exact command in Respyra's `for-ai/VERIFICATION.md`.
Require zero BIDS validator errors, MNE-BIDS path parsing, and MNE Raw readback
of every eligible numeric stream; irregular streams need an explicit resampling
rate. Verify actual XDF-to-BIDS timestamps, channel values, order, labels,
units and marker events, not just file names. Keep
irregular/sparse samples and status markers identifiable; never claim that an
unrecorded outlet, missing samples, or an approximate rate is a regular trace.
Exact large integer values belong to XDF/BIDS tables because MNE Raw stores
floating-point arrays. The Mini apps do not write participant BIDS files
themselves; XDF itself is not BIDS-valid or a direct
`mne_bids.read_raw_bids` input. A retained mock XDF may be reused only while
its LSL producer and
Respyra recorder/export contracts are unchanged; physical devices and installed
apps need separate qualification.

For a release or package change, build each affected app's own Tauri package,
verify bundled resources, and launch the installed copy without replacing the
other product. Compare installed executables against copies extracted from the
finalized installer: Tauri patches bundle metadata, so the loose build binary
can differ. Report physical H10/Vernier and non-Windows checks separately.
For Pages changes, verify the generated catalog, browser layout/filter behavior,
and the live deployed URL at the published commit.

## Gate 4: publication

1. Review status and diff; preserve unrelated changes.
2. Confirm only intended paths are staged.
3. Confirm all required gates passed or are honestly reported.
4. Create one coherent commit under normal repository policy.
5. Push without force and without bypassing protection or secret scanning.
6. Verify the remote commit and required CI/deployment for that exact SHA.

## Handoff evidence

Report exact commands or observed surfaces, results, untested scope, commit SHA,
remote synchronization, CI/deployment state, and whether `for-ai/` changed.

## 2026-10-13 suite stream-protocol evidence

The parent Respyra checkout records this change in
for-ai/verified/stream-protocol-20261013.md: 60 metrics, 47 output and 16 runtime
library tests; default all-target clippy; three real LSL modes and actual
Respyra bundled-input readback; private native XDF/BIDS/MNE round trips; and
headless Chrome --streams default/reset/picker/mock checks. The optional
Rusty backend compile check passes with an unused provenance-helper warning;
no live optional-backend, new physical-device or installed-suite claim is made.
