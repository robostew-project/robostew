# Changelog

All notable public changes will be recorded here.

## Unreleased — 0.2.0

### Added

- Read-only, provider-neutral Kubernetes/GPU workload observer.
- Sanitized fleet, robot-class, and physical-AI-loop lineage annotations.
- Accelerated-workload API and dashboard evidence panel.
- Least-privilege Kubernetes RBAC example with no write verbs.
- Deterministic eight-GPU fixture and privacy-focused projection tests.

### Changed

- Local demonstration now exercises both robot-fleet recovery and accelerated-workload observation.
- Runtime truth marks Kubernetes observations unreachable when they become stale.

## 0.1.0 — 2026-08-15

Initial open-source release:

- Apple Silicon Mac local edition using Docker Compose;
- dashboard and runtime-backed control-plane API;
- five deterministic simulated robots;
- four-stage fleet recovery demonstration;
- two inert workload containers;
- BSD-licensed Valkey state store with persistent local volume;
- explicit stop, uninstall, and purge workflows;
- server-side public API projection and security headers;
- minimized runtime image with unused package-manager trees removed and high/critical image scanning in CI;
- single-host validation evidence;
- separately documented Azure/Dell/EVE reference architecture;
- tested, non-deploying reference implementations for runtime truth, public projection, EVE inventory, bounded AI, NemoClaw/OpenShell policy, and telemetry intake;
- optional AI boundaries documented but not installed by the local quickstart.
