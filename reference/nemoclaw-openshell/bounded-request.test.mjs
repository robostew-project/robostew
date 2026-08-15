// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import test from "node:test";

import { boundedBrokerConfig, fixedAdvisorRequest, safeTokenMatch, validateBoundedBrokerConfig } from "./bounded-request.mjs";

function config() {
  return boundedBrokerConfig({
    sandboxBridgeHost: ["172", "18", "0", "1"].join("."),
    brokerToken: "reference-token-value-with-32-characters",
    model: "bounded-advisor",
    maxOutputTokens: 80,
  });
}

test("configuration requires loopback, a private bridge, a token, and a model", () => {
  assert.equal(validateBoundedBrokerConfig(config()).ok, true);
  assert.equal(validateBoundedBrokerConfig(boundedBrokerConfig({})).ok, false);
  assert.equal(validateBoundedBrokerConfig({ ...config(), loopbackHost: "0.0.0.0" }).ok, false);
});

test("fixed request discards sandbox prompts and tools", () => {
  const request = fixedAdvisorRequest({
    model: "bounded-advisor",
    messages: [{ role: "user", content: "private fleet context" }],
    tools: [{ function: { name: "deploy" } }],
    max_tokens: 1000,
    stream: true,
  }, config());
  assert.equal(request.max_tokens, 80);
  assert.equal(request.stream, true);
  assert.equal("tools" in request, false);
  assert.equal(JSON.stringify(request).includes("private fleet context"), false);
});

test("non-allowlisted models and invalid tokens are denied", () => {
  assert.throws(() => fixedAdvisorRequest({ model: "different-model" }, config()), /model_not_allowlisted/);
  assert.equal(safeTokenMatch("wrong", config().brokerToken), false);
  assert.equal(safeTokenMatch(config().brokerToken, config().brokerToken), true);
});
