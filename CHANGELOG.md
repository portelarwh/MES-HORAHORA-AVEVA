# Registro de mudanças

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

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
