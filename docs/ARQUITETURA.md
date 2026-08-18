# Arquitetura

## Estrutura

```
.
├── src/                      aplicação — é isto que o GitHub Pages publica
│   ├── index.html            marcação e ordem de carregamento
│   ├── css/                  folhas numeradas, aplicadas em cascata
│   └── js/                   módulos numerados, carregados em ordem
├── dist/
│   └── mes-horahora.html     build de arquivo único, para uso offline
├── tools/
│   ├── build.mjs             embute CSS e JS no arquivo único
│   └── check.mjs             sintaxe e referências
├── docs/                     documentação
├── samples/                  CSV de exemplo sintético
└── .github/workflows/        verificação e publicação
```

## Por que scripts clássicos e não módulos ES

Módulos ES são carregados sob regras de CORS, e navegadores bloqueiam CORS em `file://`. Um
`index.html` com `type="module"` funciona no Pages e falha no duplo clique.

Como parte do uso previsto é abrir o arquivo direto no computador da fábrica, sem servidor e às
vezes sem rede liberada, os arquivos são scripts clássicos com escopo global compartilhado. O
prefixo numérico define a ordem de carregamento, que é dependência real: `00-core.js` declara o
estado que todos os outros usam.

O `dist/` resolve o mesmo problema por outro caminho, entregando tudo num arquivo só.

## Ordem de carregamento

| Arquivo | Responsabilidade |
| --- | --- |
| `00-core.js` | Estado global, utilitários de formatação, tema, navegação entre abas |
| `10-db.js` | IndexedDB e normalização de cadastros antigos |
| `20-csv.js` | Separador, número, formato de data |
| `30-import.js` | Importação, escolha de máquina, mesclagem por dia |
| `40-metrics.js` | Motor de métricas e recortes de período |
| `50-render.js` | Cartões, tabelas, diagnóstico |
| `60-charts.js` | Gráfico de produção e faixa de cadência |
| `70-reports.js` | A4, WhatsApp, e-mail |
| `80-maquinas.js` a `83-dados.js` | Telas de cadastro e base |
| `90-montagem.js` | Ligação dos controles e exportação em CSV |
| `99-boot.js` | Abertura do banco e primeira renderização |

A navegação entre abas é ligada em `00-core.js`, antes da abertura do banco. Se o IndexedDB falhar
— janela anônima, política de privacidade do navegador —, a interface continua respondendo e o
usuário vê um aviso, em vez de uma tela inerte.

## Modelo de dados

Quatro coleções no IndexedDB, banco `monitor-hh`:

```js
maquinas  { id, nome, etapa, modo, porInc, unid, cap, meta, offset, cor, obs }
turnos    { id, nome, inicio, fim }
ajustes   { id, maquinaId, data, tipo, inicio, minutos, qtd, un, obs }
dias      { chave: "maquinaId|AAAA-MM-DD", maquinaId, data, pts: [[ms, valor], ...] }
```

`dias` guarda um dia inteiro por registro em vez de um registro por ponto. Um turno rende algumas
centenas de pontos; gravá-los individualmente multiplicaria por centenas o custo de leitura de
qualquer análise que atravesse semanas.

`ajustes.maquinaId` aceita `"*"` para lançamentos que valem para todas as máquinas.

## Fluxo de uma análise

```
seleção de período e máquinas
        ↓
carregarPontos()      lê os dias do IndexedDB
        ↓
analisarMaquina()     eventos, janelas de cobertura, paradas, percentis de ciclo
        ↓
bucketsDe()           recortes por hora, turno ou dia; aplica a regra de borda
        ↓
metricas()            para cada recorte: tempo, produção, OEE, atingimento, cadência
        ↓
renderAnalise()       cartões, tabelas e diagnóstico
        ↓
desenhar()            canvas, no requestAnimationFrame seguinte
```

`metricas(A, a, b)` é o núcleo e recebe apenas um intervalo. Cartões, linhas de tabela,
fechamento de turno e totais chamam a mesma função com recortes diferentes — o total do período
é a mesma conta aplicada ao intervalo inteiro, não a soma das linhas. É o que garante que a
tabela e o cartão nunca discordem.

## Canvas

Os dois gráficos são desenhados à mão em canvas, sem biblioteca. A razão é a mesma do arquivo
único: nada de CDN, que rede corporativa costuma bloquear.

Dois cuidados que já causaram defeito e estão fixados:

- O desenho acontece depois que o container está visível. Medir a largura de um elemento dentro
  de um bloco com `display:none` devolve zero, e o gráfico sai em branco sem erro no console.
- O canvas é dimensionado por `devicePixelRatio` e redesenhado na troca de tema e no
  redimensionamento da janela, com debounce.

O eixo da faixa de cadência é comprimido: trechos sem cobertura de dados viram um divisor
tracejado, em vez de esticar o eixo por dias vazios.
