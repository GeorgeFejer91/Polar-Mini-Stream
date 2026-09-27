"""Verify live synthetic ADR outputs with official pylsl inlets.

Build/run verify_adr_lsl first; this script owns no recording policy.
"""
import argparse
import json
import math
import time
from pathlib import Path

from pylsl import StreamInlet, cf_float32, resolve_byprop

parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["separate", "single"])
parser.add_argument("--output", type=Path)
args = parser.parse_args()
base = f"adr_acceptance_{args.mode}"
waveforms = {
    "adrPcaWaveform": "g",
    "adrMovingAverageDifference": "ratio",
    "adrAxisMeanDifference": "g",
    "adrAxisDifferenceMagnitude": "g",
}
suffixes = list(waveforms) + ["adrPcaQuality", "adrPcaValid", "adrMovingAverageValid", "adrAxisDifferenceValid"]
names = [f"{base}_{suffix}" for suffix in suffixes]
names += [base] if args.mode == "single" else [f"{base}_rawECG", f"{base}_rawACC"]
inlets = {}
received = {name: [] for name in names}
try:
    for name in names:
        infos = resolve_byprop("name", name, minimum=1, timeout=5)
        assert len(infos) == 1, f"Missing or ambiguous outlet: {name}"
        inlet = StreamInlet(infos[0], max_buflen=30)
        inlet.open_stream(timeout=3)
        info = inlet.info(timeout=3)
        suffix = name.removeprefix(base + "_")
        if suffix in waveforms:
            assert info.type() == "Respiration" and info.channel_count() == 1
            assert info.channel_format() == cf_float32
            assert info.nominal_srate() == 0
            assert info.desc().child_value("schema") == "adr-waveform/1"
            assert info.desc().child_value("stream_role") == "respiration_candidate"
            assert info.desc().child("channels").child("channel").child_value("unit") == waveforms[suffix]
            processing = info.desc().child("processing")
            assert processing.child_value("candidate_method")
            assert processing.child_value("formula")
            companions = info.desc().child_value("companion_streams").split(",")
            assert companions and all(companion in names for companion in companions)
        elif suffix in suffixes:
            assert info.type() == "SignalQuality" and info.channel_count() == 1, name
        inlets[name] = inlet
    deadline = time.monotonic() + 17
    while time.monotonic() < deadline:
        for name, inlet in inlets.items():
            rows, timestamps = inlet.pull_chunk(timeout=0, max_samples=2048)
            received[name].extend(zip(timestamps, rows))
        time.sleep(0.02)
    report = {"mode": args.mode, "scope": "synthetic real-time processing and official LSL inlet readback", "streams": {}}
    for name, rows in received.items():
        assert len(rows) >= 20, f"Too few samples: {name}: {len(rows)}"
        timestamps = [row[0] for row in rows]
        assert all(b > a for a, b in zip(timestamps, timestamps[1:])), f"Nonmonotonic stream: {name}"
        suffix = name.removeprefix(base + "_")
        if suffix in waveforms:
            values = [row[1][0] for row in rows]
            assert all(math.isfinite(value) for value in values)
            assert max(values) - min(values) > 0.001, f"Constant candidate: {name}"
            if suffix == "adrAxisDifferenceMagnitude": assert min(values) >= 0
            else: assert min(values) < 0 < max(values), f"Lost signed polarity: {name}"
        if suffix.endswith("Valid"):
            values = [row[1][0] for row in rows]
            assert set(values) <= {0.0, 1.0} and 1.0 in values
        report["streams"][name] = {"samples": len(rows), "duration_s": timestamps[-1] - timestamps[0]}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))
finally:
    for inlet in inlets.values(): inlet.close_stream()
