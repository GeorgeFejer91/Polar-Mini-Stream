//! Modular, platform-neutral processors for derived Polar H10 metrics.
//!
//! The processors accept decoded sensor samples and never depend on Bluetooth,
//! Tauri, LSL, OSC, or the HTML UI. This keeps computation testable and makes
//! the crate reusable in headless applications.

mod breathing;
mod breathing_dynamics;
mod catalog;
mod coherence;
mod ecg;
mod excitation;
mod flowborne;
mod hrv;
mod phan_breathing;
mod reference_validation;
mod timed_breathing;
mod vernier_breathing;

use polar_h10_core::AccSample;
use serde::Serialize;

pub use breathing::{
    BreathingDiagnostics, BreathingPhase, BreathingProcessor, BreathingSettings, BreathingSnapshot,
    BreathingStateMode, BreathingVolumeMode, BreathingWaveformPoint, TimedAccBatch,
};
pub use breathing_dynamics::{BreathingDynamicsSnapshot, FeatureSet};
pub use catalog::{
    ADR_WAVEFORM_IDS, METRIC_CATALOG, MetricCitation, MetricDefinition, MetricFormulaDefinition,
    MetricSelectionTier, POLAR_MINI_ONLY_IDS, RELEASE_POLAR_RESPIRATION_IDS, adr_companion_ids,
    metric_citations, metric_definition, metric_formula_definition, metric_selection_tier,
};
pub use coherence::CoherenceSnapshot;
pub use ecg::EcgSnapshot;
pub use hrv::HrvSnapshot;
pub use reference_validation::{
    AgreementError, RespirationReferenceReport, RespirationReferenceSettings, SignalAgreement,
    TimedReferenceSample, TimedRespirationSample, analyze_respiration_reference,
};
pub use vernier_breathing::{
    VERNIER_BREATHING_CONTRACT, VernierBreathingContract, VernierBreathingProcessor,
};

use breathing_dynamics::BreathingDynamicsProcessor;
use coherence::CoherenceProcessor;
use ecg::EcgProcessor;
use excitation::{ExcitationProcessor, ExcitementScoreProcessor};
use flowborne::FlowborneProcessor;
use hrv::HrvProcessor;
use phan_breathing::PhanBreathingProcessor;

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricSample {
    pub id: &'static str,
    pub value: f32,
}

/// Compact, copyable processing plan derived from the outputs a user selected.
/// Raw device signals do not activate any derived processor.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MetricSelection {
    bits: u64,
    ecg_features: bool,
    acc_magnitude: bool,
    breathing: bool,
    breathing_dynamics: bool,
    phan_breathing: bool,
    flowborne: bool,
    heart_rate: bool,
    rr_interval: bool,
    hrv: bool,
    coherence: bool,
    excitement_score: bool,
    excitometer: bool,
}

impl MetricSelection {
    pub fn from_ids<'a>(ids: impl IntoIterator<Item = &'a str>) -> Self {
        let mut selection = Self::none();
        for id in ids {
            if let Some(index) = METRIC_CATALOG.iter().position(|metric| metric.id == id) {
                selection.bits |= 1_u64 << index;
            }
            match id {
                "ecg_mean" | "ecg_rms" | "ecg_peak_to_peak" | "ecg_sd" => {
                    selection.ecg_features = true;
                }
                "acc_magnitude" => selection.acc_magnitude = true,
                "adr_pca_waveform"
                | "adr_pca_relative_amplitude"
                | "adr_pca_phase"
                | "adr_pca_calibration"
                | "adr_pca_range"
                | "adr_pca_quality"
                | "adr_pca_valid" => selection.breathing = true,
                "adr_pca_rate" | "adr_dynamics_quality" => {
                    selection.breathing = true;
                    selection.breathing_dynamics = true;
                }
                "adr_axis_difference_event"
                | "adr_axis_difference_rate"
                | "adr_axis_difference_magnitude"
                | "adr_axis_difference_valid" => selection.phan_breathing = true,
                "adr_axis_mean_difference" => {
                    selection.phan_breathing = true;
                    selection.breathing = true;
                }
                "adr_moving_average_phase"
                | "adr_moving_average_difference"
                | "adr_moving_average_valid" => {
                    selection.breathing = true;
                    selection.flowborne = true;
                }
                "heart_rate" => selection.heart_rate = true,
                "rr_interval" => selection.rr_interval = true,
                "mean_nn" | "mean_heart_rate" | "rmssd" | "ln_rmssd" | "sdnn" | "pnn50" | "sd1" => {
                    selection.hrv = true
                }
                "coherence"
                | "coherence_confidence"
                | "heartmath_coherence"
                | "coherence_peak_frequency"
                | "coherence_peak_power"
                | "coherence_total_power" => selection.coherence = true,
                "excitement_score" => selection.excitement_score = true,
                "excitometer" => {
                    selection.hrv = true;
                    selection.excitometer = true;
                }
                _ if id.starts_with("adr_interval_") || id.starts_with("adr_amplitude_") => {
                    selection.breathing = true;
                    selection.breathing_dynamics = true;
                }
                _ => {}
            }
        }
        selection
    }

    pub const fn none() -> Self {
        Self {
            bits: 0,
            ecg_features: false,
            acc_magnitude: false,
            breathing: false,
            breathing_dynamics: false,
            phan_breathing: false,
            flowborne: false,
            heart_rate: false,
            rr_interval: false,
            hrv: false,
            coherence: false,
            excitement_score: false,
            excitometer: false,
        }
    }

    fn all() -> Self {
        Self::from_ids(METRIC_CATALOG.iter().map(|metric| metric.id))
    }

    fn includes(self, id: &str) -> bool {
        METRIC_CATALOG
            .iter()
            .position(|metric| metric.id == id)
            .is_some_and(|index| self.bits & (1_u64 << index) != 0)
    }

    fn retain_selected(self, values: &mut Vec<MetricSample>) {
        values.retain(|sample| self.includes(sample.id));
    }
}

