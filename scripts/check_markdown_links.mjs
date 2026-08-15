// SPDX-License-Identifier: Apache-2.0

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || ".");
const missing = [];

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(target);
  }
  return files;
}

for (const file of await markdownFiles(root)) {
  const markdown = await readFile(file, "utf8");
  const links = markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    const reference = match[1].trim().replace(/^<|>$/g, "");
    if (!reference || reference.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(reference)) continue;
    const relative = decodeURIComponent(reference.split("#", 1)[0].split("?", 1)[0]);
    const target = path.resolve(path.dirname(file), relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      missing.push(`${path.relative(root, file)}: link leaves the repository: ${reference}`);
      continue;
    }
    try {
      await access(target);
    } catch {
      missing.push(`${path.relative(root, file)}: missing target: ${reference}`);
    }
  }
}

if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}
console.log("LINK CHECK PASS: all local Markdown targets exist inside the repository");
