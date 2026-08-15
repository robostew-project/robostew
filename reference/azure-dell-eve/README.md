# Azure, Dell, and EVE Reference Logic

This directory contains pure, environment-independent logic extracted from the privately validated reference deployment:

- a shared runtime-state vocabulary;
- conservative overall-state derivation;
- server-side removal of infrastructure details;
- EVE workload observation parsing;
- reconciliation of controller, device, and metrics evidence.

The modules accept already-collected evidence. They do not open remote sessions, execute commands, deploy workloads, mutate EVE, or control robots.

The local edition does not import these files. They are published as inspectable reference source with deterministic tests.