impl Default for MetricSelection {
    fn default() -> Self {
        Self::all()
    }
}

/// Owns all stateful processors for one connected sensor.
pub struct MetricEngine {
    selection: MetricSelection,
    hrv: HrvProcessor,
    coherence: CoherenceProcessor,
    breathing: BreathingProcessor,
    breathing_dynamics: BreathingDynamicsProcessor,
    phan_breathing: PhanBreathingProcessor,
    flowborne: FlowborneProcessor,
    ecg: EcgProcessor,
    excitation: ExcitationProcessor,
    excitement_score: ExcitementScoreProcessor,
}

impl Default for MetricEngine {
    fn default() -> Self {
        Self::with_selection(MetricSelection::default())
    }
}

impl MetricEngine {
    pub fn with_selection(selection: MetricSelection) -> Self {
        Self {
            selection,
            hrv: HrvProcessor::default(),
            coherence: CoherenceProcessor::default(),
            breathing: BreathingProcessor::default(),
            breathing_dynamics: BreathingDynamicsProcessor::default(),
            phan_breathing: PhanBreathingProcessor::default(),
            flowborne: FlowborneProcessor::default(),
            ecg: EcgProcessor::default(),
            excitation: ExcitationProcessor::default(),
            excitement_score: ExcitementScoreProcessor::default(),
        }
    }

    /// Updates the processing plan without disturbing state for dependency
    /// groups that remain active. Newly activated groups start a clean window.
    pub fn apply_selection(&mut self, selection: MetricSelection) {
        if self.selection.ecg_features != selection.ecg_features {
            self.ecg = EcgProcessor::default();
        }
        if self.selection.breathing != selection.breathing {
            self.breathing = BreathingProcessor::default();
        }
        if self.selection.breathing_dynamics != selection.breathing_dynamics {
            self.breathing_dynamics = BreathingDynamicsProcessor::default();
        }
        if self.selection.phan_breathing != selection.phan_breathing {
            self.phan_breathing = PhanBreathingProcessor::default();
        }
        if self.selection.flowborne != selection.flowborne {
            self.flowborne = FlowborneProcessor::default();
        }
        if self.selection.hrv != selection.hrv {
            self.hrv = HrvProcessor::default();
            self.excitation = ExcitationProcessor::default();
        }
        if self.selection.coherence != selection.coherence {
            self.coherence = CoherenceProcessor::default();
        }
        if self.selection.excitement_score != selection.excitement_score {
            self.excitement_score = ExcitementScoreProcessor::default();
        }
        self.selection = selection;
    }

    /// Applies saved classifier controls. Timed state-only changes preserve the
    /// calibrated waveform; waveform changes restart calibration.
    pub fn apply_breathing_settings(&mut self, settings: BreathingSettings) {
        self.breathing.apply_settings(settings);
        self.breathing_dynamics = BreathingDynamicsProcessor::default();
        self.flowborne = FlowborneProcessor::default();
    }

