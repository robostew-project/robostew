// SPDX-License-Identifier: Apache-2.0

export function parseControllerRows(output) {
  const rows = String(output || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return rows
    .filter((line) => !line.startsWith("NAME"))
    .map((line) => {
      const [name, image, memory, controllerState, deviceState] = line.split(/\t+/).map((part) => part.trim());
      return { name, image, memory, controllerState, deviceState, source: "controller" };
    })
    .filter((item) => item.name);
}

export function parseDeviceInventory(lines) {
  for (const line of String(lines || "").split(/\r?\n/)) {
    try {
      const record = JSON.parse(line);
      if (record.type !== "device-inventory" || !Array.isArray(record.workloads)) continue;
      return {
        observedAt: record.observedAt,
        state: record.state,
        workloads: record.workloads
          .map((item) => ({ name: String(item.name || ""), state: String(item.state || "unknown") }))
          .filter((item) => item.name),
      };
    } catch {
      // Skip incomplete observations and continue to the next line.
    }
  }
  return null;
}

export function observationIsFresh(observedAt, maxAgeSeconds, nowMs = Date.now()) {
  const timestamp = Date.parse(observedAt || "");
  const maxAgeMs = Number(maxAgeSeconds) * 1000;
  return Number.isFinite(timestamp)
    && Number.isFinite(maxAgeMs)
    && maxAgeMs > 0
    && timestamp <= nowMs + 60_000
    && nowMs - timestamp <= maxAgeMs;
}

export function reconcileWorkloads(controllerRows, deviceObservation, metrics = []) {
  const deviceByName = new Map((deviceObservation?.workloads || []).map((item) => [item.name, item]));
  const metricsByName = new Map(metrics.map((item) => [item.name, item]));

  return controllerRows.map((item) => {
    const device = deviceByName.get(item.name);
    const metric = metricsByName.get(item.name);
    const metricShowsRuntime = Number.isFinite(metric?.usedMemoryMb) && metric.usedMemoryMb > 0;
    const state = item.deviceState && item.deviceState !== "UNKNOWN"
      ? item.deviceState
      : device?.state || (metricShowsRuntime ? "RUNNING" : "UNKNOWN");
    return {
      name: item.name,
      image: item.image,
      memory: item.memory,
      state,
      networkAssigned: Boolean(device),
      source: device || metricShowsRuntime ? "reconciled" : "controller",
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
}
