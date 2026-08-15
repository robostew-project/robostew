# RoboStew Local Troubleshooting

## Docker Desktop is not running

Symptom:

```text
RoboStew: Docker Desktop is not running. Start it and retry.
```

Open Docker Desktop, wait until its engine is ready, and run:

```bash
docker info
./robostew start
```

## Port 8080 is already in use

Choose another loopback port:

```bash
ROBOSTEW_PORT=8180 ./robostew start
```

Use the same variable for later commands:

```bash
ROBOSTEW_PORT=8180 ./robostew status
ROBOSTEW_PORT=8180 ./robostew demo
```

## A container is unhealthy

Inspect the local stack:

```bash
docker compose --project-name robostew --file compose.yaml ps
./robostew logs
```

The logs command follows output until you press `Control-C`. Logs should be reviewed before sharing because third-party Docker diagnostics can contain local environment details.

## The control plane says degraded

Run:

```bash
./robostew status
```

The component evidence identifies whether Valkey, telemetry freshness, or workload heartbeats failed. A degraded state is intentional when a required functional probe fails; restarting the entire stack should not be the first diagnostic step.

If the simulator is stopped:

```bash
docker compose --project-name robostew --file compose.yaml start simulator
```

## The demonstration says the simulator is busy

The launcher retries a bounded busy response for up to 20 seconds. If it still fails, inspect:

```bash
docker compose --project-name robostew --file compose.yaml logs simulator
```

Then retry `./robostew demo` once the current fixed scenario completes.

## Preserve or reset local state

Preserve data while recreating services:

```bash
./robostew uninstall
./robostew start
```

Remove all RoboStew-owned runtime state:

```bash
./robostew uninstall --purge
./robostew start
```

Purge is irreversible for the local event timeline. It does not affect unrelated Docker volumes.

## Image pull fails

Confirm Docker can reach its configured registry and retry:

```bash
docker pull valkey/valkey:8.1.9-alpine
docker pull node:22-alpine
./robostew start
```

Corporate proxies, registry rate limits, and network filtering are outside RoboStew's control.

## Unsupported platform warning

The launcher warns when the host is not Apple Silicon macOS. This does not deliberately block contributor experimentation, but the warning is accurate: `v0.1.0` supplies no compatibility or support evidence for that environment.

## Report a reproducible problem

Include:

- operating system and architecture;
- Docker and Compose versions;
- the command executed;
- the failing component and its public status evidence;
- the smallest relevant log excerpt with local identifiers removed.

Never post credentials, full environment files, private endpoints, tokens, cloud account identifiers, or raw support bundles in a public issue.
