# Bounded Azure OpenAI Advisor Reference

This reference demonstrates a read-only advisor boundary using Azure managed identity. It is not enabled by the local edition and does not provision an Azure OpenAI resource.

The implementation shows:

- explicit endpoint, deployment, and identity configuration;
- bounded input and output;
- a fixed recommendation allowlist;
- no tool definitions or execution channel;
- hourly, daily, and concurrent request limits held by a host-owned in-memory limiter;
- credential-free public audit projection;
- deterministic failure behavior.

The host must create one advisor with `createReadonlyAdvisor` at process startup and reuse its `evaluate` method for every request. The factory owns the limiter; request callers cannot provide audit history or replace the limiter. The host supplies the audit sink, while each call supplies only the evidence summary. The returned result cannot deploy workloads, invoke shell commands, mutate EVE, approve an action, or actuate a robot. The included limiter is single-process reference logic; a multi-instance deployment needs an atomic shared store.

This code received deterministic tests with mocked identity and provider responses. A live managed-identity request was validated only in the private reference environment.
