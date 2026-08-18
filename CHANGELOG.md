# Registro de mudanças

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [4.0.0] — 2026-08-18

Revisão de correção e evolução. O IndexedDB continua na versão 1: bases e
backups anteriores são lidos sem conversão.

### Adicionado
- Filtro por **data e horário** inicial e final. Todo cálculo passa a respeitar a
  janela exata, inclusive quando ela começa ou termina no meio da hora.
- Filtros rápidos: turno atual, hoje, ontem, últimas 24 h, últimos 7 dias, este mês.
- **Seletor de base de cálculo** com quatro leituras — período selecionado, janela
  com dados, tempo rodando e até o último registro — sempre declarada junto do número.
- Separação entre **parada detectada** e **ausência de dados**, por dois limiares
  configuráveis. Falta de dado deixou de ser tratada como parada.
- Cartões de primeira e última marcação, com data, horário, segundos e
  milissegundos do carimbo original.
- **Qualidade dos dados** e **painel de validação**: cobertura, resets, deltas
  maiores que 1, registros sem alteração, carimbos repetidos e fora de ordem,
  valores fracionados e produção não atribuída.
- **Registros individuais** de cada marcação do contador, com filtros por tipo e
  carregamento progressivo, e **expansão de cada hora** mostrando somente os
  registros daquela janela.
- Tabela de **fechamento por turno** com status por linha (fechado, em andamento,
  ainda não começou, recortado pelo filtro, sem dados), separada da tabela por hora.
- Seção de **rastreabilidade**: cada indicador com a fórmula e os números que
  entraram nela. O relatório A4 e o texto de e-mail passaram a declarar as bases.
- **Seletor de cartões**, com a escolha salva no `localStorage`.
- Botão **Limpar relatório**, que limpa a tela sem tocar na base.
- Atualização automática que distingue “a base recebeu registros novos” de
  “a tela foi recalculada”.
- Cinco exportações em CSV — período, turno, hora, registros e paradas/lacunas —
  todas com cabeçalho declarando janela, limiares e base.
- Testes automatizados (`npm test`, 52 casos, sem dependências) cobrindo os
  cenários obrigatórios de período, turno, delta, reset e lançamento.
- `.gitignore`, workflow de verificação e workflow de publicação no Pages.

### Corrigido
- **Tabelas apareciam com o texto concatenado.** `<thead>`/`<tbody>` eram
  injetados via `innerHTML` numa `<div>`, e o parser descartava as tags de tabela,
  deixando as células como texto solto. Agora a marcação é envolvida em `<table>`.
- **A análise ignorava o período selecionado.** O início e o fim vinham do primeiro
  e do último registro encontrados, não do filtro. Um turno sem produção no fim
  simplesmente encolhia a janela e inflava todos os indicadores.
- **Produção perdida na virada do dia.** Os eventos eram construídos por dia de
  importação, então o incremento entre 23h59 e 00h01 desaparecia — perda diária em
  operação de três turnos. A série passou a ser contínua.
- **OEE parcial errado por turno.** A janela parcial usava o primeiro registro
  global do período em vez do início do recorte, o que deixava o parcial de cada
  turno com base de outro turno.
- **Indicadores exibindo 0% sem denominador.** Capacidade ou meta não cadastrada,
  turno sem registro e período de duração zero mostravam “0,0%”. Toda razão passa
  agora por uma função única e o valor não calculável aparece como “—”.
- **Turnos podiam se sobrepor** quando o cadastro tinha horários que se invadiam,
  contando o mesmo registro em dois turnos. As ocorrências passaram a ser
  recortadas e a sobreposição é sinalizada no painel de validação.
- **Leitura da base inteira a cada análise.** `getAll('dias')` trazia todos os dias
  de todas as máquinas para a memória; agora a leitura usa `IDBKeyRange` sobre a
  faixa de datas da máquina.
- Um erro em uma seção derrubava a renderização inteira. Cada bloco passou a ser
  isolado e falha sozinho, com aviso.
- 404 de favicon no console, resolvido com ícone embutido em data URI.

### Alterado
- **Fórmula do tempo disponível.** Antes era “janela dos dados menos abono”, única
  base possível. Agora existem quatro bases explícitas e o padrão é o período
  selecionado. O antigo “tempo disponível” corresponde à base *janela com dados*.
- **Atribuição de incrementos.** Um incremento vindo depois de uma lacuna, ou de
  uma borda do período com intervalo longo, não entra mais na produção do período:
  não há como afirmar quando foi produzido. A quantidade é reportada como produção
  não atribuída, em vez de ser lançada num horário inventado.
- O detalhe por período virou detalhe por hora, sempre separado do fechamento por
  turno; o agrupamento escolhido passou a valer só para o gráfico.
- `40-metrics.js` virou módulo puro, sem acesso ao DOM. A orquestração da tela saiu
  para `45-analise.js`, a formatação para `01-format.js` e as preferências para
  `02-config.js`.
- `tools/check.mjs` passou a verificar ids duplicados, `$('id')` órfão, ordem dos
  scripts e botão sem handler.

## [3.0.0] — 2026-08-17

### Adicionado
- OEE do período e por turno, na definição `produzido ÷ (capacidade × tempo disponível)`.
- OEE parcial, que usa a janela até o último registro — leitura de turno em andamento.
- Fechamento por turno com cabeçalho em dois níveis e linha de total geral.
- Seletor de produção de borda: mantém no turno que cobre o horário ou anexa ao turno seguinte.
- Lançamentos de parada justificada, refugo e retrabalho, além de abono e hora extra.
- Cartões de intervalo entre incrementos, janela de dados e produção boa.
- Coluna de variação contra o período anterior no detalhe.

### Corrigido
- **Ritmo em regime** dividia a produção pelo tempo descontado das paradas. Como paradas
  saíam do denominador, o indicador subia quando a máquina piorava. Passou a existir o
  ritmo médio sobre a janela de dados, com o ritmo sem paradas como leitura secundária.
- **Uso da capacidade** herdava o mesmo erro por usar o ritmo inflado. Substituído pelo OEE.
- Gráfico de cadência comprime períodos sem dados em vez de esticar o eixo por dias vazios.
- Diagnóstico deixou de embutir o nome da máquina no meio da frase.

## [2.0.0] — 2026-08-17

### Adicionado
- Relatório executivo A4, resumo de WhatsApp e texto de e-mail.
- Configuração do que cada incremento do contador representa, por máquina.

### Corrigido
- `ReferenceError` na inicialização: a função de tema lia `LAST` antes da declaração `let`,
  o que interrompia a execução do script inteiro e deixava as abas sem resposta.

## [1.0.0] — 2026-08-17

### Adicionado
- Base local de máquinas, turnos e registros em IndexedDB.
- Importação histórica de vários arquivos com mesclagem por carimbo de tempo.
- Sobreposição de máquinas na mesma linha do tempo.
- Temas claro e escuro.

### Corrigido
- Gráficos não apareciam: o canvas era dimensionado enquanto o bloco de resultados ainda
  estava com `display:none`, resultando em largura zero.
