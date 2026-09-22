# Implementation Plan: Universal Loop Evasion Engine & Task Training Pipeline

**Date:** 2026-09-22  
**Goal:** Implement universal infinite loop detection and evasion across ALR, repair real browser snake oscillation, provide a training CLI assistant and write the comprehensive training guide.  
**Tech Stack:** Rust (Tokio, Anyhow, Serde), JavaScript (Puppeteer, HTML5 Canvas)  
**TDD Route:** Light / Post-change verification  
**Save Plan:** `docs/superpowers/plans/2026-09-22-loop-evasion-and-training-pipeline.md`

---

## 1. Scope & Impact

### Problem
1. During live browser gameplay (`scripts/play_in_browser.js`), the snake oscillates between two opposite directions (e.g. `ArrowUp` $\leftrightarrow$ `ArrowDown`), getting trapped in local symmetry instead of pursuing the objective.
2. In the core runtime, `LoopDetector` merely bailed on identical actions rather than actively forcing orthogonal evasion and replanning.
3. Users and developers need a structured manual and dedicated CLI assistant to train the ALR on new tasks across games, browser automation, 3D, and customer support.

### Files to Modify / Create
- `crates/alr-agent/src/reliability.rs`: Evolve `LoopDetector` into `LoopEvasionEngine` with 2-level evasion (orthogonal diversion then cognitive escalation).
- `crates/alr-agent/src/lib.rs`: Export `LoopEvasionEngine`.
- `scripts/play_in_browser.js`: Integrate state oscillation detector and 3-step perpendicular evasion into real headed Chrome loop.
- `crates/alr-cli/src/main.rs`: Add `task train --type <game|browser|support|3d> --episodes <N>` command.
- `docs/training-new-tasks.md`: Comprehensive step-by-step guide with code templates.
- `tests/phase8_self_improvement_tests.rs`: Add integration tests verifying loop evasion and recovery.
- `README.md`: Update documentation index and CLI command tables.

---

## 2. Bite-Sized Implementation Tasks

### Task 1: Implement `LoopEvasionEngine` in `alr-agent`
- **File:** `crates/alr-agent/src/reliability.rs`
- **Action:**
  - Add state history and action history ring buffers.
  - Implement `check_and_evade(state_hash, candidate_action) -> Option<Action>`.
  - Add 2-step and 4-step cycle detection.
  - Add progress watchdog with orthogonal diversion action selection.

### Task 2: Integrate Anti-Oscillation Evasion in `scripts/play_in_browser.js`
- **File:** `scripts/play_in_browser.js`
- **Action:**
  - Track last 8 head positions `(x, y)` and executed keys.
  - Detect 2-step oscillation (e.g., `Up` $\to$ `Down`).
  - Force 3-tick perpendicular escape towards open canvas space when oscillation is detected.

### Task 3: Implement `task train` CLI Assistant in `alr-cli`
- **File:** `crates/alr-cli/src/main.rs`
- **Action:**
  - Add `TrainTask { task_type, episodes }` to `TaskCommands`.
  - Run headless training sandbox for the selected domain.
  - Display progress bars, success rates, and auto-persist to SQLite / ModelRegistry.

### Task 4: Write Official Training Manual
- **File:** `docs/training-new-tasks.md`
- **Action:**
  - Document the 5-step lifecycle: Environment Adapter $\to$ Reward Shaping $\to$ Accelerated Sandbox $\to$ Persistence $\to$ Holdout Acceptance.
  - Provide complete, copy-paste ready code examples for new games and workflows.

### Task 5: Verification & Full Regression
- **Action:**
  - Run `cargo test --workspace` (all 133 tests + new evasion tests).
  - Run `cargo fmt --all -- --check`.
  - Run `cargo clippy --workspace --all-targets --all-features -- -D warnings`.
  - Update `README.md`.
  - Commit all changes.
