param(
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

if (-not $FilePath) {
    $pkg = Get-Content (Join-Path $PSScriptRoot "..\package.json") -Raw | ConvertFrom-Json
    $FilePath = "dist\PSD-VIEW-$($pkg.version)-portable.exe"
}

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
$maxAttempts = 5
$signed = $false
for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
        $result = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -HashAlgorithm SHA256
        $signed = $true
        break
    } catch {
        if ($attempt -lt $maxAttempts) {
            Start-Sleep -Seconds 1
        } else {
            throw $_
        }
    }
}

Write-Host "Resultado da assinatura:" -ForegroundColor Green
$sig = Get-AuthenticodeSignature -FilePath $FilePath
$sig | Format-List Status, StatusMessage, Path, SignerCertificate
