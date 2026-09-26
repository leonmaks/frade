# Requires PowerShell 7. Assets are public upstream files; every file is checked by Git blob SHA.
$ErrorActionPreference='Stop'
$vendor=Join-Path $PSScriptRoot '../apps/desktop/vendor'
$manifest=Get-Content (Join-Path $vendor 'drawio-manifest.json') -Raw|ConvertFrom-Json
$root=Join-Path $vendor 'drawio'
$version=$manifest.version
$manifest.assets | ForEach-Object -ThrottleLimit 6 -Parallel {
  $ErrorActionPreference='Stop'
  $asset=$_; $file=Join-Path $using:root $asset.path
  function Valid($file,$sha) {
    if(!(Test-Path -LiteralPath $file)){return $false}
    $bytes=[IO.File]::ReadAllBytes($file);$header=[Text.Encoding]::UTF8.GetBytes("blob $($bytes.Length)`0")
    return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($header+$bytes)).ToLowerInvariant() -eq $sha
  }
  if(Valid $file $asset.sha){return}
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file))|Out-Null
  $path=if($asset.path -eq 'LICENSE'){'LICENSE'}else{'src/main/webapp/'+$asset.path}
  $version=$using:version
  foreach($url in @("https://raw.githubusercontent.com/jgraph/drawio/v$version/$path","https://raw.githubusercontent.com/jgraph/drawio/refs/tags/v$version/$path")){
    try{Invoke-WebRequest $url -OutFile $file -TimeoutSec 20;if(Valid $file $asset.sha){return}}catch{}
  }
  try{$blob=Invoke-RestMethod ('https://api.github.com/repos/jgraph/drawio/git/blobs/'+$asset.sha) -TimeoutSec 20;[IO.File]::WriteAllBytes($file,[Convert]::FromBase64String($blob.content));if(Valid $file $asset.sha){return}}catch{}
  Write-Output ('Missing or invalid: '+$asset.path)
}
node (Join-Path $PSScriptRoot 'check-drawio-assets.mjs')
if($LASTEXITCODE -ne 0){throw 'Draw.io asset verification failed'}
