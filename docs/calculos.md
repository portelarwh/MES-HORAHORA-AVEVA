# Cálculos, com exemplos verificáveis

Este documento fixa cada fórmula da ferramenta e mostra um exemplo que pode ser
refeito na mão. É o texto a levar para a reunião quando alguém perguntar de onde
saiu o número.

O módulo `src/js/40-metrics.js` é a única implementação dessas contas. Nenhuma
tela refaz cálculo por conta própria. Os testes em `tests/metrics.test.mjs`
reproduzem os exemplos abaixo.

---

## 1. Do registro bruto ao evento

O historian grava por mudança de valor. A ferramenta junta todos os dias
importados numa **única série ordenada por carimbo de tempo** e olha cada par de
registros consecutivos:

```
gap    = t[i] − t[i−1]            em segundos
delta  = valor[i] − valor[i−1]
peças  = delta × peças por incremento
```

### O contador indica a PRÓXIMA unidade

Esta é a premissa mais importante da leitura. O contador da linha não mostra
quantas caixas ficaram prontas — ele mostra **qual é a próxima caixa**. Com a
contagem iniciando em 1:

| Leitura | Caixas concluídas |
| --- | --- |
| 1 | 0 — a contagem começou, nada foi produzido |
| 2 | 1 |
| 21 | 20 |

Ou seja, `caixas concluídas = leitura − início da contagem`. O “início da
contagem” é o campo **“Contador indica a próxima — contagem inicia em”** do
cadastro da máquina, normalmente 1.

Contar por diferença entre leituras consecutivas dá o mesmo resultado, porque o
início da contagem se cancela na subtração — e é assim que a ferramenta trabalha
no meio da série. O início da contagem aparece explicitamente em dois momentos:

- **no reinício de contagem**, quando `delta` é negativo: nesse caso
  `delta = valor[i] − início da contagem`. Voltar para a leitura 1 conta **zero**
  caixas, não uma;
- **no cartão “Contagem do contador”**, que mostra a primeira e a última leitura
  do período ao lado das caixas contadas, para o operador conferir contra o
  painel da máquina.

A primeira marcação do período **não é o início da produção** — é o instante em
que a contagem foi lida. É por isso que existe a base *Da primeira à última
marcação*, descrita na seção 3.

A série **não é quebrada na meia-noite**. Um incremento entre 23h59 e 00h01 é
contado normalmente; o dia é apenas a chave de armazenamento, não um critério de
cálculo.

### Nada de horário inventado

Um `delta` de 5 é **um** registro, no instante em que o historian o gravou — não
cinco registros espalhados em horários fabricados. A lista de registros
individuais mostra exatamente isso, com o carimbo original, milissegundos
inclusive.

---

## 2. As três classes de intervalo

Cada intervalo entre dois registros recebe uma classe, decidida por **dois
limiares configuráveis**:

| Condição | Classe | Efeito |
| --- | --- | --- |
| `gap ≤ limiar de parada` | **normal** | tempo com dados, máquina rodando |
| `limiar de parada < gap ≤ limiar de ausência` | **parada** | tempo com dados, máquina parada |
| `gap > limiar de ausência` | **sem dados** | fora do tempo com dados; **não é parada** |

Padrão: parada acima de 3 min, ausência de dados acima de 30 min.

Isso responde à regra mais importante do projeto: **falta de dado não é parada**.
Quando o historian deixa de gravar, a ferramenta diz que não sabe — não afirma
que a máquina estava parada.

Também são ausência de dados os trechos do período **antes do primeiro** e
**depois do último** registro, e o período inteiro quando não há nenhum registro.

### A primeira marcação é a referência, não produção

A primeira marcação de um período **nunca conta como produção**: ela não tem
delta próprio, é o ponto de partida da subtração. A contagem começa na **segunda
marcação**, e daí em diante **todo delta conta**, sempre atribuído ao carimbo em
que o historian o registrou. Nenhum horário intermediário é inventado para
distribuir um incremento grande.

Isso vale inclusive quando a marcação de referência está fora da janela
analisada. Puxando o dia 17/08, a última marcação válida do dia 16/08 serve de
referência, e o incremento registrado no dia 17 pertence ao dia 17 — que é o dia
em que ele apareceu.

**Exemplo verificável** (é o caso que originou esta regra):

```
16/08 14:40:07,500   1.006.142      referência, sem incremento
17/08 05:12:11,692   1.006.143      Δ 1     <- 14h32 de lacuna antes dele
17/08 05:21:14,076   1.006.150      Δ 7
17/08 05:21:42,955   1.006.151      Δ 1
17/08 05:37:30,254   1.006.164      Δ 13
17/08 05:38:10,728   1.006.165      Δ 1
17/08 05:43:40,278   1.006.167      Δ 2

1.006.167 − 1.006.142 = 25 caixas
soma dos deltas       = 25 caixas
```

