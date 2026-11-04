# Notas de Atualização — PSD VIEW

Todas as modificações notáveis neste projeto serão documentadas neste arquivo.

---

## [0.1.3] — 04/11/2026

### 📑 Inspetor e Árvore de Camadas Interativa (PSD / PSB)
- **Abas no Painel Direito (`[Propriedades] | [Camadas]`)**: alternância rápida entre os metadados do arquivo e a árvore hierárquica de camadas do Photoshop, com contador de camadas em badge dinâmico.
- **Atalho Rápido no Palco (`⧉` / Tecla `L`)**: botão dedicado na barra flutuante do visualizador para abrir/fechar o inspetor de camadas.
- **Carregamento Inteligente em 2 Estágios**:
  - **Estágio 1 (Instantâneo)**: carrega a imagem composta e toda a estrutura da árvore de camadas (nomes, pastas/grupos, visibilidade, opacidade e modos de mesclagem) sem decodificar os pixels individuais de cada camada.
  - **Estágio 2 (Sob Demanda)**: decodifica os buffers de cada camada somente quando o usuário interage com a árvore (ocultar/mostrar camada, isolar em modo Solo ou exportar camada).
- **Controles Interativos por Camada**:
  - **Mostrar / Ocultar (`👁`)**: liga/desliga camadas ou grupos inteiros recompondo o palco em tempo real.
  - **Modo Solo (Isolar Camada)**: clique sobre qualquer linha da camada para isolá-la no palco com fundo transparente; clique novamente ou em *"Original"* para restaurar a composição completa.
  - **Exportação Individual de Camada (`⬇`)**: salva qualquer camada ou grupo isoladamente como arquivo `.png` transparente direto pela árvore.

### 🖼️ Suporte Completo a PSB (Grande Formato) e TIFF Nativo
- **Arquivos `.psb` (Large Document Format)**:
  - Leitura nativa de cabeçalho e seção de recursos (`fs:psd-header`) usando descritores de arquivo parciais (`fs.promises.open`), extraindo dimensões reais e a miniatura JPEG embutida (Resource 1036) em menos de 2ms mesmo em arquivos de múltiplos gigabytes.
  - Renderização completa do composite e árvore de camadas para arquivos `.psb`.
- **Decodificador Nativo de `.tif` / `.tiff` (`UTIF.js`)**:
  - Suporte completo a arquivos TIFF de 8 e 16 bits, RGB, CMYK e tons de cinza, com compressão LZW, Deflate/ZIP, PackBits ou sem compressão (que o Chromium nativamente não exibe na tag `<img>`).
  - **TIFF Multi-Páginas**: suporte a navegação entre páginas de documentos TIFF multipáginas usando os controles inferiores (`◀`, `▶`, `PgUp` e `PgDn`).
  - **Exportação para PNG**: conversão direta de arquivos `.tif`/`.tiff` e `.psb` para `.png` pelo menu de contexto.

### ⊞ Modo Galeria de Miniaturas (Thumbnails Lazy-Loaded)
- **Botão `⊞ Miniaturas` (Tecla `G`)**: novo modo de visualização em grade de cartões visuais na barra da lista de arquivos, preservando os modos *Múltiplas Colunas* e *Lista Linear*.
- **Motor Assíncrono com `IntersectionObserver`**:
  - Gera miniaturas exclusivamente para os cartões visíveis na rolagem com fila limitada a 3 workers simultâneos e cache em memória (`thumbCache`).
  - Extração instantânea de miniaturas de `.psd` e `.psb` via recurso JPEG embutido no cabeçalho (`Resource 1036`), além de miniaturas para `.tif`/`.tiff`, imagens, PDFs (1ª página) e vídeos.

---

## [0.1.2] — 04/11/2026

### 🔍 Busca com Escopo Dinâmico (Pasta Atual vs. Todo o PC)
- **Seletor de Escopo em Pílula (`[Pasta] [PC]`)**: integrado elegantemente dentro da barra de busca lateral.
- **Busca na Pasta Atual (Padrão)**: varre recursivamente a pasta aberta e todas as suas subpastas com alta performance.
- **Busca em Todo o PC**: alternável com um clique, cobrindo todos os discos e pastas do usuário.
- **Feedback Dinâmico**: placeholders e status contextuais (`"Buscar nesta pasta..."` / `"Buscar em todo o computador..."`).

### 🖱️ Abertura Rápida com Duplo Clique
- **Integração com Aplicativo Padrão do Sistema**: duplo clique sobre qualquer arquivo (como `.psd`) agora abre diretamente no programa padrão do Windows (ex.: Adobe Photoshop para `.psd`, fotos para `.png`).
- O duplo clique sobre pastas continua abrindo a navegação na pasta normalmente.

### 🧭 Histórico de Navegação de Pastas (Voltar e Avançar)
- **Botões dedicados na barra de arquivos**: novos botões `◀` (Voltar) e `▶` (Avançar) ao lado do botão `↑` (Subir).
- **Atalhos nativos**: navegação rápida com `Alt + ←` (Voltar), `Alt + →` (Avançar) e `Alt + ↑` (Subir nível).
- **Gerenciamento Inteligente de Histórico**: estado habilitado/desabilitado automático conforme a pilha de navegação.

### 🎯 Visualizador: Zoom Ancorado no Cursor e Pan com Espaço
- **Zoom Focal no Cursor (estilo Photoshop/Figma)**: ao usar `Ctrl + Roda do mouse`, o ponto da imagem sob o cursor é mantido perfeitamente no mesmo lugar sob qualquer nível de aproximação.
- **Pan com Barra de Espaço**: segurar a tecla `Espaço` ativa a ferramenta de mãozinha (`cursor: grab / grabbing`), permitindo arrastar livremente o palco.
- **Feedback Visual de Carregamento**: spinner elegante e aviso de carregamento ao abrir PSDs, PDFs e mídias pesadas.

