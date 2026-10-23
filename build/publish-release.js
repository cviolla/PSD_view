const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

async function main() {
  console.log('==> Obtendo credenciais do GitHub via Git Credential Manager...');
  const creds = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n' }).toString();
  const tokenLine = creds.split('\n').find(l => l.startsWith('password='));
  if (!tokenLine) throw new Error('Não foi possível obter o token do GitHub.');
  const token = tokenLine.replace('password=', '').trim();

  const exePath = path.join(__dirname, '..', 'dist', 'PSD-VIEW-0.1.1-portable.exe');
  if (!fs.existsSync(exePath)) {
    throw new Error('Arquivo não encontrado: ' + exePath);
  }
  const exeStats = fs.statSync(exePath);
  console.log(`==> Executável encontrado: ${exePath} (${(exeStats.size / 1024 / 1024).toFixed(2)} MB)`);

  const bodyText = `## 🚀 O que há de novo na versão 0.1.1

### 📌 Card de Acesso Rápido (Arquivos Fixados)
- **Área dedicada no painel direito**: novo card visual posicionado no rodapé da barra lateral de propriedades para armazenar até 3 arquivos favoritos de acesso frequente.
- **Identificação visual completa**:
  - Exibe o ícone oficial por formato (\`.psd\`, imagens, vídeos, PDFs e documentos).
  - Nome do arquivo com truncamento (*ellipsis*) e caminho/pasta de origem resumido.
  - Contador dinâmico no cabeçalho indicando slots em uso (\`0/3\`, \`1/3\`, \`2/3\`, \`3/3\`).
  - Destaque com contorno amarelo suave (\`#e4ff00\`) quando o item fixado for o atualmente selecionado.
  - Botão de exclusão rápida (\`✕\`) exibido ao passar o mouse.
  - Estado vazio elegante quando nenhum arquivo estiver fixado.
- **Formas de Fixar e Desfixar**:
  - **Botão de Ação**: botão no painel de propriedades (*"Fixar no Acesso Rápido"* / *"Arquivo fixado (remover)"*) com ícone oficial de alfinete (\`Pin.png\`).
  - **Menu de Contexto**: clique com o botão direito em qualquer arquivo da lista para fixar ou desfixar diretamente.
- **Abertura Rápida**:
  - **Clique simples**: navega automaticamente até a pasta de origem, seleciona o item na lista e renderiza seu preview e metadados na hora.
  - **Duplo clique**: abre o arquivo diretamente no programa padrão do Windows (ex.: Adobe Photoshop).
- **Regras de Negócio e Sincronização**:
  - Limite estrito de 3 arquivos com aviso amigável.
  - Sincronização automática ao renomear ou excluir arquivos pelo app.
  - Persistência total entre sessões via \`localStorage\`.

---

### 🪟 Controles da Janela Unificados e Harmonizados
- **Botão Minimizar Clássico**: retorno do ícone circular oficial com traço negativo (\`MacOS-Minimize.png\`).
- **Botão Maximizar / Restaurar Unificado**:
  - O botão \`btn-max\` agora detecta automaticamente o estado da janela (inclusive via Windows Snap ou clique duplo na barra).
  - Em tamanho normal: exibe \`Decompress.png\` (setas divergentes ↗↙) para maximizar.
  - Quando maximizada: alterna dinamicamente para \`minimize 2.png\` (setas convergentes ↘↖) para restaurar o tamanho.

---

### 📦 Como executar
Baixe o arquivo **PSD-VIEW-0.1.1-portable.exe** abaixo e execute diretamente — não requer instalação.`;

  console.log('==> Criando Release v0.1.1 na API do GitHub...');
  const releasePayload = JSON.stringify({
    tag_name: 'v0.1.1',
    target_commitish: 'main',
    name: 'PSD VIEW v0.1.1 — Acesso Rápido e Melhorias nos Controles de Janela',
    body: bodyText,
    draft: false,
    prerelease: false
  });

  const release = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: '/repos/cviolla/PSD_view/releases',
      method: 'POST',
      headers: {
        'User-Agent': 'PSD-VIEW-Publisher',
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(releasePayload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Falha ao criar release (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(releasePayload);
    req.end();
  });

  console.log(`==> Release criada com sucesso! ID: ${release.id}`);
  console.log(`==> URL da Release: ${release.html_url}`);

  // Faz upload do binário para a release
  const uploadUrlRaw = release.upload_url.replace(/\{(\?.*)?\}/, '');
  const urlObj = new URL(uploadUrlRaw);
  urlObj.searchParams.set('name', 'PSD-VIEW-0.1.1-portable.exe');

  console.log(`==> Enviando executável (${(exeStats.size / 1024 / 1024).toFixed(2)} MB)...`);

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'User-Agent': 'PSD-VIEW-Publisher',
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': exeStats.size
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const asset = JSON.parse(data);
          console.log(`==> Binário enviado com sucesso! Asset ID: ${asset.id}`);
          console.log(`==> Link direto do executável: ${asset.browser_download_url}`);
          resolve(asset);
        } else {
          reject(new Error(`Falha no upload do executável (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);

    let uploadedBytes = 0;
    const fileStream = fs.createReadStream(exePath);
    fileStream.on('data', chunk => {
      uploadedBytes += chunk.length;
      const pct = ((uploadedBytes / exeStats.size) * 100).toFixed(1);
      process.stdout.write(`\rProgresso do upload: ${pct}% (${(uploadedBytes / 1024 / 1024).toFixed(1)} / ${(exeStats.size / 1024 / 1024).toFixed(1)} MB)`);
    });
    fileStream.on('end', () => console.log('\nEnvio concluído, processando no GitHub...'));
    fileStream.pipe(req);
  });

  console.log('\n=======================================================');
  console.log('🎉 Release 0.1.1 publicada com sucesso no GitHub!');
  console.log('Página da Release: ' + release.html_url);
  console.log('=======================================================');
}

main().catch(err => {
  console.error('\nErro ao publicar release:', err.message || err);
  process.exit(1);
});
