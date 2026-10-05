Native handoff path clarification (metadata only, raw receipt preserved).

The actual declared test-ready file consumed by the parent watch is:
../work/BUDGET-TEST-READY.json from the staging base, or ./BUDGET-TEST-READY.json from your current working directory.

Its author is PARENT_NATIVE_CONTROLLER, and its exact raw SHA256 is the testReadySha256 in ../NATIVE-BUDGET-BEFORE.json. The watcher read that file at `base + '/work/BUDGET-TEST-READY.json'`; it never read `work/BUDGET-TEST-READY.json` relative to your already-nested work cwd.

Your separate output `./work/BUDGET-TEST-READY.json` is a different, later document and was not the input to this native run. Do not assert its hash should equal the actual consumed controller handoff. Both files remain distinct and preserved. Inspect both raw hashes to resolve the apparent binding mismatch. Native test hashes and unchanged production hashes already match the actual staged source.