    pub fn breathing_diagnostics(&self) -> BreathingDiagnostics {
        self.breathing.diagnostics()
    }

    /// Drains bounded source-time points intended only for UI presentation.
    /// Canonical metrics and phase state do not consume this data.
    pub fn take_breathing_presentation_points(&mut self) -> Vec<BreathingWaveformPoint> {
        self.breathing.take_presentation_points()
    }

    pub fn process_heart_rate(&mut self, bpm: u16, rr_intervals_ms: &[f32]) -> Vec<MetricSample> {
        let mut output = Vec::new();
        if self.selection.heart_rate {
            output.push(MetricSample {
                id: "heart_rate",
                value: f32::from(bpm),
            });
        }

        for &rr in rr_intervals_ms {
            if !is_valid_rr(rr) {
                continue;
            }
            if self.selection.rr_interval {
                output.push(MetricSample {
                    id: "rr_interval",
                    value: rr,
                });
            }

            if self.selection.excitement_score
                && let Some(score) = self.excitement_score.update(rr)
            {
                output.push(MetricSample {
                    id: "excitement_score",
                    value: score,
                });
            }

            if self.selection.hrv
                && let Some(hrv) = self.hrv.push(rr)
            {
                output.extend(hrv.samples());
                if self.selection.excitometer
                    && let Some(excitation) = self.excitation.update(f32::from(bpm), hrv.ln_rmssd)
                {
                    output.push(MetricSample {
                        id: "excitometer",
                        value: excitation,
                    });
                }
            }
            if self.selection.coherence
                && let Some(coherence) = self.coherence.push(rr)
            {
                output.extend(coherence.samples());
            }
        }
        self.selection.retain_selected(&mut output);
        output
    }

    pub fn process_ecg(&mut self, microvolts: &[i32]) -> Vec<MetricSample> {
        if !self.selection.ecg_features {
            return Vec::new();
        }
        self.ecg
            .push(microvolts)
            .map(|snapshot| {
                let mut values = snapshot.samples();
                self.selection.retain_selected(&mut values);
                values
            })
            .unwrap_or_default()
    }

    pub fn process_accelerometer(&mut self, samples: &[AccSample]) -> Vec<MetricSample> {
        self.process_accelerometer_with(samples, None)
    }

    pub fn process_accelerometer_timed(
        &mut self,
        samples: &[AccSample],
        timing: TimedAccBatch,
    ) -> Vec<MetricSample> {
        self.process_accelerometer_with(samples, Some(timing))
    }

    fn process_accelerometer_with(
        &mut self,
        samples: &[AccSample],
        timing: Option<TimedAccBatch>,
    ) -> Vec<MetricSample> {
        let mut output = if self.selection.acc_magnitude {
            samples
                .iter()
                .map(|sample| MetricSample {
                    id: "acc_magnitude",
                    value: sample.magnitude_g(),
                })
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };
        let mut breathing_snapshot = None;
        if self.selection.breathing {
            let breathing = match timing {
                Some(timing) => self.breathing.push_timed(samples, timing),
                None => self.breathing.push(samples),
            };
            if let Some(breathing) = breathing {
                breathing_snapshot = Some(breathing);
                output.extend(breathing.samples());
                if self.selection.flowborne {
                    let flowborne = self.flowborne.push(
                        breathing,
                        timing.is_some_and(|batch| batch.clock_reset || batch.gap_before),
                    );
                    output.push(MetricSample {
                        id: "adr_moving_average_phase",
                        value: flowborne.phase,
                    });
                    output.push(MetricSample {
                        id: "adr_moving_average_valid",
                        value: if flowborne.valid { 1.0 } else { 0.0 },
                    });
                    if let Some(score) = flowborne.motion_score {
                        output.push(MetricSample {
                            id: "adr_moving_average_difference",
                            value: score,
                        });
                    }
                }
                if self.selection.breathing_dynamics
                    && let Some(dynamics) = self.breathing_dynamics.push(breathing)
                {
                    output.extend(dynamics.samples());
                }
            }
        }
        if self.selection.phan_breathing
            && let Some(snapshot) = self.phan_breathing.push(samples, timing)
        {
            output.push(MetricSample {
                id: "adr_axis_difference_magnitude",
                value: snapshot.rectified_difference_g,
            });
            output.push(MetricSample {
                id: "adr_axis_difference_valid",
                value: if snapshot.warmed_up { 1.0 } else { 0.0 },
            });
            if breathing_snapshot.is_some_and(|breathing| breathing.calibrated) {
                let axis = self.breathing.diagnostics().pca_axis;
                let signed = snapshot
                    .axis_difference_g
                    .into_iter()
                    .zip(axis)
                    .map(|(difference, direction)| difference * direction)
                    .sum();
                output.push(MetricSample {
                    id: "adr_axis_mean_difference",
                    value: signed,
                });
            }
            if snapshot.breath_detected {
                output.push(MetricSample {
                    id: "adr_axis_difference_event",
                    value: 1.0,
                });
            }
            output.push(MetricSample {
                id: "adr_axis_difference_rate",
                value: snapshot.breaths_per_minute,
            });
        }
        self.selection.retain_selected(&mut output);
        output
    }
}

