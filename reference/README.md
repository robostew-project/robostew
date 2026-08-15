# RoboStew Reference Implementations

The default RoboStew installation is the local Compose stack at the repository root. Nothing under `reference/` is started by `./robostew start`.

These modules preserve the most useful, reviewable engineering patterns from the separately validated Azure, Dell, LF Edge EVE, and bounded-advisor environment without publishing deployment identities or claiming one-command reproducibility.

| Area | What is included | What is deliberately absent |
|---|---|---|
| `azure-dell-eve/` | Runtime-state derivation, server-side public projection, EVE inventory parsing, and evidence reconciliation | Remote command execution, credentials, endpoints, host identities, and deployment actions |
| `ai-advisor/` | Managed-identity request construction, bounded recommendations, rate checks, audit projection, and failure behavior | Provider credentials, a provisioned model, autonomous tools, and deployment authority |
| `nemoclaw-openshell/` | Fixed-request boundary, model allowlist, token comparison, deny-by-default policy example, and negative tests | A sandbox installer, host mounts, arbitrary prompts, arbitrary tools, and a bundled model runtime |
| `telemetry/` | Loopback-first authenticated receiver with bounded input and allowlisted public projection | Production identity, durable storage, permissive cross-origin access, and kinetic commands |
| `infrastructure/` | Security and warm-standby design contracts | An unvalidated promise of complete cloud reconstruction |

Run the environment-independent reference tests with:

```bash
find reference -name '*.test.mjs' -exec node --test {} +
```

Passing these tests demonstrates policy and transformation behavior. It does not demonstrate a live Azure subscription, Dell host, EVE node, AI deployment, or NemoClaw/OpenShell sandbox.
