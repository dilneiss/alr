use crate::game::{Position, SnakeEnvironment};

pub fn render_terminal_board(
    env: &SnakeEnvironment,
    step: usize,
    action: &str,
    confidence: f32,
    source: &str,
) {
    render_terminal_board_with_telemetry(env, step, action, confidence, source, None, None, false);
}

#[allow(clippy::too_many_arguments)]
pub fn render_terminal_board_with_telemetry(
    env: &SnakeEnvironment,
    step: usize,
    action: &str,
    confidence: f32,
    source: &str,
    probabilities: Option<&[(String, f32)]>,
    latency_micros: Option<u128>,
    intervened: bool,
) {
    // Clear terminal screen using ANSI escape sequences
    print!("\x1B[2J\x1B[1;1H");

    println!("============================================================");
    println!("     ALR AUTONOMOUS SNAKE RUNTIME - LIVE VISUAL DISPLAY     ");
    println!("============================================================");
    println!(
        " Step: {:<4} | Score: {:<3} | Action: {:<5} | Conf: {:.2} | Source: {}",
        step, env.score, action, confidence, source
    );

    if let Some(probs) = probabilities {
        let prob_str = probs
            .iter()
            .map(|(k, v)| format!("{}:{:.0}%", k, v * 100.0))
            .collect::<Vec<_>>()
            .join(" | ");
        let lat_ms = latency_micros
            .map(|l| format!("{:.2}ms", l as f64 / 1000.0))
            .unwrap_or_else(|| "0.00ms".to_string());
        println!(" Probabilities: [{}] | Inferência: {}", prob_str, lat_ms);
    }

    if intervened {
        println!(" [CYCLE SAFETY SHIELD]: Intervenção ativa! Bloqueada colisão fatal.");
    }

    println!(" Snake Length: {} | Speed: ~120ms/tick", env.body.len() + 1);
    println!("------------------------------------------------------------");

    let width = env.width as usize;
    let height = env.height as usize;

    // Top border
    print!("+");
    for _ in 0..width {
        print!("--");
    }
    println!("+");

    let head = env.head;
    let food = env.food;

    for y in 0..height {
        print!("|");
        for x in 0..width {
            let pos = Position {
                x: x as i32,
                y: y as i32,
            };
            if pos == head {
                print!("O "); // Snake Head
            } else if env.body.contains(&pos) {
                print!("o "); // Snake Body
            } else if pos == food {
                print!("* "); // Food
            } else {
                print!("  "); // Empty space
            }
        }
        println!("|");
    }

    // Bottom border
    print!("+");
    for _ in 0..width {
        print!("--");
    }
    println!("+");
}
