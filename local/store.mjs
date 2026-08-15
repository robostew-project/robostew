// SPDX-License-Identifier: Apache-2.0

import { RespClient } from "./resp.mjs";

const client = new RespClient({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
});

async function readJson(key, fallback) {
  const raw = await client.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  await client.set(key, JSON.stringify(value));
}

export const store = {
  ping: () => client.ping(),
  fleet: () => readJson("robostew:fleet", { robots: [], stage: "starting", updatedAt: null }),
  saveFleet: (value) => writeJson("robostew:fleet", value),
  workloads: () => readJson("robostew:workloads", []),
  saveWorkloads: (value) => writeJson("robostew:workloads", value),
  events: () => readJson("robostew:events", []),
  saveEvents: (value) => writeJson("robostew:events", value.slice(-80)),
};
