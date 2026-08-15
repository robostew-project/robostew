// SPDX-License-Identifier: Apache-2.0

import http from "node:http";

const controlPlane = process.env.CONTROL_PLANE_URL || "http://control-plane:8080";
const id = String(process.env.WORKLOAD_ID || "inert-workload").slice(0, 50);
const role = String(process.env.WORKLOAD_ROLE || "Inert demonstration service").slice(0, 100);

async function heartbeat() {
  const response = await fetch(`${controlPlane}/api/workloads/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, role, state: "running" }),
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`heartbeat returned ${response.status}`);
}

const server = http.createServer((request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  if (request.url === "/healthz") {
    response.writeHead(200);
    response.end(JSON.stringify({ status: "running", workload: id, inert: true }));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(8100, "0.0.0.0", () => {
  console.log(`RoboStew inert workload ${id} listening on 8100`);
  heartbeat().catch(() => {});
  setInterval(() => heartbeat().catch((error) => console.error("Heartbeat failed", error.message)), 4000);
});
