# Métricas — visão rápida

Este arquivo é o resumo. As fórmulas completas, com exemplos que podem ser
refeitos na mão, estão em **[calculos.md](calculos.md)**.

## O que a ferramenta mede

| Indicador | Fórmula | Observação |
| --- | --- | --- |
| Produção | incrementos × peças por incremento | o contador indica a próxima unidade: leitura − início da contagem |
| Meta proporcional | meta efetiva (peças/h) × base ÷ 60 | a meta efetiva vem do catálogo da hora |
| Atingimento | peças ÷ meta proporcional | “—” quando a meta não está cadastrada |
| OEE | peças ÷ (capacidade × base ÷ 60) | quatro leituras, uma por base |
| Disponibilidade | tempo rodando ÷ tempo observado | |
| Cobertura de dados | tempo com dados ÷ período | mede a confiança, não o desempenho |
| Ritmo médio | peças ÷ tempo com dados (h) | |
| Tempo de ciclo médio | tempo rodando (s) ÷ incrementos | desconta as paradas; comparado com o nominal do cadastro |
| Intervalo entre incrementos | tempo com dados (s) ÷ incrementos | segundos por caixa |

## As bases de cálculo

Todo indicador que divide por tempo declara **contra o que** foi medido:

| Base | Denominador | Responde a |
| --- | --- | --- |
| Da primeira à última marcação | última − primeira marcação − abono | quanto entregou enquanto esteve contando (**padrão**) |
| Tempo cadastrado do turno | horas de turno no período − abono | quanto entregou do que a escala previa; produção fora de turno entra como bônus |
| Período selecionado | período − abono | quanto entregou do que o relógio permitia |
| Janela com dados | tempo com dados − abono | quanto entregou enquanto era observada |
| Tempo rodando | observado − paradas | quanto entregou enquanto de fato rodava |
| Até o último registro | última marcação − início do período | como está indo até agora |

## Meta de OEE

Mora na **família** do catálogo, com **vigência por período**. Cada hora resolve
a própria meta pela data daquela hora. Verde acima da meta, âmbar entre atenção e
meta, vermelho abaixo, **neutro sem meta cadastrada**. Um recorte que atravessa
duas vigências usa a média ponderada pelos minutos.

## Catálogos

A meta por hora vem do catálogo programado para ela; sem programação, do catálogo
padrão da máquina; sem catálogo, da meta cadastrada na própria máquina. Quando o
recorte atravessa catálogos diferentes, a meta é a média das metas horárias
ponderada pelos minutos.

## A primeira marcação é referência

Ela não tem delta próprio. A contagem começa na segunda marcação e, daí em
diante, todo delta conta no carimbo em que foi registrado — a soma dos deltas
fecha com a diferença entre a primeira e a última leitura. Incrementos vindos
depois de uma lacuna, ou do registro anterior à janela, são contados e marcados
como **data incerta**. O seletor *Contagem dos incrementos* permite deixá-los de
fora, quando a localização no tempo importa mais que o total.

## Turno desconsiderado

O turno não produtivo (limpeza) entrega a **produção** ao turno seguinte, mas não
as **horas**. Cada linha do fechamento passa a ter duas janelas: a de tempo é o
horário cadastrado do turno e vale como denominador; a de produção é estendida
sobre o turno anexado e vale como numerador.

## Parada não é ausência de dados

Dois limiares classificam cada intervalo entre registros:

- até o **limiar de parada** (3 min por padrão): máquina rodando;
- entre os dois limiares: **parada detectada**;
- acima do **limiar de ausência de dados** (30 min por padrão): **sem dados**.

Tempo sem dados fica fora do tempo observado e **nunca** é lançado como parada.
Falta de informação é falta de informação.

## Quando o indicador não pode ser calculado

Aparece **“—”**, nunca 0%. Zero por cento significa que a conta foi feita e deu
zero: houve tempo disponível e não houve produção.

## Onde a conta está implementada

`src/js/40-metrics.js`, módulo puro sem acesso ao DOM, coberto por
`tests/metrics.test.mjs`, `tests/turnos.test.mjs` e `tests/qualidade.test.mjs`.
A tela lê o resultado e não refaz nenhuma conta.
