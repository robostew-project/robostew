// SPDX-License-Identifier: Apache-2.0

const byId = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

async function api(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

function robotCard(robot) {
  const state = escapeHtml(robot.state);
  return `<article class="robot-card">
    <div>
      <div class="robot-top"><span class="robot-icon ${state}">RS</span><span class="state-dot ${state}" title="${state}"></span></div>
      <h3>${escapeHtml(robot.label)}</h3>
      <p class="robot-role">${escapeHtml(robot.role)}</p>
    </div>
    <div>
      <div class="telemetry"><span>Battery<strong>${escapeHtml(robot.battery)}%</strong></span><span>Temp<strong>${escapeHtml(robot.temperatureC)}°C</strong></span></div>
      <p class="robot-note" title="${escapeHtml(robot.note)}">${escapeHtml(robot.note)}</p>
    </div>
  </article>`;
}

function truthRow(item) {
  const state = escapeHtml(item.state);
  return `<div class="truth-row"><span class="truth-state ${state}"></span><div class="truth-copy"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.evidence)}</span></div><span class="truth-value">${state}</span></div>`;
}

function workloadRow(item) {
  return `<div class="workload-row"><div><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(item.role)} · inert container</span></div><span class="workload-badge">${escapeHtml(item.state)}</span></div>`;
}

function eventRow(item) {
  const time = item.at ? new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  return `<div class="event"><span class="event-marker ${escapeHtml(item.tone)}"></span><span class="event-stage">${escapeHtml(item.stage)}</span><span class="event-message">${escapeHtml(item.message)}</span><span class="event-time">${escapeHtml(time)}</span></div>`;
}

async function refresh() {
  try {
    const [truth, fleet, workloads, events, summary] = await Promise.all([
      api("/api/runtime/truth"), api("/api/fleet"), api("/api/workloads"), api("/api/events"), api("/api/summary"),
    ]);
    byId("overall-state").textContent = truth.state;
    byId("overall-orb").classList.toggle("degraded", truth.state !== "running");
    byId("last-updated").textContent = `Updated ${new Date(truth.checkedAt).toLocaleTimeString()}`;
    byId("robot-count").textContent = summary.robots;
    byId("ready-count").textContent = summary.readyRobots;
    byId("attention-count").textContent = summary.attentionRequired;
    byId("workload-count").textContent = `${summary.runningWorkloads}/${summary.workloads}`;
    byId("scenario-stage").textContent = fleet.stage;
    byId("fleet-grid").innerHTML = fleet.robots.length ? fleet.robots.map(robotCard).join("") : '<p class="loading">Waiting for deterministic telemetry…</p>';
    byId("truth-list").innerHTML = truth.components.map(truthRow).join("");
    byId("workload-list").innerHTML = workloads.workloads.length ? workloads.workloads.map(workloadRow).join("") : '<p class="loading">Waiting for heartbeats…</p>';
    byId("event-list").innerHTML = events.events.length ? events.events.map(eventRow).join("") : '<p class="loading">No events yet.</p>';
  } catch {
    byId("overall-state").textContent = "unreachable";
    byId("overall-orb").classList.add("degraded");
    byId("last-updated").textContent = "Control plane unreachable";
  }
}

refresh();
setInterval(refresh, 2500);
