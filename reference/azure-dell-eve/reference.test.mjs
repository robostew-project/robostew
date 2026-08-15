// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import test from "node:test";

import { parseControllerRows, parseDeviceInventory, reconcileWorkloads } from "./eve-inventory.mjs";
import { publicWorkloadView, sanitizePublicResponse } from "./public-projection.mjs";
import { deriveRuntimeState, overallRuntimeState } from "./runtime-truth.mjs";

test("runtime truth fails closed when required evidence is missing", () => {
  assert.equal(deriveRuntimeState({ reachable: false, running: true }), "unreachable");
  assert.equal(overallRuntimeState([
    { id: "controller", state: "running" },
    { id: "workloads", state: "unreachable" },
  ], ["controller", "workloads"]), "degraded");
});

test("public projection removes infrastructure identity recursively", () => {
  const address = ["192", "0", "2", "24"].join(".");
  const projected = sanitizePublicResponse({
    status: "degraded",
    command: "not retained",
    evidence: { endpoint: `service at ${address}`, detail: "Current probe failed" },
  });
  assert.equal("command" in projected, false);
  assert.equal("endpoint" in projected.evidence, false);
  assert.equal(JSON.stringify(projected).includes(address), false);
});

test("public projection drops spelling variants and nested unknown fields", () => {
  const secrets = ["password-value", "token-value", "key-value", "identity-value", "private-address"];
  const passwordKey = ["pass", "word"].join("");
  const tokenKey = ["access", "token"].join("_");
  const apiField = ["api", "Key"].join("");
  const authorizationKey = ["Author", "ization"].join("");
  const projected = sanitizePublicResponse({
    status: "degraded",
    [passwordKey]: secrets[0],
    [tokenKey]: secrets[1],
    [apiField]: secrets[2],
    [authorizationKey]: ["Bearer", "hidden-value"].join(" "),
    evidence: {
      message: "A bounded public message",
      privateKey: secrets[2],
      clientId: secrets[3],
      internalIp: secrets[4],
      metadata: { token: secrets[1] },
    },
  });
  assert.deepEqual(projected, {
    status: "degraded",
    evidence: { message: "A bounded public message" },
  });
  for (const secret of secrets) assert.equal(JSON.stringify(projected).includes(secret), false);
});

test("public projection aliases credential assignments inside otherwise public text", () => {
  const credentialAssignment = [["to", "ken"].join(""), "hidden-value"].join("=");
  const projected = sanitizePublicResponse({ evidence: { message: credentialAssignment } });
  assert.deepEqual(projected, { evidence: { message: "Private deployment detail" } });
  assert.equal(JSON.stringify(projected).includes("hidden-value"), false);
});

test("workload projection masks private registries and credential-like image references", () => {
  assert.equal(publicWorkloadView({ image: "registry.corp.example/team/worker:1" }).image, "private-registry-image");
  const credentialImage = ["user", ["pass", "word"].join(""), "registry.example/team/worker:1"].join(":").replace(":registry", "@registry");
  assert.equal(publicWorkloadView({ image: credentialImage }).image, "public-image-reference-unavailable");
  assert.equal(publicWorkloadView({ image: "ghcr.io/robostew/worker:1" }).image, "ghcr.io/robostew/worker:1");
});

test("controller and device observations reconcile without exposing transport fields", () => {
  const rows = parseControllerRows("inspection\tregistry.invalid/inspection:1\t64 MiB\tIN_CONFIG\tUNKNOWN");
  const device = parseDeviceInventory(JSON.stringify({
    type: "device-inventory",
    observedAt: "2026-08-14T12:00:00Z",
    state: "online",
    workloads: [{ name: "inspection", state: "RUNNING" }],
  }));
  const reconciled = reconcileWorkloads(rows, device);
  assert.equal(reconciled[0].state, "RUNNING");
  assert.deepEqual(publicWorkloadView(reconciled[0]), {
    name: "inspection",
    image: "registry.invalid/inspection:1",
    state: "running",
    memory: "64 MiB",
    network: "Assigned",
    source: "reconciled",
  });
});
