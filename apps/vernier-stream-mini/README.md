# Vernier Stream Mini

Standalone one-device Vernier Go Direct BLE-to-LSL applet. The UI is
intentionally a compact transparent-shell window with its own install,
settings, and process.

- Default outputs: metadata-defined raw Go Direct channels and the derived
  Vernier breathing waveform.
- Modes: canonical separate LSL streams or one sparse fixed-channel LSL stream.
- For exact force/breathing sample timing, use separate streams. The single
  sparse mode preserves acquisition order and clamps overlapping channel
  timestamps to the next microsecond; it does not add full sample periods or
  drift into the future.
- Changing mode or stream name replaces active LSL outlets without disconnecting
  the sensor or pausing its sample worker. If replacement fails, the previous
  healthy outlets continue publishing.
- Startup: opt-in **Start with PC** registration plus default automatic
  reconnection to the last successfully connected Go Direct device.
- Memory: app-local stream name, output mode, reconnect preference, and last
  Vernier device.
- Multi-device use: launch multiple app instances.
- Mocking: **Mock** launches an independent, automatically streaming applet
  with deterministic 20 Hz force/breathing data and real LSL publication. Its
  PID-suffixed stream name and settings are session-only.
- Without a connected Go Direct sensor, the regular app does not publish
  invented measurements; use the clearly labeled Mock window for synthetic data.
- Live state: after samples are flowing through a healthy LSL outlet, the three
  outline rings emit a restrained breathing beacon; connected-only state does
  not animate.
- Logo: `icons/app-icon.svg`, preserving the original Polar Stream geometry and
  changing only its palette to Vernier teal, orange, and white.
