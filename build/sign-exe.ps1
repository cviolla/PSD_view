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

# A senha do PFX não fica no código: vem da variável PSDVIEW_PFX_PASSWORD ou do arquivo local build\cert.password (ignorado pelo git)
$pwdFile = Join-Path $PSScriptRoot "cert.password"
$pfxPassword = if ($env:PSDVIEW_PFX_PASSWORD) { $env:PSDVIEW_PFX_PASSWORD } elseif (Test-Path $pwdFile) { (Get-Content $pwdFile -Raw).Trim() } else { throw "Senha do certificado não encontrada (defina PSDVIEW_PFX_PASSWORD ou rode create-cert.ps1)." }

$cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($pfxPath, $pfxPassword)

Write-Host "Assinando digitalmente '$FilePath' com o certificado de $($cert.Subject)..." -ForegroundColor Cyan
$result = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -HashAlgorithm SHA256

Write-Host "Resultado da assinatura:" -ForegroundColor Green
$sig = Get-AuthenticodeSignature -FilePath $FilePath
$sig | Format-List Status, StatusMessage, Path, SignerCertificate
