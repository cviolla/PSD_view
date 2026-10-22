# Cria e instala certificado autoassinado de Code Signing para assinatura do PSD VIEW
$ErrorActionPreference = "Stop"
$certName = "Cristiano Violla"
$passwordPlainText = "PsdView2026!"
$pwd = ConvertTo-SecureString -String $passwordPlainText -Force -AsPlainText

Write-Host "Gerando certificado de Code Signing para '$certName'..."

# Remove versões antigas no CurrentUser
Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*CN=$certName*" } | Remove-Item -Force -ErrorAction SilentlyContinue

# Gera o certificado
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=$certName, O=PSD VIEW" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeySpec Signature `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(5)

$pfxPath = Join-Path $PSScriptRoot "cert.pfx"
if (Test-Path $pfxPath) { Remove-Item $pfxPath -Force }

# Exporta arquivo .pfx
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null

# Importa na autoridade raiz de certificados confiáveis do usuário local
Import-PfxCertificate -CertStoreLocation "Cert:\CurrentUser\Root" -FilePath $pfxPath -Password $pwd | Out-Null

Write-Host "Certificado gerado com sucesso em: $pfxPath"
Write-Host "Thumbprint: $($cert.Thumbprint)"
