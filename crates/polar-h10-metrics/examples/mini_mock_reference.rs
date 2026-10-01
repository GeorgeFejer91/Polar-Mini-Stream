//! Deterministic reference for Polar Stream Mini's 200 Hz ACC mock.
//! Usage: mini_mock_reference <ticks> > reference.csv
use polar_h10_core::AccSample;
use polar_h10_metrics::{MetricEngine, MetricSelection, TimedAccBatch};

fn sample(index: u64) -> AccSample {
    let phase = (index % 3_200) as f64 / 800.0;
    let breath = if phase < 1.0 {
        2.0 * phase - 1.0
    } else if phase < 2.0 {
        1.0
    } else if phase < 3.0 {
        5.0 - 2.0 * phase
    } else {
        -1.0
    };
    AccSample {
        x_mg: (26.0 * breath).round() as i16,
        y_mg: (18.0 * breath).round() as i16,
        z_mg: (1_000.0 + 42.0 * breath).round() as i16,
    }
}

fn main() {
    let ticks: u64 = std::env::args()
        .nth(1)
        .expect("usage: mini_mock_reference <ticks>")
        .parse()
        .expect("ticks must be an integer");
    let mut engine = MetricEngine::with_selection(MetricSelection::from_ids([
        "adr_pca_waveform",
        "adr_axis_mean_difference",
        "adr_pca_valid",
        "adr_axis_difference_valid",
        "adr_pca_quality",
    ]));
    println!("tick,metric_id,value");
    for tick in 0..ticks {
        let acc = [sample(tick * 2), sample(tick * 2 + 1)];
        let values = engine.process_accelerometer_timed(
            &acc,
            TimedAccBatch {
                newest_sensor_timestamp_ns: 1_000_000_000 + tick * 10_000_000,
                sample_period_ns: 5_000_000,
                clock_revision: 1,
                clock_reset: false,
                gap_before: false,
            },
        );
        for value in values {
            if matches!(
                value.id,
                "adr_pca_waveform"
                    | "adr_axis_mean_difference"
                    | "adr_pca_valid"
                    | "adr_axis_difference_valid"
                    | "adr_pca_quality"
            ) {
                println!("{tick},{},{:.9}", value.id, value.value);
            }
        }
    }
}
