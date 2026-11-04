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

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const version = pkg.version;
  const exePath = path.join(__dirname, '..', 'dist', `PSD-VIEW-${version}-portable.exe`);
  if (!fs.existsSync(exePath)) {
    throw new Error('Arquivo não encontrado: ' + exePath);
  }
  const exeStats = fs.statSync(exePath);
  console.log(`==> Executável encontrado: ${exePath} (${(exeStats.size / 1024 / 1024).toFixed(2)} MB)`);

  const bodyText = `## 🚀 O que há de novo na versão ${version}

### 🔍 Busca com Escopo Dinâmico (Pasta Atual vs. Todo o PC)
- **Seletor de Escopo em Pílula (\`[Pasta] [PC]\`)**: integrado na barra de busca lateral.
- **Busca na Pasta Atual**: varre recursivamente a pasta aberta e todas as suas subpastas.
- **Busca em Todo o PC**: busca global em todos os discos e pastas do sistema.

### 🖱️ Abertura Rápida com Duplo Clique
- **Aplicativo Padrão do Windows**: clique duplo em qualquer arquivo (ex.: \`.psd\`) abre imediatamente no programa padrão (como Adobe Photoshop). Pastas continuam navegando normalmente.

### 🧭 Histórico de Navegação de Pastas (Voltar / Avançar)
- Botões \`◀\` e \`▶\` integrados à barra de arquivos com atalhos de teclado \`Alt + ←\` e \`Alt + →\`.

### 🎯 Visualizador: Zoom Ancorado no Cursor e Pan com Espaço
- **Zoom Focal**: aproximação/afastamento proporcional mantendo exatamente o ponto sob o cursor do mouse (estilo Photoshop/Figma).
- **Pan com Barra de Espaço**: segurar \`Espaço\` ativa a mãozinha para arrastar o palco.
- **Feedback Visual**: spinner de carregamento ao abrir PSDs, PDFs e mídias pesadas.

### ⌨️ Central de Atalhos de Teclado (?)
- Novo modal de atalhos acessível por \`?\` ou botão na barra de título.
- Novos atalhos: \`F11\` (Tela Cheia), \`Ctrl+F\` (Busca), \`1\` a \`5\` (Estrelas), \`R\` (Girar 90°), \`+\` / \`-\` / \`Backspace\` (Zoom).

### 🖼️ Exportação Rápida para PNG
- Menu de contexto com opção *"Exportar como PNG..."* para PSDs e imagens.

### ⚡ Performance e Concorrência de I/O
- Divisão em lotes balanceados na leitura de diretórios (\`fs:readdir\`), evitando gargalos no Windows.

---

### 📦 Como executar
Baixe o arquivo **PSD-VIEW-${version}-portable.exe** abaixo e execute diretamente — não requer instalação.`;

  console.log(`==> Criando Release v${version} na API do GitHub...`);
  const releasePayload = JSON.stringify({
    tag_name: `v${version}`,
    target_commitish: 'main',
    name: `PSD VIEW v${version} — Busca por Pasta, Zoom no Cursor, Histórico e Atalhos`,
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
