# Registro de mudanças

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [5.3.1] — 2026-08-18

### Corrigido
- **Os controles de catálogo e lote estavam impossíveis de achar.** O cartão de
  filtros da análise passou de 1.261 px de controles sem nenhuma separação
  visual. Os dois viraram um bloco destacado, **“Catálogo e lote do período”**,
  com borda, fundo próprio e um texto dizendo que também dá para editar hora a
  hora nas colunas da tabela de detalhe. Os rótulos das demais seções do cartão
  ganharam uma régua acima, para que o cartão deixe de ser um bloco único.

## [5.3.0] — 2026-08-18

### Adicionado
- **Lote por hora.** Cada hora aceita o lote corrente, em texto livre, gravado no
  mesmo registro da programação do catálogo. Dá para aplicar um lote a todas as
  horas do período ou editar hora a hora, na coluna **Lote** da tabela de detalhe.
  Mudar o lote de uma hora não mexe no catálogo dela, e vice-versa.
- **Filtro por lote.** O período escolhido diz onde procurar; o lote diz onde
  olhar. Ao filtrar, a janela de análise passa a ser o intervalo em que aquele
  lote rodou — pedindo 24 h e filtrando um lote das 10h às 14h, cartões, tabelas,
  gráfico e exportações passam a valer para essas 4 h. O resumo declara o recorte
  junto com o período original.
- Cartão **Lote do período**, coluna de lote nos CSV e o lote no texto de e-mail.
- Validação `LOTE`: avisa quando o período atravessa mais de um lote e, no modo
  filtrado, quando o intervalo do lote contém horas de outro — o lote não foi
  contínuo e os números incluem essas horas.

### Notas
- O lote não entra em nenhuma conta: não altera produção, meta nem OEE. É
  identificação e recorte.
- O campo foi acrescentado a um store existente, sem mudar a versão do banco.
  Registros gravados antes simplesmente não o têm.

## [5.2.0] — 2026-08-18

### Adicionado
- **Cor por catálogo.** O cadastro do catálogo ganhou um seletor de cor, para
  espelhar a cor da tampa de cada produto. A cor aparece na lista de catálogos,
  ao lado do seletor de cada hora na tabela de detalhe, e como terceiro critério
  do seletor **Colorir o gráfico por**, que passa a oferecer: OEE contra a meta
  da família, atingimento da meta de peças, ou cor do catálogo.
- **OEE dentro da coluna** do gráfico de barras. A produção continua acima da
  coluna: quantidade em cima, eficiência dentro, sem trocar de gráfico.

### Alterado
- Os cartões de **primeira e última marcação** passam a mostrar até o segundo. Os
  milissegundos continuam na lista de registros individuais e nos CSV, onde se
  confere marcação a marcação.
- O rótulo da linha de meta no gráfico ganhou um fundo, para continuar legível
  quando uma coluna alta passa por baixo dele.

## [5.1.0] — 2026-08-18

### Adicionado
- **Famílias de catálogo com meta de OEE por vigência.** O catálogo passa a
  pertencer a uma família, e é na família que mora a meta de OEE — cadastrada por
  período, porque a meta muda de tempos em tempos e o histórico não pode ser
  reescrito quando ela muda. Cada hora resolve a própria meta pela data daquela
  hora: vale a vigência mais recente que já começou e ainda não terminou.
- **As cores acompanham a meta vigente.** Cartões de OEE, pílulas das tabelas,
  barras e pontos do gráfico e o relatório A4 passam a colorir contra a meta da
  família em vez de um limiar fixo de 85%. Mudar a data da análise muda as cores
  quando a vigência muda — o mesmo OEE de 66,7% fica verde contra uma meta de 40%
  e vermelho contra uma de 90%.
- Limite de **atenção** junto de cada meta: acima da meta é verde, entre atenção e
  meta é âmbar, abaixo é vermelho. Em branco, assume 90% da meta.
- Cartão **Meta de OEE**, com o alvo vigente, o limite de atenção e a família e o
  período de onde vieram.
- Seletor **Colorir o gráfico por**: OEE contra a meta da família (padrão) ou
  atingimento da meta de peças. A legenda declara o critério e o valor da meta.
- Validações `META-OEE` para período sem vigência cadastrada e para período que
  atravessa metas diferentes.
- Família, meta de OEE e limite de atenção nos CSV, no relatório e no e-mail.

### Alterado
- **IndexedDB migrado da versão 2 para a 3**, criando o store `familias`. Aditiva:
  nenhum store existente, keyPath ou registro é tocado.
- Sem meta de OEE cadastrada o indicador fica **neutro**, não reprovado. Antes,
  todo OEE abaixo de 85% era vermelho por um limiar embutido no código.

## [5.0.0] — 2026-08-18

### Adicionado
- **Aba Catálogos.** Cada catálogo é um produto com número, tipo e meta própria
  em peças por hora.
- **Meta por hora, vinda do catálogo.** A meta de uma hora é a do catálogo
  programado para ela; sem programação vale o catálogo padrão da máquina; sem
  catálogo padrão, a meta cadastrada na própria máquina. Sem nenhum catálogo, a
  apuração é idêntica à das versões anteriores.
- **Programação por hora.** No painel de análise, o seletor de catálogo aplica um
  catálogo a todas as horas do período; a coluna Catálogo da tabela de detalhe
  por hora edita uma hora só, para registrar troca no meio do processo. A
  programação fica gravada no IndexedDB, por máquina e por dia.
- **Meta ponderada.** Quando o recorte atravessa catálogos diferentes, a meta é a
  média das metas horárias ponderada pelos minutos. O cartão e a rastreabilidade
  mostram a composição.
