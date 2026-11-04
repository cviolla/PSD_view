<p align="center">
  <img src="LOGO.png" alt="PSD VIEW" />
</p>

# PSD VIEW — Documentação

> Visualizador e explorador de arquivos **offline**, focado em **velocidade de leitura**.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Layout da interface](#2-layout-da-interface)
3. [Funcionalidades](#3-funcionalidades)
4. [Formatos suportados](#4-formatos-suportados)
5. [Atalhos e controles](#5-atalhos-e-controles)
6. [Desempenho](#6-desempenho)
7. [Requisitos não funcionais](#7-requisitos-não-funcionais)
8. [Arquitetura sugerida](#8-arquitetura-sugerida)
9. [Roadmap](#9-roadmap)
10. [Glossário](#10-glossário)

---

## 1. Visão geral

**PSD VIEW** é um aplicativo desktop que funciona como um *explorer* de arquivos, com leitura nativa de arquivos **.psd** (Adobe Photoshop), além de pastas, imagens de diversos formatos, vídeos e outros tipos de arquivo.

- **Offline:** não depende de internet, conta ou nuvem. Nenhum arquivo do usuário sai da máquina.
- **Rápido:** o diferencial do produto é abrir, navegar e pré-visualizar arquivos (inclusive PSDs pesados) quase instantaneamente.
- **Sem abrir o Photoshop:** permite ver o conteúdo composto do PSD sem carregar um editor.

### Público-alvo
Designers, fotógrafos, editores de vídeo, equipes de arte e qualquer pessoa que navegue por grandes bibliotecas de arquivos.

---

## 2. Layout da interface

Referência: [page1.png](page1.png). A janela é dividida em **quatro áreas**, com barra de título customizada.

```
┌───────────────────────────────────────────────────────────────────┐
│ LOGO  PSD VIEW   Sobre                         ☀  —  ⤢  ✕         │
├────────────┬──────────────────────────────────┬───────────────────┤
│ 🔍 Busca   │  Armazenamento (C:, D:, E: lado) │  Propriedades     │
│ Sistema ▾  ├──────────────────────────────────┤  Tipo             │
│ Discos  ▾  │                                  │  Tamanho          │
│ Favoritos▾ │     Área de Visualização         │  Caminho          │
│            │     (preview grande)             │  Última modif.    │
│            │                                  │  Classificação ★  │
├────────────┼──────────────────────────────────┤  Mostrar no       │
│ Todos      │   Lista de arquivos e pastas     │  explorer         │
│ Imagens    │   (em colunas)                   │                   │
│ PSD        │                                  │                   │
│ Vídeos     │                                  │                   │
└────────────┴──────────────────────────────────┴───────────────────┘
```

### 2.1 Barra superior
| Elemento | Função |
|---|---|
| Logo + **PSD VIEW** | Identidade do app |
| **Sobre** | Informações de versão, licença e créditos |
| ☀ (sol) | Alternar tema claro/escuro |
| — (menos) | Minimizar |
| ⤢ | Maximizar / restaurar |
| ✕ | Fechar |

### 2.2 Painel esquerdo — Navegação
- **Campo de busca:** pesquisa por nome de arquivo/pasta.
- **Sistema:** atalhos para locais do sistema (Área de Trabalho, Documentos, Imagens, Downloads etc.).
- **Discos:** unidades de armazenamento disponíveis (C:, D:, E:...).
- **Favoritos:** pastas fixadas pelo usuário com opção de exclusão.
- Cada grupo é **expansível/colapsável** (seta ▾), com **persistência automática de estado** (o app memoriza exatamente quais grupos você deixou abertos ou fechados entre as sessões).

### 2.3 Painel central superior — Armazenamento
Card horizontal posicionado no topo, logo acima da janela de preview, exibindo as unidades de disco lado a lado em tamanho perfeitamente uniforme e compacto:
- Letra e rótulo (ex.: `C:`, `D:`, `E:`)
- **Gráfico circular** com % de uso com a cor de destaque oficial do app (`#e4ff00`)
- GB usados, GB livres e capacidade total
- Tipo (Interno) e sistema de arquivos (NTFS)
- Cabeçalho com total: nº de unidades e espaço livre somado
- **Dimensões uniformes e proporcionais:** cards com altura fixa de 48px e distribuição equilibrada via grid, eliminando distorções de tamanho e quebras de texto.
- **Seleção e hover sutis:** efeito translúcido discreto sem contornos fluorescentes excessivos, mantendo elegância visual e foco no conteúdo.

### 2.4 Painel esquerdo inferior — Filtros rápidos
**Todos · Imagens · PSD · Vídeos** — filtram a lista de arquivos pelo tipo, com indicador na cor `#e4ff00`.

### 2.5 Área de visualização (central superior)
- Preview grande do arquivo selecionado, sobre fundo escuro.
- Barra de dicas de atalhos na parte inferior (ver [seção 5](#5-atalhos-e-controles)).
- Suporta zoom, arrastar e rotação.

### 2.6 Lista de arquivos (central inferior)
- Exibe pastas e arquivos em **múltiplas colunas**, **lista linear** ou **galeria de miniaturas** (`⊞ Miniaturas`, tecla `G`).
- No modo **Galeria de Miniaturas**, gera *thumbnails* sob demanda (*lazy-loading* via `IntersectionObserver`) para PSD, PSB, TIFF, imagens, PDFs e vídeos.

### 2.7 Painel Direito — Abas Propriedades e Camadas
- **Aba Propriedades:**
| Campo | Descrição |
|---|---|
| **Tipo** | Nome, extensão e formato detalhado (ex.: `PSD`, `PSB · Grande Formato`, `TIFF`) |
| **Tamanho** | Tamanho em KB/MB/GB |
| **Caminho** | Caminho do arquivo (abreviado quando longo) |
| **Última modificação** | Data de modificação |
| **Dimensões / Tempo** | Resolução em pixels/pontos, contagem de camadas/páginas e tempo de leitura em `ms` |
| **Classificação** | Nota de 1 a 5 estrelas, definida pelo usuário |
| **Mostrar no explorer** | Abre o local do arquivo no gerenciador do sistema |
| **Acesso Rápido (Fixados)** | Card para fixar até 3 arquivos frequentemente usados com acesso direto |

- **Aba Camadas (Inspetor PSD/PSB — tecla `L`):**
  - Exibe a árvore hierárquica de camadas e grupos na mesma ordem do Adobe Photoshop.
  - Permite alternar visibilidade (`👁`), isolar camada no modo **Solo** (clicando na camada), visualizar modo de mesclagem e opacidade, e exportar qualquer camada individualmente como `.png` transparente (`⬇`).

---

## 3. Funcionalidades

### 3.1 Navegação de arquivos
- Navegar por pastas e discos como em um explorer.
- **Histórico de navegação:** botões de Voltar (`◀`), Avançar (`▶`) e Subir (`↑`), com suporte a atalhos de teclado (`Alt + ← / → / ↑`).
- **Busca com escopo dinâmico:** pílula seletora para buscar na **Pasta atual** (recursivo em todas as subpastas) ou em **Todo o computador**.
- Filtrar por categoria (Todos, Imagens, PSD, PDF, Vídeos).
- **Abertura no programa padrão:** duplo clique em qualquer arquivo abre diretamente no aplicativo padrão do sistema (ex.: Adobe Photoshop para `.psd`).
- Favoritar pastas.
- **Acesso Rápido:** pinar/fixar até 3 arquivos usados com frequência no card lateral, com navegação imediata ao clicar e abertura no aplicativo padrão com duplo clique.

### 3.2 Visualização
- **PSD:** exibe a imagem composta, sem abrir o Photoshop, com opção de **Exportar como PNG...** no menu de contexto.
- **PDF:** leitura e renderização nativa de páginas via PDF.js, com navegação de páginas (PgUp/PgDn).
- **Imagens:** JPG, PNG, WebP, etc. com checkerboard para canais alfa e exportação direta.
- **Vídeos:** reprodução/preview direto.
- **Outros arquivos:** ícone e propriedades básicas.
- **Zoom ancorado no cursor:** aproximação/afastamento proporcional centrado exatamente sob o ponteiro do mouse (estilo Figma/Photoshop).
- **Pan com barra de espaço:** segurar `Espaço` ativa a ferramenta de mãozinha para arrastar.
- **Feedback visual de carregamento:** spinner elegante durante o processamento de mídias pesadas.
- Modo de tela cheia no visualizador (`F11`).

### 3.3 Propriedades e organização
- Metadados do arquivo.
- Classificação por estrelas.
- Atalho para "Mostrar no explorer" e "Abrir no programa padrão".
- Botão "Fixar no Acesso Rápido" e menu de contexto correspondente.

### 3.4 Personalização
- Tema claro e escuro.
- Alternador de visualização (Lista linear / Múltiplas colunas) com botões oficiais ON / OFF.
- Janela redimensionável com controles próprios.

---

## 4. Formatos suportados

| Categoria | Formatos |
|---|---|
| **Photoshop** | `.psd` (principal), `.psb` |
| **Documentos** | `.pdf` (visualização nativa com suporte a multi-páginas) |
| **Imagens** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tif/.tiff`, `.svg`, `.ico`, `.heic` |
| **Vídeos** | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.wmv` |
| **Outros** | Qualquer arquivo é listado com ícone e propriedades |

> A lista final depende dos codecs/bibliotecas escolhidos na implementação.

---

## 5. Atalhos e controles

A aplicação conta com um modal interativo de atalhos acessível pela tecla `?` ou pelo botão **Atalhos** na barra de título.

| Ação | Atalho / Controle |
|---|---|
| **Navegação de pastas** | `Alt + ←` (Voltar) / `Alt + →` (Avançar) / `Alt + ↑` (Subir) |
| **Buscar arquivos** | `Ctrl + F` |
| **Atualizar lista** | `F5` |
| **Abrir pasta / arquivo** | `Enter` ou `2x Clique` (abre no programa padrão) |
| **Zoom no cursor** | `Ctrl + Roda do mouse` |
| **Zoom in / out / fit** | `+` / `-` / `Backspace` |
| **Mover imagem (Pan)** | `Espaço + Arrastar` ou clicar e arrastar |
| **Girar 90°** | `R` |
| **Tela cheia** | `F11` (ou clique duplo no palco) |
| **Item anterior / próximo** | `←` / `→` (ou roda do mouse sem Ctrl) |
| **Páginas do PDF** | `PgUp` / `PgDn` (ou `↑` / `↓` com PDF selecionado) |
| **Classificação por estrelas** | Teclas `1` a `5` (`0` para limpar) |
| **Renomear / Excluir** | `F2` / `Delete` |
| **Copiar / Colar** | `Ctrl + C` / `Ctrl + V` |
| **Propriedades** | `Alt + Enter` |
| **Ajuda de atalhos** | `?` |
| **Fechar modais / tela cheia** | `Esc` |

---

## 6. Desempenho

A velocidade é o principal diferencial. Diretrizes:

- **Cache de miniaturas** em disco, para reabrir pastas instantaneamente.
- **Leitura da imagem composta do PSD** (merged image) em vez de processar todas as camadas.
- **Carregamento assíncrono e em segundo plano**: a interface nunca trava.
- **Virtualização da lista**: renderiza só os itens visíveis, mesmo com milhares de arquivos.
- **Pré-carregamento (prefetch)** dos arquivos vizinhos ao navegar.
- **Indexação incremental** para a busca.
- **Decodificação acelerada** (multithread/GPU quando disponível).

### Metas sugeridas
| Operação | Meta |
|---|---|
| Abrir pasta com 1.000 itens | < 300 ms |
| Preview de PSD de ~20 MB | < 500 ms |
| Troca entre imagens (prefetch) | < 100 ms |
| Inicialização do app | < 2 s |

---

## 7. Requisitos não funcionais

- **Offline total:** sem telemetria, sem dependências de rede.
- **Privacidade:** nenhum dado enviado externamente.
- **Somente leitura por padrão:** o app não altera os arquivos do usuário.
- **Baixo consumo** de memória e CPU.
- **Acessibilidade:** contraste adequado nos dois temas e navegação por teclado.
- **Idioma:** Português (Brasil).
- **Plataforma inicial:** Windows (a arquitetura deve permitir expansão).

---

## 8. Arquitetura sugerida

```
┌─────────────────────── Interface (UI) ───────────────────────┐
│ Navegação │ Lista virtualizada │ Visualizador │ Propriedades  │
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
        ┌───────▼────────┐             ┌────────▼────────┐
        │ Serviço de     │             │ Serviço de      │
        │ Arquivos (FS)  │             │ Decodificação   │
        └───────┬────────┘             │ PSD/Img/Vídeo   │
                │                      └────────┬────────┘
        ┌───────▼────────┐             ┌────────▼────────┐
        │ Índice / Busca │             │ Cache miniaturas│
        └────────────────┘             └─────────────────┘
        ┌──────────────────────────────────────────────┐
        │ Armazenamento local: favoritos, notas, config │
        └──────────────────────────────────────────────┘
```

Dados persistidos localmente: favoritos, classificações (estrelas), tema, cache de miniaturas e índice de busca.

---

## 9. Roadmap

| Fase | Entregas |
|---|---|
| **MVP** | Explorer básico, leitura de PSD e imagens, propriedades, tema claro/escuro |
| **v1.0** | Vídeos, busca, favoritos, classificação, painel de armazenamento, atalhos |
| **v1.1** | Cache otimizado, prefetch, modo grade/lista |
| **Futuro** | Visualização de camadas do PSD, tags, comparação lado a lado, multiplataforma |

---

## 10. Glossário

- **PSD:** formato nativo do Adobe Photoshop, com camadas.
- **Imagem composta:** versão achatada do PSD, usada para preview rápido.
- **Prefetch:** carregamento antecipado de arquivos prováveis de serem abertos.
- **Virtualização:** renderização apenas dos itens visíveis em uma lista.

---

<p align="center"><sub>PSD VIEW — Documentação v1.0</sub></p>
