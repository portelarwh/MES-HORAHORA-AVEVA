# Métricas — visão rápida

Este arquivo é o resumo. As fórmulas completas, com exemplos que podem ser
refeitos na mão, estão em **[calculos.md](calculos.md)**.

## O que a ferramenta mede

| Indicador | Fórmula | Observação |
| --- | --- | --- |
| Produção | incrementos × peças por incremento | incremento vem do cadastro da máquina |
| Meta proporcional | meta (peças/h) × base ÷ 60 | acompanha a base escolhida |
| Atingimento | peças ÷ meta proporcional | “—” quando a meta não está cadastrada |
| OEE | peças ÷ (capacidade × base ÷ 60) | quatro leituras, uma por base |
| Disponibilidade | tempo rodando ÷ tempo observado | |
| Cobertura de dados | tempo com dados ÷ período | mede a confiança, não o desempenho |
| Ritmo médio | peças ÷ tempo com dados (h) | |
| Intervalo entre incrementos | tempo com dados (s) ÷ incrementos | segundos por caixa |

## As bases de cálculo

Todo indicador que divide por tempo declara **contra o que** foi medido:

| Base | Denominador | Responde a |
| --- | --- | --- |
| Período selecionado | período − abono | quanto entregou do que o relógio permitia |
| Janela com dados | tempo com dados − abono | quanto entregou enquanto era observada |
| Tempo rodando | observado − paradas | quanto entregou enquanto de fato rodava |
| Até o último registro | última marcação − início do período | como está indo até agora |

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
