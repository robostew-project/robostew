// SPDX-License-Identifier: Apache-2.0

import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { projectRobot, projectWorkload, publicEvent, summarizeFleet } from "./model.mjs";
import { store } from "./store.mjs";

const port = Number(process.env.PORT || 8080);
const simulatorUrl = process.env.SIMULATOR_URL || "http://simulator:8090";
const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function headers(type = "application/json; charset=utf-8") {
  return {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'",
  };
}

function json(response, status, value) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(value));
}

async function bodyJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65536) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

function ageSeconds(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - Date.parse(value)) / 1000);
}

async function runtimeTruth() {
  let stateStore = "unreachable";
  try {
    stateStore = (await store.ping()) === "PONG" ? "running" : "degraded";
  } catch {
    stateStore = "unreachable";
  }

  const fleet = await store.fleet().catch(() => ({ robots: [], updatedAt: null }));
  const workloads = await store.workloads().catch(() => []);
  const freshWorkloads = workloads.filter((item) => ageSeconds(item.lastSeen) < 15);
  const fleetState = fleet.robots.length > 0 && ageSeconds(fleet.updatedAt) < 20 ? "running" : "degraded";
  const workloadState = freshWorkloads.length >= 2 ? "running" : "degraded";
  const overall = [stateStore, fleetState, workloadState].every((value) => value === "running") ? "running" : "degraded";

  return {
    state: overall,
    mode: "local simulation",
    checkedAt: new Date().toISOString(),
    components: [
      { id: "control-plane", label: "Control plane", state: "running", evidence: "API request served" },
      { id: "state-store", label: "State store", state: stateStore, evidence: stateStore === "running" ? "Valkey PING succeeded" : "Valkey PING failed" },
      { id: "fleet-simulator", label: "Fleet simulator", state: fleetState, evidence: `${fleet.robots.length} simulated robots; telemetry age ${Math.round(ageSeconds(fleet.updatedAt))}s` },
      { id: "inert-workloads", label: "Inert workloads", state: workloadState, evidence: `${freshWorkloads.length}/${workloads.length || 2} current heartbeats` },
      { id: "ai-advisor", label: "AI advisor", state: "stopped", evidence: "Optional and not configured in the local edition" },
    ],
  };
}

async function appendEvent(event) {
  const events = await store.events();
  events.push(publicEvent(event));
  await store.saveEvents(events);
}

async function api(request, response, pathname) {
  if (request.method === "GET" && pathname === "/healthz") {
    try {
      const pong = await store.ping();
      return json(response, pong === "PONG" ? 200 : 503, { status: pong === "PONG" ? "running" : "degraded" });
    } catch {
      return json(response, 503, { status: "unreachable" });
    }
  }

  if (request.method === "GET" && pathname === "/api/runtime/truth") {
    return json(response, 200, await runtimeTruth());
  }

  if (request.method === "GET" && pathname === "/api/fleet") {
    const fleet = await store.fleet();
    return json(response, 200, { ...fleet, robots: fleet.robots.map(projectRobot), simulated: true });
  }

  if (request.method === "GET" && pathname === "/api/workloads") {
    const workloads = (await store.workloads()).map((item) => projectWorkload({
      ...item,
      state: ageSeconds(item.lastSeen) < 15 ? item.state : "unreachable",
    }));
    return json(response, 200, { workloads });
  }

  if (request.method === "GET" && pathname === "/api/events") {
    return json(response, 200, { events: (await store.events()).map(publicEvent).slice(-20).reverse() });
  }

  if (request.method === "GET" && pathname === "/api/summary") {
    const fleet = await store.fleet();
    const workloads = await store.workloads();
    return json(response, 200, summarizeFleet(fleet.robots.map(projectRobot), workloads.map(projectWorkload)));
  }

  if (request.method === "POST" && pathname === "/api/telemetry/batch") {
    const input = await bodyJson(request);
    if (!Array.isArray(input.robots) || input.robots.length < 1 || input.robots.length > 50) {
      return json(response, 400, { error: "invalid_telemetry_batch" });
    }
    const robots = input.robots.map(projectRobot);
    const stage = String(input.stage || "telemetry").slice(0, 40);
    const updatedAt = new Date().toISOString();
    await store.saveFleet({ robots, stage, updatedAt, simulated: true });
    if (input.recordEvent !== false) {
      await appendEvent({ at: updatedAt, stage, message: String(input.message || `Fleet entered ${stage}`).slice(0, 180), tone: input.tone });
    }
    return json(response, 202, { accepted: robots.length, stage, simulated: true });
  }

  if (request.method === "POST" && pathname === "/api/workloads/heartbeat") {
    const input = await bodyJson(request);
    const workload = projectWorkload({ ...input, state: "running", lastSeen: new Date().toISOString() });
    if (!workload.id) return json(response, 400, { error: "invalid_workload" });
    const workloads = await store.workloads();
    const next = workloads.filter((item) => item.id !== workload.id);
    next.push(workload);
    await store.saveWorkloads(next);
    return json(response, 202, { accepted: true, workload: workload.id });
  }

  if (request.method === "POST" && pathname === "/api/demo/run") {
    try {
      const result = await fetch(`${simulatorUrl}/run`, { method: "POST", signal: AbortSignal.timeout(20000) });
      const value = await result.json();
      return json(response, result.ok ? 200 : 409, {
        status: result.ok ? "completed" : "busy",
        scenario: "fleet-recovery",
        stages: Number(value.stages || 0),
        durationMs: Number(value.durationMs || 0),
      });
    } catch {
      return json(response, 503, { status: "unreachable", scenario: "fleet-recovery" });
    }
  }

  return false;
}

async function staticFile(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const path = join(publicRoot, safe);
  if (!path.startsWith(publicRoot)) return json(response, 404, { error: "not_found" });
  try {
    const content = await readFile(path);
    response.writeHead(200, headers(contentTypes[extname(path)] || "application/octet-stream"));
    response.end(content);
  } catch {
    json(response, 404, { error: "not_found" });
  }
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://local.robostew").pathname;
  try {
    if (pathname === "/healthz" || pathname.startsWith("/api/")) {
      const handled = await api(request, response, pathname);
      if (handled === false) json(response, 404, { error: "not_found" });
      return;
    }
    if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
    await staticFile(response, pathname);
  } catch (error) {
    const code = error?.message === "request_too_large" ? 413 : 500;
    json(response, code, { error: code === 413 ? "request_too_large" : "internal_error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`RoboStew local control plane listening on ${port}`);
});
