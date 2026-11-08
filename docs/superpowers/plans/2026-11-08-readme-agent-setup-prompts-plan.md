# Implementation Plan: README Agent Setup Prompts

**Date:** 2026-11-08  
**Spec Reference:** `docs/superpowers/specs/2026-11-08-readme-agent-setup-prompts-design.md`  
**Target Repository:** `D:/herd/alr`  
**Primary File:** `README.md`  
**Plan Status:** Drafted for immediate execution  

## Goal

Add three copy-paste prompts at the beginning of the ALR `README.md` so that an AI coding agent can autonomously:
1. Detect the operating system (Windows, Linux distribution including Ubuntu, or macOS), install missing prerequisites, build ALR, configure it to run on boot, start the service, open the Playground web UI at `http://localhost:3000`, and verify it is responding in real time.
2. Update the installation manually on demand, discarding tracked Git modifications only inside the ALR checkout while preserving untracked/ignored configs and local databases, rebuild, restart the service, and verify.
3. Configure native daily automatic updates that inspect upstream changes once per day, update/rebuild/restart only when new commits exist, report status, and provide an inspection/disable path.

## Tech Stack & Architecture Baseline

- **Repository:** Rust workspace (`alr-cli`, `alr-core`, etc.), static web pages, Node.js launch scripts.
- **Service/Startup mechanisms targeted by agent prompts:**
  - Windows: Task Scheduler user logon task or Startup shortcut / `sc.exe` user-mode service.
  - Linux/Ubuntu: user-level `systemd` service (`systemctl --user`) or system service fallback.
  - macOS: `launchd` user LaunchAgent (`~/Library/LaunchAgents/com.alr.service.plist`).
- **Playground contract:** `cargo run -p alr-cli -- playground --port 3000` or the compiled binary `target/release/alr playground --port 3000`.
- **Health check endpoint:** `http://localhost:3000/` or `http://127.0.0.1:3000/`.

## Scope Check & Guards

```text
TDD Route:
- Mode: off
- Decision: skipped
- Strict authority: not applicable
- Test posture: post-change regression & documentation consistency check
- Reason: The change is exclusively documentation in README.md without modifying Rust binaries or runtime code.
- Verification: node scripts/check-sync.mjs, git diff review, markdown link/syntax validation, and prompt self-consistency verification.
```

```text
Requirement Ready Check:
- Requirement source refs: User conversation 2026-11-08 + docs/superpowers/specs/2026-11-08-readme-agent-setup-prompts-design.md
- Goals and scope refs: 3 copy-paste prompts for AI agents near the top of README.md
- User / scenario refs: Windows, Linux (detect Ubuntu/distro), macOS; boot autostart; Playground web UI on localhost:3000; discard tracked-only changes on update; once-daily update check.
- Requirement item refs: Prompts 1 (Install+Autostart+Playground), 2 (Manual Update), 3 (Daily Scheduled Update).
- Acceptance / verification criteria refs: Explicitly defined in spec.
- Open blocker questions: None (approved by user).
- Decision: ready
```

```text
Change Necessity:
- User-visible need: Clear copy-paste agent prompts at top of README.md for zero-touch setup, manual update, and daily automatic update across OSes.
- No-change / non-code option: Current README has manual 3-step cargo quickstart that does not configure boot autostart, does not distinguish Linux/Ubuntu vs macOS, and does not provide update routines.
- Why code change is necessary: Documentation-only change in README.md is required.
- Minimum change boundary: Insert section right after the introductory block and badges, before the hero banners.
- Decision: docs/config-only
```

---

## Task 1: Insert the Agent Setup Prompts into ALR README.md

### Files
- Modify: `D:/herd/alr/README.md`

### Placement
Insert right after line 20 (after the introductory quote block and before `<div align="center">` featuring the playground hero banner).

### Prompts to Include

1. **Prompt 1: Instalação Automática, Autostart no Boot e Playground ao Vivo**
   - Instructs the receiving agent to:
     - Detect OS (`uname -s` / `$env:OS`), architecture, and if Linux, read `/etc/os-release` to distinguish Ubuntu/Debian from Fedora/Arch.
     - Check and install required prerequisites (`git`, `curl`, build tools, Rust 1.80+ via `rustup` or official package managers).
     - Clone `https://github.com/dilneiss/alr.git` (or use existing checkout).
     - Build release binary (`cargo build --release -p alr-cli` or `cargo build --release`).
     - Configure persistent autostart when the computer boots / user logs in:
       - Windows: Register scheduled task on logon (`schtasks /Create /TN "ALRPlayground" ...`) or Startup folder script.
       - Linux (Ubuntu/Debian/etc): Configure `systemd` user service (`~/.config/systemd/user/alr.service`) with `systemctl --user enable --now alr.service`.
       - macOS: Configure LaunchAgent (`~/Library/LaunchAgents/com.alr.playground.plist`) with `launchctl load`.
     - Start the Playground on port 3000 (`alr playground --port 3000`).
     - Poll `http://localhost:3000` until HTTP 200 is confirmed.
     - Open default browser pointing to `http://localhost:3000`.
     - Report concrete service status, PID, port, and how to stop/restart.

2. **Prompt 2: Atualização Manual Imediata**
   - Instructs the receiving agent to:
     - Locate ALR checkout and active service.
     - Scope discard policy: Run `git reset --hard HEAD` within the ALR directory to discard tracked local code edits as requested, explicitly avoiding `git clean -fd` to preserve `.env`, SQLite databases (`alr_state.db`, `trading.db`), and user files.
     - Pull `git pull origin main`.
     - Rebuild release binary.
     - Gracefully restart the autostart service/process.
     - Verify `http://localhost:3000` health check.
     - Report new commit hash and service uptime.

3. **Prompt 3: Atualização Automática Diária**
   - Instructs the receiving agent to:
     - Create an idempotent scheduled job set to run once per calendar day:
       - Windows: Scheduled task running daily.
       - Linux/Ubuntu: `systemd` timer (`alr-update.timer` + `alr-update.service`) daily.
       - macOS: `launchd` calendar interval (`StartCalendarInterval`).
     - The daily script:
       - Checks `git fetch origin main`.
       - If `git rev-parse HEAD` == `git rev-parse @{u}`, logs "Sem atualizações hoje" and exits without touching the service.
       - If updates exist: discards tracked edits, pulls, recompiles, restarts service, tests `http://localhost:3000`.
       - If build fails: keeps old binary running, logs failure, and alerts.
     - Outputs exact command to inspect logs and command to disable the daily update timer.

### Verification Steps
1. Review markdown rendering and links.
2. Confirm no disruption to existing quickstart sections.
3. Validate that `scripts/check-sync.mjs` in maestros correctly checks sync between ALR and maestros mirrors if relevant.
4. Commit the change with clear commit message `docs(readme): add copy-paste agent prompts for install, autostart, and updates`.
