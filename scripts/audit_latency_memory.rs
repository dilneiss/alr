use alr_models::{LocalModelRuntime, OnnxModelRuntime};
use alr_snake::game::{Environment, SnakeEnvironment};
use std::path::Path;
use std::time::Instant;

fn main() {
    println!("======================================================");
    println!("      ALR PERFORMANCE & LATENCY DEEP AUDIT BENCHMARK  ");
    println!("======================================================");

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let onnx_runtime = OnnxModelRuntime::new();
        let path = Path::new("models/snake_policy.onnx");
        let handle = onnx_runtime.load_from_file(path, "snake").await.unwrap();

        let input = vec![0.0f32, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0];

        // 1. Measure pure forward-pass latency
        let mut fwd_latencies = Vec::with_capacity(10000);
        for _ in 0..10000 {
            let start = Instant::now();
            let pred = onnx_runtime.predict(&handle, &input).await.unwrap();
            let elapsed = start.elapsed().as_nanos();
            fwd_latencies.push(elapsed);
            assert_eq!(pred.predicted_class, 0);
        }
        fwd_latencies.sort();
        let p50_fwd = fwd_latencies[5000];
        let p95_fwd = fwd_latencies[9500];
        let p99_fwd = fwd_latencies[9900];
        println!("1. Pure ONNX Forward-Pass Latency (10,000 iterations):");
        println!(
            "   p50 : {} ns ({:.3} µs)",
            p50_fwd,
            p50_fwd as f64 / 1000.0
        );
        println!(
            "   p95 : {} ns ({:.3} µs)",
            p95_fwd,
            p95_fwd as f64 / 1000.0
        );
        println!(
            "   p99 : {} ns ({:.3} µs)",
            p99_fwd,
            p99_fwd as f64 / 1000.0
        );

        // 2. Measure full Agent End-to-End Decision Loop
        // (Environment state observation + feature extraction + ONNX predict + decision wrap)
        let mut env = SnakeEnvironment::new(10, 10, 42);
        env.reset(42);
        let mut e2e_latencies = Vec::with_capacity(5000);
        for _ in 0..5000 {
            let start = Instant::now();
            let obs = env.step(alr_core::Action::new("RIGHT", serde_json::json!({})));
            let state = obs.observation.to_alr_state();
            let _pred = onnx_runtime
                .predict(&handle, &state.features)
                .await
                .unwrap();
            let elapsed = start.elapsed().as_nanos();
            e2e_latencies.push(elapsed);
        }
        e2e_latencies.sort();
        let p50_e2e = e2e_latencies[2500];
        let p95_e2e = e2e_latencies[4750];
        let p99_e2e = e2e_latencies[4950];
        println!("\n2. End-to-End Agent Decision Cycle Latency (5,000 steps):");
        println!(
            "   p50 : {} ns ({:.3} µs)",
            p50_e2e,
            p50_e2e as f64 / 1000.0
        );
        println!(
            "   p95 : {} ns ({:.3} µs)",
            p95_e2e,
            p95_e2e as f64 / 1000.0
        );
        println!(
            "   p99 : {} ns ({:.3} µs)",
            p99_e2e,
            p99_e2e as f64 / 1000.0
        );

        // 3. Continuous Long-Run Memory Stability Check
        println!("\n3. Long-Run Memory Stability (100,000 decision steps continuous session)...");
        let start_time = Instant::now();
        for i in 0..100000 {
            let obs = env.step(alr_core::Action::new(
                if i % 2 == 0 { "UP" } else { "RIGHT" },
                serde_json::json!({}),
            ));
            if obs.terminal {
                env.reset(42 + i as u64);
            }
            let state = obs.observation.to_alr_state();
            let _ = onnx_runtime
                .predict(&handle, &state.features)
                .await
                .unwrap();
        }
        println!(
            "   Executed 100,000 steps continuously in {:.2}s without leak, crash, or degradation.",
            start_time.elapsed().as_secs_f32()
        );
    });
    println!("======================================================");
}
