# Métricas e critérios de cálculo

Todo indicador da ferramenta parte de duas coisas: os incrementos do contador e o tempo.
Este documento fixa como cada um é apurado, para que o número possa ser defendido em reunião.

## Da leitura bruta ao evento

O historian grava por mudança de valor. Cada par de registros consecutivos vira um **evento**:

```
evento = { instante, intervalo em segundos, incrementos }
incrementos = valor[i] − valor[i−1]
```

Quando a diferença é negativa, houve reinício de lote. Nesse caso os incrementos passam a ser
`valor[i] − offset`, onde o offset é o campo "contagem do lote inicia em" da máquina. Isso existe
porque contadores que exibem a **próxima** unidade abrem o lote em 1 sem nada produzido.

Eventos nunca cruzam a fronteira entre dois dias de importação. O silêncio entre o último registro
de um dia e o primeiro do dia seguinte não é evento nem parada — é ausência de dados.

`peças = incrementos × peças por incremento`, definido no cadastro da máquina.

## As quatro medidas de tempo

Elas se encaixam uma dentro da outra e aparecem nos cartões nessa ordem:

| Medida | Definição |
| --- | --- |
| **Janela de dados** | Interseção do período analisado com os trechos efetivamente cobertos pela importação. Nunca é estimada. |
| **Tempo disponível** | Janela de dados menos o abono lançado. É o denominador de tudo. |
| **Tempo rodando** | Tempo disponível menos as paradas detectadas. |
| **Duração do turno** | Horário cadastrado do turno. Só usada no fechamento. |

Hora extra **não** entra em nenhuma delas. O tempo trabalhado a mais já está dentro da janela de
dados, porque o contador registrou durante ele. Somá-la de novo contaria duas vezes. Ela aparece
separada, para mostrar quanto da produção custou tempo pago além do turno.

## Paradas

Um intervalo entre eventos acima do limiar configurável — três minutos por padrão — vira parada.
Ao ser distribuída pelos períodos, a parada é **recortada na virada**: uma interrupção que começa
às 11h52 e termina às 12h11 lança 8 minutos na hora 11 e 11 minutos na hora 12.

Parada aqui significa ausência de incremento. Pode ser máquina parada, pode ser cadência abaixo do
limiar. Confronte com o apontamento do MES antes de tratar como perda de equipamento.

## OEE

```
planejado = capacidade (peças/h) × tempo disponível (h)
OEE       = produzido ÷ planejado
```

O cartão mostra a divisão escrita por extenso para conferência.

**OEE parcial** troca o tempo disponível pela janela entre o primeiro registro e o último registro
do período, também líquida de abono. Serve para turno em andamento: não pune por horas que ainda
não aconteceram.

**OEE fechado**, na tabela de turno, usa a duração cadastrada do turno menos abono. É o número
oficial depois que o turno terminou.

**OEE líquido** aparece quando há refugo ou retrabalho lançado, e troca o produzido pela produção
boa. O OEE bruto continua medindo o que a máquina entregou.

Esta é a definição de OEE adotada aqui: razão entre o produzido e o que a velocidade nominal
entregaria no tempo disponível. Não é a decomposição clássica em disponibilidade × performance ×
qualidade. Disponibilidade aparece como indicador próprio, e qualidade entra pelo OEE líquido.

## Atingimento da meta

```
meta do período = meta (peças/h) × tempo disponível (h)
atingimento     = produzido ÷ meta do período
```

Mesma estrutura do OEE, trocando capacidade por meta. Como o denominador é proporcional ao tempo
coberto, períodos parciais são comparáveis sem ajuste manual.

## Ritmo e cadência

| Indicador | Fórmula | Para que serve |
| --- | --- | --- |
| Ritmo médio | peças ÷ janela de dados | O número real, por hora de relógio |
| Ritmo sem paradas | peças ÷ tempo rodando | Leitura condicional, sempre rotulada |
| Intervalo entre incrementos | janela ÷ incrementos | Cadência em segundos por caixa |
| Melhor cadência sustentada | percentil 10 do tempo de ciclo | O que a máquina demonstrou conseguir |

O ritmo sem paradas é apresentado como apoio, nunca como indicador principal. Ele tem uma
propriedade indesejada: quanto mais tempo sai do denominador por parada, maior fica o valor.
Um número que melhora quando a operação piora não serve como métrica de acompanhamento.

Quando a melhor cadência sustentada supera a capacidade cadastrada, o diagnóstico avisa. Isso
normalmente significa velocidade nominal desatualizada — e, enquanto não for revista, o OEE
está otimista.

## Produção de borda entre turnos

Registros que caem fora do horário principal têm dois destinos, escolhidos no seletor da análise:

- **Manter em cada turno cadastrado** — cada registro vai para o turno que cobre seu horário.
- **Não usar o turno X — anexar ao turno seguinte** — o turno escolhido deixa de existir como
  linha e sua janela é absorvida pelo turno cronologicamente seguinte.

Caixas fechadas às 05h30 com o primeiro turno começando às 06h00: na primeira opção vão para o
terceiro turno; na segunda entram no primeiro, sem virar hora extra. As linhas que receberam
janela anexada são marcadas na tabela.

## Composição da perda

O diagnóstico separa o que faltou para a capacidade em duas parcelas:

- **Perda por parada** — minutos parados convertidos pela velocidade nominal
- **Perda por cadência** — diferença entre capacidade e ritmo, aplicada ao tempo rodando

Elas respondem a perguntas diferentes. A primeira é resolvida com manutenção e setup; a segunda,
com ajuste de processo. Saber qual é maior no período decide onde vale gastar esforço.
