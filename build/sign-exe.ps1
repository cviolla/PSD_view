param(
    [string]$FilePath = "dist\PSD-VIEW-0.1.0-portable.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $FilePath)) {
    throw "Arquivo não encontrado: $FilePath"
}

$pfxPath = Join-Path $PSScriptRoot "cert.pfx"
if (-not (Test-Path $pfxPath)) {
    throw "Certificado PFX não encontrado em: $pfxPath"
}

$cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($pfxPath, "PsdView2026!")

Write-Host "Assinando digitalmente '$FilePath' com o certificado de $($cert.Subject)..." -ForegroundColor Cyan
$result = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -HashAlgorithm SHA256

Write-Host "Resultado da assinatura:" -ForegroundColor Green
$sig = Get-AuthenticodeSignature -FilePath $FilePath
$sig | Format-List Status, StatusMessage, Path, SignerCertificate
