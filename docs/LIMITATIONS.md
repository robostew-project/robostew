# RoboStew v0.1.0 Limitations

These limitations are part of the release, not deferred marketing footnotes.

## Platform evidence

- The laptop edition was tested on one Apple Silicon Mac only.
- Passing on that host does not establish compatibility with other Apple Silicon Macs or macOS versions.
- Intel macOS, Linux, Windows, WSL2, and Linux ARM64 are untested.
- A shell warning on an untested platform is not a support claim.
- Browser evidence is limited to the browser and version recorded in the validation report.

## Installation measurement

- The measured start time assumes Git and Docker Desktop are already installed and Docker is running.
- Cold image download time depends on network and registry performance.
- The published timing is an observation from one host, not a universal guarantee.
- Docker Desktop installation and first-time operating-system permissions are outside the measurement.

## Robotics boundary

- All five robots are deterministic simulations.
- No physical robot, motor, actuator, sensor bus, navigation stack, manipulation stack, or programmable logic controller is connected.
- No emergency-stop or safety-rated function is implemented.
- Workload lifecycle demonstrations do not imply permission to control physical motion.
- “Bring any robot” states the integration direction, not universal compatibility in `v0.1.0`.

## Product boundary

- Single local operator only.
- No production authentication or authorization system.
- No multi-tenancy, high availability, hosted service, or managed upgrade channel.
- The local dashboard key mechanisms from the private reference deployment are not part of the laptop edition.
- Valkey persistence is local and single-instance.
- The event timeline is bounded and is not a compliance audit store.

## AI boundary

- AI is disabled by default and absent from the core quickstart.
- The local edition does not install NemoClaw, OpenShell, a hosted provider, or a local model.
- The reference AI path is advisory only and cannot deploy workloads, run host commands, mutate EVE, approve actions, or actuate robots.
- Rapidly changing optional AI dependencies require separate version pinning and validation.

## Azure/Dell/EVE reference boundary

- The reference deployment is not a one-command installation.
- Full reconstruction from an empty Azure resource group was not validated.
- EVE autostart is enabled in the private reference environment, but Dell host cold boot and unattended EVE recovery were not validated afterward.
- A historical Dell host simulator was intentionally retired; current EVE and workload state comes from the controller path.
- The reference infrastructure is not presented as a production security baseline.
- Private deployment evidence cannot be copied directly into a public environment.

## Security boundary

- Loopback binding reduces exposure but is not production identity.
- Docker Desktop and the host operating system remain outside RoboStew's trust boundary.
- Dependency and base-image vulnerabilities may emerge after the recorded validation date.
- The local release is not certified for industrial, medical, automotive, aerospace, or other safety-critical operation.
