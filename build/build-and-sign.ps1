# Script oficial de build e assinatura digital do PSD VIEW
$ErrorActionPreference = "Stop"

Write-Host "==> Compilando PSD VIEW com electron-builder..." -ForegroundColor Cyan
npx electron-builder --win portable -c.win.sign=null

$portableExe = Join-Path $PSScriptRoot "..\dist\PSD-VIEW-0.1.0-portable.exe"
$unpackedExe = Join-Path $PSScriptRoot "..\dist\win-unpacked\PSD VIEW.exe"

$signScript = Join-Path $PSScriptRoot "sign-exe.ps1"

if (Test-Path $portableExe) {
    & $signScript -FilePath $portableExe
}
if (Test-Path $unpackedExe) {
    & $signScript -FilePath $unpackedExe
}

Write-Host "==> Processo de compilação e assinatura digital finalizado com sucesso!" -ForegroundColor Green