fn is_valid_rr(value: f32) -> bool {
    (250.0..=2_500.0).contains(&value) && value.is_finite()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_ids_are_unique_and_resolvable() {
        let mut ids = METRIC_CATALOG
            .iter()
            .map(|metric| metric.id)
            .collect::<Vec<_>>();
        let original = ids.len();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), original);
        assert!(
            METRIC_CATALOG
                .iter()
                .all(|metric| metric_definition(metric.id).is_some())
        );
        for metric in METRIC_CATALOG {
            assert!(
                !metric.detail.trim().is_empty(),
                "{} lacks a definition",
                metric.id
            );
            assert!(
                metric.explainer.matches('.').count() >= 2,
                "{} needs a two-sentence scientific interpretation",
                metric.id
            );
            assert!(
                metric.citation_url.starts_with("https://"),
                "{} lacks a secure citation URL",
                metric.id
            );
            assert!(
                !metric.citation_label.trim().is_empty(),
                "{} lacks a citation",
                metric.id
            );
            let citations = metric_citations(*metric);
            assert!(
                (2..=3).contains(&citations.len()),
                "{} needs two or three relevant sources",
                metric.id
            );
            assert!(
                citations
                    .iter()
                    .all(|citation| citation.url.starts_with("https://")
                        && !citation.label.trim().is_empty()),
                "{} has an invalid source",
                metric.id
            );
            let mut urls = citations
                .iter()
                .map(|citation| citation.url)
                .collect::<Vec<_>>();
            urls.sort_unstable();
            urls.dedup();
            assert_eq!(
                urls.len(),
                citations.len(),
                "{} repeats a source",
                metric.id
            );
        }
    }

    #[test]
    fn engine_always_emits_device_heart_rate() {
        let mut engine = MetricEngine::default();
        let values = engine.process_heart_rate(72, &[833.0]);
        assert!(
            values
                .iter()
                .any(|value| value.id == "heart_rate" && value.value == 72.0)
        );
        assert!(values.iter().any(|value| value.id == "rr_interval"));
    }

    #[test]
    fn engine_emits_acceleration_magnitude_for_every_native_sample() {
        let mut engine = MetricEngine::default();
        let values = engine.process_accelerometer(&[
            AccSample {
                x_mg: 1_000,
                y_mg: 0,
                z_mg: 0,
            },
            AccSample {
                x_mg: 0,
                y_mg: 600,
                z_mg: 800,
            },
        ]);
        let magnitudes = values
            .iter()
            .filter(|value| value.id == "acc_magnitude")
            .map(|value| value.value)
            .collect::<Vec<_>>();
        assert_eq!(magnitudes, vec![1.0, 1.0]);
    }

    #[test]
    fn raw_only_selection_skips_every_derived_processor() {
        let mut engine =
            MetricEngine::with_selection(MetricSelection::from_ids(["raw_ecg", "raw_acc"]));
        assert!(engine.process_ecg(&[1, 2, 3]).is_empty());
        assert!(
            engine
                .process_accelerometer(&[AccSample {
                    x_mg: 1_000,
                    y_mg: 0,
                    z_mg: 0,
                }])
                .is_empty()
        );
        assert!(engine.process_heart_rate(72, &[833.0]).is_empty());
    }

    #[test]
    fn selection_emits_only_requested_metric_group_results() {
        let mut engine = MetricEngine::with_selection(MetricSelection::from_ids(["acc_magnitude"]));
        let values = engine.process_accelerometer(&[AccSample {
            x_mg: 1_000,
            y_mg: 0,
            z_mg: 0,
        }]);
        assert_eq!(values.len(), 1);
        assert_eq!(values[0].id, "acc_magnitude");
    }

    #[test]
    fn experimental_breathing_outputs_are_independent_scalar_streams() {
        let mut magnitude =
            MetricEngine::with_selection(MetricSelection::from_ids(["adr_pca_waveform"]));
        let mut phase = MetricEngine::with_selection(MetricSelection::from_ids(["adr_pca_phase"]));
        let mut magnitude_values = Vec::new();
        let mut phase_values = Vec::new();
        for index in 0..2_500 {
            let sample = AccSample {
                x_mg: 0,
                y_mg: 0,
                z_mg: 1_000
                    + (25.0 * (index as f32 / 200.0 * std::f32::consts::TAU * 0.2).sin()) as i16,
            };
            magnitude_values = magnitude.process_accelerometer(&[sample]);
            phase_values = phase.process_accelerometer(&[sample]);
        }
        assert_eq!(magnitude_values.len(), 1);
        assert_eq!(magnitude_values[0].id, "adr_pca_waveform");
        assert_eq!(phase_values.len(), 1);
        assert_eq!(phase_values[0].id, "adr_pca_phase");
        assert!([-1.0, 0.0, 1.0].contains(&phase_values[0].value));
    }

    #[test]
    fn breathing_waveform_and_quality_outputs_remain_independently_selectable() {
        let mut waveform =
            MetricEngine::with_selection(MetricSelection::from_ids(["adr_pca_relative_amplitude"]));
        let mut confidence =
            MetricEngine::with_selection(MetricSelection::from_ids(["adr_pca_quality"]));
        let mut ready = MetricEngine::with_selection(MetricSelection::from_ids(["adr_pca_valid"]));

        let mut waveform_values = Vec::new();
        let mut confidence_values = Vec::new();
        let mut ready_values = Vec::new();
        for index in 0..2_500 {
            let sample = AccSample {
                x_mg: 0,
                y_mg: 0,
                z_mg: 1_000
                    + (25.0 * (index as f32 / 200.0 * std::f32::consts::TAU * 0.2).sin()) as i16,
            };
            waveform_values = waveform.process_accelerometer(&[sample]);
            confidence_values = confidence.process_accelerometer(&[sample]);
            ready_values = ready.process_accelerometer(&[sample]);
        }

        assert_eq!(waveform_values.len(), 1);
        assert_eq!(waveform_values[0].id, "adr_pca_relative_amplitude");
        assert!((0.0..=1.0).contains(&waveform_values[0].value));
        assert_eq!(confidence_values.len(), 1);
        assert_eq!(confidence_values[0].id, "adr_pca_quality");
        assert!((0.0..=1.0).contains(&confidence_values[0].value));
        assert_eq!(ready_values.len(), 1);
        assert_eq!(ready_values[0].id, "adr_pca_valid");
        assert_eq!(ready_values[0].value, 1.0);
    }

    #[test]
    fn all_four_live_candidates_preserve_their_distinct_signal_semantics() {
        let mut engine = MetricEngine::with_selection(MetricSelection::from_ids(
            ADR_WAVEFORM_IDS.iter().copied(),
        ));
        let mut ranges = [[f32::INFINITY, f32::NEG_INFINITY]; 4];
        for index in 0..6_000_u64 {
            let breath = (std::f64::consts::TAU * 0.2 * index as f64 / 200.0).sin();
            let sample = AccSample {
                x_mg: (25.0 * breath) as i16,
                y_mg: 0,
                z_mg: 1_000 + (15.0 * breath) as i16,
            };
            let values = engine.process_accelerometer_timed(
                &[sample],
                TimedAccBatch {
                    newest_sensor_timestamp_ns: (index + 1) * 5_000_000,
                    sample_period_ns: 5_000_000,
                    clock_revision: 1,
                    clock_reset: false,
                    gap_before: false,
                },
            );
            if index > 3_000 {
                for value in values {
                    let slot = ADR_WAVEFORM_IDS
                        .iter()
                        .position(|id| *id == value.id)
                        .unwrap();
                    assert!(value.value.is_finite());
                    ranges[slot][0] = ranges[slot][0].min(value.value);
                    ranges[slot][1] = ranges[slot][1].max(value.value);
                }
            }
        }
        for range in &ranges[..3] {
            assert!(
                range[0] < -0.001 && range[1] > 0.001,
                "signed waveform lost direction: {range:?}"
            );
        }
        assert!(ranges[3][0] >= 0.0 && ranges[3][1] - ranges[3][0] > 0.005);
        assert!(engine.process_accelerometer(&[]).is_empty());
    }
}
