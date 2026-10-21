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
│ 🔍 Busca   │                                  │  Propriedades     │
│ Sistema ▾  │     Área de Visualização         │  Tipo             │
│ Discos  ▾  │     (preview grande)             │  Tamanho          │
│ Favoritos▾ │                                  │  Caminho          │
│            │                                  │  Última modif.    │
│ Armazena-  │                                  │  Classificação ★  │
│ mento      │                                  │  Mostrar no       │
├────────────┼──────────────────────────────────┤  explorer         │
│ Todos      │   Lista de arquivos e pastas     │                   │
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

### 2.2 Painel esquerdo superior — Navegação
- **Campo de busca:** pesquisa por nome de arquivo/pasta.
- **Sistema:** atalhos para locais do sistema (Área de Trabalho, Documentos, Imagens, Downloads etc.).
- **Discos:** unidades de armazenamento disponíveis (C:, D:, E:...).
- **Favoritos:** pastas fixadas pelo usuário.
- Cada grupo é **expansível** (seta ▾).

### 2.3 Painel esquerdo — Armazenamento
Resumo das unidades, exibindo para cada disco:
- Letra e rótulo (ex.: `C:`, `E: D2`, `D: D1`)
- **Gráfico circular** com % de uso
- GB usados, GB livres e capacidade total
- Tipo (Interno), sistema de arquivos (NTFS) e modelo do dispositivo
- Cabeçalho com total: nº de unidades e espaço livre somado

### 2.4 Painel esquerdo inferior — Filtros rápidos
**Todos · Imagens · PSD · Vídeos** — filtram a lista de arquivos pelo tipo.

### 2.5 Área de visualização (central superior)
- Preview grande do arquivo selecionado, sobre fundo escuro.
- Barra de dicas de atalhos na parte inferior (ver [seção 5](#5-atalhos-e-controles)).
- Suporta zoom, arrastar e rotação.

### 2.6 Lista de arquivos (central inferior)
- Exibe pastas e arquivos em **múltiplas colunas**, com ícone por tipo.
- Possui **alternador (toggle)** no canto superior esquerdo para trocar o modo de exibição (ex.: lista/grade).

### 2.7 Painel de Propriedades (direita)
| Campo | Descrição |
|---|---|
| **Tipo** | Nome e extensão (ex.: `IMAGE.jpg`) |
| **Tamanho** | Tamanho em KB/MB/GB |
| **Caminho** | Caminho do arquivo (abreviado quando longo) |
| **Última modificação** | Data de modificação |
| **Classificação** | Nota de 1 a 5 estrelas, definida pelo usuário |
| **Mostrar no explorer** | Abre o local do arquivo no gerenciador do sistema |

---

## 3. Funcionalidades

### 3.1 Navegação de arquivos
- Navegar por pastas e discos como em um explorer.
- Filtrar por categoria (Todos, Imagens, PSD, Vídeos).
- Busca por nome.
- Favoritar pastas.

### 3.2 Visualização
- **PSD:** exibe a imagem composta, sem abrir o Photoshop.
- **Imagens:** JPG, PNG, WebP, etc.
- **Vídeos:** reprodução/preview.
- **Outros arquivos:** ícone e propriedades básicas.
- Modo de tela cheia no visualizador.

### 3.3 Propriedades e organização
- Metadados do arquivo.
- Classificação por estrelas.
- Atalho para "Mostrar no explorer".

### 3.4 Personalização
- Tema claro e escuro.
- Janela redimensionável com controles próprios.

---

## 4. Formatos suportados

| Categoria | Formatos |
|---|---|
| **Photoshop** | `.psd` (principal), `.psb` |
| **Imagens** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tif/.tiff`, `.svg`, `.ico`, `.heic` |
| **Vídeos** | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.wmv` |
| **Outros** | Qualquer arquivo é listado com ícone e propriedades |

> A lista final depende dos codecs/bibliotecas escolhidos na implementação.

---

## 5. Atalhos e controles

Conforme a barra de dicas do visualizador:

| Ação | Controle |
|---|---|
| Navegar entre arquivos | **Roda do mouse** / **← →** |
| Zoom | **Ctrl + Roda do mouse** |
| Mover imagem | **Arrastar** |
| Girar | **R** |
| Fechar visualizador | **Esc** |

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