- **Colunas de acumulado** na tabela por hora: peças acumuladas, planejado
  acumulado, saldo e atingimento acumulado.
- **Gráfico colorido por atingimento**: verde bateu a meta da hora, âmbar 85% ou
  mais, vermelho abaixo. Vale para barras e para os pontos da linha, e com mais
  de uma máquina a identidade fica no contorno. A linha de meta virou um degrau,
  já que a meta pode mudar de hora para hora.
- Catálogo, meta efetiva e as colunas de acumulado nos CSV, no relatório e no
  texto de e-mail.

### Alterado
- **IndexedDB migrado da versão 1 para a 2.** Migração puramente aditiva: cria
  os stores `catalogos` e `programacao` sem tocar em nenhum store existente,
  keyPath ou registro. Base e backups anteriores continuam sendo lidos.
- O cartão de meta passou a rotular com a **meta efetiva** do catálogo em vez da
  meta cadastrada na máquina — a conta já usava a do catálogo, só o rótulo
  estava desatualizado.
- O rótulo da linha de meta no gráfico foi para a direita, para não colidir com
  o da capacidade quando os dois valores coincidem.

## [4.3.0] — 2026-08-18

### Adicionado
- **Seções recolhíveis.** Toda seção da análise expande e recolhe pelo próprio
  título, por clique ou pelo teclado, com botões “Expandir tudo” e “Recolher
  tudo”. O estado fica salvo por seção e sobrevive ao recarregamento. Na
  impressão o relatório sai completo, independentemente do que estiver recolhido.
- Base de cálculo **“Tempo cadastrado do turno”**: o denominador passa a ser só
  as horas de turno cadastradas que caem no período, já sem o turno
  desconsiderado. O numerador continua sendo toda a produção, então as caixas
  feitas fora de turno entram como **bônus** — o cartão, a rastreabilidade, o
  relatório e o CSV declaram quantas peças são.
- Cartão **OEE pelo turno cadastrado** e coluna `OEE_turno_%` nos CSV.
- Cartão **Tempo de ciclo médio**: segundos por caixa sobre o tempo rodando, com
  mediana, melhor cadência sustentada e comparação com o ciclo nominal do
  cadastro, em desvio percentual.

### Removido
- Cartão **Contagem do contador**. A leitura inicial e final continua disponível
  na seção de rastreabilidade, onde serve para auditoria.

## [4.2.0] — 2026-08-18

### Corrigido
- **Produção perdida na primeira marcação do período.** O incremento registrado
  logo depois de uma lacuna de dados era descartado como “produção não
  atribuída”. Como o descarte valia para qualquer janela que contivesse aquele
  carimbo, a caixa não aparecia em janela nenhuma — sumia da base. No caso
  relatado, 25 caixas entre as leituras 1.006.142 e 1.006.167 eram computadas
  como 24. O mesmo acontecia com o incremento cujo registro anterior ficava
  fora da janela, quando o intervalo era uma parada.

### Adicionado
- Seletor **“Contagem dos incrementos”**, com dois modos:
  *Todo incremento conta, a partir da segunda marcação* (novo padrão) e
  *Não contar incrementos vindos depois de uma lacuna* (comportamento anterior,
  que passa a ser uma escolha explícita).
- Marca **Data incerta** no painel de qualidade, no cartão de produção, na lista
  de registros e nos CSV: separa o incremento cuja quantidade é certa mas cujo
  instante está dentro de uma lacuna. Ele é contado, e fica identificado.
- Validações `DATA-INCERTA` e `BORDA` no painel de validação.

### Alterado
- Intervalos entre registros acima de uma hora passam a ser exibidos como
  duração (`14h32`) em vez de segundos (`52.324,2 s`).

## [4.1.0] — 2026-08-18

Ajuste de duas regras de negócio a partir do comportamento real da linha.

### Adicionado
- Base de cálculo **“Da primeira à última marcação”**, agora o padrão: o
  denominador de meta e OEE vai do primeiro ao último registro do contador, e
  não do horário do filtro. A linha começa a produzir quando a primeira caixa é
  contada.
- Cartão **Contagem do contador**, com a primeira e a última leitura do período
  ao lado das caixas contadas, para conferência contra o painel da máquina.
- Coluna **Adiantadas** no fechamento por turno e status **Produção antecipada**
  para caixas cujo turno começa fora da janela analisada.
- Coluna de OEE entre marcações no fechamento, na rastreabilidade, no relatório
  A4, no texto de e-mail e nos CSV.
- Validações de contagem: período que começa no início da contagem e produção
  adiantada absorvida.

### Alterado
- **Regra do turno desconsiderado.** Antes, o turno anexado entregava a janela
  inteira ao turno seguinte, o que jogava as horas do turno de limpeza no
  denominador e afundava o OEE de quem apenas herdou o trabalho. Agora cada
  linha do fechamento tem duas janelas: a de **tempo** é o horário cadastrado do
  turno e serve de denominador; a de **produção** é estendida sobre o turno
  anexado e serve de numerador. No exemplo de referência, o mesmo turno passa de
  54,0% para 108,0% de OEE.

  Consequência: com um turno desconsiderado, a soma das horas do fechamento fica
  menor que o período, exatamente pelas horas retiradas. A soma das caixas
  continua igual — nada é duplicado nem perdido.
- O campo “Contagem do lote inicia em” virou **“Contador indica a próxima —
  contagem inicia em”**, com prévia explicando que a leitura 1 significa nenhuma
  caixa concluída.

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
