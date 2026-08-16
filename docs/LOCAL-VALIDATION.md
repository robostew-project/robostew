# RoboStew v0.1.0 Local Validation

Status: **validated `v0.1.0` release evidence; published on 2026-08-15**

Validation date: 2026-08-14

## Tested host

| Item | Observed value |
|---|---|
| Hardware architecture | Apple Silicon `arm64` |
| Operating system | macOS 26.5.2, build 25F84 |
| Docker client and engine | 29.4.0 |
| Docker Compose | 5.1.2 |
| Docker Desktop VM architecture | `aarch64` |
| Container build runtime | Node.js 22 Alpine image |
| State-store image | Valkey 8.1.9 Alpine |

This is one-host evidence. It must not be generalized into support for all Apple Silicon Macs.

## Recorded timing

| Operation | Observed elapsed time | Conditions |
|---|---:|---|
| Start from a fresh Git clone | 8.98 seconds | Exact allowlisted candidate; shared base images cached; RoboStew containers, network, volume, and local image absent |
| Stop then cached restart | 9.00 seconds | Exact fresh clone; local image and persistent volume present |
| Non-purge reinstall | 8.92 seconds | Exact fresh clone; containers and network recreated; volume and local image preserved |

All three measurements were taken from a fresh local Git clone of the exact allowlisted candidate. A fully cold run with neither shared base image in the Docker cache was not recorded. Network cloning from the pre-publication private GitHub repository was not timed. These results comfortably satisfy the five-to-ten-minute experience goal on this host, but they are observations rather than guarantees.

## Functional results

- Five Compose services reached healthy state.
- Five simulated robots appeared through the public fleet API.
- Two inert workloads reported current heartbeats.
- Valkey responded to a live functional probe.
- The deterministic `baseline`, `attention`, `recovery`, and `stable` scenario completed.
- All five robots returned to stable state.
- Optional AI reported `stopped` without degrading the core stack.
- Stopping the simulator caused runtime truth to report `degraded` after the freshness window.
- Restarting the simulator restored runtime truth to `running`.
- A quiet heartbeat kept telemetry current beyond that window without creating duplicate timeline events.

## Persistence and removal results

- Stop/start preserved the event timeline.
- Non-purge uninstall removed containers and network while preserving `robostew-data`.
- Reinstall after non-purge uninstall recovered the persisted event timeline.
- Purge removed all RoboStew containers, the `robostew-local` network, `robostew-data`, and the exact locally built `robostew/control-plane:0.1.0` image.
- Shared Node.js and Valkey images and an unrelated test image retained their exact image IDs.
- The complete start, demonstration, stop, restart, non-purge uninstall, reinstall, and purge lifecycle passed from the fresh Git clone.

## Security and privacy results

- Dashboard host binding resolved to `127.0.0.1`.
- Control-plane container ran as the unprivileged `node` user.
- Control-plane container was not privileged.
- Control-plane container had no host bind mounts.
- Valkey, simulator, and workloads had no published host port.
- Public API projection excluded credential, command, private-address, username, and absolute-path markers used by the validator.
- Trivy 0.70.0 source scanning reported no detected secrets or Dockerfile misconfigurations.
- Trivy 0.70.0 reported zero high or critical vulnerabilities in the minimized RoboStew control-plane image and the pinned Valkey image.
- Invalid telemetry input was rejected.
- Content Security Policy, frame denial, no-sniff, and no-referrer headers were present.
- Browser inspection in the Codex in-app Chromium environment found five robot cards, two workload rows, correct running truth, and no console errors. The session did not expose an exact browser build number.
- Two browser-chrome-free viewport captures were reviewed: the fleet overview and runtime/evidence operations view.

## Automated command

With RoboStew running:

```bash
./scripts/validate_local_release.sh
```

The validator checks unit behavior, Compose validity, service health, runtime truth, simulation labeling, public API privacy, browser security headers, invalid-input rejection, the fixed scenario, loopback binding, container privilege, and host mounts.

## Post-publication verification

- The public repository and `v0.1.0` release are available at the GitHub URLs documented in the README.
- An anonymous fresh clone passed the publication audit and local Markdown-link check.
- The initial GitHub Actions validation completed successfully.

## Remaining validation work

- Run a fully cold, empty-image-cache timing only if a cold-download claim is desired.
- Record tests from additional browsers and platforms before adding compatibility claims.
