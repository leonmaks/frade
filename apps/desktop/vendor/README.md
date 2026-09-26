# Local Draw.io distribution

Pinned upstream: [jgraph/drawio v31.5.2](https://github.com/jgraph/drawio/tree/v31.5.2).

Copyright notices in the original assets are retained. The upstream Apache 2.0 license is included as `drawio/LICENSE`; libraries and images retain their original embedded notices and marks. Frade does not claim ownership of third-party logos or trademarks.

`drawio-manifest.json` records exact upstream Git blob SHA-1 values and sizes for the local runtime resources and license. `node scripts/check-drawio-assets.mjs` verifies content, including incomplete downloads. `pwsh -File scripts/sync-drawio.ps1` restores missing resources from the pinned official GitHub version and verifies them. A failed download never counts as a valid bundle.

Resources are loaded through the isolated `frade://drawio` origin. The host applies its CSP at response time; upstream assets are unmodified. No remote editor fallback, service worker, account, plugin or network resource is enabled. The production Desktop build verifies this directory before bundling host code. Keep this vendor directory with the Desktop application resources.

The Desktop protocol adds a reference to its own `frade-repository-bridge.js` when serving the editor HTML. This bridge is built from `src/main/drawio-bridge.ts`, runs inside the isolated frame, validates parent origin/source and bounded messages, and has no host IPC. It creates native graph vertices for navigator drops after Workbench checks object scope. It is not written into the vendor directory; pinned upstream hashes remain unchanged.
