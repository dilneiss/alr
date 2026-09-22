# Autonomous Learning Runtime (ALR)

[![Rust](https://img.shields.io/badge/Rust-1.80%2B%20%7C%201.98.1-blue.svg)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT%2FApache--2.0-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-135%2F135%20Passing-brightgreen.svg)]()
[![Autonomy Rate](https://img.shields.io/badge/Local%20Autonomy-98.8%25-orange.svg)]()
[![Loop Evasion](https://img.shields.io/badge/Loop%20Evasion-Multi--Layer%20Active-brightgreen.svg)](docs/training-new-tasks.md)
[![Release Status](https://img.shields.io/badge/Release%20Certification-Certified%20With%20Limitations-yellow.svg)](docs/final-certification-report.md)
[![Evidence Matrix](https://img.shields.io/badge/Evidence%20Matrix-Audited-blue.svg)](docs/evidence-matrix.md)
[![Final Acceptance](https://img.shields.io/badge/Acceptance%20Gates-12%2F12%20Evaluated-brightgreen.svg)](docs/final-acceptance-report.md)
[![Game Autonomy Engine](https://img.shields.io/badge/Game%20Engine-Tetris%20%7C%20Social%20Lab%20%7C%20External-purple.svg)](docs/game-engine.md)
[![Docker Qdrant](https://img.shields.io/badge/Qdrant-v1.12.1-red.svg)](https://qdrant.tech)

> **A local-first runtime for autonomous learning, memory, planning, tool execution, verification, recovery, and skill reuse across games, browsers, simulated worlds, and external environments.**

---

## What is ALR?

The **Autonomous Learning Runtime (ALR)** is an open-source, local-first runtime for autonomous agents built from scratch in **Rust**. It provides a robust cognitive architecture where an external Large Language Model (LLM) acts as an occasional teacher, oracle, or hypothesis generator during cold-start or extreme novelty, while routine decisions, task execution, tool operations, and spatial navigation run on fast, deterministic, local components.

Traditional agent frameworks suffer from a structural inefficiency: they query remote LLM APIs on every loop iteration, incurring massive token costs, variable network latency, prompt-injection risks, and lack of persistent operational memory.

ALR solves this by turning acquired knowledge into **durable local capability**:
```text
Novel State / Low Confidence
             │
             ▼
     LLM Teacher Oracle
             │ (Structured Guidance)
             ▼
      Proposal Sandbox
             │ (Syntax & Semantic Validation)
             ▼
    Active Skill / Local Policy
             │ (SQLite / Model Registry)
             ▼
       Local Execution  ◄───────────────────────────┐
             │                                      │ (Subsequent Encounters)
             ▼                                      │ Zero LLM Calls
       Action & Input                               │ Sub-Millisecond Speed
             │                                      │
             ▼                                      │
  Postcondition Verification ───────────────────────┘
```

Once a task or procedure is learned and verified, subsequent encounters execute locally at native Rust speed (**~1.9 µs** forward-pass tensor inference, **~3.0 µs** end-to-end decision cycles) with **0 external API calls**.

---

## Universal Loop Evasion Engine & Task Training

To prevent agents from getting stuck in symmetric oscillations or local minima (such as oscillating back and forth in games, repeated button clicks in browser automation, or circular pathfinding in 3D corridors), ALR features the **`LoopEvasionEngine`**:

1. **Short-Cycle Oscillation Detection (2-Step & 4-Step):** Intercepts back-and-forth movement ($A \leftrightarrow B$) and locks oscillating actions.
2. **State Stagnation & Progress Watchdog:** Monitors state visitation frequency and steps since meaningful progress.
3. **Two-Level Evasion Protocol:**
   * *Level 1 (Local Evasion):* Forces orthogonal escape maneuvers toward open space for 3 ticks ($< 1$ µs latency, 0 tokens).
   * *Level 2 (Cognitive Escalation):* If trapped after 3 attempts, invalidates current local policy confidence and escalates to the Hierarchical Planner ($A^*$) or LLM Oracle to synthesize a brand-new trajectory.

### Training New Tasks
ALR provides an official step-by-step guide and CLI assistant for teaching the runtime new tasks:
* **Manual & Code Templates:** [`docs/training-new-tasks.md`](docs/training-new-tasks.md)
* **CLI Training Assistant:**
  ```bash
  # Train game policy (Snake, Tetris, etc.):
  cargo run -p alr-cli -- task train --type game --episodes 1000

  # Train browser web task:
  cargo run -p alr-cli -- task train --type browser --episodes 100

  # Train 3D navigation task:
  cargo run -p alr-cli -- task train --type 3d --episodes 500
  ```

---

## Why ALR?

| Dimension | Traditional Fixed Scripts | Remote LLM Agents | Autonomous Learning Runtime (ALR) |
| :--- | :--- | :--- | :--- |
| **Adaptability** | Fragile; breaks on UI drift or layout changes | High adaptability; reinvents solution on every turn | High adaptability; adapts skills and persists repairs |
| **Execution Latency** | Instantaneous | 500 ms – 3,000 ms per step | **~1.9 µs – 3.0 µs** locally; remote LLM only on novelty |
| **Operational Cost** | Zero runtime token cost | High cost per interaction (token burn) | **98.8% local autonomy**; minimal token usage |
| **Offline Resilience** | Runs offline; cannot learn | Inoperable when network or API fails | **100% operational offline** for known/learned tasks |
| **Safety Invariants** | Hardcoded | Vulnerable to prompt injection in loop | Multi-layer: `TrustBoundary`, `RiskEngine`, `ApprovalGateway` |
| **Learning Over Time** | Static | Stateless unless manual prompts engineered | **Continuous learning**: Q-learning, replay buffer, self-healing |

---

## Core Premise

> **Intelligence acquired once should become reusable, governed, local capability whenever possible.**

When an unfamiliar situation arises, the runtime can consult an oracle. However, that consultation is converted into structured operational artifacts—procedural skills, state-action transitions, invariant constraints, or distilled local neural network weights—so that the system steadily reduces its reliance on external models.

---

## Architectural Principles

1. **LLM as Teacher, Not Permanent Engine:** Remote models provide bootstrapping, initial planning, and hypothesis generation. They do not run the continuous execution loop.
2. **Local-First Execution:** Priority is given to local deterministic rules, verified skills, episodic memory, and local ONNX tensor policies.
3. **Verification Over Assumption:** An action is never assumed successful simply because a tool returned an HTTP 200 or an input was injected. Postconditions and environmental mutations are strictly verified.
4. **Safe Abstention:** When visual confidence is low ($< 0.60$), distribution shift is detected (OOD), or actions carry critical unapproved risk, the runtime safely abstains rather than hallucinating an action.
5. **No Code Rewriting in Production:** The system self-improves its skills, parameters, heuristics, and models, but **never mutates its compiled Rust source code** at runtime.
6. **Integrity and Anti-Cheat:** Games and black-box environments are operated through legitimate channels (viewport frames, keyboard, mouse). Reading target process RAM, injecting DLLs, or accessing hidden game state is strictly prohibited.
7. **Multi-Agent Specialization:** Tasks are assigned to specialized functional roles (`Planner`, `Researcher`, `Executor`, `Verifier`, `Critic`, `RedTeam`) coordinated via structured messages on a shared blackboard.

---

## Quick Start & Commands

```bash
# 1. Run Autonomous Snake in Your Terminal (Plays Until Game Over)
cargo run -p alr-cli -- snake --mode visual

# 2. Run Snake Playing in Real Google Chrome Browser
node scripts/play_in_browser.js

# 3. Train Snake for 1,000 Episodes in Fast Headless Sandbox
cargo run -p alr-cli -- snake --train --episodes 1000

# 4. Train Any New Task via the ALR Task Assistant
cargo run -p alr-cli -- task train --type game --episodes 1000

# 5. Run the Formal 12-Gate Final Acceptance Battery
cargo run -p alr-cli -- final-acceptance

# 6. Run Full Test Suite (135 Tests Passing)
cargo test --workspace
```

---

## Documentation Index

* [`docs/training-new-tasks.md`](docs/training-new-tasks.md): Guide for teaching ALR new tasks and workflows.
* [`docs/browser-snake-integration.md`](docs/browser-snake-integration.md): Architecture for playing browser games with computer vision.
* [`docs/snake-visual-training.md`](docs/snake-visual-training.md): Live visual terminal display and reinforcement learning guide.
* [`docs/final-certification-report.md`](docs/final-certification-report.md): Official 23-section independent evidence audit.
* [`docs/evidence-matrix.md`](docs/evidence-matrix.md): Claim-by-claim verification matrix.
* [`docs/final-acceptance-report.md`](docs/final-acceptance-report.md): 12-gate acceptance evaluation.
* [`docs/self-improvement.md`](docs/self-improvement.md): Governed self-improvement and sandbox validation.
* [`docs/reward-hacking.md`](docs/reward-hacking.md): Defenses against metric gaming and invariant tampering.
* [`docs/multiagent.md`](docs/multiagent.md): Multi-agent roles, task graphs, and blackboard protocol.
* [`docs/game-engine.md`](docs/game-engine.md): Game autonomy engine and anti-cheat policies.

---

## Code Quality & Verification

```bash
cargo fmt --all -- --check
cargo check --workspace
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

---

## License

Dual-licensed under **MIT License** and **Apache License 2.0**.
