// SPDX-License-Identifier: Apache-2.0

import net from "node:net";

function encode(parts) {
  const chunks = [`*${parts.length}\r\n`];
  for (const part of parts) {
    const value = String(part);
    chunks.push(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
  }
  return chunks.join("");
}

function lineEnd(buffer, offset) {
  return buffer.indexOf("\r\n", offset);
}

function parseReply(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const prefix = String.fromCharCode(buffer[offset]);
  const end = lineEnd(buffer, offset + 1);
  if (end < 0) return null;
  const header = buffer.subarray(offset + 1, end).toString();

  if (prefix === "+") return { value: header, next: end + 2 };
  if (prefix === "-") throw new Error(`State-store error: ${header}`);
  if (prefix === ":") return { value: Number(header), next: end + 2 };
  if (prefix === "$") {
    const length = Number(header);
    if (length === -1) return { value: null, next: end + 2 };
    const start = end + 2;
    const next = start + length + 2;
    if (buffer.length < next) return null;
    return { value: buffer.subarray(start, start + length).toString(), next };
  }
  if (prefix === "*") {
    const count = Number(header);
    const values = [];
    let next = end + 2;
    for (let index = 0; index < count; index += 1) {
      const parsed = parseReply(buffer, next);
      if (!parsed) return null;
      values.push(parsed.value);
      next = parsed.next;
    }
    return { value: values, next };
  }
  throw new Error("Unsupported RESP response type");
}

export class RespClient {
  constructor({ host = "redis", port = 6379, timeoutMs = 2000 } = {}) {
    this.host = host;
    this.port = Number(port);
    this.timeoutMs = timeoutMs;
  }

  command(...parts) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let buffer = Buffer.alloc(0);
      let settled = false;

      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve(value);
      };

      socket.setTimeout(this.timeoutMs, () => finish(new Error("State-store request timed out")));
      socket.on("error", (error) => finish(error));
      socket.on("connect", () => socket.write(encode(parts)));
      socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        try {
          const parsed = parseReply(buffer);
          if (parsed) finish(null, parsed.value);
        } catch (error) {
          finish(error);
        }
      });
    });
  }

  ping() {
    return this.command("PING");
  }

  get(key) {
    return this.command("GET", key);
  }

  set(key, value) {
    return this.command("SET", key, value);
  }
}
