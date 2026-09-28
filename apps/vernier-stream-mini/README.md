# Vernier Stream Mini

Standalone one-device Vernier Go Direct BLE-to-LSL applet. The UI is
intentionally a compact transparent-shell window where the detached Polar
Stream node card is the visible program outline, not the main controller
workspace.

Eight outlet checkboxes sit directly inside the mini window. The first,
**Respyra raw**, is checked and locked: Respyra reads Force in newtons from
this raw device-data outlet. Click any other checkbox or its label to select
an additional stream; changes save instantly. **All-in-one** is last and has
a small merging-stream icon.

Resize the applet from any edge or corner. Controls grow and reflow with the
window; long status text remains reachable by scrolling.

- Default outlets: `rawVernier` (every advertised numeric belt channel plus
  recording diagnostics) and `vernierBreathing` (a relative 0–1 belt-force
  waveform). The raw outlet is mandatory. Individual force, signal events,
  steps, step rate, and breaths/min outlets are optional. Choices persist and
  replace active outlets without restarting Bluetooth.
- Optional `steps`, `stepRate`, and `respirationRate` checkboxes forward the
  belt's cumulative step count, cadence (steps/min), and respiration estimate
  (breaths/min) as their own LSL streams. Together with `rawForce`, all four
  device signals are individually selectable. They
  publish only when those device channels update. The Mock source includes
  synthetic rate/count updates every 10 seconds.
- The documented GDX-RB device channels are Force, Respiration Rate, Steps,
  and Step Rate. Vernier does not document an exposed raw accelerometer channel
  on this belt. Its Force transducer measures tension in a short strap connected
  to the box, not air pressure or lung volume. See the
  [Vernier manual](https://www.vernier.com/manuals/GDX-RB) and the
  [Mini signal reference](https://georgefejer91.github.io/Polar-Mini-Stream/#vernier-outputs).
- Optional **All-in-one** opens one additional sparse fixed-channel LSL stream
  with every device channel, raw diagnostics, the normalized breath wave, and
  signal events. It is independent of the individual outlet choices and does
  not duplicate force, steps, or rates as extra columns. Overlapping channel
  timestamps advance only to the next microsecond; use individual outlets for
  exact per-signal sample timing. Saved Single-mode preferences migrate to this
  choice while retaining their selected individual outlets.
- Changing the output selection or stream name replaces active LSL outlets without disconnecting
  the sensor or pausing its sample worker. If replacement fails, the previous
  healthy outlets continue publishing.
- Startup: opt-in **Start with PC** registration plus default automatic
  reconnection to the last successfully connected Go Direct device.
- Device search shows the Windows system Bluetooth state and offers a radio
  switch. The app requests radio-control access when the switch is used;
  Windows may prompt or deny it. The NSIS installer cannot pregrant it, and
  hardware or policy blocks remain under Windows control.
- Memory: every output checkbox change saves automatically. The last saved
  selection, stream name, reconnect preference, and Vernier device
  are loaded when the regular app next opens. No Apply or Save step is required.
  If a save fails, the UI restores the last successfully saved selection.
- Multi-device use: launch multiple app instances.
- Device battery: a miniature battery icon and percentage in the title bar,
  immediately left of minimize and close, show the reading reported at
  connection. The meter is red at 0–20%, orange at 21–50%, and green at 51–100%.
  `—` means disconnected or unavailable; mock windows hide the indicator.
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
