# Script oficial de build e assinatura digital do PSD VIEW
$ErrorActionPreference = "Stop"

# Evita processos travados
Stop-Process -Name 'PSD VIEW' -Force -ErrorAction SilentlyContinue

Write-Host "==> Compilando PSD VIEW portátil com electron-builder..." -ForegroundColor Cyan
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win portable

$pkg = Get-Content (Join-Path $PSScriptRoot "..\package.json") -Raw | ConvertFrom-Json
$portableExe = Join-Path $PSScriptRoot "..\dist\PSD-VIEW-$($pkg.version)-portable.exe"
$unpackedExe = Join-Path $PSScriptRoot "..\dist\win-unpacked\PSD VIEW.exe"

$signScript = Join-Path $PSScriptRoot "sign-exe.ps1"

if (Test-Path $portableExe) {
    & $signScript -FilePath $portableExe
}
if (Test-Path $unpackedExe) {
    & $signScript -FilePath $unpackedExe
}

Write-Host "==> Processo de compilação e assinatura digital finalizado com sucesso!" -ForegroundColor Green
