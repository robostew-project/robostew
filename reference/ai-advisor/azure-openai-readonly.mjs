// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";

const TOKEN_RESOURCE = "https://cognitiveservices.azure.com/";
const ALLOWED_RECOMMENDATIONS = new Set([
  "check_control_plane",
  "check_workload_inventory",
  "check_edge_connectivity",
  "continue_observing",
]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, minimum), maximum);
}

export function advisorConfig(input = {}) {
  return {
    endpoint: String(input.endpoint || "").trim().replace(/\/$/, ""),
    deployment: String(input.deployment || "").trim(),
    managedIdentityClientId: String(input.managedIdentityClientId || "").trim(),
    apiVersion: String(input.apiVersion || "2024-10-21").trim(),
    maxInputChars: boundedInteger(input.maxInputChars, 1800, 500, 3000),
    maxOutputTokens: boundedInteger(input.maxOutputTokens, 160, 50, 300),
    hourlyRequestLimit: boundedInteger(input.hourlyRequestLimit, 4, 1, 12),
    dailyRequestLimit: boundedInteger(input.dailyRequestLimit, 12, 1, 50),
    maxConcurrentRequests: boundedInteger(input.maxConcurrentRequests, 1, 1, 4),
    timeoutMs: boundedInteger(input.timeoutMs, 30000, 5000, 45000),
  };
}

export function validateAdvisorConfig(config) {
  const missing = [];
  if (!/^https:\/\/[A-Za-z0-9.-]+\.openai\.azure\.com$/.test(config.endpoint)) missing.push("valid endpoint");
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(config.deployment)) missing.push("valid deployment");
  if (!config.managedIdentityClientId) missing.push("managed identity client ID");
  return { ok: missing.length === 0, missing };
}

function publicEvidence(summary) {
  return {
    controller: {
      visible: Boolean(summary?.controller?.visible),
      fresh: Boolean(summary?.controller?.fresh),
    },
    workloads: Array.isArray(summary?.workloads)
      ? summary.workloads.slice(0, 20).map((item) => ({
        name: String(item?.name || "unknown").slice(0, 80),
        state: String(item?.state || "unknown").slice(0, 40),
      }))
      : [],
    safety: {
      execution: false,
      deployment: false,
      mutation: false,
      arbitraryShell: false,
      robotActuation: false,
    },
  };
}

export function buildAdvisorRequest(summary, config) {
  const evidence = JSON.stringify(publicEvidence(summary)).slice(0, config.maxInputChars);
  return {
    messages: [
      {
        role: "system",
        content: [
          "You are RoboStew's read-only robot fleet advisor.",
          "Return JSON with recommendation and rationale string fields.",
          `recommendation must be one of: ${[...ALLOWED_RECOMMENDATIONS].join(", ")}.`,
          "Never propose or perform deployment, mutation, shell access, credential access, or robot actuation. No tools are available.",
        ].join(" "),
      },
      { role: "user", content: `Choose one bounded diagnostic recommendation from: ${evidence}` },
    ],
    max_tokens: config.maxOutputTokens,
    temperature: 0,
    response_format: { type: "json_object" },
  };
}

export function createAdvisorLimiter(configInput = {}, options = {}) {
  const config = advisorConfig(configInput);
  const clock = typeof options.clock === "function" ? options.clock : Date.now;
  const attempts = [];
  let inFlight = 0;

  function snapshot(nowMs = clock()) {
    const cutoff = nowMs - 24 * 60 * 60 * 1000;
    while (attempts.length && attempts[0] < cutoff) attempts.shift();
    const hourly = attempts.filter((value) => value >= nowMs - 60 * 60 * 1000).length;
    return Object.freeze({ hourly, daily: attempts.length, inFlight });
  }

  return Object.freeze({
    acquire() {
      const nowMs = clock();
      const state = snapshot(nowMs);
      if (state.inFlight >= config.maxConcurrentRequests) {
        throw Object.assign(new Error("advisor_concurrency_limit"), { statusCode: 429 });
      }
      if (state.hourly >= config.hourlyRequestLimit || state.daily >= config.dailyRequestLimit) {
        throw Object.assign(new Error("advisor_rate_limit"), { statusCode: 429 });
      }
      attempts.push(nowMs);
      inFlight += 1;
      let released = false;
      return Object.freeze({
        release() {
          if (released) return;
          released = true;
          inFlight -= 1;
        },
      });
    },
    snapshot,
  });
}

