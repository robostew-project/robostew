// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";

import { projectRobot, projectWorkload, publicEvent, summarizeFleet } from "../model.mjs";

test("robot projection allowlists fields and clamps telemetry", () => {
  const value = projectRobot({
    id: "robot-01",
    label: "Picker",
    role: "Picking",
    state: "ready",
    battery: 140,
    temperatureC: 500,
    heartbeat: "current",
    privateField: "must-not-cross-api",
  });
  assert.equal(value.battery, 100);
  assert.equal(value.temperatureC, 150);
  assert.equal(value.simulated, true);
  assert.equal("privateField" in value, false);
});

test("unknown robot and workload states fail visibly", () => {
  assert.equal(projectRobot({ state: "perfect" }).state, "unreachable");
  assert.equal(projectWorkload({ state: "ready" }).state, "unreachable");
});

test("fleet summary counts attention and running workloads", () => {
  const result = summarizeFleet(
    [projectRobot({ state: "ready" }), projectRobot({ state: "degraded" })],
    [projectWorkload({ state: "running" }), projectWorkload({ state: "stopped" })],
  );
  assert.deepEqual(result, {
    robots: 2,
    readyRobots: 1,
    attentionRequired: 1,
    workloads: 2,
    runningWorkloads: 1,
    mode: "local simulation",
  });
});

test("event projection strips arbitrary input", () => {
  const event = publicEvent({ at: "now", stage: "test", message: "ok", tone: "good", command: "hidden" });
  assert.equal(event.tone, "good");
  assert.equal("command" in event, false);
});
