// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");

async function mockEnvironment(context, imageRemovalFails = false) {
  const directory = await mkdtemp(path.join(tmpdir(), "robostew-purge-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const log = path.join(directory, "docker.log");
  const imageState = path.join(directory, "image-present");
  await writeFile(imageState, "present\n");
  const docker = path.join(directory, "docker");
  const curl = path.join(directory, "curl");
  await writeFile(docker, `#!/bin/sh
printf '%s\\n' "$*" >> "$ROBOSTEW_DOCKER_LOG"
case "$1" in
  compose|info|ps) exit 0 ;;
  volume|network) exit 1 ;;
  image)
    if [ "$2" = "inspect" ]; then
      [ -f "$ROBOSTEW_IMAGE_STATE" ]
      exit $?
    fi
    if [ "$2" = "rm" ]; then
      if [ "$ROBOSTEW_IMAGE_REMOVE_FAIL" = "true" ]; then exit 1; fi
      /bin/rm -f "$ROBOSTEW_IMAGE_STATE"
      exit 0
    fi
    ;;
esac
exit 1
`);
  await writeFile(curl, "#!/bin/sh\nexit 0\n");
  await Promise.all([chmod(docker, 0o755), chmod(curl, 0o755)]);
  return {
    directory,
    log,
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      ROBOSTEW_DOCKER_LOG: log,
      ROBOSTEW_IMAGE_STATE: imageState,
      ROBOSTEW_IMAGE_REMOVE_FAIL: String(imageRemovalFails),
    },
  };
}

test("purge removes only the exact RoboStew local image", async (context) => {
  const mock = await mockEnvironment(context);
  const result = await execFileAsync(path.join(root, "robostew"), ["uninstall", "--purge"], { cwd: root, env: mock.env });
  const log = await readFile(mock.log, "utf8");
  assert.match(result.stdout, /local image were purged/);
  assert.match(log, /compose --project-name robostew --file .*compose\.yaml down --volumes --remove-orphans/);
  assert.match(log, /image rm robostew\/control-plane:0\.1\.0/);
  assert.doesNotMatch(log, /valkey\/|node:22|alpine@sha256/);
});

test("purge fails clearly when another container holds the local image", async (context) => {
  const mock = await mockEnvironment(context, true);
  await assert.rejects(
    execFileAsync(path.join(root, "robostew"), ["uninstall", "--purge"], { cwd: root, env: mock.env }),
    (error) => error.code === 1 && /non-RoboStew container using robostew\/control-plane:0\.1\.0/.test(error.stderr),
  );
});
