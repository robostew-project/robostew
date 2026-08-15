// SPDX-License-Identifier: Apache-2.0

export const RUNTIME_STATES = Object.freeze([
  "available",
  "configured",
  "running",
  "degraded",
  "stopped",
  "unreachable",
]);

export function normalizeRuntimeState(value) {
  const state = String(value || "").trim().toLowerCase();
  return RUNTIME_STATES.includes(state) ? state : "unreachable";
}

export function deriveRuntimeState({
  reachable,
  running = false,
  configured = false,
  available = false,
  degraded = false,
  stopped = false,
}) {
  if (reachable === false) return "unreachable";
  if (degraded) return "degraded";
  if (running) return "running";
  if (configured) return "configured";
  if (available) return "available";
  if (stopped || reachable === true) return "stopped";
  return "unreachable";
}

export function overallRuntimeState(capabilities, requiredIds) {
  const required = capabilities.filter((item) => requiredIds.includes(item.id));
  if (required.length === 0) return "unreachable";

  const states = required.map((item) => normalizeRuntimeState(item.state));
  if (states.every((state) => state === "unreachable")) return "unreachable";
  if (states.some((state) => ["unreachable", "degraded", "stopped"].includes(state))) return "degraded";
  if (states.every((state) => state === "running")) return "running";
  if (states.some((state) => state === "configured")) return "configured";
  return "available";
}
