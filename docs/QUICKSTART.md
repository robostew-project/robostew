# RoboStew Local Quickstart

This guide covers the only `v0.1.0` quickstart environment validated by the project: one Apple Silicon Mac with Docker Desktop.

## Prerequisites

Install and start:

- Git;
- Docker Desktop.

Confirm Docker is ready:

```bash
docker version
docker compose version
```

The server section of `docker version` must respond. RoboStew does not install Docker Desktop for you.

## Install and start

```bash
git clone https://github.com/robostew-project/robostew.git
cd robostew
./robostew start
```

The launcher:

1. checks Docker and Compose;
2. identifies whether the host matches the validated Apple Silicon target;
3. builds the Node.js 22 control-plane image;
4. pulls the pinned Valkey image when needed;
5. creates only RoboStew-labeled containers, network, and volume;
6. waits for functional health checks;
7. prints the loopback dashboard address.

Open:

```text
http://127.0.0.1:8080
```

No credential is placed in the URL.

## Run the demonstration

```bash
./robostew demo
```

Expected output includes:

```json
{"status":"completed","scenario":"fleet-recovery","stages":4}
```

The exact duration field varies. The dashboard timeline should show `baseline`, `attention`, `recovery`, and `stable`, with all five simulated robots ready at completion.

## Inspect runtime truth

```bash
./robostew status
```

Expected core states:

- control plane: `running`;
- state store: `running`;
- fleet simulator: `running`;
- inert workloads: `running`;
- AI advisor: `stopped`, because it is optional and not configured.

An intentionally stopped optional advisor does not degrade the local core.

## Stop and restart

```bash
./robostew stop
./robostew start
```

The `robostew-data` volume preserves fleet events across this cycle.

## Remove containers but preserve data

```bash
./robostew uninstall
```

This removes the five containers and `robostew-local` network. It preserves the `robostew-data` volume and prints the command for removing it.

## Remove all RoboStew runtime state

```bash
./robostew uninstall --purge
```

This removes:

- RoboStew containers;
- the `robostew-local` network;
- the `robostew-data` volume.
- the exact locally built `robostew/control-plane:0.1.0` image.

It does not remove the repository, Docker Desktop, shared Node.js or Valkey base images, unrelated containers, unrelated volumes, or other projects. If a non-RoboStew container is using the local RoboStew image, purge stops with a clear error rather than forcing its removal.

## Timing definition

The installation measurement starts immediately before `./robostew start` and ends when the launcher reports the dashboard ready. Git and Docker Desktop must already be installed and Docker must be running.

Release evidence records cold-image and cached-image measurements separately. Network conditions can dominate a cold image pull; the published measurement is evidence from one host, not a guarantee for another machine.

## Platform disclaimer

RoboStew `v0.1.0` was validated on one Apple Silicon Mac using the exact environment recorded in `LOCAL-VALIDATION.md`. Other macOS versions, Intel Macs, Linux, and Windows were not validated. The containerized architecture may work elsewhere, but `v0.1.0` makes no support claim for those environments.
