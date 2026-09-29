# Live accelerometer-derived respiration (ADR)

Polar Stream Mini publishes four optional continuous candidate waveforms from
the H10's raw X/Y/Z accelerometer. Select them under **+ Realtime metrics → ACC
derived**. Each selection adds its required readiness/quality companions.
Raw ECG and ACC remain mandatory outputs whenever samples are available.
Vernier Mini likewise always includes raw force in **Raw data**
(`rawVernier`); **Force only** (`rawForce`) is an optional scalar copy.
The applets publish LSL streams. An external recorder owns recording policy.

## Candidate definitions

For raw acceleration converted from mg to g, let `a(t)` be the three-axis
vector, `u` the fixed learned PCA axis, and `b(t)` its centered, smoothed signed
projection. All windows are causal and use source timestamps.

| Metric ID / LSL suffix | Formula and unit | Origin and interpretation |
| --- | --- | --- |
| `adr_pca_waveform` / `adrPcaWaveform` | `b(t) = dot(EMA(a) − calibration center, u)`, g | Fixed-axis PCA motion waveform. Default axis learning takes 12 s. Retains signed motion and sustained offsets. |
| `adr_moving_average_difference` / `adrMovingAverageDifference` | `(mean_0.267s(b) − mean_2s(b)) / PCA span`, ratio | Flowborne-style two-window contrast applied to the PCA acceleration signal. It approaches zero during a sustained hold. |
| `adr_axis_mean_difference` / `adrAxisMeanDifference` | `dot(mean_0.2s(a) − mean_200s(a), u)`, g | Signed adaptation of Phan's windows using the shared fixed PCA axis. This signed variant is an app-specific adaptation. |
| `adr_axis_difference_magnitude` / `adrAxisDifferenceMagnitude` | `sum(abs(mean_0.2s(a_i) − mean_200s(a_i)))`, g | The original Phan detector's continuous rectified score before event thresholding. Sign is discarded; both respiratory directions can produce peaks. |

These candidates describe acceleration-related motion, not force in newtons,
airflow, displacement, or lung volume. Their common LSL contract makes them
available for a future Respira input adapter; it does not make their amplitudes
physically equivalent to Vernier force. The signed candidates share PCA axis
learning, so they are correlated algorithm variants rather than independent
sensors. PCA sign is initially chosen mathematically, not from inhale labels.
Polarity and participant range belong in later Respira calibration.

The PCA and signed axis-mean outlets are also advertised as separate optional
Respyra input contracts: `respyra-polar-pca/1` and
`respyra-polar-phan-signed/1`. Select either candidate under **+ Realtime
metrics -> ACC derived** to publish its one-channel LSL outlet and validity
companions. The metadata declares inhale polarity unknown; Respyra must set
direction and calibrate the selected waveform before using it for a study.

The existing 0–1 PCA output is named `adr_pca_relative_amplitude`; phase, rate,
and dynamics use the corresponding `adr_*` names. They are distinct from these
four primary waveforms. Former respiratory IDs/suffixes are removed without
aliases; previously saved selections of those IDs need to be selected again.

## LSL contract and readiness

Each primary candidate is a dedicated **one-channel Float32** stream with type
`Respiration`, nominal rate `0` (irregular), and name `<base>_<suffix>`.
It emits one snapshot per accepted ACC notification, timestamped at that
notification's newest sensor sample. Raw ACC continues at its native sample
rate, currently 200 Hz. Candidates therefore have notification-level timing,
not a claimed 200 Hz output rate. No interpolation or acceleration-to-position
integration is performed.

Selected ADR values have dedicated scalar outlets. The optional Polar
All-in-one outlet also includes all available ADR values as sparse columns
alongside raw ECG, ACC, heart rate, RR, and other available metrics, even when
their individual outlets are off. Use individual outlets
for exact per-signal timing. Changing names or selections replaces outlets;
recorder discovery must follow the selected names and metadata.

| Candidate | Automatically selected companions |
| --- | --- |
| PCA waveform / relative amplitude | `adr_pca_quality`, `adr_pca_valid` |
| Moving-average difference | `adr_moving_average_valid`, `adr_pca_quality` |
| Signed axis-mean difference | `adr_axis_difference_valid`, `adr_pca_valid`, `adr_pca_quality` |
| Rectified axis difference | `adr_axis_difference_valid` |

