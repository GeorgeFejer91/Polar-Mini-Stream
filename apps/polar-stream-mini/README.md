# Polar Stream Mini

Standalone one-device Polar H10 BLE-to-LSL applet. The UI is intentionally a
compact transparent-shell window with its own install, settings, and process.

- Mandatory outputs when available: raw ECG, raw accelerometer, heart rate,
  and RR intervals.
- Optional outputs: Polar metrics including Excite-O-Meter and four continuous
  accelerometer-derived respiration (ADR) candidates: signed PCA projection,
  Flowborne-style moving-average difference, signed Phan-window difference,
  and the original rectified Phan score. Readiness/quality companions are added
  with each candidate. Phase, rate, and dynamics remain separate metrics.
  See [`docs/adr-waveforms.md`](../../docs/adr-waveforms.md).
- Checking a realtime metric saves it as a default for future launches and
  applies it to the active LSL output. **Reset metrics** clears all optional
  selections while keeping raw ECG, ACC, heart rate, and RR.
- Modes: canonical separate LSL streams or one sparse fixed-channel LSL stream.
  Selected ADR metrics always have dedicated scalar outlets in either mode.
- For exact ECG/ACC sample timing, use separate streams. The single sparse mode
  preserves acquisition order and clamps overlapping channel timestamps to the
  next microsecond; it does not add full sample periods or drift into the future.
- Changing mode, stream name, or optional metrics replaces active LSL outlets
  without disconnecting the H10 or pausing its sample worker. If replacement
  fails, the previous healthy outlets continue publishing.
- Startup: opt-in **Start with PC** registration plus default automatic
  reconnection to the last successfully connected H10.
- Memory: app-local stream name, output mode, reconnect preference, selected
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