Nenhum delta some. O mesmo vale no outro extremo: o último delta dentro da
janela é sempre contado, e o delta seguinte pertence à janela em que o registro
apareceu. Analisar 16/08 e 17/08 separadamente dá a mesma soma que analisar os
dois juntos — nada é duplicado nem perdido.

### Incrementos com data incerta

Dois casos têm a **quantidade** certa e o **instante** incerto:

| Marca | Quando |
| --- | --- |
| **Após lacuna** | o intervalo anterior foi classificado como ausência de dados |
| **Borda** | o registro anterior está fora da janela analisada |

No exemplo acima, a caixa registrada às 05:12 é uma dessas: ela foi produzida em
algum ponto das 14h32 de silêncio, e o contador só a mostrou às 05:12. Ela é
contada — a caixa existe —, e fica marcada no painel de qualidade, na coluna
**Data incerta** e na lista de registros individuais.

### O seletor de contagem

O comportamento acima é o padrão. O seletor **“Contagem dos incrementos”**
oferece a alternativa:

| Modo | Efeito | Exemplo acima |
| --- | --- | --- |
| **Todo incremento conta, a partir da segunda marcação** (padrão) | tudo entra na produção, com os casos incertos marcados | **25 caixas** |
| **Não contar incrementos vindos depois de uma lacuna** | os casos incertos ficam fora e viram *produção não atribuída* | 24 caixas, 1 reportada |

O segundo modo serve para quem prefere não somar produção que não consegue
localizar no tempo — uma análise de cadência hora a hora, por exemplo, em que
uma caixa lançada na hora errada distorce mais do que a caixa faltante. Ele era
o comportamento da versão 4.1.0 e passou a ser opcional porque perdia produção:
a caixa não aparecia em janela nenhuma.

---

## 3. Os cinco tempos

Todos medidos **dentro da janela exata** escolhida em data **e horário**.

| Tempo | Definição | Para que serve |
| --- | --- | --- |
| **Período selecionado** | `fim − início` do filtro | a janela que o usuário pediu |
| **Tempo com dados** | soma dos intervalos normais e de parada, recortados na janela | cobertura real |
| **Tempo sem dados** | `período − tempo com dados` | o que a ferramenta não viu |
| **Tempo parado** | soma dos intervalos de parada, recortados na janela | paradas detectadas |
| **Abono** | lançamentos do tipo abono que caem na janela | tempo que não deve cobrar meta |

E as quatro **bases de cálculo** derivadas, escolhidas no seletor da tela:

```
marcacoes   = (última marcação − primeira marcação) − abono entre elas
programado  = período selecionado − abono
observado   = tempo com dados − abono que cai dentro da cobertura
operacional = observado − tempo parado
parcial     = (última marcação do período − início do período) − abono até ali
```

A base é sempre mostrada junto do indicador. Um OEE sem a base declarada não
significa nada, porque o mesmo turno pode render 91% ou 108% conforme o
denominador.

A base padrão é **Da primeira à última marcação**. O motivo é operacional: a
linha não começa a produzir quando o relógio do filtro vira, e sim quando a
primeira caixa é contada. Pedir a análise do dia inteiro e ser cobrado por 24 h
de meta, quando a linha contou das 05:00 às 14:00, mede o filtro e não a linha.

| Base | Responde a | Quando usar |
| --- | --- | --- |
| Da primeira à última marcação | “quanto a linha entregou enquanto esteve contando?” | **padrão** — é como a linha se comporta |
| Período selecionado | “quanto a linha entregou do que o relógio permitia?” | fechamento oficial |
| Janela com dados | “quanto ela entregou enquanto era observada?” | coleta incompleta |
| Tempo rodando | “quanto ela entregou enquanto de fato rodava?” | isolar cadência de parada |
| Até o último registro | “como está indo até agora?” | turno em andamento |

Hora extra **não** entra em nenhuma base: o tempo trabalhado a mais já está
dentro do tempo com dados, porque o contador registrou durante ele. Somá-la de
novo contaria duas vezes. Ela aparece separada.

---

## 4. Meta proporcional

```
meta do período = meta (peças/h) × base (min) ÷ 60
atingimento     = peças ÷ meta do período
```

A meta acompanha a base escolhida, então períodos parciais são comparáveis sem
ajuste manual. Meia hora de análise cobra meia hora de meta.

**Exemplo.** Máquina com meta de 90.000 peças/h, período das 06:00 às 07:00,
sem abono, base “período selecionado”:

```
meta do período = 90.000 × 60 ÷ 60 = 90.000 peças
produção        = 59 caixas × 1.000 = 59.000 peças
atingimento     = 59.000 ÷ 90.000  = 65,6 %
```

