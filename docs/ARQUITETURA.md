# Arquitetura

## Estrutura

```
.
├── src/                        aplicação — é isto que o GitHub Pages publica
│   ├── index.html              marcação e ordem de carregamento
│   ├── css/                    folhas numeradas, aplicadas em cascata
│   └── js/                     módulos numerados, carregados em ordem
├── dist/
│   └── mes-horahora.html       build de arquivo único, para uso offline
├── tools/
│   ├── build.mjs               embute CSS e JS no arquivo único
│   └── check.mjs               sintaxe, referências, ids únicos e handlers
├── tests/                      testes automatizados (node --test, sem dependências)
├── docs/                       documentação
├── samples/                    CSV de exemplo sintético
└── .github/workflows/          verificação e publicação
```

## Por que scripts clássicos e não módulos ES

Módulos ES são carregados sob regras de CORS, e navegadores bloqueiam CORS em
`file://`. Um `index.html` com `type="module"` funciona no Pages e falha no duplo
clique.

Como parte do uso previsto é abrir o arquivo direto no computador da fábrica, sem
servidor e às vezes sem rede liberada, os arquivos são scripts clássicos com
escopo global compartilhado. O prefixo numérico define a ordem de carregamento,
que é dependência real.

O `dist/` resolve o mesmo problema por outro caminho, entregando tudo num arquivo
só. Os testes resolvem pelo terceiro: `tests/harness.mjs` concatena os módulos
puros na mesma ordem do `index.html` e os avalia num contexto de `node:vm`, o que
permite testar as fórmulas sem converter o projeto para módulos ES.

## Ordem de carregamento e responsabilidades

| Arquivo | Responsabilidade | DOM |
| --- | --- | --- |
| `00-core.js` | estado global, helpers de DOM, tema, abas, proteção contra erro isolado | sim |
| `01-format.js` | números, datas, durações, percentuais e a política de “não calculável” | não |
| `02-config.js` | preferências do usuário, catálogo de cartões, seções e bases | não |
| `10-db.js` | IndexedDB, leitura por faixa de chave, normalização de cadastros antigos | sim |
| `20-csv.js` | separador, número, formato de data | não |
| `30-import.js` | importação, escolha de máquina, mesclagem por dia | sim |
| `40-metrics.js` | **motor de cálculo**: série, classes de intervalo, tempos, OEE, turnos, buckets | não |
| `41-quality.js` | qualidade dos dados e painel de validação | não |
| `45-analise.js` | janela exata, filtros rápidos, orquestração, limpar relatório, atualização automática | sim |
| `50-render.js` | cartões, fechamento por turno, qualidade, validação, diagnóstico, rastreabilidade | sim |
| `51-registros.js` | detalhe por hora com expansão e lista de registros individuais | sim |
| `60-charts.js` | gráfico de produção e faixa de cadência | sim |
| `70-reports.js` | A4, WhatsApp, e-mail | sim |
| `75-export.js` | exportações em CSV | sim |
| `80-maquinas.js` a `83-dados.js` | telas de cadastro, lançamentos e base | sim |
| `90-montagem.js` | ligação dos controles e seletor de cartões | sim |
| `99-boot.js` | preferências, abertura do banco e primeira renderização | sim |

Os módulos marcados com **não** na coluna DOM são puros e é o que os testes
carregam. Regra do projeto: fórmula nova entra num módulo puro; tela nenhuma
refaz conta.

A navegação entre abas é ligada em `00-core.js`, antes da abertura do banco. Se o
IndexedDB falhar — janela anônima, política de privacidade —, a interface continua
respondendo e o usuário vê um aviso, em vez de uma tela inerte. Cada bloco de
render passa por `protegido()`, então um dado inválido derruba uma seção e não a
página.

## Modelo de dados

Quatro coleções no IndexedDB, banco `monitor-hh`, **versão 1**:

```js
maquinas    { id, nome, etapa, modo, porInc, unid, cap, meta, offset, catalogoId, cor, obs }
turnos      { id, nome, inicio, fim }
ajustes     { id, maquinaId, data, tipo, inicio, minutos, qtd, un, obs }
catalogos   { id, numero, tipo, metaHora, obs }
dias        { chave: "maquinaId|AAAA-MM-DD", maquinaId, data, pts: [[ms, valor], ...] }
programacao { chave: "maquinaId|AAAA-MM-DD", maquinaId, data, horas: { "6": catalogoId, ... } }
```

**Migração 1 → 2.** Puramente aditiva: cria `catalogos` e `programacao`, e não
toca em nenhum store existente, keyPath ou registro. Uma base da versão 1 abre
na 2 com todos os dados intactos e os dois stores novos vazios — a meta cai no
fallback do cadastro da máquina até que algum catálogo seja criado. A criação dos
stores é idempotente, então vale igual para banco novo e para base migrada.
Backups anteriores, sem os campos novos, são restaurados normalmente.

