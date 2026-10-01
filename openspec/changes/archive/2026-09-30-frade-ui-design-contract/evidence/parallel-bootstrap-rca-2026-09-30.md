# Isolated-workspace bootstrap root cause

Classification: ENVIRONMENT / retained reference artifact hydration. No UI/domain/routing implementation defect was fixed and no production checker/manifest/assertion was changed.

First offline install failed with ERR_PNPM_NO_OFFLINE_TARBALL for form-data@4.0.6. Frozen online install with scripts disabled then passed (336 packages, 48 fetched). Lockfile remains unchanged.

The first desktop build failed the existing Draw.io checksum check before typecheck/build. Fresh Windows checkout has core.autocrlf=true; drawio.svg became 1299 bytes instead of its 1280-byte pinned blob. Canonical text equals HEAD. First environment repair via Git archive also applied checkout conversion and failed. Second via upstream manifest blob IDs failed with `missing !== blob`.

After these two unsuccessful environment repairs, no further write occurred before this root-cause audit. The source checkout passes all 2851 pinned resources. Read-only git cat-file --batch-check proves five upstream IDs are absent from Frade's object database (including images/google-drive-logo.svg and two onedrive logos). Therefore neither fresh checkout nor archive nor reading all upstream IDs from Frade can hydrate the complete original raw reference.

The next environment repair is exact raw hydration from the source checkout's already verified reference assets, with every file size/upstream Git-blob SHA checked against the unchanged manifest before writing any target file. Only the new managed UI worktree's reference checkout is written. Then execute the existing checksum checker and require a clean vendor Git diff. Preserve source assets, original HEAD/control/dependency state and all checks. No R04 source/tests/metadata are transferred. This is an existing Draw runtime asset prerequisite, not an R04 dependency.

Original failures remain failures; later PASS applies only to the repaired environment run. UI product PRE/visual acceptance are still open.

Final hydration/checksum/build passed. A subsequent Git status check exposed 1321 normalization/stat markers with no canonical diff; a plain refresh failed to clear them. Read-only canonical hashing verified all 2852 tracked vendor entries against index before scoped renormalization. Every OID/mode/stage remained unchanged, staged diff was empty and vendor status became clean. No source byte or global Git config change was made by that metadata repair.
