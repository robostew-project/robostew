// SPDX-License-Identifier: Apache-2.0

const PIPELINE_STAGES = new Set(["observe", "curate", "improve", "evaluate", "run"]);
const SAFE_STATE = new Set(["available", "configured", "running", "degraded", "stopped", "unreachable"]);

function text(value, maximum = 80) {
  return String(value ?? "").trim().slice(0, maximum);
}

function slug(value, fallback, maximum = 48) {
  const result = text(value, maximum)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return result || fallback;
}

function quantity(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function gpuQuantity(resources = {}) {
  const values = { ...(resources.limits || {}), ...(resources.requests || {}) };
  return Object.entries(values).reduce((total, [name, value]) => (
    name.endsWith("/gpu") ? total + quantity(value) : total
  ), 0);
}

function requestedGpus(pod = {}) {
  return (pod.spec?.containers || []).reduce((total, container) => (
    total + gpuQuantity(container.resources)
  ), 0);
}

function nodeReady(node = {}) {
  return (node.status?.conditions || []).some((condition) => (
    condition.type === "Ready" && condition.status === "True"
  ));
}

function podState(pod = {}) {
  const phase = pod.status?.phase;
  const statuses = pod.status?.containerStatuses || [];
  if (phase === "Running") {
    return statuses.length > 0 && statuses.every((status) => status.ready) ? "running" : "degraded";
  }
  if (phase === "Pending") return "configured";
  if (phase === "Succeeded") return "stopped";
  if (phase === "Failed" || phase === "Unknown") return "degraded";
  return "unreachable";
}

function annotations(item = {}) {
  return item.metadata?.annotations || {};
}

function observedPod(pod = {}) {
  const metadata = annotations(pod);
  return metadata["robostew.org/observe"] === "true" || requestedGpus(pod) > 0;
}

function aliasNodes(nodes = []) {
  const sorted = [...nodes].sort((left, right) => (
    text(left.metadata?.name).localeCompare(text(right.metadata?.name))
  ));
  const counts = { gpu: 0, cpu: 0 };
  return new Map(sorted.map((node) => {
    const kind = quantity(node.status?.capacity?.["nvidia.com/gpu"]) > 0 ? "gpu" : "cpu";
    counts[kind] += 1;
    return [text(node.metadata?.name), `${kind}-node-${String(counts[kind]).padStart(2, "0")}`];
  }));
}

function nodeAlias(value) {
  const candidate = text(value, 20);
  return /^(?:gpu|cpu)-node-[0-9]{2}$/.test(candidate) ? candidate : "unassigned";
}

export function projectAcceleratedSnapshot(input = {}) {
  const nodes = Array.isArray(input.nodes?.items) ? input.nodes.items : [];
  const pods = Array.isArray(input.pods?.items) ? input.pods.items.filter(observedPod) : [];
  const aliases = aliasNodes(nodes);
  const gpuNodes = nodes.filter((node) => quantity(node.status?.capacity?.["nvidia.com/gpu"]) > 0);
  const observedAt = new Date(input.observedAt || Date.now()).toISOString();
  const simulated = input.simulated === true;

  const workloads = pods
    .sort((left, right) => text(left.metadata?.name).localeCompare(text(right.metadata?.name)))
    .map((pod, index) => {
      const metadata = annotations(pod);
      const pipelineStage = PIPELINE_STAGES.has(metadata["robostew.org/pipeline-stage"])
        ? metadata["robostew.org/pipeline-stage"]
        : "unspecified";
      const state = podState(pod);
      return {
        id: slug(metadata["robostew.org/workload-id"], `accelerated-workload-${String(index + 1).padStart(2, "0")}`),
        role: text(metadata["robostew.org/role"] || "Accelerated robotics workload", 100),
        state: SAFE_STATE.has(state) ? state : "unreachable",
        pipelineStage,
        fleet: slug(metadata["robostew.org/fleet"], "unassigned"),
        robotClass: slug(metadata["robostew.org/robot-class"], "unspecified"),
        requestedGpus: requestedGpus(pod),
        node: aliases.get(text(pod.spec?.nodeName)) || "unassigned",
        source: "kubernetes",
        simulated,
      };
    });

  const totalGpus = gpuNodes.reduce((total, node) => total + quantity(node.status?.capacity?.["nvidia.com/gpu"]), 0);
  const allocatableGpus = gpuNodes.reduce((total, node) => total + quantity(node.status?.allocatable?.["nvidia.com/gpu"]), 0);
  const requested = workloads.reduce((total, workload) => total + workload.requestedGpus, 0);
  const unhealthy = workloads.filter((workload) => !["running", "stopped"].includes(workload.state)).length;
  const state = gpuNodes.length === 0
    ? "stopped"
    : gpuNodes.every(nodeReady) && unhealthy === 0
      ? "running"
      : "degraded";

  return {
    state,
    observedAt,
    source: simulated ? "fixture" : "kubernetes",
    simulated,
    summary: {
      gpuNodes: gpuNodes.length,
      readyGpuNodes: gpuNodes.filter(nodeReady).length,
      totalGpus,
      allocatableGpus,
      requestedGpus: requested,
      workloads: workloads.length,
      runningWorkloads: workloads.filter((workload) => workload.state === "running").length,
    },
    workloads,
  };
}

export function projectStoredAcceleratedSnapshot(input = {}) {
  const workloads = Array.isArray(input.workloads) ? input.workloads.slice(0, 100).map((workload, index) => ({
    id: slug(workload.id, `accelerated-workload-${String(index + 1).padStart(2, "0")}`),
    role: text(workload.role || "Accelerated robotics workload", 100),
    state: SAFE_STATE.has(workload.state) ? workload.state : "unreachable",
    pipelineStage: PIPELINE_STAGES.has(workload.pipelineStage) ? workload.pipelineStage : "unspecified",
    fleet: slug(workload.fleet, "unassigned"),
    robotClass: slug(workload.robotClass, "unspecified"),
    requestedGpus: Math.min(1024, quantity(workload.requestedGpus)),
    node: nodeAlias(workload.node),
    source: "kubernetes",
    simulated: workload.simulated === true,
  })) : [];
  const simulated = input.simulated === true;
  const requestedGpus = workloads.reduce((total, workload) => total + workload.requestedGpus, 0);
  const summary = input.summary || {};
  return {
    state: SAFE_STATE.has(input.state) ? input.state : "unreachable",
    observedAt: text(input.observedAt, 40),
    source: simulated ? "fixture" : "kubernetes",
    simulated,
    summary: {
      gpuNodes: Math.min(10000, quantity(summary.gpuNodes)),
      readyGpuNodes: Math.min(10000, quantity(summary.readyGpuNodes)),
      totalGpus: Math.min(100000, quantity(summary.totalGpus)),
      allocatableGpus: Math.min(100000, quantity(summary.allocatableGpus)),
      requestedGpus,
      workloads: workloads.length,
      runningWorkloads: workloads.filter((workload) => workload.state === "running").length,
    },
    workloads,
  };
}
