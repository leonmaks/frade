# Packet dependency preflight interpretation

The bounded AST preflight selected 204 existing Frade files, 2,370,747 bytes, including all PRE03 named missing fixture generators/hardware input and their owned relative/workspace imports. No external files were read or copied.

The three unresolved literal references are intentional generated negative-test fixture paths: packages/ui-navigator/src/control.css (scripts/ui/controls.mjs creates it inside its isolated temporary root) and two references to packages/ui-workspace/src/isolated-negative.ts (tests/ui-contract/vscode-dark-2026.test.mjs creates it in its isolated fixture). These must not be fabricated in production or treated as missing baseline dependencies. Existing checker source documents their creation and expected nonzero negative outcomes.

The two external path declarations are the default KA data/metadata roots in scripts/ka-fixtures.mjs; they are not packet read authority. Review can inspect the generator/workload contract and in-repository frozen benchmark record. Actual future runtime records must identify the fixture inputs/environment and preserve any unavailable-workload BLOCKED state. No external business data, credentials, global settings or another repository is copied.

Future packet construction uses the validated existing file list plus current accepted plan/decision/evidence, rehashes raw bytes immediately before freeze, and excludes raw prior event streams unless needed for an integrity question. Prepared draft TS files are non-executable decision inputs, not import roots. This static preflight does not certify dynamic runtime coverage or independent PRE.
