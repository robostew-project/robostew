# Generic Telemetry Receiver Reference

The private reference deployment used a small telemetry receiver to reconnect observable runtime state to the dashboard. The original receiver was intentionally not copied because it listened on every interface, accepted unauthenticated writes, allowed broad cross-origin requests, returned submitted payloads, and used unbounded local storage.

This rewritten reference instead provides:

- loopback binding by default;
- a required 32-character-or-longer shared token supplied at runtime;
- constant-time token comparison;
- a 16 KiB request limit;
- strict allowlisting and clamping of telemetry fields;
- bounded in-memory retention;
- no cross-origin policy and no kinetic action endpoint.

It is an inspectable reference, not a production ingestion service. Production use needs workload identity, TLS termination, replay protection, durable bounded storage, observability, and an explicit network policy.
