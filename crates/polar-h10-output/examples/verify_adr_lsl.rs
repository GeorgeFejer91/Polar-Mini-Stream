//! Wall-clock paced synthetic acquisition through the real metric engine and LSL.
//! Proves online publication, not physical respiratory agreement.
use polar_h10_core::AccSample;
use polar_h10_metrics::{
    ADR_WAVEFORM_IDS, MetricEngine, MetricSelection, TimedAccBatch, adr_companion_ids,
};
use polar_h10_output::{MetricValue, MiniCombinedOutput, OutputConfig, OutputRouter};
use std::{
    env,
    path::PathBuf,
    thread,
    time::{Duration, Instant},
};

#[tokio::main]
async fn main() -> Result<(), String> {
    let library = env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .ok_or("usage: verify_adr_lsl <lsl.dll> <separate|single|both>")?;
    let mode = env::args()
        .nth(2)
        .ok_or("choose separate, single, or both")?;
    let base = match mode.as_str() {
        "single" => "adr_acceptance_single",
        "separate" => "adr_acceptance_separate",
        "both" => "adr_acceptance_both",
        _ => return Err("choose separate, single, or both".into()),
    };
    let mut ids = vec!["raw_ecg".to_string(), "raw_acc".to_string()];
    for id in ADR_WAVEFORM_IDS {
        for value in std::iter::once(id).chain(adr_companion_ids(id).iter()) {
            if !ids.iter().any(|selected| selected == value) {
                ids.push((*value).into());
            }
        }
    }
    let router = OutputRouter::with_bundled_lsl(Some(library.clone()));
    if mode != "single" {
        let individual_ids = if mode == "both" {
            std::iter::once("raw_ecg")
                .chain(std::iter::once("raw_acc"))
                .chain(std::iter::once(ADR_WAVEFORM_IDS[0]))
                .chain(adr_companion_ids(ADR_WAVEFORM_IDS[0]).iter().copied())
                .map(str::to_string)
                .collect()
        } else {
            ids.clone()
        };
        router
            .configure(OutputConfig {
                stream_name: base.into(),
                lsl_enabled: true,
                outputs: individual_ids,
                ..OutputConfig::default()
            })
            .await?;
    }
    let combined = match mode.as_str() {
        "single" => Some(MiniCombinedOutput::polar(Some(library), base, &ids)?),
        "both" => Some(MiniCombinedOutput::polar_alongside_individuals(
            Some(library),
            base,
            &ids,
        )?),
        _ => None,
    };
    let mut engine =
        MetricEngine::with_selection(MetricSelection::from_ids(ids.iter().map(String::as_str)));
    println!("ADR_LSL_READY {base}");
    thread::sleep(Duration::from_secs(2));
    let origin = Instant::now();
    let mut max_processing_us = 0;
    for batch in 0..240_u64 {
        let due = Duration::from_millis(batch * 100);
        if let Some(wait) = due.checked_sub(origin.elapsed()) {
            thread::sleep(wait);
        }
        let samples = (0..20)
            .map(|offset| {
                let time = (batch * 20 + offset) as f64 / 200.0;
                let breath = (std::f64::consts::TAU * 0.3 * time).sin();
                AccSample {
                    x_mg: (30.0 * breath) as i16,
                    y_mg: 0,
                    z_mg: 1_000 + (20.0 * breath) as i16,
                }
            })
            .collect::<Vec<_>>();
        let timestamp = (batch + 1) * 100_000_000;
        let ecg = (0..13)
            .map(|index| ((batch * 13 + index) % 400) as i32 - 200)
            .collect::<Vec<_>>();
        if mode != "single" {
            if let Some(error) = router.publish_ecg(timestamp, &ecg) {
                return Err(error);
            }
            if let Some(error) = router.publish_accelerometer(timestamp, &samples) {
                return Err(error);
            }
        }
        if let Some(output) = &combined {
            output.publish_polar_ecg(timestamp, &ecg);
            output.publish_polar_accelerometer(timestamp, &samples);
        }
        let began = Instant::now();
        let metrics = engine.process_accelerometer_timed(
            &samples,
            TimedAccBatch {
                newest_sensor_timestamp_ns: timestamp,
                sample_period_ns: 5_000_000,
                clock_revision: 1,
                clock_reset: false,
                gap_before: false,
            },
        );
        max_processing_us = max_processing_us.max(began.elapsed().as_micros());
        let values = metrics
            .iter()
            .map(|sample| MetricValue {
                id: sample.id,
                value: sample.value,
            })
            .collect::<Vec<_>>();
        if mode != "single"
            && let Some(error) = router.publish_metrics_at(timestamp, &values)
        {
            return Err(error);
        }
        if let Some(output) = &combined {
            output.publish_polar_metrics_at(timestamp, &values);
        }
    }
    thread::sleep(Duration::from_secs(2));
    println!("ADR_LSL_COMPLETE max_processing_us={max_processing_us}");
    Ok(())
}
