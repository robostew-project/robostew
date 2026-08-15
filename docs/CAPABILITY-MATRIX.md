# RoboStew v0.1.0 Capability Matrix

Status: **release-candidate claims contract**

Legend:

- **Required** — must ship and pass public release validation.
- **Reference** — demonstrated by the Azure/Dell/EVE architecture and documented honestly.
- **Optional** — available only after explicit configuration; absence cannot break core health.
- **Excluded** — not a `v0.1.0` capability.

| Capability | Core laptop edition | Azure/Dell/EVE reference | Optional AI profile | Public claim boundary |
|---|---|---|---|---|
| Dashboard and API | Required | Reference | Observes only | Operator-facing fleet-control interface |
| Runtime truth states | Required | Reference and privately validated | Must report its own optional state | No static success indicators |
| Deterministic fleet simulator | Required | Not required | May observe simulation | Clearly labeled simulated robots |
| Robot health telemetry | Required, simulated | Reference telemetry path | May summarize bounded data | No universal robot protocol claim |
| Alerts and degraded states | Required | Reference | Advisory interpretation only | No automatic remediation |
| Fleet inventory | Required, simulated | Reference EVE/device inventory | Read-only | Not a production asset registry |
| Inert workload lifecycle | Required demonstration | Reference and privately validated | No deployment authority | Software workloads only |
| Valkey-backed local state | Required, containerized | Reference deployment uses Redis with bounded retention | No direct access required | Not a high-availability data service |
| Persistent restart recovery | Required locally | Azure guest reboot privately validated | Optional component failures isolated | Full disaster recovery not claimed |
| Azure infrastructure template | Not required | Documentation only; no template ships | Managed identity reference source only | No environment-recreation claim |
| Dell Ubuntu and LF Edge EVE | Not required | Reference | Read-only advisor context | No unattended Dell recovery claim |
| Azure OpenAI advisor | Not required | Optional reference, privately validated | Optional | Bounded advice, fixed safety boundary |
| NemoClaw/OpenShell sandbox | Not required | Optional reference, privately validated | Optional | Bounded inference path, not a fleet copilot |
| Local model advisor | Not required | Not required | Not included | No `v0.1.0` capability claim |
| Audit evidence | Required for demonstration checks | Reference validation summaries | Required for AI functional and negative tests | No credentials or private identifiers |
| Multi-user authentication | Excluded | Deployment-specific boundary only | Excluded | Local dashboard key is not production identity |
| Multi-tenancy | Excluded | Excluded | Excluded | Single-operator engineering release |
| High availability | Excluded | Excluded | Excluded | Single-instance reference components |
| Real robot movement | Excluded | Excluded | Excluded | No kinetic authority demonstrated |
| ROS 2 navigation/manipulation | Excluded | Excluded | Excluded | Future integration area only |
| Safety-rated control | Excluded | Excluded | Excluded | Never position RoboStew as a safety controller |
| Autonomous remediation | Excluded | Excluded | Excluded | Human authority remains outside the AI path |

## Demonstrated private evidence versus public release evidence

The private environment currently demonstrates a working Azure controller, Dell/EVE visibility, five inert workloads, bounded state retention, Azure guest cold boot, a fresh managed-identity advisor call, and dated NemoClaw/OpenShell functional and negative-policy evidence. The optional NemoClaw path has no availability guarantee and is not part of the local edition.

Those results support the reference story but do not automatically validate the public snapshot. Public evidence must be regenerated or rewritten against the exact history-free release candidate.

## Status language

The UI and API must use the same state vocabulary and evidence rules:

- `available` means the capability exists;
- `configured` means required configuration is present;
- `running` requires a current functional probe;
- `degraded` means only part of the expected behavior passes;
- `stopped` means intentionally not running;
- `unreachable` means the source of truth cannot be contacted.

“Healthy,” “ready,” or green presentation must never be inferred solely from configuration, a process identifier, or a static fixture.

## Claim approval rule

A capability moves from candidate to public claim only when its implementation, automated check, documentation, and platform evidence all exist in the public release candidate. Screenshots alone are not validation.
