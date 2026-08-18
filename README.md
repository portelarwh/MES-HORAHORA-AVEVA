# MES Hora a Hora — AVEVA

Ferramenta local que transforma a exportação bruta do contador do **AVEVA
Historian** em análise de produção: fechamento por turno, análise hora a hora,
cada caixa registrada, OEE por base declarada, separação entre parada e ausência
de dados, qualidade da coleta e relatórios prontos para envio.

Roda inteiramente no navegador. Nenhum dado sai da máquina de quem usa.

**[▶ Abrir a versão publicada](https://portelarwh.github.io/MES-HORAHORA-AVEVA/)** · **[⬇ Baixar arquivo único](dist/mes-horahora.html)**

---

## O problema

O historian entrega uma tabela de duas colunas — carimbo de tempo e valor
acumulado de um contador. Ela não diz quanto se produziu por hora, não sabe o que
é um turno, não conhece a velocidade da máquina e não distingue “a máquina parou”
de “eu deixei de gravar”. Transformar isso em indicador dá trabalho manual toda
vez, e o trabalho manual não sobrevive à auditoria.

Esta ferramenta faz essa ponte com o critério explícito e visível na tela.

## O que ela entrega

| Recurso | Descrição |
| --- | --- |
| Importação histórica | Vários arquivos de uma vez, gravados por máquina e por dia em IndexedDB. Reimportar período já carregado não duplica: a mesclagem é por carimbo de tempo. |
| Janela exata | Filtro por **data e horário** inicial e final. Todo cálculo respeita o intervalo escolhido, inclusive quando ele começa ou termina no meio da hora. |
| Filtros rápidos | Turno atual, hoje, ontem, últimas 24 h, últimos 7 dias, este mês. |
| Base de máquinas | Cada máquina define o que um incremento representa (1 peça ou lote de X), capacidade e meta em peças por hora. |
| Turnos | Aceitam virada de meia-noite, são recortados na janela e nunca se sobrepõem. Seletor decide se um turno é desconsiderado e anexado ao seguinte. |
| Meta proporcional | A meta acompanha a base escolhida. Por padrão a base vai da primeira à última marcação do contador — a linha começa a produzir quando a primeira caixa é contada, não quando o relógio do filtro vira. |
| OEE em cinco leituras | Entre marcações (padrão), programado, observado, operacional e parcial — com a base sempre declarada junto do número. |
| Contador de próxima unidade | A leitura do historian indica a **próxima** caixa: leitura 21 com contagem iniciando em 1 são 20 caixas prontas. O cartão “Contagem do contador” mostra as leituras para conferência contra o painel da máquina. |
| Contagem sem perda | A primeira marcação é só a referência; da segunda em diante todo delta conta, no carimbo em que foi registrado. A soma dos deltas fecha com a diferença das leituras. Incrementos vindos depois de uma lacuna são contados e marcados como *data incerta*. |
| Turno de limpeza | O turno desconsiderado entrega sua produção ao turno seguinte sem entregar as horas: quem recebe as caixas adiantadas conta a produção e continua medido pelo próprio horário cadastrado. |
| Parada ≠ ausência de dados | Dois limiares separam “a máquina parou” de “o historian não gravou”. Falta de dado nunca vira parada. |
| Qualidade dos dados | Cobertura, resets, deltas maiores que 1, registros sem alteração, carimbos repetidos ou fora de ordem, produção não atribuída — com classificação e painel de validação. |
| Registros individuais | Cada marcação do contador com o carimbo original, delta, intervalo e classificação. Expansão por hora mostra só os registros daquela janela. |
| Rastreabilidade | Cada indicador com a fórmula e os números que entraram nela. |
| Cartões selecionáveis | O usuário escolhe o que aparece no resumo; a escolha fica salva. |
| Relatórios | Página A4 executiva para impressão ou PDF, resumo curto para WhatsApp, texto longo para e-mail, e cinco exportações em CSV. |

## Requisitos

- Para **usar**: um navegador atual. Nada mais.
- Para **desenvolver**: Node 18 ou superior, só para os scripts de verificação,
  teste e build. O projeto não tem dependência de runtime nem etapa de bundling.

## Como usar

### Publicado

Ative o GitHub Pages em **Settings → Pages → Source: GitHub Actions**. O workflow
em `.github/workflows/pages.yml` publica a pasta `src/` a cada push na `main`.

### Local, sem servidor

Baixe [`dist/mes-horahora.html`](dist/mes-horahora.html) e abra com duplo clique.
É um arquivo só, com todo o CSS e JS embutidos — a forma indicada para uso no chão
de fábrica, onde nem sempre há servidor ou rede liberada.

### Desenvolvimento

```bash
git clone https://github.com/portelarwh/MES-HORAHORA-AVEVA.git
cd MES-HORAHORA-AVEVA

npm run dev      # servidor local em http://localhost:5173
npm run check    # sintaxe, referências, ids únicos e botões sem handler
npm test         # testes automatizados das fórmulas
npm run build    # regenera dist/mes-horahora.html
npm run verify   # check + test + build, na ordem
```

Não há `npm install`: o projeto não tem dependências. O `npm run dev` usa `npx serve`
só como servidor estático — qualquer outro serve igual, inclusive
`python3 -m http.server`.

## Primeiros passos na ferramenta

1. **Máquinas** — cadastre o equipamento. Informe se cada incremento do contador é
   uma peça ou um lote, e quantas peças por lote. Capacidade e meta são sempre em
   peças por hora.
2. **Turnos** — use o botão de três turnos padrão e ajuste os horários.
3. **Importar** — solte os CSV. Com mais de uma máquina cadastrada, a ferramenta
   pergunta de qual é o arquivo.
4. **Análise** — escolha o período (data **e** horário), a base de cálculo, as
   máquinas, e clique em Atualizar.

Há um arquivo de exemplo em
[`samples/EXEMPLO_LINHA_01.csv`](samples/EXEMPLO_LINHA_01.csv) com 8 horas de
dados sintéticos no mesmo formato do historian.

### Formato esperado do arquivo

Duas colunas: uma de tempo e uma com o valor acumulado do contador.

```csv
Time,VAEB01_MES_GoodCount
8/17/2026 6:24:46.857 AM,1006194
8/17/2026 6:25:31.204 AM,1006195
```

Separador, decimal, BOM, aspas e formato de data são detectados sozinhos, com
possibilidade de forçar manualmente. Detalhes e diagnóstico de arquivos que não
entram em [`docs/FORMATO-CSV.md`](docs/FORMATO-CSV.md).

## Como os números são apurados

O resumo está abaixo; as fórmulas completas, com exemplos que podem ser refeitos
na mão, estão em **[`docs/calculos.md`](docs/calculos.md)**.

### Turnos

Cadastrados por horário de início e fim, aceitam virada de meia-noite. As
ocorrências são geradas dia a dia, recortadas na janela selecionada e garantidas
sem sobreposição — nenhum registro entra em dois turnos. Cada linha traz o status:
fechado, em andamento, ainda não começou, recortado pelo filtro ou sem dados.

### A primeira marcação é referência, não produção

A primeira marcação de um período não tem delta próprio: ela é o ponto de
partida. A contagem começa na **segunda marcação** e, daí em diante, **todo
delta conta**, no carimbo em que o historian o registrou.

Isso vale mesmo quando a marcação de referência está fora da janela. Puxando o
dia 17/08, a última marcação de 16/08 serve de referência e o incremento
registrado no dia 17 pertence ao dia 17.

Quando o incremento vem logo depois de uma lacuna de dados, ou do registro
anterior à janela, a **quantidade** é certa mas o **instante** é incerto. Ele é
contado assim mesmo e fica marcado como *data incerta* no painel de qualidade e
na lista de registros. O seletor **“Contagem dos incrementos”** permite trocar
para o modo estrito, em que esses incrementos ficam fora da produção e são
reportados como *não atribuídos*.

### O contador indica a próxima caixa

A leitura do historian não diz quantas caixas ficaram prontas: diz **qual é a
próxima**. Com a contagem iniciando em 1, a leitura `1` significa nenhuma caixa
concluída e a leitura `21` significa 20. O campo *“Contador indica a próxima —
contagem inicia em”*, no cadastro da máquina, guarda esse valor; ele é aplicado
em todo reinício de contagem e aparece no cartão **Contagem do contador**, com a
primeira e a última leitura do período.

Em resumo: a primeira marcação não é o início da produção, é a contagem da
primeira peça.

### Turno desconsiderado — o turno de limpeza

O seletor **“Turno desconsiderado”** existe para o turno que não é produtivo. Ele
deixa de existir como linha do fechamento, e a regra tem duas metades:

- a **produção** dele vai para o turno seguinte — as caixas adiantadas são
  trabalho entregue e pertencem a quem recebe o turno;
- as **horas** dele **não** vão — cobrar meta e OEE por horas de limpeza puniria
  o turno seguinte por um tempo em que ninguém deveria estar produzindo.

Se o pessoal do 3º turno fecha 20 caixas entre 05:00 e 06:00, o 1º turno começa
com 20 na conta e continua sendo medido das 06:00 às 14:20. A linha recebe a
marca *+ turno anexado* e a coluna **Adiantadas** mostra quantas vieram de antes.

Consequência: com um turno desconsiderado, a soma das horas do fechamento fica
menor que o período, exatamente pelas horas retiradas. A soma das caixas continua
igual — nada é duplicado nem perdido.

### Os tempos

```
período selecionado = fim − início do filtro
tempo com dados     = trechos do período cobertos por registros
tempo sem dados     = período − tempo com dados          (nunca é parada)
tempo parado        = intervalos entre os dois limiares
```

E as cinco bases: `marcações` (primeira → última marcação − abono, **padrão**),
`programado` (período − abono), `observado` (com dados − abono), `operacional`
(observado − paradas) e `parcial` (início do período até a última marcação −
abono).

### Produção, meta e OEE

```
peças              = incrementos × peças por incremento
meta proporcional  = meta (peças/h) × base ÷ 60
atingimento        = peças ÷ meta proporcional
planejado          = capacidade (peças/h) × base ÷ 60
OEE                = peças ÷ planejado
```

| Leitura | Base do denominador |
| --- | --- |
| OEE entre marcações | primeira → última marcação − abono |
| OEE programado | período selecionado − abono |
| OEE observado | tempo com dados − abono |
| OEE operacional | observado − paradas detectadas |
| OEE parcial | início do período até a última marcação |

O OEE parcial serve para turno em andamento: não pune por horas que ainda não
aconteceram. A base usada aparece sempre junto do número.

### Parada e ausência de dados

Cada intervalo entre dois registros é classificado por dois limiares
configuráveis: até 3 min é operação normal, entre 3 e 30 min é **parada
detectada**, acima de 30 min é **ausência de dados**. O tempo sem dados fica fora
do denominador observado e nunca é lançado como parada.

### Quando um indicador não pode ser calculado

Aparece **“—”**, nunca 0%. Zero por cento só aparece quando a conta foi feita e
deu zero.

## Armazenamento

### IndexedDB

Banco `monitor-hh`, **versão 1** — não alterada nesta revisão. Quatro stores:
`maquinas`, `turnos`, `ajustes` e `dias`. Os registros do contador ficam em `dias`,
com a chave `maquinaId|AAAA-MM-DD`, o que permite ler apenas a faixa de datas da
análise em vez da base inteira.

Bases criadas por versões anteriores continuam sendo lidas sem conversão.

### Configurações

Ficam no `localStorage`, separadas dos dados de produção:

| Chave | Conteúdo |
| --- | --- |
| `hh-tema` | claro ou escuro |
| `hh-prefs` | cartões visíveis, seções, base de cálculo, limiares, horários do filtro, turno desconsiderado, atualização automática |

Apagar a base de produção não mexe nas preferências, e vice-versa.

### Backup

**Base de dados → Exportar backup** gera um JSON com máquinas, turnos,
lançamentos, todos os dias de registros e, em campo separado, as preferências.
A restauração **mescla** por carimbo de tempo, então restaurar duas vezes não
duplica nada. Backups de versões anteriores, sem o campo de preferências, são
restaurados normalmente.

Guarde o arquivo fora do repositório: a base local vive no navegador e some se o
cache for limpo.

## Limitações conhecidas

- **Produção não atribuída.** Incrementos que aparecem depois de uma lacuna não
  entram na produção do período: não há como afirmar em que momento foram
  produzidos. A quantidade é reportada no painel de qualidade em vez de ser
  distribuída em horários inventados.
- **Paradas vêm do contador**, não do apontamento. Ausência de incremento pode ser
  máquina parada ou cadência abaixo do limiar. Confronte com o MES antes de
  transformar em indicador formal.
- **OEE não é a decomposição clássica** em disponibilidade × performance ×
  qualidade. É a razão entre o produzido e o que a velocidade nominal entregaria
  na base escolhida.
- **Fontes por CDN.** A tipografia vem do Google Fonts. Em rede que bloqueia o
  domínio a página funciona com as fontes de sistema, mas o navegador registra o
  bloqueio no console.
- **Um contador por máquina.** Não há suporte a múltiplas tags por equipamento.
- **Sem fonte de dados externa.** A leitura é por arquivo; não há conexão direta
  ao historian.

## Próximas melhorias planejadas

- Virtualização da lista de registros para períodos de vários meses, hoje resolvida
  por carregamento progressivo em blocos.
- Comparação entre períodos equivalentes (turno contra o mesmo turno da véspera).
- Motivos de parada vindos de arquivo, para casar automaticamente com as paradas
  detectadas.
- Exportação do relatório executivo em PDF sem passar pela caixa de impressão.

## Aviso sobre dados

Este repositório é **público**. Não versione exportações reais de produção: o
`.gitignore` bloqueia `*.csv` fora de `samples/`, e backups `.json` da ferramenta
também estão bloqueados.

Os números produzidos aqui derivam de um contador, não do apontamento oficial.

## Documentação

- [Cálculos, com exemplos verificáveis](docs/calculos.md) — a referência completa das fórmulas
- [Métricas — visão rápida](docs/METRICAS.md) — o resumo de uma página
- [Formato do CSV](docs/FORMATO-CSV.md) — o que a leitura aceita e como resolver arquivos que não entram
- [Arquitetura](docs/ARQUITETURA.md) — organização das pastas, ordem de carregamento e modelo de dados

## Licença

[MIT](LICENSE).
