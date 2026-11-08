# README Agent Setup Prompts Design

**Date:** 2026-11-08  
**Status:** Approved for specification; awaiting user review  
**Scope:** Add agent-executable prompts near the beginning of `README.md`.

## Goal

Let a user copy a prompt from the README into an AI coding agent and have that agent install ALR, configure it to start when the computer boots, show the Playground working, update it on demand, or keep it updated automatically with one daily check.

## User-approved choices

- Open the ALR Playground web UI at `http://localhost:3000` after installation.
- Support Windows, Linux (detect the specific distribution, including Ubuntu), and macOS.
- During updates, discard tracked Git modifications only inside the ALR repository. Do not run `git clean`; preserve ignored configuration, local databases, and user data.
- Prefer three copyable prompts in the README over adding installation/update scripts or presenting shell commands for users to select by operating system.

## Placement and content

Add a concise section after the short project introduction and before the large promotional screenshots/banners. Provide three independently usable fenced text blocks, each clearly labelled and introduced as instructions to paste into an AI agent:

1. **Install and start:** inspect OS, architecture, and Linux distribution; locate or obtain the repository; install missing prerequisites using the platform's appropriate package manager or official Rust installer; build ALR; configure its service/startup mechanism to launch at boot; start the service; open the Playground; and verify that the local UI responds and ALR is functioning.
2. **Update now:** identify the existing installation and platform; fetch current upstream code; discard tracked local repository modifications as approved while preserving untracked/ignored state; rebuild; restart the configured service; and verify the running service and Playground.
3. **Daily automatic updates:** configure the native scheduler for one check per day (Windows Task Scheduler, systemd timer or appropriate user-level Linux scheduler, and launchd on macOS); if an upstream update exists, update, rebuild, restart, and verify. Do not repeatedly check within the same day. Provide a way to inspect or disable the scheduled task and report its status.

The prompts must be self-contained, OS-aware, and instruct the receiving agent to do the work rather than merely provide instructions. They must report concrete paths, service/scheduler identifiers, verification results, and errors. They must not claim success when a command, permission, build, startup, browser launch, or health check fails. Request elevation only for a specific operation that requires it; prefer user-level setup where practical.

## Runtime and safety boundaries

- Use the repository's documented `cargo run -p alr-cli -- playground --port 3000` behavior as the UI contract; the existing quickstart is a terminal demonstration, not the requested persistent dashboard.
- Keep the installed checkout and runtime state identifiable so manual and scheduled prompts can update the same installation rather than cloning duplicate copies.
- Discard only tracked repository edits with a Git operation scoped to the ALR checkout. Do not clean untracked or ignored files, change files outside the checkout, delete databases/configuration, or reset unrelated repositories.
- Daily update means at most one scheduled check per day; an update should only rebuild/restart when upstream code has changed. The prompt must define behavior for offline/network failures and failed builds: preserve the last known working executable/service where feasible, log the failure, and report that no successful update occurred.
- Scheduled updates must run with the user's permissions and environment needed for the installation, and must not store credentials or enable unrelated privileged access.

## Alternatives considered

1. **Three README agent prompts (selected):** directly matches the copy/paste request and lets the agent select native OS mechanisms at setup time.
2. **Cross-platform installer and updater scripts:** more deterministic, but expands the task into implementation and maintenance across three OS families.
3. **Platform-specific shell commands only:** transparent, but makes users choose the correct platform flow and does not delegate environment discovery to their agent.

## Acceptance criteria

- The section is placed near the README start, before the existing large visual banner content.
- Exactly three labelled, self-contained prompts cover install/autostart + live Playground, one-time manual update, and once-daily automatic update.
- Prompt language explicitly covers Windows, Linux distribution detection including Ubuntu, and macOS, using their native service/scheduler mechanisms.
- Installation starts ALR at boot and opens the Playground in a browser, with checks that demonstrate the UI/service is responding.
- Update prompts preserve ignored and user data, discard tracked code changes only within the ALR checkout, avoid `git clean`, and verify rebuild/restart outcomes.
- Daily scheduling has an inspect/disable path and no more than one check per day.
- README retains its existing Quickstart and install guide sections without conflicting claims.