Com 10 minutos de abono na janela, a base cai para 50 min:

```
meta do período = 90.000 × 50 ÷ 60 = 75.000 peças
atingimento     = 59.000 ÷ 75.000  = 78,7 %
```

---

## 5. OEE

```
planejado = capacidade (peças/h) × base (min) ÷ 60
OEE       = peças ÷ planejado
```

Quatro leituras, uma por base:

| Indicador | Denominador |
| --- | --- |
| **OEE entre marcações** | capacidade × (última − primeira marcação) |
| **OEE programado** | capacidade × período selecionado (− abono) |
| **OEE observado** | capacidade × tempo com dados (− abono) |
| **OEE operacional** | capacidade × tempo rodando |
| **OEE parcial** | capacidade × (última marcação − início do período) |

**Exemplo.** Capacidade 120.000 peças/h, período 06:00–07:00, registros de
06:00 a 06:59, sem parada e sem abono:

```
tempo com dados  = 59 min          (do primeiro ao último registro)
tempo sem dados  = 1 min           (o minuto final, sem registro)
produção         = 59.000 peças

OEE programado = 59.000 ÷ (120.000 × 60 ÷ 60) = 59.000 ÷ 120.000 = 49,2 %
OEE observado  = 59.000 ÷ (120.000 × 59 ÷ 60) = 59.000 ÷ 118.000 = 50,0 %
```

**OEE parcial, turno em andamento.** Turno das 06:00 às 14:20 (500 min), dados
até as 08:00:

```
base parcial   = 120 min
OEE parcial    = peças ÷ (120.000 × 120 ÷ 60)
OEE programado = peças ÷ (120.000 × 500 ÷ 60)
```

O parcial não pune por horas que ainda não aconteceram; o programado, sim. É por
isso que os dois aparecem lado a lado na tabela de turno, com o status da linha
dizendo se ela já fechou.

**OEE líquido** troca as peças produzidas pela produção boa
(`peças − refugo − retrabalho`) e só aparece quando há esses lançamentos.

Esta é a definição de OEE adotada aqui: razão entre o produzido e o que a
velocidade nominal entregaria na base escolhida. **Não** é a decomposição
clássica em disponibilidade × performance × qualidade. Disponibilidade é
indicador próprio, e qualidade entra pelo OEE líquido.

---

## 6. Divisão por zero

Toda razão passa por `razao(numerador, denominador)`, que devolve `null` quando o
denominador não existe, é zero ou não é finito. Na tela, `null` vira **“—”**.

**Nunca é exibido 0% por denominador inexistente.** Capacidade não cadastrada,
período de duração zero, turno sem nenhum registro para a base parcial: todos
mostram “—”. Zero por cento só aparece quando a conta foi feita e deu zero — a
máquina teve tempo e não produziu.

---

## 7. Ritmo e cadência

| Indicador | Fórmula | Leitura |
| --- | --- | --- |
| Ritmo médio | peças ÷ tempo com dados (h) | o número real, por hora de relógio |
| Ritmo sem paradas | peças ÷ tempo rodando (h) | leitura condicional, sempre rotulada |
| Intervalo entre incrementos | tempo com dados (s) ÷ incrementos | segundos por caixa |
| Melhor cadência sustentada | percentil 10 do tempo de ciclo | o que a máquina demonstrou conseguir |

O ritmo sem paradas é apoio, nunca indicador principal: quanto mais tempo sai do
denominador por parada, maior ele fica. Um número que melhora quando a operação
piora não serve para acompanhamento.

Quando a melhor cadência sustentada supera a capacidade cadastrada, o painel de
validação avisa: normalmente é velocidade nominal desatualizada e, enquanto não
for revista, o OEE está otimista.

---

## 8. Turnos

As ocorrências de turno são geradas dia a dia a partir do cadastro, aceitam
virada de meia-noite e são **recortadas na janela** selecionada. Duas garantias:

1. **Nenhuma ocorrência se sobrepõe a outra.** Se o cadastro tiver turnos que se
   invadem, a ocorrência anterior é cortada no início da seguinte e o painel de
   validação sinaliza. Sem isso o mesmo registro entraria em dois turnos.
2. A **duração cadastrada** do turno é preservada à parte da duração dentro da
   janela, e a linha é marcada como *recortado* quando o filtro a cortou.

Status de cada linha:

| Status | Quando |
| --- | --- |
| Fechado | o turno terminou e tem registros |
| Em andamento | o instante atual está dentro do turno |
| Ainda não começou | o turno é futuro |
| Recortado pelo filtro | a janela cortou o turno |
| Sem dados | o turno terminou sem nenhum registro |

### Turno desconsiderado

O seletor **“Turno desconsiderado”** existe para o turno que não é produtivo — na
linha de referência, o 3º turno é de limpeza. Ele desaparece como linha do
fechamento, e a regra tem duas metades que precisam ser lidas juntas:

