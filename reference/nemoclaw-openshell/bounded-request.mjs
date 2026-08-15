// SPDX-License-Identifier: Apache-2.0

import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

const SYSTEM_PROMPT = [
  "You are RoboStew's read-only robot fleet advisor.",
  "Return one short sentence confirming whether observation should continue.",
  "Never propose deployment, mutation, shell access, credentials, tool use, or robot actuation.",
].join(" ");

const USER_PROMPT = [
  "Bounded functional test:",
  "the control plane is reachable, no fleet data is present, and advisory mode cannot execute actions.",
  "Recommend continued observation.",
].join(" ");

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, minimum), maximum);
}

export function boundedBrokerConfig(input = {}) {
  return {
    loopbackHost: String(input.loopbackHost || "127.0.0.1"),
    sandboxBridgeHost: String(input.sandboxBridgeHost || ""),
    brokerToken: String(input.brokerToken || ""),
    model: String(input.model || ""),
    maxOutputTokens: boundedInteger(input.maxOutputTokens, 80, 32, 120),
  };
}

function privateIpv4(value) {
  if (isIP(value) !== 4) return false;
  const [first, second] = value.split(".").map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

export function validateBoundedBrokerConfig(config) {
  const errors = [];
  if (config.loopbackHost !== "127.0.0.1") errors.push("loopback listener required");
  if (!privateIpv4(config.sandboxBridgeHost)) errors.push("private sandbox bridge required");
  if (config.brokerToken.length < 32) errors.push("broker token must contain at least 32 characters");
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(config.model)) errors.push("valid allowlisted model required");
  return { ok: errors.length === 0, errors };
}

export function safeTokenMatch(supplied, expected) {
  const left = Buffer.from(String(supplied || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function fixedAdvisorRequest(body, config) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_request");
  if (body.model !== config.model) throw new Error("model_not_allowlisted");
  return {
    model: config.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT },
    ],
    max_tokens: config.maxOutputTokens,
    temperature: 0,
    stream: Boolean(body.stream),
  };
}
