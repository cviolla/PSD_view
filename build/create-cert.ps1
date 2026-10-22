# Cria e instala certificado autoassinado de Code Signing para assinatura do PSD VIEW
$ErrorActionPreference = "Stop"
$certName = "Cristiano Violla"
# Senha aleatória, salva só localmente em build\cert.password (ignorado pelo git)
$passwordPlainText = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Set-Content -Path (Join-Path $PSScriptRoot "cert.password") -Value $passwordPlainText -NoNewline
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

# Para confiar no certificado, execute build\install-cert.ps1 como Administrador (não é feito automaticamente).

Write-Host "Certificado gerado com sucesso em: $pfxPath"
Write-Host "Thumbprint: $($cert.Thumbprint)"
