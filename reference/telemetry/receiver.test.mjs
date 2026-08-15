// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import test from "node:test";

import { createTelemetryReceiver, projectTelemetry } from "./receiver.mjs";

const token = "reference-telemetry-token-with-safe-length";

test("projection allowlists fields and clamps numeric values", () => {
  const projected = projectTelemetry({
    robotId: "picker/one",
    state: "READY",
    batteryPercent: 140,
    temperatureC: -80,
    command: "discarded",
    credential: "discarded",
    simulated: true,
  });
  assert.equal(projected.robotId, "pickerone");
  assert.equal(projected.batteryPercent, 100);
  assert.equal(projected.temperatureC, -50);
  assert.equal("command" in projected, false);
  assert.equal("credential" in projected, false);
});

test("receiver rejects unauthenticated writes and stores only public projection", async (context) => {
  const receiver = createTelemetryReceiver({ token, maxSamples: 2 });
  await new Promise((resolve, reject) => {
    receiver.server.once("error", reject);
    receiver.server.listen(0, receiver.host, resolve);
  });
  context.after(() => new Promise((resolve) => receiver.server.close(resolve)));
  const address = receiver.server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const denied = await fetch(`${base}/v1/telemetry`, { method: "POST", body: "{}" });
  assert.equal(denied.status, 401);

  const accepted = await fetch(`${base}/v1/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-RoboStew-Telemetry-Token": token },
    body: JSON.stringify({ robotId: "scout-1", state: "ready", command: "discarded", simulated: true }),
  });
  assert.equal(accepted.status, 202);

  const response = await fetch(`${base}/v1/telemetry`, { headers: { "X-RoboStew-Telemetry-Token": token } });
  const payload = await response.json();
  assert.equal(payload.samples.length, 1);
  assert.equal("command" in payload.samples[0], false);
});

test("receiver rejects retention settings that could disable the bound", () => {
  for (const maxSamples of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5, 1001, "", "not-a-number", true, {}]) {
    assert.throws(() => createTelemetryReceiver({ token, maxSamples }), /invalid_max_samples/);
  }
  const receiver = createTelemetryReceiver({ token });
  assert.deepEqual(receiver.retention, { maxSamples: 200 });
  assert.equal("samples" in receiver, false);
});

test("receiver never retains more than the configured maximum", async (context) => {
  const receiver = createTelemetryReceiver({ token, maxSamples: 2 });
  await new Promise((resolve, reject) => {
    receiver.server.once("error", reject);
    receiver.server.listen(0, receiver.host, resolve);
  });
  context.after(() => new Promise((resolve) => receiver.server.close(resolve)));
  const address = receiver.server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { "Content-Type": "application/json", "X-RoboStew-Telemetry-Token": token };

  for (const robotId of ["scout-1", "scout-2", "scout-3"]) {
    const response = await fetch(`${base}/v1/telemetry`, {
      method: "POST",
      headers,
      body: JSON.stringify({ robotId, state: "ready" }),
    });
    assert.equal(response.status, 202);
  }

  const response = await fetch(`${base}/v1/telemetry`, { headers });
  const payload = await response.json();
  assert.deepEqual(payload.samples.map((sample) => sample.robotId), ["scout-3", "scout-2"]);
});
