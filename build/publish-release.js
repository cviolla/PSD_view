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

### 📑 Inspetor e Árvore de Camadas Interativa (PSD / PSB)
- **Abas no Painel Direito (\`[Propriedades] | [Camadas]\`)**: inspecione toda a hierarquia de pastas/grupos e camadas do seu arquivo \`.psd\` ou \`.psb\` sem abrir o Photoshop.
- **Carregamento Inteligente em 2 Estágios**: abertura instantânea da imagem composta + metadados no Estágio 1, decodificando pixels individuais das camadas sob demanda no Estágio 2.
- **Interatividade Completa**:
  - **Mostrar / Ocultar (\`👁\`)**: ligue ou desligue camadas e grupos recompondo o preview em tempo real.
  - **Modo Solo**: clique em qualquer camada para isolá-la no palco; clique novamente ou em *"Original"* para restaurar.
  - **Exportar Camada Individual (\`⬇\`)**: extraia qualquer camada ou grupo diretamente como \`.png\` transparente.

### 🖼️ Suporte Completo a PSB (Grande Formato) e TIFF Nativo
- **Suporte a \`.psb\` (Large Document Format)**: leitura ultrarrápida de cabeçalho e miniatura JPEG embutida (\`Resource 1036\`) em < 2ms via file descriptor parcial, mais suporte completo a preview e camadas.
- **Decodificador Nativo de \`.tif\` / \`.tiff\`**: renderização direta de arquivos TIFF (RGB, CMYK, 8/16 bits, compressão LZW/Deflate) com suporte a **TIFFs multipáginas** (\`PgUp\` / \`PgDn\`) e exportação para PNG.

### ⊞ Modo Galeria de Miniaturas (Thumbnails)
- **Botão \`⊞ Miniaturas\` (Tecla \`G\`)**: novo modo de exibição em grade visual ao lado dos modos Colunas e Lista.
- **Lazy Loading Assíncrono**: geração de miniaturas sob demanda via \`IntersectionObserver\` com cache em memória para PSD, PSB, TIFF, imagens, PDFs e vídeos.

---

### 📦 Como executar
Baixe o arquivo **PSD-VIEW-${version}-portable.exe** abaixo e execute diretamente — não requer instalação.`;

  console.log(`==> Criando Release v${version} na API do GitHub...`);
  const releasePayload = JSON.stringify({
    tag_name: `v${version}`,
    target_commitish: 'main',
    name: `PSD VIEW v${version} — Árvore de Camadas, Suporte a PSB/TIFF e Galeria de Miniaturas`,
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
  urlObj.searchParams.set('name', path.basename(exePath));

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
  console.log(`🎉 Release ${version} publicada com sucesso no GitHub!`);
  console.log('Página da Release: ' + release.html_url);
  console.log('=======================================================');
}

main().catch(err => {
  console.error('\nErro ao publicar release:', err.message || err);
  process.exit(1);
});
