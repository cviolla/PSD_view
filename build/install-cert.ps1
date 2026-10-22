# Instala o certificado do PSD VIEW nas Autoridades Raiz Confiáveis da máquina local
# Execute como Administrador para confiar globalmente no certificado.
$pfxPath = Join-Path $PSScriptRoot "cert.pfx"
if (-not (Test-Path $pfxPath)) {
    Write-Error "Arquivo cert.pfx não encontrado."
    exit 1
}

$secPwd = ConvertTo-SecureString "PsdView2026!" -AsPlainText -Force
Import-PfxCertificate -FilePath $pfxPath -CertStoreLocation "Cert:\LocalMachine\Root" -Password $secPwd

Write-Host "Certificado de Cristiano Violla instalado com sucesso nas Autoridades Raiz Confiáveis!" -ForegroundColor Green
