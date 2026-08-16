# RoboStew Security Policy

## Supported release

Security fixes target the latest `v0.1.x` release only. The project is an early engineering release and does not provide production, safety-critical, or long-term-support guarantees.

## Report a vulnerability privately

Use GitHub private vulnerability reporting through the repository's **Security** tab. If that channel is unavailable, email `security@robostew.org`. Do not open a public issue containing exploit details, credentials, private endpoints, personal data, or unpublished infrastructure information.

Include:

- affected version or commit;
- affected component;
- reproduction steps using non-sensitive test data;
- expected and observed behavior;
- realistic impact;
- suggested mitigation, if known.

GitHub private vulnerability reporting is enabled for the public repository.

## Security boundaries

- The local dashboard binds to loopback by default.
- Local access is not production authentication.
- Simulated robots and inert workloads have no kinetic authority.
- AI is optional, advisory, and unable to deploy or actuate.
- Docker Desktop, container images, and the host operating system remain dependencies outside RoboStew's control.

See `docs/SECURITY-BOUNDARIES.md` and `docs/LIMITATIONS.md` for the complete release boundary.
