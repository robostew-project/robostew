// SPDX-License-Identifier: Apache-2.0

import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

const ALLOWED_STATES = new Set(["ready", "attention", "degraded", "stopped", "unreachable"]);

function safeTokenMatch(supplied, expected) {
  const left = Buffer.from(String(supplied || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function clampNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, minimum), maximum) : null;
}

export function projectTelemetry(input) {
  const state = String(input?.state || "unreachable").toLowerCase();
  return {
    robotId: String(input?.robotId || "unknown").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "unknown",
    state: ALLOWED_STATES.has(state) ? state : "unreachable",
    batteryPercent: clampNumber(input?.batteryPercent, 0, 100),
    temperatureC: clampNumber(input?.temperatureC, -50, 150),
    observedAt: Number.isFinite(Date.parse(input?.observedAt || "")) ? new Date(input.observedAt).toISOString() : null,
    receivedAt: new Date().toISOString(),
    simulated: Boolean(input?.simulated),
  };
}

async function jsonBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("request_too_large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("invalid_json"), { statusCode: 400 });
  }
}

function send(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

export function createTelemetryReceiver(options = {}) {
  const host = String(options.host || "127.0.0.1");
  const token = String(options.token || "");
  const rawMaxSamples = options.maxSamples;
  const maxSamples = rawMaxSamples === undefined ? 200 : Number(rawMaxSamples);
  if (host !== "127.0.0.1") throw new Error("loopback_host_required");
  if (token.length < 32) throw new Error("telemetry_token_too_short");
  if ((typeof rawMaxSamples !== "undefined" && !["number", "string"].includes(typeof rawMaxSamples))
    || (typeof rawMaxSamples === "string" && !rawMaxSamples.trim())
    || !Number.isSafeInteger(maxSamples)
    || maxSamples < 1
    || maxSamples > 1000) {
    throw new Error("invalid_max_samples");
  }
  const samples = [];

  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, { state: "running", retainedSamples: samples.length });
      return;
    }
    if (!safeTokenMatch(request.headers["x-robostew-telemetry-token"], token)) {
      send(response, 401, { error: "authentication_required" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/v1/telemetry") {
      send(response, 200, { samples: samples.slice().reverse() });
      return;
    }
    if (request.method === "POST" && url.pathname === "/v1/telemetry") {
      try {
        const projected = Object.freeze(projectTelemetry(await jsonBody(request, 16 * 1024)));
        samples.push(projected);
        if (samples.length > maxSamples) samples.splice(0, samples.length - maxSamples);
        send(response, 202, { accepted: true, robotId: projected.robotId });
      } catch (error) {
        send(response, error?.statusCode || 400, { error: String(error?.message || "invalid_request") });
      }
      return;
    }
    send(response, 404, { error: "not_found" });
  });
  return Object.freeze({ server, host, retention: Object.freeze({ maxSamples }) });
}
