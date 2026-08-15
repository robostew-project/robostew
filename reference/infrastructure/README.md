# Infrastructure Publication Boundary

RoboStew does not publish a complete cloud deployment template in `v0.1.0`.

The private Azure foundation is useful engineering evidence, but publishing it as a turnkey template would be misleading because the complete environment was not recreated from an empty resource group. The candidate also requires deliberate redesign before it can represent a safe default.

A future public infrastructure implementation must provide:

- no public IP or inbound administrative access by default;
- private connectivity or an explicitly scoped operator path;
- managed identity with the minimum data-plane role;
- password authentication disabled;
- no long-lived credentials in templates, command lines, cloud-init, or repository files;
- encrypted persistent disks and explicit backup ownership;
- deny-by-default sandbox and workload networks;
- pinned images and dependency versions;
- budget alerts and bounded model quotas;
- deletion locks or an equivalent explicit destruction boundary;
- output redaction for resource identifiers and network details;
- a tested empty-resource-group deployment and destruction procedure.

Until those conditions are implemented and validated, the public material remains an architecture and security contract rather than executable infrastructure-as-code.
