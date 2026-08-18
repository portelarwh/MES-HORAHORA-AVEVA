# Formato do CSV

A ferramenta lê a exportação padrão do AVEVA Historian e tolera boa parte das variações que
aparecem entre configurações regionais e versões de cliente.

## Mínimo necessário

Duas colunas: uma de tempo e uma com o valor acumulado do contador.

```csv
Time,VAEB01_MES_GoodCount
8/17/2026 6:24:46.857 AM,1006194
8/17/2026 6:25:31.204 AM,1006195
8/17/2026 6:27:00.881 AM,1006198
```

O contador precisa ser **acumulado e monotônico** dentro do lote. Valores fracionários indicam que
o historian está interpolando em modo analógico em vez de degrau — a ferramenta avisa quando
encontra.

## O que é detectado sozinho

| Item | Tratamento |
| --- | --- |
| Separador | Vírgula ou ponto e vírgula, pelo que for mais frequente no cabeçalho |
| Coluna de tempo | Primeira cujo nome contenha `time`, `data`, `hora`, `date` ou `stamp` |
| Coluna de valor | Primeira coluna numérica diferente da de tempo |
| Decimal | Ponto ou vírgula, inclusive com separador de milhar |
| BOM UTF-8 | Removido |
| Aspas | Campos entre aspas, com aspas duplicadas escapadas |
| Fim de linha | CRLF, LF ou CR |

Se o cabeçalho da sua exportação fugir do padrão, escolha as colunas manualmente na aba
**Importar** antes de soltar o arquivo.

## Formatos de data aceitos

```
8/17/2026 6:24:46.857 AM      MM/DD/AAAA com AM/PM   (padrão en-US do Historian)
17/08/2026 06:24:46,857       DD/MM/AAAA 24h         (regional pt-BR)
2026-08-17 06:24:46.857       ISO
2026-08-17T06:24:46.857Z      ISO com T
```

A detecção automática procura um dia acima de 12 para desambiguar `MM/DD` de `DD/MM`. Quando não
encontra — exportações curtas nos primeiros doze dias do mês —, assume `MM/DD` se houver AM/PM e
`DD/MM` caso contrário. Em caso de dúvida, force o formato no seletor da aba Importar.

Milissegundos e segundos são opcionais.

## Vários arquivos e histórico

Solte quantos arquivos quiser de uma vez. Cada um é dividido por dia e gravado com a chave
`máquina + data`, então um arquivo que atravessa a meia-noite se separa sozinho.

A mesclagem é por carimbo de tempo: reimportar um período já carregado não duplica nada. O log
mostra quantos registros eram realmente novos, o que serve para conferir se a exportação trouxe o
que se esperava.

Carimbos repetidos e linhas fora de ordem não impedem a leitura: a série é ordenada antes do
cálculo, o último valor prevalece em caso de empate, e as duas ocorrências são contadas no painel
de **Qualidade dos dados** da análise. A série montada não é quebrada na meia-noite, então um
incremento entre 23h59 e 00h01 é contabilizado normalmente.

Não há limite prático de tamanho de janela. O armazenamento é IndexedDB, não `localStorage`.

## Quando o arquivo não entra

| Sintoma | Causa provável |
| --- | --- |
| "nenhum registro válido" | Formato de data não reconhecido, ou colunas trocadas |
| Muitas linhas ignoradas | Rodapé de resumo no arquivo, ou linhas de qualidade sem valor |
| Produção zerada | Coluna de valor apontando para uma tag que não é o contador |
| Valores quebrados | Historian interpolando em modo analógico |
| Datas embaralhadas | Ambiguidade `MM/DD` × `DD/MM` — force o formato no seletor |

## Exemplo

[`samples/EXEMPLO_LINHA_01.csv`](../samples/EXEMPLO_LINHA_01.csv) tem oito horas de dados
sintéticos, com paradas plantadas e queda gradual de cadência, no formato en-US do historian.
Serve para conhecer a ferramenta sem expor dado real.
