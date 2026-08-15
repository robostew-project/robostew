# RoboStew v0.1.0 Security Boundaries

Status: **release-candidate security contract**

RoboStew `v0.1.0` is an engineering release for local simulation and a documented reference deployment. It is not a safety controller, security appliance, or production identity platform.

## Core security principles

- Default to local-only access and no cloud dependency.
- Treat configuration, process existence, and UI state as different facts.
- Sanitize sensitive fields at the API boundary, not only in the browser.
- Keep AI advisory and unable to execute actions.
- Give every optional component least privilege and a bounded failure domain.
- Make destructive actions explicit, narrow, and attributable to the operator.
- Never imply kinetic or safety authority.

## Trust boundaries

```text
Operator browser
  -> local dashboard/API
       -> RoboStew state store
       -> deterministic simulator and telemetry
       -> inert workload runtime

Optional provider boundary
  -> bounded advisor adapter
       -> explicitly configured hosted or local inference

Reference deployment boundary
  -> Azure controller
       -> private Dell/EVE path
            -> inert EVE workloads
```

The local, optional-provider, and reference-deployment boundaries must remain independently operable. Failure or compromise of an optional advisor must not grant workload deployment, host shell, container runtime, EVE mutation, or robot-actuation authority.

## Core laptop edition

- Services bind to loopback by default.
- Docker resources use a dedicated project name and network.
- The state store is not published to the host unless a documented development profile explicitly requires it.
- Health endpoints expose no credentials, raw environment values, host paths, private endpoints, usernames, or command strings.
- The simulator is clearly labeled and cannot be mistaken for physical robot telemetry.
- No privileged containers, host PID namespace, Docker socket, or writable host-root mounts are allowed in the default profile.
- Local dashboard access controls are convenience controls, not a production authentication claim.

## API and UI boundary

Public API responses must be constructed from an allowlisted schema. Server-side projection must remove:

- credentials and authorization material;
- addresses and private endpoints not required by the local user;
- usernames, absolute paths, UUIDs, and cloud resource identities;
- raw SSH or shell commands;
- raw exception strings that can expose topology;
- unbounded logs and provider responses.

React or browser-side redaction is defense in depth only. Tests must request the API directly and prove prohibited fields never cross the server boundary.

## Optional AI boundary

AI is disabled by default and advisory only.

The advisor must:

- use a dedicated minimally privileged identity or user-supplied provider credential;
- accept only bounded, documented input;
- expose no arbitrary tool or prompt execution through the public dashboard;
- enforce output and request limits;
- record latency, provider result, token usage when available, and failure class without recording secrets;
- fail closed when authentication or policy validation fails;
- remain unable to deploy workloads, invoke a host shell, access the Docker socket, mutate EVE, approve actions, or control robots.

For the NemoClaw/OpenShell profile, the release must pin a validated compatibility set, use authenticated gateway communication, deny public network access by default, and include functional plus negative-policy tests.

## Secrets and configuration

- Track examples only; never track live `.env` files.
- Do not accept secrets in URLs or command-line arguments.
- Prefer workload identity or managed identity in the Azure reference path.
- When local credentials are unavoidable, store them in an operating-system-appropriate secret mechanism or an ignored file with restrictive permissions.
- Logs, support bundles, screenshots, tests, and error responses must redact secrets before persistence.
- Secret scanners supplement manual review; they do not replace it.

## Workload and actuation boundary

The workload demonstrations are inert software services. RoboStew `v0.1.0` provides no motor, actuator, navigation, manipulation, calibration, programmable-logic-controller, emergency-stop, or safety-rated interface.

Any future actuation work requires a separate threat model, explicit authorization design, hardware safety analysis, audit model, failure-mode analysis, and release decision. The existence of a generic workload action must never be interpreted as permission to control physical motion.

## Azure/Dell/EVE reference defaults

Public reference documentation must use safer defaults than the private validation environment:

- restrict SSH ingress to an operator-controlled source or private network;
- disable registry admin credentials and public access unless a documented requirement exists;
- require modern TLS and deny-by-default storage networking;
- disable local AI-account authentication when managed identity is used;
- restrict managed-disk network access;
- scope identities to the selected resources and actions;
- keep control-plane traffic private where practical;
- document backup, deallocation, recovery, and credential-rotation boundaries.

The public documentation must disclose that full reconstruction from an empty Azure resource group and Dell cold-boot recovery were not validated in the private release.

## Dependency and supply-chain boundary

- Pin release dependencies and container images to validated versions or digests.
- Produce a dependency inventory and retain license notices.
- Run vulnerability and secret scans in continuous integration.
- Build the public release from a clean checkout.
- Do not publish generated dependencies, virtual environments, or unreviewed binary artifacts.
- Sign or attest release artifacts when the release workflow is established.

## Security validation gates

Before `v0.1.0`:

- direct API privacy tests pass;
- default containers run without unnecessary privilege;
- no default service binds publicly;
- optional AI functional and denial tests pass;
- installation and purge touch only RoboStew-owned resources;
- secret and naming scans pass across source and paths;
- images and documents pass extraction and visual review;
- the public snapshot contains no private history or operational evidence;
- known limitations are visible in the README and security documentation.

## Vulnerability reporting

The public repository must include `SECURITY.md` with a private reporting channel before publication. Public issues should not be used to disclose unpatched credentials, exploitable endpoints, or private deployment details.
