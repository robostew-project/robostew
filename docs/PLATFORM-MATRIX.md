# RoboStew v0.1.0 Platform Matrix

Status: **single-host release-candidate evidence**

RoboStew `v0.1.0` was tested on one Apple Silicon Mac. Passing on that host does not establish general macOS compatibility. The current private Azure/Dell validation is evidence for the reference architecture, not proof that the laptop edition works on Ubuntu.

## Core laptop edition

| Host platform | Architecture | v0.1.0 position | Current release-candidate evidence | Public wording |
|---|---|---|---|---|
| macOS 26.5.2 validation host | Apple silicon `arm64` | sole validated target | complete local stack, lifecycle, API, and browser smoke tests passed | Publish the exact measured results in `LOCAL-VALIDATION.md` |
| Other Apple silicon macOS configurations | `arm64` | untested | none | May work; not validated or supported by `v0.1.0` evidence |
| macOS | Intel | untested | none | No compatibility claim |
| Ubuntu 22.04/24.04 LTS | x86-64 | community target | laptop edition untested; reference components are separate evidence | May work through containers; no `v0.1.0` laptop support claim |
| Linux | ARM64 | community target | none | No compatibility claim |
| Windows 11 with WSL2 | x86-64 | community target | none | No compatibility claim and no PowerShell launcher |
| Windows native containers | x86-64 | unsupported | not applicable | Not planned for `v0.1.0` |

## Browser targets

The dashboard is designed for current standards-based browsers, including:

- Chrome;
- Edge;
- Firefox;
- Safari on macOS.

The release candidate received a functional and visual smoke test in the Codex in-app Chromium environment; that session did not expose an exact browser build number. Chrome, Edge, Firefox, and Safari were not separately validated. Browser validation means the operator workflow works; it does not promise pixel-identical rendering.

## Container architecture requirements

All core images must build for the validated `arm64` host without architecture emulation. Multi-architecture publication is a future contribution unless separately validated.

The public build path must use Node.js 22. Host Node.js is not a core prerequisite because compilation and runtime dependencies should be containerized.

The core stack must use a containerized state store. Installing Valkey or another database directly on the host is not part of the supported quickstart.

## Optional AI matrix

| Path | Validation Mac | Other platforms | v0.1.0 claim |
|---|---|---|---|---|
| Core without AI | required | untested | validated only on the recorded Mac host |
| Hosted AI provider | optional after separate test | untested | never required for core health |
| Local model provider | candidate | untested | no claim without a recorded provider/model test |
| NemoClaw/OpenShell advisor | reference only | untested | optional bounded integration, not default setup |

Provider setup, credentials, quotas, latency, and cost are outside the ten-minute core-install target.

## Azure/Dell/EVE reference platform

The privately validated reference topology uses:

- an x86-64 Ubuntu 24.04 Azure controller host;
- an x86-64 Ubuntu 24.04 Dell host;
- libvirt/QEMU;
- LF Edge EVE;
- inert container workloads;
- private host-to-host connectivity;
- an optional managed-identity AI path;
- an optional bounded NemoClaw/OpenShell sandbox.

This topology may be documented publicly after identifiers and recovery details are removed. It is not a supported laptop installation, is not validated as a production design, and has not been recreated from an empty Azure resource group.

## Version policy

- Pin container image versions or digests used by release validation.
- Pin rapidly changing optional AI components to the validated compatibility set.
- Publish the exact tested Docker, Compose, operating-system, and architecture versions in release evidence.
- Treat untested newer versions as unknown, not automatically compatible.
- Require the complete installation protocol before adding any platform claim in a patch release.

## Required disclaimer

Public installation material must state:

> RoboStew v0.1.0 was validated on one Apple Silicon Mac using the exact environment recorded in the release evidence. Other macOS versions, Intel Macs, Linux, and Windows were not validated. The containerized architecture may work elsewhere, but v0.1.0 makes no support claim for those environments. Community test reports and contributions are welcome.
