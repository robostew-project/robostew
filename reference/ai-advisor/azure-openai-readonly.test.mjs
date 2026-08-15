// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import test from "node:test";

import { advisorConfig, buildAdvisorRequest, createAdvisorLimiter, createReadonlyAdvisor } from "./azure-openai-readonly.mjs";

function config(overrides = {}) {
  return advisorConfig({
    endpoint: "https://example.openai.azure.com",
    deployment: "small-advisor",
    managedIdentityClientId: "managed-identity-reference",
    maxOutputTokens: 80,
    ...overrides,
  });
}

test("request contains bounded public evidence and no tools", () => {
  const request = buildAdvisorRequest({
    controller: { visible: true, fresh: true, endpoint: "not forwarded" },
    workloads: [{ name: "inspection", state: "running", command: "not forwarded" }],
  }, config());
  assert.equal(request.max_tokens, 80);
  assert.equal("tools" in request, false);
  assert.equal(JSON.stringify(request).includes("not forwarded"), false);
});

test("server-owned limiter enforces hourly and daily bounds", () => {
  let now = Date.parse("2026-08-14T12:00:00Z");
  const limiter = createAdvisorLimiter(config({ hourlyRequestLimit: 2, dailyRequestLimit: 3 }), { clock: () => now });
  limiter.acquire().release();
  limiter.acquire().release();
  assert.throws(() => limiter.acquire(), (error) => error.statusCode === 429 && error.message === "advisor_rate_limit");
  now += 61 * 60 * 1000;
  limiter.acquire().release();
  assert.throws(() => limiter.acquire(), (error) => error.statusCode === 429 && error.message === "advisor_rate_limit");
  assert.deepEqual(limiter.snapshot(), { hourly: 1, daily: 3, inFlight: 0 });
});

test("successful evaluation allowlists recommendation and never returns credentials", async () => {
  const calls = [];
  const audit = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return new Response(JSON.stringify({ access_token: "ephemeral-credential" }));
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ recommendation: "deploy_everything", rationale: "No." }) } }],
      usage: { total_tokens: 20 },
    }), { status: 200 });
  };
  const advisor = createReadonlyAdvisor({
    config: config(),
    fetchImpl,
    appendAudit: async (record) => audit.push(record),
  });
  const result = await advisor.evaluate({ controller: { visible: true } });
  assert.equal(result.recommendation, "continue_observing");
  assert.equal(result.safety.deployment, false);
  assert.equal(JSON.stringify({ result, audit }).includes("ephemeral-credential"), false);
});

test("provider failure returns a non-sensitive deterministic audit record", async () => {
  let call = 0;
  const fetchImpl = async () => {
    call += 1;
    return call === 1
      ? new Response(JSON.stringify({ access_token: "ephemeral-credential" }))
      : new Response("provider internals", { status: 503 });
  };
  const advisor = createReadonlyAdvisor({ config: config(), fetchImpl });
  await assert.rejects(
    advisor.evaluate({}),
    (error) => error.statusCode === 502
      && error.auditRecord.fallback === "deterministic-read-only-observation"
      && !JSON.stringify(error.auditRecord).includes("provider internals"),
  );
});

test("advisor factory owns the limiter rather than accepting request history", () => {
  const advisor = createReadonlyAdvisor({ config: config(), fetchImpl: async () => new Response("{}") });
  assert.deepEqual(Object.keys(advisor).sort(), ["evaluate", "limiterSnapshot"]);
  assert.deepEqual(advisor.limiterSnapshot(), { hourly: 0, daily: 0, inFlight: 0 });
});

test("concurrent evaluations are bounded before a second provider call", async () => {
  let releaseProvider;
  let providerStarted;
  const providerGate = new Promise((resolve) => { releaseProvider = resolve; });
  const providerStart = new Promise((resolve) => { providerStarted = resolve; });
  const limiterConfig = config({ maxConcurrentRequests: 1 });
  const audit = [];
  const fetchImpl = async (url) => {
    if (String(url).startsWith("http://169.254.169.254/")) {
      return new Response(JSON.stringify({ access_token: "ephemeral-credential" }));
    }
    providerStarted();
    await providerGate;
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ recommendation: "continue_observing", rationale: "Bounded." }) } }],
    }));
  };

  const advisor = createReadonlyAdvisor({
    config: limiterConfig,
    fetchImpl,
    appendAudit: async (record) => audit.push(record),
  });
  const first = advisor.evaluate({});
  await providerStart;
  await assert.rejects(
    advisor.evaluate({}),
    (error) => error.statusCode === 429
      && error.message === "advisor_concurrency_limit"
      && error.auditRecord.attempted === false,
  );
  assert.equal(audit[0].outcome, "bounded");
  releaseProvider();
  await first;
  assert.equal(advisor.limiterSnapshot().inFlight, 0);
});
