// SPDX-License-Identifier: Apache-2.0

const ROBOT_STATES = new Set(["ready", "degraded", "recovering", "unreachable"]);
const WORKLOAD_STATES = new Set(["running", "degraded", "stopped", "unreachable"]);

function text(value, maximum = 120) {
  return String(value ?? "").trim().slice(0, maximum);
}

function number(value, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function projectRobot(input = {}) {
  const state = ROBOT_STATES.has(input.state) ? input.state : "unreachable";
  return {
    id: text(input.id, 40),
    label: text(input.label, 60),
    role: text(input.role, 80),
    state,
    battery: Math.round(number(input.battery, 0, 100)),
    temperatureC: Number(number(input.temperatureC, -40, 150).toFixed(1)),
    heartbeat: text(input.heartbeat, 40),
    note: text(input.note, 140),
    simulated: true,
  };
}

export function projectWorkload(input = {}) {
  const state = WORKLOAD_STATES.has(input.state) ? input.state : "unreachable";
  return {
    id: text(input.id, 50),
    role: text(input.role, 100),
    state,
    runtime: "container",
    inert: true,
    lastSeen: text(input.lastSeen, 40),
  };
}

export function summarizeFleet(robots = [], workloads = []) {
  const degraded = robots.filter((robot) => robot.state !== "ready").length;
  const runningWorkloads = workloads.filter((workload) => workload.state === "running").length;
  return {
    robots: robots.length,
    readyRobots: robots.length - degraded,
    attentionRequired: degraded,
    workloads: workloads.length,
    runningWorkloads,
    mode: "local simulation",
  };
}

export function publicEvent(input = {}) {
  return {
    at: text(input.at, 40),
    stage: text(input.stage, 40),
    message: text(input.message, 180),
    tone: ["neutral", "good", "warning"].includes(input.tone) ? input.tone : "neutral",
  };
}
