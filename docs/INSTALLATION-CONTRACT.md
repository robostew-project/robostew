# RoboStew v0.1.0 Installation Contract

Status: **implemented and validated on the designated Apple Silicon Mac**

This document defines the installation and removal experience for `v0.1.0`. The release candidate was validated on one Apple Silicon Mac. Commands shown here are implemented interfaces; evidence is recorded in `LOCAL-VALIDATION.md`.

## User prerequisites

The core laptop edition may require only:

- Git;
- Docker Engine with the Compose plugin, or Docker Desktop;
- a supported browser;
- enough local capacity for the published container images and demonstration data.

Users must not need a host-installed Valkey, Node.js, Python, cloud CLI, Azure subscription, AI key, second machine, or Ubuntu virtual machine for the default experience.

## Repository ownership boundary

The installation must create state only in clearly owned locations:

- the cloned RoboStew directory;
- Docker images, networks, containers, and named volumes carrying a `robostew` project label or prefix;
- an optional user-local RoboStew configuration directory documented per platform.

The installer must not modify unrelated Docker resources, shell startup files, system services, firewall rules, SSH configuration, or other projects.

## Command contract

Unix-like hosts:

```bash
./robostew start
./robostew status
./robostew demo
./robostew stop
./robostew uninstall
./robostew uninstall --purge
```

The launcher may wrap Docker Compose, but its behavior and exit codes must remain stable for `v0.1.x`. A PowerShell launcher is not required or claimed for `v0.1.0`.

## Start behavior

`start` must:

1. Check supported host architecture and required tools.
2. Fail before mutation when prerequisites are missing.
3. Create only RoboStew-owned Docker resources.
4. Start the dashboard/API, state store, fleet simulator, telemetry generator, and inert workload demonstration.
5. Wait for meaningful health checks rather than process existence alone.
6. Print a loopback dashboard URL without embedding credentials in it.
7. Return a nonzero exit code if the stack is not usable.

It must be safe to run `start` more than once.

## Status behavior

`status` must report runtime-backed states using the shared vocabulary:

- `available` — supported capability is present but not necessarily configured;
- `configured` — required configuration is present;
- `running` — functional checks currently pass;
- `degraded` — partially functional or inconsistent;
- `stopped` — intentionally not running;
- `unreachable` — a required probe cannot reach its target.

Optional AI being stopped or unconfigured must not make the core stack falsely degraded.

## Demonstration behavior

`demo` must be deterministic and repeatable. It should exercise at least:

- a healthy simulated robot;
- elevated temperature or another degraded health signal;
- low battery;
- an intermittent heartbeat;
- an inert workload state transition;
- recovery to a stable state.

The command must identify simulated data clearly and must not contact a cloud provider unless the user explicitly enables an optional profile.

## Stop and restart behavior

`stop` must stop RoboStew containers without deleting persistent data. A subsequent `start` must restore the local fleet state or clearly explain any intentionally reset demonstration state.

The restart test must confirm that runtime truth, dashboard availability, and the demonstration workflow recover without manual database repair.

## Removal behavior

`uninstall` must:

- stop and remove RoboStew-owned containers and networks;
- preserve named volumes and user configuration;
- print what was preserved and how to remove it later;
- leave unrelated Docker resources untouched.

`uninstall --purge` must additionally remove RoboStew-owned volumes, cached local state, optional RoboStew configuration, and the exact locally built RoboStew image after showing the ownership boundary. It must not remove Git, Docker, shared base images, shared provider CLIs, unrelated model runtimes, or non-RoboStew sandboxes. If an unrelated container uses the RoboStew image, purge must fail clearly rather than force removal.

The repository directory remains under user control and is not deleted by either command.

## Optional AI installation

AI setup must be a separate, explicit action. Provider credentials must never be accepted as command-line arguments, written into tracked files, returned by APIs, or displayed in screenshots.

If NemoClaw/OpenShell is supported, removal may delete only the sandbox, policy, and configuration created by RoboStew. It must not remove another project's sandbox or a shared runtime installation without separate confirmation.

## Failure and recovery contract

- Every command returns a useful nonzero exit code on failure.
- Partial startup identifies which component failed and preserves logs without exposing secrets.
- Health checks distinguish configured, running, degraded, stopped, and unreachable states.
- Retrying after a transient failure must not create duplicate containers or volumes.
- The troubleshooting guide must include port collisions, Docker availability, image-pull failure, unsupported architecture, and corrupt local state.

## Release validation

For the designated Apple Silicon Mac, record:

- clean-machine prerequisites;
- start duration excluding prerequisite installation;
- exact images and versions;
- functional dashboard and API checks;
- deterministic demonstration result;
- stop/start persistence result;
- uninstall ownership result;
- purge result and verification that no RoboStew-owned runtime resources remain.

The published result must state that it is a single-host validation. Results from Linux, Windows, Intel Mac, or a different macOS version are unknown until contributors execute and submit the same validation protocol.
