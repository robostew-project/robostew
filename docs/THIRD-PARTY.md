# Third-Party Components

RoboStew source is licensed under Apache License 2.0. The local edition references or builds on independently licensed components.

## Node.js

The control-plane image builds from the official Node.js 22 Alpine image. Node.js is distributed under the Node.js license and includes third-party components under their own terms.

- Project: <https://nodejs.org/>
- License inventory: <https://github.com/nodejs/node/blob/main/LICENSE>

## Valkey

The local state store uses the official Valkey 8.1.9 Alpine image. Valkey is an open-source continuation of the Redis 7.2 codebase and is distributed under the BSD 3-Clause License.

- Project: <https://valkey.io/>
- Source and license: <https://github.com/valkey-io/valkey>
- Container source: <https://github.com/valkey-io/valkey-container>

## Alpine Linux and container contents

The Node.js and Valkey images contain Alpine Linux packages under their respective licenses. Consult the selected image's package and license inventory when redistributing an image rather than building it locally.

## Trademarks

Third-party names identify compatibility or reference integrations. They do not imply sponsorship or endorsement. See `NOTICE`.
