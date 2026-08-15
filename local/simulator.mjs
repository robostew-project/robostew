// SPDX-License-Identifier: Apache-2.0

import http from "node:http";

const controlPlane = process.env.CONTROL_PLANE_URL || "http://control-plane:8080";
let running = false;

const base = [
  ["robot-01", "Picker 01", "Order picking"],
  ["robot-02", "Picker 02", "Order picking"],
  ["robot-03", "Carrier 03", "Material transport"],
  ["robot-04", "Scout 04", "Aisle inspection"],
  ["robot-05", "Tug 05", "Line replenishment"],
];

function robot([id, label, role], values = {}) {
  return {
    id,
    label,
    role,
    state: "ready",
    battery: 88,
    temperatureC: 37,
    heartbeat: "current",
    note: "Nominal simulated operation",
    ...values,
  };
}

const stages = [
  {
    stage: "baseline",
    message: "Five simulated robots reported nominal operating state.",
    tone: "good",
    robots: base.map((item, index) => robot(item, { battery: 91 - index * 4, temperatureC: 35 + index * 0.6 })),
  },
  {
    stage: "attention",
    message: "Deterministic thermal, battery, and heartbeat conditions require operator attention.",
    tone: "warning",
    robots: base.map((item, index) => robot(item, index === 1
      ? { state: "degraded", temperatureC: 68.4, note: "Thermal threshold exceeded" }
      : index === 2
        ? { state: "degraded", battery: 14, note: "Low battery" }
        : index === 3
          ? { state: "unreachable", heartbeat: "late", note: "Heartbeat window exceeded" }
          : {})),
  },
  {
    stage: "recovery",
    message: "The simulated fleet entered a bounded recovery sequence.",
    tone: "neutral",
    robots: base.map((item, index) => robot(item, index === 1
      ? { state: "recovering", temperatureC: 49.2, note: "Cooling trend observed" }
      : index === 2
        ? { state: "recovering", battery: 32, note: "Charging" }
        : index === 3
          ? { state: "recovering", heartbeat: "restored", note: "Connection restored" }
          : {})),
  },
  {
    stage: "stable",
    message: "All five simulated robots returned to stable operation.",
    tone: "good",
    robots: base.map((item, index) => robot(item, { battery: 84 - index * 3, temperatureC: 36 + index * 0.5, note: "Stable after demonstration" })),
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postBatch(stage, recordEvent = true) {
  const response = await fetch(`${controlPlane}/api/telemetry/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...stage, recordEvent }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`control plane returned ${response.status}`);
}

async function runScenario() {
  if (running) return { ok: false, stages: 0, durationMs: 0 };
  running = true;
  const started = Date.now();
  try {
    for (const stage of stages) {
      await postBatch(stage);
      await sleep(900);
    }
    return { ok: true, stages: stages.length, durationMs: Date.now() - started };
  } finally {
    running = false;
  }
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://simulator.robostew").pathname;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET" && pathname === "/healthz") {
    response.writeHead(200);
    response.end(JSON.stringify({ status: "running", mode: "deterministic" }));
    return;
  }
  if (request.method === "POST" && pathname === "/run") {
    const result = await runScenario();
    response.writeHead(result.ok ? 200 : 409);
    response.end(JSON.stringify(result));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(8090, "0.0.0.0", async () => {
  console.log("RoboStew deterministic simulator listening on 8090");
  await sleep(500);
  runScenario().catch((error) => console.error("Initial scenario failed", error.message));
  setInterval(() => {
    if (!running) postBatch(stages.at(-1), false).catch((error) => console.error("Stable heartbeat failed", error.message));
  }, 10000);
  setInterval(() => runScenario().catch((error) => console.error("Scheduled scenario failed", error.message)), 90000);
});
