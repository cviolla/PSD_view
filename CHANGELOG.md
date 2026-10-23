# Notas de Atualização — PSD VIEW

Todas as modificações notáveis neste projeto serão documentadas neste arquivo.

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

### 🪟 Novo Ícone Oficial de Minimizar Janela
- Substituição do antigo ícone circular estilo macOS (`MacOS-Minimize.png`), que causava forte ruído visual e parecia uma placa de proibição ao ser invertido no tema escuro.
- Implementação do ícone de setas convergentes (`icons/Minimize.png` / `icons/minimize 2.png`), perfeitamente simétrico e complementar ao ícone de maximizar (`Decompress.png`), mantendo total coerência estética na barra de título.

---

### 🛠️ Melhorias Técnicas e Manutenção
- Atualização da versão do app para **0.1.1** no `package.json`, `package-lock.json` e modal "Sobre".
- Scripts de build e assinatura digital (`build/build-and-sign.ps1` e `build/sign-exe.ps1`) agora obtêm a versão dinamicamente direto do `package.json`.
- Atualização da documentação oficial em [DOCUMENTACAO.md](DOCUMENTACAO.md).

---

## [0.1.0] — 22/10/2026
- Lançamento inicial oficial do PSD VIEW com suporte nativo a Gilroy, ícones oficiais, preview de PSDs, PDFs, imagens, vídeos, gráficos de armazenamento de discos e filtros por extensão.
