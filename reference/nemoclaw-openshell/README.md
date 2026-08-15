# NemoClaw and OpenShell Bounded Boundary

This directory publishes the policy boundary used to reason about a restricted advisor sandbox. It does not install NemoClaw or OpenShell and is not part of the local quickstart.

The reference boundary:

- accepts only an allowlisted model identifier;
- discards caller-supplied messages, tools, and generation limits;
- substitutes a fixed, non-sensitive functional probe;
- compares broker tokens without early-exit string comparison;
- permits only the two inference routes in the policy example;
- denies arbitrary destinations and robot-control capabilities.

The private reference environment validated one successful bounded request and negative network/authentication cases. These public files are environment-independent policy examples and unit tests, not a sandbox attestation.
