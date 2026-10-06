#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { projectAcceleratedSnapshot } from "./kubernetes.mjs";

const run = promisify(execFile);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function kubectlJson(args) {
  const { stdout } = await run("kubectl", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 20000,
  });
  return JSON.parse(stdout);
}

async function collect() {
  const fixture = argument("--fixture");
  if (fixture) {
    const [nodes, pods] = await Promise.all([
      readFile(join(fixture, "kubernetes-nodes.json"), "utf8").then(JSON.parse),
      readFile(join(fixture, "kubernetes-pods.json"), "utf8").then(JSON.parse),
    ]);
    return projectAcceleratedSnapshot({ nodes, pods, observedAt: new Date().toISOString(), simulated: true });
  }

  const namespace = process.env.ROBOSTEW_KUBERNETES_NAMESPACE;
  const podArgs = namespace
    ? ["get", "pods", "--namespace", namespace, "--output", "json"]
    : ["get", "pods", "--all-namespaces", "--output", "json"];
  const [nodes, pods] = await Promise.all([
    kubectlJson(["get", "nodes", "--output", "json"]),
    kubectlJson(podArgs),
  ]);
  return projectAcceleratedSnapshot({ nodes, pods, observedAt: new Date().toISOString(), simulated: false });
}

const baseUrl = new URL(process.env.ROBOSTEW_URL || "http://127.0.0.1:8080");
if (!new Set(["127.0.0.1", "localhost", "::1"]).has(baseUrl.hostname)) {
  console.error("RoboStew Kubernetes observer: ROBOSTEW_URL must use a loopback host.");
  process.exit(1);
}
const endpoint = new URL("/api/accelerated/snapshot", baseUrl);

try {
  const snapshot = await collect();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`RoboStew returned HTTP ${response.status}`);
  console.log(JSON.stringify({ accepted: true, simulated: snapshot.simulated, state: snapshot.state, summary: snapshot.summary }));
} catch (error) {
  const reason = error?.message?.startsWith("RoboStew returned HTTP ")
    ? error.message
    : "observation failed; verify read-only kubeconfig, cluster connectivity, and local control-plane health";
  console.error(`RoboStew Kubernetes observer: ${reason}`);
  process.exitCode = 1;
}
