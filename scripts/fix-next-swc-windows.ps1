param(
  [switch]$CleanModules
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Remove-IfExists {
  param([string]$PathToRemove, [string]$RepoRoot)
  if (-not (Test-Path $PathToRemove)) {
    return
  }

  $resolved = (Resolve-Path $PathToRemove).Path
  if (-not $resolved.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Guvenlik kontrolden gecemedi, beklenmeyen silme yolu: $resolved"
  }

  Remove-Item -LiteralPath $resolved -Recurse -Force
  Write-Host "Silindi: $resolved"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$webDir = Join-Path $repoRoot 'apps\web'
$swcPackagePath = Join-Path $repoRoot 'node_modules\@next\swc-win32-x64-msvc\package.json'

Write-Step "Next.js SWC Windows onarimi basliyor"
Write-Host "Repo: $repoRoot"

$nodeVersionText = (node --version).Trim()
$pnpmVersion = (pnpm --version).Trim()
Write-Host "Node: $nodeVersionText"
Write-Host "pnpm: $pnpmVersion"

if ([Version]($nodeVersionText.TrimStart('v')) -lt [Version]'20.9.0') {
  throw "Node.js $nodeVersionText desteklenmiyor. En az Node 20.9 gerekir."
}

if (-not $nodeVersionText.StartsWith('v22.')) {
  Write-Warning "Windows + Next.js icin Node 22 LTS en stabil secenektir. Mevcut surum: $nodeVersionText"
}

Push-Location $repoRoot
try {
  if ($CleanModules) {
    Write-Step "Temizlik modulu acik"
    Remove-IfExists -PathToRemove (Join-Path $repoRoot 'node_modules') -RepoRoot $repoRoot
    Remove-IfExists -PathToRemove (Join-Path $webDir 'node_modules') -RepoRoot $repoRoot
    Remove-IfExists -PathToRemove (Join-Path $webDir '.next') -RepoRoot $repoRoot
  }

  Write-Step "pnpm store prune"
  pnpm store prune

  Write-Step "pnpm install --prefer-offline=false"
  pnpm install --prefer-offline=false

  Write-Step "SWC paketi kontrolu"
  if (Test-Path $swcPackagePath) {
    Get-Content $swcPackagePath
  }
  else {
    Write-Warning "@next/swc-win32-x64-msvc paketi bulunamadi. Bu durumda bundle WASM fallback ile calisabilir."
  }

  Write-Step "Web typecheck"
  pnpm --filter @carloi-v4/web typecheck

  Write-Step "Web production bundle"
  pnpm --filter @carloi-v4/web bundle
}
finally {
  Pop-Location
}

Write-Step "Not"
Write-Host "SWC native binary hatasi devam ederse su uc noktayi kontrol edin:"
Write-Host "1. Repo OneDrive, Desktop sync, Dropbox veya iCloud altinda olmasin."
Write-Host "2. Node 22 LTS kullanin."
Write-Host "3. Microsoft Visual C++ Redistributable kurulu olsun."
