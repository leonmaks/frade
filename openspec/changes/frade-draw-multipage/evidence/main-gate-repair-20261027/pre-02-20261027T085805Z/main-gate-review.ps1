param([ValidateSet('PRE','POST')][string]$Phase)
$ErrorActionPreference = 'Stop'
$fradeIndex = 'E:/dev/codex/frade/.git/index'
$fradeRequest = "E:/dev/codex/frade/.worktrees/requests/main-gate-repair-$Phase.json"
$fradeOut = "E:/dev/codex/frade/.worktrees/requests/main-gate-repair-$Phase-console.txt"
$fradeLeasePath = "E:/dev/codex/frade/.worktrees/requests/main-gate-repair-$Phase-index-lease.json"
$fradeBefore = (Get-FileHash -LiteralPath $fradeIndex -Algorithm SHA256).Hash
$fradeStarted = (Get-Date).ToUniversalTime().ToString('o')
$fradeLease = [System.IO.File]::Open($fradeIndex,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read)
try {
  & node 'E:/dev/codex/frade/.git/frade-workflow/releases/a6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5/scripts/agent-review/cli.mjs' run $fradeRequest 2>&1 | Tee-Object -FilePath $fradeOut
  $fradeExit = $LASTEXITCODE
} finally {
  $fradeLease.Dispose()
  $fradeAfter = (Get-FileHash -LiteralPath $fradeIndex -Algorithm SHA256).Hash
  @{phase=$Phase;startedAtUtc=$fradeStarted;finishedAtUtc=(Get-Date).ToUniversalTime().ToString('o');path=$fradeIndex;hashBefore=$fradeBefore;hashAfter=$fradeAfter;lease='FileAccess.Read/FileShare.Read own main index only';released=$true;reviewExit=$fradeExit} | ConvertTo-Json | Set-Content -LiteralPath $fradeLeasePath
}
if ($fradeAfter -ne $fradeBefore) { throw 'OWN_INDEX_CHANGED' }
exit $fradeExit
