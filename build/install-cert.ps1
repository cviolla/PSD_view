# Instala o certificado do PSD VIEW nas Autoridades Raiz Confiáveis da máquina local
# Execute como Administrador para confiar globalmente no certificado.
$pfxPath = Join-Path $PSScriptRoot "cert.pfx"
if (-not (Test-Path $pfxPath)) {
    Write-Error "Arquivo cert.pfx não encontrado."
    exit 1
}

$pwdFile = Join-Path $PSScriptRoot "cert.password"
$plain = if ($env:PSDVIEW_PFX_PASSWORD) { $env:PSDVIEW_PFX_PASSWORD } elseif (Test-Path $pwdFile) { (Get-Content $pwdFile -Raw).Trim() } else { Write-Error "Senha do certificado não encontrada (cert.password)."; exit 1 }
$secPwd = ConvertTo-SecureString $plain -AsPlainText -Force
Import-PfxCertificate -FilePath $pfxPath -CertStoreLocation "Cert:\LocalMachine\Root" -Password $secPwd

Write-Host "Certificado de Cristiano Violla instalado com sucesso nas Autoridades Raiz Confiáveis!" -ForegroundColor Green