Validity flags are numeric 0/1. PCA validity combines calibration, freshness,
and its motion-quality gate; its quality score is a heuristic, not a probability
of breathing. Moving-average validity also requires its 2 s window and rejects
contrast beyond one PCA span. Axis-difference validity indicates at least 0.2 s
of contiguous samples; the 200 s baseline uses available samples while filling.
For the signed axis difference, both axis-difference and PCA flags apply.

The rectified score starts as soon as real ACC samples arrive. PCA and its signed
dependents wait for axis learning. Partial moving averages and finite values
during poor quality are retained with validity zero. Source gaps and clock
resets reset the relevant windows; absent samples are never invented.
Consumers should retain the flags when evaluating or calibrating candidates.

Every candidate carries `schema=adr-waveform/1`,
`stream_role=respiration_candidate`, `metric_id`, `raw_source_metric_id=raw_acc`,
and the full companion stream names. Its processing metadata includes the
formula, method version, application version, source reference, startup policy,
and axis/filter configuration. Source identity also distinguishes regular and
mock app instances. Recording these descriptors preserves the implementation
that produced each live signal.

## Study workflow and software evidence

1. In Polar Mini, enable `adr_pca_waveform` or
   `adr_axis_mean_difference` under **Realtime metrics → ACC derived**. Their
   required validity outlets are selected automatically.
2. In Respyra 2.0, select that exact Polar outlet as the breathing input and
   choose whether inhalation raises or lowers the waveform. The two input
   contracts are `respyra-polar-pca/1` and `respyra-polar-phan-signed/1`;
   Respyra calibrates in native g and publishes its own normalized breathing
   stream. Its bundled recorder captures the selected input, derived stream and
   markers. See [Respyra's input details](https://github.com/GeorgeFejer91/respyra-2.0/blob/main/docs/polar-input-contracts.md).
3. For later paired evaluation, also record Vernier raw Force, raw Polar ACC,
   both candidate waveforms and their validity companions. Compare timing,
   shape, polarity, posture and motion artifacts before claiming equivalence.

The producer below feeds wall-clock-paced synthetic 200 Hz ACC through the real
metric engine and LSL output. The independent official `pylsl` inlet checks
metadata, changing signed/rectified values, timestamps, readiness, and raw data.
Run the receiver in a second terminal while the producer is active:

```powershell
cargo build -p polar-h10-output --example verify_adr_lsl --locked
target/debug/examples/verify_adr_lsl.exe apps/polar-stream-mini/resources/lsl.dll separate
python scripts/verify_adr_lsl.py separate --output .for-ai-local/adr-separate.json
```

Repeat with `single` and `both` for both commands. This establishes live software
production and LSL readback; paired participant recordings establish respiratory
agreement. Respyra and the Mini streamers are separate projects.

## Method sources

- [Phan's original phone algorithm](https://github.com/lynphan/Mobile-Phone-Breathing-Detection/blob/main/BreathingDetection/Assets/MobilePhoneBreathingDetection.cs)
  uses 0.2/200 s per-axis means, their rectified sum, and adaptive event
  thresholding. Mini preserves the continuous score separately from its
  corrected quiet/refractory event gate; the signed projection is an additional
  adaptation.
- [Viscereality controller source](https://github.com/MesmerPrism/Viscereality/blob/927beb17a1d6f90b5f1b3efdcd3d4eab656dfb71/Viscereality/Assets/Scripts/Breathing/BreathDetection.cs)
  uses tracked controller position and 24/180-frame means at nominal 90 Hz.
  Mini borrows the contrast structure, substitutes PCA acceleration, and
  divides by learned span. It does not reproduce controller displacement or
  metre thresholds. The optional phase classifier uses exploratory +0.025/−0.075
  span thresholds.
- [Schipper et al., chest-worn accelerometer research](https://research.tue.nl/en/publications/estimation-of-respiratory-rate-and-effort-from-a-chest-worn-accel/)
  motivates PCA-based extraction. Its constrained recursive PCA differs from
  Mini's fixed calibration axis; citation is related research, not algorithm
  equivalence or validation of this implementation.