async function managedIdentityToken(config, fetchImpl) {
  const url = new URL("http://169.254.169.254/metadata/identity/oauth2/token");
  url.searchParams.set("api-version", "2018-02-01");
  url.searchParams.set("resource", TOKEN_RESOURCE);
  url.searchParams.set("client_id", config.managedIdentityClientId);
  const response = await fetchImpl(url, { headers: { Metadata: "true" }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw Object.assign(new Error("managed_identity_failure"), { providerStatus: response.status });
  const payload = await response.json();
  if (!payload.access_token) throw new Error("managed_identity_token_missing");
  return payload.access_token;
}

function safetyBoundary() {
  return { execution: false, deployment: false, mutation: false, arbitraryShell: false, robotActuation: false };
}

async function evaluateAdvisor(summary, runtime) {
  const { appendAudit, config, fetchImpl, limiter } = runtime;
  const requestId = randomUUID();
  const startedAt = Date.now();
  let permit;
  try {
    permit = limiter.acquire();
    const accessToken = await managedIdentityToken(config, fetchImpl);
    const url = `${config.endpoint}/openai/deployments/${encodeURIComponent(config.deployment)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": requestId,
      },
      body: JSON.stringify(buildAdvisorRequest(summary, config)),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!response.ok) throw Object.assign(new Error("provider_failure"), { providerStatus: response.status });

    const payload = await response.json();
    const parsed = JSON.parse(payload?.choices?.[0]?.message?.content || "{}");
    const requested = String(parsed.recommendation || "continue_observing");
    const record = {
      event: "advisor_evaluation",
      requestId,
      timestamp: new Date().toISOString(),
      attempted: true,
      outcome: "success",
      latencyMs: Date.now() - startedAt,
      recommendation: ALLOWED_RECOMMENDATIONS.has(requested) ? requested : "continue_observing",
      rationale: String(parsed.rationale || "Continue bounded observation.").slice(0, 1000),
      usage: { totalTokens: payload?.usage?.total_tokens ?? null },
      safety: safetyBoundary(),
    };
    await appendAudit(record);
    return record;
  } catch (error) {
    if (error?.statusCode === 429) {
      const record = {
        event: "advisor_evaluation",
        requestId,
        timestamp: new Date().toISOString(),
        attempted: false,
        outcome: "bounded",
        reason: String(error.message || "advisor_rate_limit"),
        safety: safetyBoundary(),
      };
      await appendAudit(record);
      throw Object.assign(new Error(record.reason), { statusCode: 429, auditRecord: record });
    }
    const record = {
      event: "advisor_evaluation",
      requestId,
      timestamp: new Date().toISOString(),
      attempted: true,
      outcome: "provider_error",
      providerStatus: error?.providerStatus || null,
      fallback: "deterministic-read-only-observation",
      safety: safetyBoundary(),
    };
    await appendAudit(record);
    throw Object.assign(new Error("advisor_provider_error"), { statusCode: 502, auditRecord: record });
  } finally {
    permit?.release();
  }
}

export function createReadonlyAdvisor(options = {}) {
  const config = advisorConfig(options.config);
  const validation = validateAdvisorConfig(config);
  if (!validation.ok) throw Object.assign(new Error("advisor_not_configured"), { statusCode: 503 });
  const limiter = createAdvisorLimiter(config, { clock: options.clock });
  const runtime = Object.freeze({
    appendAudit: options.appendAudit || (async () => {}),
    config,
    fetchImpl: options.fetchImpl || fetch,
    limiter,
  });
  return Object.freeze({
    evaluate(summary) {
      return evaluateAdvisor(summary, runtime);
    },
    limiterSnapshot() {
      return limiter.snapshot();
    },
  });
}