`programacao` espelha o formato de `dias` de propósito: uma linha por máquina e
dia, com o mapa de hora do dia para catálogo. Ler um intervalo continua sendo um
range contíguo da chave primária, e a gravação de uma hora só reescreve um
registro pequeno.

`dias` guarda um dia inteiro por registro em vez de um registro por ponto. Um
turno rende algumas centenas de pontos; gravá-los individualmente multiplicaria o
custo de leitura de qualquer análise que atravesse semanas.

Como a chave é `maquinaId|data`, um intervalo de datas de uma máquina é um range
contíguo da chave primária. `diasDoIntervalo()` usa `IDBKeyRange` e lê só o
necessário, em vez de trazer a base inteira para a memória.

`ajustes.maquinaId` aceita `"*"` para lançamentos que valem para todas as
máquinas.

### Preferências

Ficam no `localStorage`, separadas dos dados de produção:

| Chave | Conteúdo |
| --- | --- |
| `hh-tema` | claro ou escuro |
| `hh-prefs` | cartões, seções, base de cálculo, limiares, horários, turno desconsiderado, atualização automática |

Apagar a base de produção não mexe nas preferências; trocar de preferência não
mexe na base. O backup exporta as duas coisas, em campos distintos.

## Fluxo de uma análise

```
janela exata (data + horário) e máquinas selecionadas
        ↓
diasDoIntervalo()     lê do IndexedDB só a faixa necessária
        ↓
analisarMaquina()     série contínua, classes de intervalo, cobertura,
                      paradas, lacunas, eventos, percentis de ciclo
        ↓
bucketsDe() / turnosNoIntervalo()
                      recortes de hora, dia e turno, sempre dentro da janela
        ↓
metricas(A, a, b)     para cada recorte: tempos, produção, OEE por base,
                      meta proporcional, cadência
        ↓
qualidade() / validacoes()
        ↓
renderAnalise()       cartões, tabelas, painéis, diagnóstico, rastreabilidade
        ↓
desenhar()            canvas, no requestAnimationFrame seguinte
```

`metricas(A, a, b)` é o núcleo e recebe apenas um intervalo. Cartões, linhas de
tabela, fechamento de turno e totais chamam a mesma função com recortes
diferentes — o total do período é a mesma conta aplicada ao intervalo inteiro,
não a soma das linhas. É o que garante que a tabela e o cartão nunca discordem.

## Volume

Períodos longos não montam a tabela inteira de uma vez: o detalhe por hora e a
lista de registros individuais são renderizados em blocos de 200 linhas, com
botão para carregar o restante. A leitura do banco já vem limitada à faixa de
datas da janela.

## Canvas

Os dois gráficos são desenhados à mão em canvas, sem biblioteca. A razão é a mesma
do arquivo único: nada de CDN, que rede corporativa costuma bloquear.

Dois cuidados que já causaram defeito e estão fixados:

- O desenho acontece depois que o container está visível. Medir a largura de um
  elemento dentro de um bloco com `display:none` devolve zero, e o gráfico sai em
  branco sem erro no console.
- O canvas é dimensionado por `devicePixelRatio` e redesenhado na troca de tema e
  no redimensionamento da janela, com debounce.

Na faixa de cadência, parada e ausência de dados têm marcações diferentes: bloco
vermelho para parada detectada, hachura cinza para ausência de dados. O eixo é
comprimido nos trechos com cobertura, para que dias vazios não estiquem o
gráfico.

## Seções recolhíveis

Cada seção da análise recebe uma chave (`data-sec`) e um estado (`data-aberto`).
O recolhimento é feito por uma regra de CSS que esconde os irmãos do `<h2>`, em
vez de envolver cada bloco numa `div` extra — o HTML das seções continua como
estava e nenhum call site precisou mudar de estrutura.

O estado fica em `PREFS.recolhidas`, por chave. Ao expandir uma seção que contém
canvas, `desenhar()` é chamado no quadro seguinte: um canvas medido enquanto
escondido devolve largura zero e sai em branco.

Na impressão, a regra de recolhimento é revertida — o relatório em papel sai
completo, independentemente do que estiver recolhido na tela.

## Armadilha de HTML que já custou caro

`elemento.innerHTML = '<thead>...'` só funciona se o elemento for uma `<table>`.
Injetar `<thead>`/`<tbody>` dentro de uma `<div>` faz o parser descartar as tags e
sobrar o texto solto — as células aparecem concatenadas. Toda tabela montada por
string precisa ser envolvida em `<table>` ou escrita dentro de um elemento
`table` já existente.
