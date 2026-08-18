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

Quando `delta` é negativo houve reinício de lote. Nesse caso
`delta = valor[i] − offset`, sendo o offset o campo **“contagem do lote inicia
em”** da máquina — existe porque contadores que exibem a *próxima* unidade abrem
o lote em 1 sem nada produzido. O reinício é contado e aparece na qualidade dos
dados.

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

### Produção não atribuída

Um incremento só entra na produção do período quando é possível afirmar que
aconteceu dentro dele. Fica de fora, e é reportado à parte, quando:

- veio depois de um intervalo classificado como **sem dados** — não há como dizer
  em que momento foi produzido;
- o registro anterior está **fora do período** e o intervalo não é normal — parte
  da produção pertence ao lado de fora da janela.

Um intervalo normal (até 3 min) que cruza a borda do período é contado: a fatia
que vaza é menor que o limiar e a convenção é registrar o incremento no instante
em que ele aparece.

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
programado  = período selecionado − abono
observado   = tempo com dados − abono que cai dentro da cobertura
operacional = observado − tempo parado
parcial     = (última marcação do período − início do período) − abono até ali
```

A base é sempre mostrada junto do indicador. Um OEE sem a base declarada não
significa nada, porque o mesmo turno pode render 91% ou 102% conforme o
denominador.

| Base | Responde a | Quando usar |
| --- | --- | --- |
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

O seletor **“Turno desconsiderado”** faz o turno escolhido deixar de existir como
linha: sua janela é absorvida pelo turno cronologicamente **seguinte**, que passa
a começar mais cedo e é marcado como *turno anexado*.

Caixas fechadas às 05h30 com o 1º turno começando às 06h00: mantendo o cadastro
elas vão para o 3º turno; desconsiderando o 3º turno elas entram no 1º, sem virar
hora extra. O período continua **totalmente coberto** — nenhum minuto e nenhum
registro desaparece, o que é verificado em `tests/turnos.test.mjs`.

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
