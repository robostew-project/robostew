// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { projectAcceleratedSnapshot, projectStoredAcceleratedSnapshot } from "../kubernetes.mjs";

const fixture = (name) => readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8").then(JSON.parse);

test("Kubernetes projection exposes GPU truth without cluster identities", async () => {
  const [nodes, pods] = await Promise.all([
    fixture("kubernetes-nodes.json"),
    fixture("kubernetes-pods.json"),
  ]);
  const snapshot = projectAcceleratedSnapshot({
    nodes,
    pods,
    observedAt: "2026-10-05T12:00:00.000Z",
    simulated: true,
  });

  assert.equal(snapshot.state, "running");
  assert.deepEqual(snapshot.summary, {
    gpuNodes: 1,
    readyGpuNodes: 1,
    totalGpus: 8,
    allocatableGpus: 8,
    requestedGpus: 3,
    workloads: 2,
    runningWorkloads: 2,
  });
  assert.equal(snapshot.workloads[0].node, "gpu-node-01");
  assert.equal(snapshot.workloads[0].pipelineStage, "evaluate");
  assert.equal(snapshot.workloads[1].pipelineStage, "curate");
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("private-team-namespace"), false);
  assert.equal(serialized.includes("private-render-job-name"), false);
  assert.equal(serialized.includes("fixture-gpu-node"), false);
  assert.equal(serialized.includes("ordinary-cpu-service"), false);
});

test("stored snapshot is projected again at the API boundary", () => {
  const snapshot = projectStoredAcceleratedSnapshot({
    state: "perfect",
    observedAt: "now",
    simulated: false,
    summary: { gpuNodes: 2, totalGpus: 16 },
    workloads: [{
      id: "Policy Eval",
      role: "Evaluation",
      state: "running",
      pipelineStage: "evaluate",
      fleet: "Warehouse A",
      robotClass: "AMR",
      requestedGpus: 2,
      node: "secret-node.example.internal",
      token: "must-not-cross-api",
    }],
  });
  assert.equal(snapshot.state, "unreachable");
  assert.equal(snapshot.workloads[0].node, "unassigned");
  assert.equal("token" in snapshot.workloads[0], false);
  assert.equal(snapshot.summary.requestedGpus, 2);
});
