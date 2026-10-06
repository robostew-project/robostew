# Kubernetes/GPU Observer

Status: `v0.2.0` development capability

RoboStew can take a read-only snapshot of Kubernetes nodes and pods, project it through an allowlist, and relate accelerated workloads to robot fleets and stages of a physical AI loop. The observer works with standard Kubernetes APIs and does not require a provider-specific SDK.

The capability is intended for visibility and lineage. It cannot create, update, delete, scale, restart, or execute inside Kubernetes workloads.

## Try the safe fixture

Start RoboStew and run the normal demonstration:

```bash
./robostew start
./robostew demo
```

The demonstration loads a sanitized fixture representing one ready eight-GPU node and two running robotics workloads requesting three GPUs. The dashboard labels this evidence **SIMULATED FIXTURE**. It is not evidence of a live GPU cluster.

## Observe a Kubernetes cluster

Additional prerequisites:

- Node.js 22 or later;
- `kubectl` configured for the intended cluster;
- permission to list nodes and pods.

Apply the included least-privilege example only after reviewing it with the cluster owner:

```bash
kubectl apply -f deploy/kubernetes/robostew-observer-rbac.yaml
```

Configure a short-lived kubeconfig for the `robostew-observer` service account using your organization's approved Kubernetes authentication process. Keep that kubeconfig outside the repository. Confirm its effective access before use:

```bash
kubectl auth can-i list nodes
kubectl auth can-i list pods --all-namespaces
kubectl auth can-i get secrets --all-namespaces
```

The first two answers should be `yes`; the secrets answer should be `no`. Then run:

```bash
./robostew observe-kubernetes
```

Set `ROBOSTEW_KUBERNETES_NAMESPACE` to observe pods in one namespace instead of all namespaces. Node discovery remains cluster-scoped because GPU capacity belongs to nodes.

## Workload selection and lineage

The observer includes a pod when either condition is true:

- one of its containers requests a resource whose name ends in `/gpu`; or
- it has the annotation `robostew.org/observe: "true"`.

These optional annotations add safe lineage:

| Annotation | Meaning | Example |
| --- | --- | --- |
| `robostew.org/workload-id` | Public workload identity | `policy-evaluation` |
| `robostew.org/role` | Human-readable purpose | `Robot-policy evaluation` |
| `robostew.org/pipeline-stage` | `observe`, `curate`, `improve`, `evaluate`, or `run` | `evaluate` |
| `robostew.org/fleet` | Public fleet alias | `warehouse-fleet` |
| `robostew.org/robot-class` | Public robot class | `mobile-manipulator` |

Missing annotations produce generic aliases rather than exposing Kubernetes object identities.

Treat every `robostew.org/*` annotation value as intentionally public. Do not place customer names, internal project names, registry paths, account identifiers, credentials, or other confidential material in these annotations.

## Server-side privacy projection

The adapter discards:

- cluster, node, namespace, pod, container, and image names;
- raw labels and annotations;
- environment variables, commands, arguments, volumes, and mounts;
- IP addresses, endpoints, and provider account identifiers;
- service-account tokens, kubeconfig content, Secrets, and ConfigMaps.

The server projects the already-sanitized snapshot a second time before persistence. Accepted fields are workload ID, role, state, pipeline stage, fleet alias, robot class, GPU request count, generic node alias, observation time, and fixture flag.

Snapshots become `unreachable` after 120 seconds without a refresh. RoboStew does not preserve a static green state after observation stops.

## CoreWeave compatibility boundary

The observer uses standard `kubectl get nodes` and `kubectl get pods` calls and recognizes the standard `nvidia.com/gpu` resource. That design is compatible in principle with standard Kubernetes GPU clusters, including CoreWeave Kubernetes Service.

This release has not been deployed to or validated on a CoreWeave account. RoboStew is independent, is not affiliated with or endorsed by CoreWeave, and makes no CoreWeave performance, security, or support claim.

## Removal

RoboStew never installs the observer role automatically. If you applied the example manifest, remove only those reviewed resources with:

```bash
kubectl delete -f deploy/kubernetes/robostew-observer-rbac.yaml
```

Delete or revoke any observer kubeconfig or short-lived credential through your normal cluster-access process.
