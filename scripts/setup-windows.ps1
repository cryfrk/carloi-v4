$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$recommendedPath = 'C:\dev\carloi-v4'
$syncPathPattern = 'OneDrive|Dropbox|iCloud|Desktop|Masaüstü'

Write-Step "Carloi V4 Windows kurulum kontrolu basliyor"
Write-Host "Repo: $repoRoot"

if ($repoRoot -match $syncPathPattern) {
  Write-Warning "Repo senkronize bir klasorde gorunuyor: $repoRoot"
  Write-Warning "OneDrive, Desktop sync, Dropbox ve iCloud altinda pnpm install kilitlenebilir."
  Write-Warning "Onerilen yol: $recommendedPath"
}

if (-not (Test-Command 'node')) {
  throw 'Node.js bulunamadi. Node 22 LTS kurup tekrar deneyin.'
}

$nodeVersionText = (node --version).Trim()
$nodeVersion = [Version]($nodeVersionText.TrimStart('v'))
Write-Step "Node surumu: $nodeVersionText"

if ($nodeVersion.Major -lt 20 -or ($nodeVersion.Major -eq 20 -and $nodeVersion.Minor -lt 9)) {
  throw "Node.js $nodeVersionText desteklenmiyor. En az Node 20.9 gerekir, tercih edilen surum Node 22 LTS."
}

if ($nodeVersion.Major -ne 22) {
  Write-Warning "Bu repo Windows tarafinda en rahat Node 22 LTS ile calisir. Mevcut surum: $nodeVersionText"
}

Write-Step "corepack enable"
corepack enable | Out-Null

if (-not (Test-Command 'pnpm')) {
  Write-Step "pnpm hazirlaniyor"
  corepack prepare pnpm@10.17.1 --activate | Out-Null
}

$pnpmVersion = (pnpm --version).Trim()
Write-Step "pnpm surumu: $pnpmVersion"

Write-Step "pnpm store path"
$storePath = (pnpm store path).Trim()
Write-Host $storePath

Push-Location $repoRoot
try {
  Write-Step "pnpm install --prefer-offline=false"
  pnpm install --prefer-offline=false
}
catch {
  Write-Warning "pnpm install basarisiz oldu."
  if ($repoRoot -match $syncPathPattern) {
    Write-Warning "Muhtemel sebep: repo senkronize bir klasorde calisiyor."
    Write-Warning "Projeyi $recommendedPath benzeri senkronize olmayan bir klasore tasiyip scripti tekrar calistirin."
  }
  throw
}
finally {
  Pop-Location
}

Write-Step "Kurulum tamamlandi"
