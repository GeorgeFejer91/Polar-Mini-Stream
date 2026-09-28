# Polar Stream Mini

Standalone one-device Polar H10 BLE-to-LSL applet. The UI is intentionally a
compact transparent-shell window with its own install, settings, and process.

- Mandatory outputs when available: raw ECG, raw accelerometer, heart rate,
  and RR intervals. The mini window shows these as checked, locked checkboxes.
- Optional outputs: Polar metrics including Excite-O-Meter and four continuous
  accelerometer-derived respiration (ADR) candidates: signed PCA projection,
  Flowborne-style moving-average difference, signed Phan-window difference,
  and the original rectified Phan score. Readiness/quality companions are added
  with each candidate. Phase, rate, and dynamics remain separate metrics.
  See [`docs/adr-waveforms.md`](../../docs/adr-waveforms.md).
- Checking a realtime metric saves it as a default for future launches and
  applies it to its individual LSL outlet. **Reset metrics** clears optional
  metric selections while keeping raw ECG, ACC, heart rate, RR, and the
  All-in-one choice. **Add more metrics** opens the full Polar Mini selection
  catalog over the current window.
- Resize the applet from any edge or corner. Controls grow and reflow with the
  window without a main-window scrollbar. An overlong status value can be
  opened in a full-text dialog by clicking it or pressing Enter while focused.
- Optional **All-in-one recording stream** adds one sparse fixed-channel LSL
  outlet alongside the individual outlets. Its checkbox is the sole control for
  that extra stream. It includes raw ECG, ACC, heart
  rate, RR, signal events, and every available Polar Mini derived metric,
  including ADR, independently of the individual metric choices.
  Missing fields in each row are NaN. Individual outlets retain their own
  timing for feedback; the combined outlet preserves acquisition order and
  clamps overlapping timestamps to the next microsecond.
- Saved Single-mode preferences migrate to separate outlets plus All-in-one.
- Changing the All-in-one choice, stream name, or optional metrics replaces active LSL outlets
  without disconnecting the H10 or pausing its sample worker. If replacement
  fails, the previous healthy outlets continue publishing.
- Startup: opt-in **Start with PC** registration plus default automatic
  reconnection to the last successfully connected H10.
- Memory: app-local stream name, reconnect preference, selected
  metrics, and last H10.
- Multi-device use: launch multiple app instances.
- Device battery: a miniature battery icon and percentage in the title bar,
  immediately left of minimize and close, show the reading reported at
  connection. The meter is red at 0–20%, orange at 21–50%, and green at 51–100%.
  `—` means disconnected or unavailable; mock windows hide the indicator.
- Mocking: **Mock** launches an independent, automatically streaming applet.
  Its 130 Hz ECG replays a bundled, 60-minute NeuroKit2 ECGSYN recording and
  loops after one hour. ACC (200 Hz), HR/RR, and derived metrics remain
  synthetic. All mock outputs use real LSL publication; its PID-suffixed
  stream name and settings are session-only. Regenerate the ECG fixture with
  `python scripts/generate_polar_mini_mock_ecg.py` and NeuroKit2 0.2.13.
- Without a connected H10, the regular app does not publish invented sensor
  measurements; use the clearly labeled Mock window for synthetic data.
- Live state: after samples are flowing through a healthy LSL outlet, the three
  outline rings emit a restrained breathing beacon; connected-only state does
  not animate.
- Logo: `icons/app-icon.svg`, preserving the original Polar Stream geometry and
  changing only its palette to Polar red, black, and white.