### ⌨️ Central de Atalhos de Teclado e Produtividade
- **Modal de Atalhos Interativo (`?`)**: novo modal com design Gilroy e badges `<kbd>`, acessível pela tecla `?` ou pelo botão *"Atalhos"* na barra de título.
- **Novos Atalhos Globais**:
  - `F11`: Alternar modo tela cheia (*Full View*).
  - `Ctrl + F`: Focar instantaneamente no campo de busca com seleção de texto.
  - `1` a `5`: Atribuir classificação por estrelas diretamente pelo teclado (`0` para limpar).
  - `+` / `-` / `Backspace`: Zoom in, out e redefinir enquadramento à tela.
  - `R`: Girar 90 graus.
  - `Esc`: Fechar modais (Atalhos, Sobre), menu de contexto e tela cheia de forma segura.

### 🖼️ Exportação Rápida para PNG
- **Menu de Contexto**: nova opção *"Exportar como PNG..."* ao clicar com botão direito em qualquer arquivo `.psd` ou imagem, gerando o arquivo PNG diretamente sem necessidade de abrir o Photoshop.

### ⚡ Performance e Concorrência de I/O
- **Leitura Otimizada de Diretórios (`fs:readdir`)**: divisão em lotes concorrentes balanceados (48 itens), eliminando gargalos de I/O na libuv do Windows ao abrir pastas com milhares de arquivos.
- **Ajuste Ergonômico de Escala**: redução de 10% nos ícones e textos do card de filtros para harmonização visual.

---

## [0.1.1] — 23/10/2026

### 📌 Card de Acesso Rápido (Arquivos Fixados)
- **Área dedicada no painel direito**: novo card visual posicionado no rodapé da barra lateral de propriedades (área antes vazia), projetado para armazenar até 3 arquivos favoritos de acesso frequente.
- **Identificação visual completa**:
  - Exibição do ícone oficial por formato (`.psd`, imagens, vídeos, PDFs e documentos).
  - Nome do arquivo com truncamento (*ellipsis*) e caminho/pasta de origem resumido em destaque discreto.
  - Badge dinâmico no cabeçalho indicando a contagem de slots ocupados (`0/3`, `1/3`, `2/3`, `3/3`).
  - Efeito de realce e borda ativa no item fixado quando ele for o arquivo atualmente selecionado no explorador.
  - Botão de exclusão rápida (`✕`) exibido ao passar o mouse sobre cada item fixado.
  - Estado vazio elegante com mensagem orientativa quando nenhum arquivo estiver fixado.
- **Formas de Fixação ("Pinar")**:
  - **Botão de Ação**: novo botão no painel de propriedades (*"Fixar no Acesso Rápido"* / *"Arquivo fixado (remover)"*) com ícone oficial de alfinete (`Pin.png`). Visível exclusivamente para arquivos (pastas mantêm o fluxo nativo em Favoritos).
  - **Menu de Contexto**: opção nativa ao clicar com o botão direito em qualquer arquivo da lista (*"Fixar no Acesso Rápido"* / *"Desfixar do Acesso Rápido"*).
- **Interação ao Clicar**:
  - **Clique simples**: navega automaticamente até a pasta de origem do arquivo, seleciona o item na lista com rolagem automática e renderiza instantaneamente o preview e metadados.
  - **Duplo clique**: abre o arquivo diretamente no programa padrão do Windows (ex.: Adobe Photoshop).
- **Regras de Negócio e Capacidade**:
  - Limite estrito de 3 arquivos. Tentativas de adicionar um 4º item abrem um diálogo amigável orientando o usuário a desfixar um arquivo antes.
- **Sincronização Automática**:
  - A lista de fixados é sincronizada automaticamente caso um arquivo fixado seja renomeado ou enviado para a Lixeira dentro do aplicativo.
  - Persistência total entre sessões via `localStorage`.

---

### 🪟 Controles da Janela Unificados e Harmonizados
- **Retorno do botão clássico de minimizar**: restaurado o ícone oficial circular com sinal negativo (`MacOS-Minimize.png`).
- **Botão Maximizar / Restaurar unificado e dinâmico**: o botão `btn-max` agora detecta automaticamente se a janela está maximizada ou em tamanho normal (inclusive via Windows Snap ou clique duplo na barra), alternando dinamicamente:
  - Janela normal: exibe `Decompress.png` (setas divergentes ↗↙) e tooltip *"Maximizar"*.
  - Janela maximizada: exibe `minimize 2.png` (setas convergentes ↘↖) e tooltip *"Restaurar tamanho"*.

---

### 🛠️ Melhorias Técnicas e Manutenção
- Atualização da versão do app para **0.1.1** no `package.json`, `package-lock.json` e modal "Sobre".
- Scripts de build e assinatura digital (`build/build-and-sign.ps1` e `build/sign-exe.ps1`) agora obtêm a versão dinamicamente direto do `package.json`.
- Atualização da documentação oficial em [DOCUMENTACAO.md](DOCUMENTACAO.md).

---

## [0.1.0] — 22/10/2026
- Lançamento inicial oficial do PSD VIEW com suporte nativo a Gilroy, ícones oficiais, preview de PSDs, PDFs, imagens, vídeos, gráficos de armazenamento de discos e filtros por extensão.