| O que acontece | Por quê |
| --- | --- |
| A **produção** do turno desconsiderado vai para o turno seguinte | os funcionários da limpeza às vezes adiantam caixas; elas são trabalho entregue e pertencem a quem recebe o turno |
| As **horas** do turno desconsiderado **não** vão | o turno de limpeza não é produtivo; cobrar meta e OEE por essas horas puniria o turno seguinte por um tempo em que ninguém deveria estar produzindo |

Na prática, cada linha do fechamento passa a ter **duas janelas**:

```
janela de tempo      = horário cadastrado do turno   -> denominador (meta, OEE)
janela de produção   = estendida sobre o turno anexo -> numerador (caixas, peças)
```

**Exemplo.** Turnos 06:00–14:20, 14:20–22:40 e 22:40–06:00, com o 3º
desconsiderado. Entre 05:00 e 05:40 o pessoal da limpeza fecha 20 caixas; das
06:00 às 14:00 o 1º turno fecha mais 160.

```
1º turno, janela de produção : 00:00 -> 14:20   -> 180 caixas (20 adiantadas)
1º turno, janela de tempo    : 06:00 -> 14:20   -> 8h20
OEE programado = 180.000 ÷ (20.000 peças/h × 8h20) = 108,0 %
```

O operador começa o turno com 20 caixas na conta e continua sendo medido pelas
8h20 do próprio turno. Se as horas do turno de limpeza entrassem no denominador,
o mesmo trabalho apareceria como 54% — foi assim que a ferramenta se comportou
até a versão 4.0.0, e estava errado para este caso.

A coluna **Adiantadas** mostra quantos incrementos vieram de antes do início do
turno, e a linha recebe a marca *+ turno anexado*.

Consequência a conhecer: com um turno desconsiderado, a soma das horas das linhas
do fechamento é **menor** que o período selecionado, exatamente pelas horas do
turno retirado. A soma das caixas continua igual à do período — nada é duplicado
nem perdido, o que é verificado em `tests/turno-anexado.test.mjs`.

Quando a produção adiantada pertence a um turno que começa fora da janela
analisada, ela aparece numa linha marcada como **Produção antecipada**, com
tempo zero e OEE não calculável: as caixas existem, mas o turno que vai respondê‑las
ainda não começou dentro do período.

---

## 9. Recortes de hora e dia

Buckets de hora e de dia são recortados na janela. Um período que começa às 07h20
gera um primeiro bucket de **07h20 às 08h00**, marcado como parcial — não uma hora
cheia inventada. A soma das durações dos buckets é sempre igual à duração do
período.

A expansão de uma linha da tabela por hora mostra **somente** os registros cuja
marcação cai dentro daquela janela.

---

## 10. Lançamentos manuais

| Tipo | Efeito no cálculo |
| --- | --- |
| **Abono** | sai de todas as bases; a meta e o planejado caem junto |
| **Hora extra** | nenhum: o tempo já está no tempo com dados. Aparece separada |
| **Parada justificada** | informativo: dá nome a uma parada já detectada |
| **Refugo** | entra na produção boa e no OEE líquido; não altera o OEE bruto |
| **Retrabalho** | igual ao refugo, contabilizado separadamente |

Abono, hora extra e parada justificada são lançados com início e duração, e são
recortados na janela — um abono de 20 min iniciado às 06h50 contribui com 10 min
para um período que termina às 07h00.

Refugo e retrabalho são lançados por dia e rateados pela fatia do dia que cai
dentro do recorte.

---

## 11. Qualidade dos dados

A qualidade mede a confiança no número, não o desempenho da máquina. Um turno com
OEE alto e 40% de cobertura é um turno sem dados, não um turno bom.

| Classificação | Critério |
| --- | --- |
| **Boa** | cobertura ≥ 98% e nenhuma anomalia grave |
| **Aceitável** | cobertura ≥ 85% e no máximo uma anomalia grave |
| **Ruim** | abaixo disso |
| **Sem dados** | nenhum registro no período |

Anomalias graves: valores fracionados, carimbos fora de ordem e produção não
atribuída. Também são contados e exibidos, sem pesar na classificação: registros
sem alteração, incrementos maiores que 1, reinícios de contagem, carimbos
repetidos e lacunas.

---

## 12. Composição da perda

O diagnóstico separa o que faltou para a capacidade em duas parcelas:

```
perda por parada   = tempo parado (h) × capacidade
perda por cadência = (capacidade − ritmo em operação) × tempo rodando (h)
```

Elas respondem a perguntas diferentes. A primeira se resolve com manutenção e
setup; a segunda, com ajuste de processo. Saber qual é maior decide onde gastar
esforço no período.
