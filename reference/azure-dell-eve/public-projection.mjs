// SPDX-License-Identifier: Apache-2.0

const PUBLIC_RESPONSE_KEYS = new Set([
  "apps", "attention", "availability", "components", "configured", "controller", "count", "degraded",
  "detail", "device", "error", "evidence", "fresh", "healthy", "image", "latencyms", "memory", "message",
  "metrics", "name", "network", "networkassigned", "observedat", "reachable", "ready", "reason", "receivedat",
  "required", "running", "simulated", "source", "state", "status", "stopped", "summary", "total", "unreachable",
  "visible", "workloads",
]);
const SENSITIVE_KEY = /(?:authorization|credential|password|passwd|passphrase|secret|token|apikey|privatekey|publickey|clientid|tenantid|subscriptionid|resourcegroup|username|hostname|endpoint|url|uri|ipaddress|internalip|externalip|deviceuuid|appuuid|uuid|command|stdout|stderr|raw|filepath|directory|sshkey)/;
const INFRASTRUCTURE_DETAIL = /(?:https?:\/\/|\b(?:password|passwd|passphrase|secret|token|api[_ -]?key|authorization|accountkey|sharedaccesssignature)\s*[:=]\s*\S+|\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+|-----BEGIN [A-Z ]+PRIVATE KEY-----|\bssh-(?:rsa|ed25519)\b|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|(?:^|\s)[\w.-]+@[\w.-]+|\/(?:home|Users|var|etc|opt|srv|tmp)\/|(?:^|\n)\s*(?:ssh|sudo|docker|systemctl|virsh)\b)/i;
const PUBLIC_REGISTRIES = new Set([
  "docker.io", "ghcr.io", "mcr.microsoft.com", "nvcr.io", "public.ecr.aws", "quay.io", "registry-1.docker.io",
  "registry.invalid", "registry.k8s.io",
]);

function normalizedKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPublicResponseKey(key) {
  const normalized = normalizedKey(key);
  return PUBLIC_RESPONSE_KEYS.has(normalized) && !SENSITIVE_KEY.test(normalized);
}

function aliasFor(key) {
  if (/(?:endpoint|url|receiver)/i.test(key)) return "Private service endpoint";
  if (/(?:path|file|directory)/i.test(key)) return "Deployment-local artifact";
  if (/(?:target|host|controller|node|device|machine)/i.test(key)) return "Managed deployment target";
  if (/error/i.test(key)) return "Runtime operation did not complete.";
  return "Private deployment detail";
}

export function containsInfrastructureDetail(value) {
  return INFRASTRUCTURE_DETAIL.test(String(value || ""));
}

function publicImageLabel(value) {
  const text = String(value || "").trim();
  if (!text || text.length > 200 || containsInfrastructureDetail(text) || /\s|:\/\//.test(text)) {
    return "public-image-reference-unavailable";
  }
  const digestIndex = text.lastIndexOf("@");
  if (digestIndex >= 0 && !/^sha256:[a-f0-9]{64}$/i.test(text.slice(digestIndex + 1))) {
    return "public-image-reference-unavailable";
  }
  const imageName = digestIndex >= 0 ? text.slice(0, digestIndex) : text;
  const firstSegment = imageName.split("/")[0].toLowerCase();
  const hasRegistryHost = firstSegment.includes(".") || firstSegment.includes(":") || firstSegment === "localhost";
  return hasRegistryHost && !PUBLIC_REGISTRIES.has(firstSegment) ? "private-registry-image" : text;
}

export function sanitizePublicResponse(value, key = "response") {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    if (normalizedKey(key) === "image") return publicImageLabel(value);
    return containsInfrastructureDetail(value) ? aliasFor(key) : value.slice(0, 1000);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizePublicResponse(item, key)).filter((item) => item !== undefined);
  if (typeof value !== "object") return undefined;

  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (!isPublicResponseKey(childKey)) continue;
    if (/error/i.test(childKey) && childValue) {
      result[childKey] = "Runtime operation did not complete.";
      continue;
    }
    const sanitized = sanitizePublicResponse(childValue, childKey);
    if (sanitized !== undefined) result[childKey] = sanitized;
  }
  return result;
}

function safeLabel(value, fallback) {
  const text = String(value || "").trim();
  return !text || text.length > 120 || containsInfrastructureDetail(text) || !/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(text)
    ? fallback
    : text;
}

export function publicWorkloadView(workload) {
  return {
    name: safeLabel(workload?.name, "workload"),
    image: publicImageLabel(workload?.image),
    state: safeLabel(workload?.state, "unknown").toLowerCase(),
    memory: /^\d+(?:\.\d+)?\s*(?:B|KiB|MiB|GiB|KB|MB|GB)$/i.test(String(workload?.memory || ""))
      ? String(workload.memory)
      : "Not reported",
    network: workload?.networkAssigned ? "Assigned" : "Not reported",
    source: ["controller", "device", "metrics", "reconciled"].includes(workload?.source)
      ? workload.source
      : "runtime",
  };
}
