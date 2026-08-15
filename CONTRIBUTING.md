# Contributing to RoboStew

RoboStew welcomes focused contributions that improve truthful fleet visibility, reproducible local operation, security boundaries, documentation, or tested platform portability.

## Before opening a change

- Search existing issues and discussions.
- Keep kinetic robot control outside `v0.1.x`.
- Do not weaken the advisory-only AI boundary.
- Do not add static healthy or ready states where a functional probe can exist.
- Do not commit credentials, private infrastructure identifiers, generated dependencies, databases, or raw operational evidence.
- Discuss large architecture or platform-support changes before implementation.

## Local workflow

```bash
./robostew start
./scripts/validate_local_release.sh
./robostew uninstall --purge
```

Also run:

```bash
node --test local/tests/*.test.mjs
docker compose --file compose.yaml config --quiet
```

## Pull requests

A useful pull request includes:

- one clearly bounded purpose;
- tests for changed behavior;
- documentation for user-visible changes;
- an explicit platform and environment statement;
- no unsupported compatibility claim;
- no unrelated generated files.

Contributions are submitted under Apache License 2.0 as described in Section 5 of the license.

## Platform test reports

Linux, Windows, Intel Mac, and other macOS configurations are untested in `v0.1.0`. Reports are valuable only when they include the exact operating system, architecture, Docker and Compose versions, start timing, demonstration result, restart result, uninstall result, and purge verification.

One successful report is evidence for that host—not automatic support for the entire platform family.
