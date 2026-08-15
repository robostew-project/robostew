# Warm-Standby and Recovery Contract

The reference deployment separates durable state from resources that create continuous compute cost.

| Layer | Warm-standby position | Recovery evidence required |
|---|---|---|
| Source and release metadata | Retain in private version control and a reviewed public release | Exact commit and clean checkout |
| Protected configuration | Retain encrypted outside the controller host | Decrypt, inventory, and checksum without exposing contents |
| Controller state | Retain a bounded, encrypted backup outside temporary storage | Restore into an isolated location before service cutover |
| Compute host | Deallocate rather than guest-shutdown when billing semantics require it | Boot, service enablement, and functional health probes |
| AI deployment | Reduce or remove capacity when not demonstrating it | Identity, quota, bounded request, audit, and failure tests |
| Edge host and EVE | Power state is independent from the cloud controller | Host boot, EVE start, controller visibility, and workload inventory |

Recovery must be staged and fail closed:

1. Recreate or start the foundation without restoring credentials.
2. Verify the expected release commit and a clean checkout.
3. Inventory the encrypted archive before extraction.
4. Restore protected configuration only after explicit approval.
5. Start required services individually and verify functional probes.
6. Confirm current controller, device, and workload evidence.
7. Run bounded AI positive and negative-policy tests separately.

The public repository contains no recovery archive, certificate, private key, provider identity, private endpoint, or host-specific extraction script. The privately validated environment demonstrated an Azure guest cold boot; it did not demonstrate a Dell host cold boot or complete reconstruction from an empty cloud environment.
