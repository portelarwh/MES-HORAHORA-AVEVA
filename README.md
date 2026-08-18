# MES Hora a Hora — AVEVA

Ferramenta local que transforma a exportação bruta do contador do **AVEVA Historian** em análise de produção hora a hora: OEE, fechamento por turno, detecção de paradas e relatórios prontos para envio.

Roda inteiramente no navegador. Nenhum dado sai da máquina de quem usa.

**[▶ Abrir a versão publicada](https://portelarwh.github.io/MES-HORAHORA-AVEVA/)** · **[⬇ Baixar arquivo único](dist/mes-horahora.html)**

---

## O problema

O historian entrega uma tabela de duas colunas — carimbo de tempo e valor acumulado de um contador. Ela não diz quanto se produziu por hora, não sabe o que é um turno, não conhece a velocidade da máquina e trata qualquer intervalo sem incremento como silêncio. Transformar isso em indicador dá trabalho manual toda vez, e o trabalho manual não sobrevive à auditoria.

Esta ferramenta faz essa ponte com o critério explícito e visível na tela.

## O que ela entrega

| Recurso | Descrição |
| --- | --- |
| Importação histórica | Vários arquivos de uma vez, gravados por máquina e por dia em IndexedDB. Reimportar período já carregado não duplica: a mesclagem é por carimbo de tempo. |
| Base de máquinas | Cada máquina define o que um incremento representa (1 peça ou lote de X), capacidade e meta em peças por hora. |
| Turnos | Aceitam virada de meia-noite. Seletor decide se a produção de borda fica no turno que a cobre ou é anexada ao turno seguinte. |
| OEE | `produzido ÷ (capacidade × tempo disponível)`, com variante parcial que usa a janela até o último registro — serve para turno em andamento. |
| Detecção de paradas | Intervalos sem incremento acima de um limiar configurável, recortados na virada de cada período. |
| Lançamentos manuais | Abono, hora extra, parada justificada, refugo e retrabalho. |
| Comparação entre máquinas | Séries sobrepostas na mesma linha do tempo, com faixa de cadência por máquina. |
| Relatórios | Página A4 executiva para impressão ou PDF, resumo curto para WhatsApp e texto longo para e-mail. |

## Como usar

### Publicado

Ative o GitHub Pages em **Settings → Pages → Source: GitHub Actions**. O workflow em `.github/workflows/pages.yml` publica a pasta `src/` a cada push na `main`.

### Local, sem servidor

Baixe [`dist/mes-horahora.html`](dist/mes-horahora.html) e abra com duplo clique. É um arquivo só, com todo o CSS e JS embutidos — a forma indicada para uso no chão de fábrica, onde nem sempre há servidor ou rede liberada.

### Desenvolvimento

```bash
git clone https://github.com/portelarwh/MES-HORAHORA-AVEVA.git
cd MES-HORAHORA-AVEVA

npm run dev      # servidor local em http://localhost:5173
npm run check    # sintaxe dos módulos e referências no index.html
npm run build    # regenera dist/mes-horahora.html
```

Não há dependências de runtime nem etapa de bundling: o `src/` são arquivos estáticos que o navegador carrega direto. O Node só é usado pelos scripts de build e verificação.

## Primeiros passos na ferramenta

1. **Máquinas** — cadastre o equipamento. Informe se cada incremento do contador é uma peça ou um lote, e quantas peças por lote. Capacidade e meta são sempre em peças por hora.
2. **Turnos** — use o botão de três turnos padrão e ajuste os horários.
3. **Importar** — solte os CSV. Com mais de uma máquina cadastrada, a ferramenta pergunta de qual é o arquivo.
4. **Análise** — escolha o período, as máquinas e clique em Atualizar.

Há um arquivo de exemplo em [`samples/EXEMPLO_LINHA_01.csv`](samples/EXEMPLO_LINHA_01.csv) com 8 horas de dados sintéticos no mesmo formato do historian.

## Documentação

- [Métricas e critérios de cálculo](docs/METRICAS.md) — como OEE, tempo disponível, atingimento e paradas são apurados
- [Formato do CSV](docs/FORMATO-CSV.md) — o que a leitura aceita e como resolver arquivos que não entram
- [Arquitetura](docs/ARQUITETURA.md) — organização das pastas, ordem de carregamento e modelo de dados

## Aviso sobre dados

Este repositório é **público**. Não versione exportações reais de produção: o `.gitignore` bloqueia `*.csv` fora de `samples/`, e backups `.json` da ferramenta também estão bloqueados. A base local vive no IndexedDB do navegador e some se o cache for limpo — use **Base de dados → Exportar backup** com regularidade e guarde o arquivo fora do repositório.

Os números produzidos aqui derivam de um contador, não do apontamento oficial. As paradas detectadas vêm da ausência de incremento e devem ser confrontadas com o MES antes de virarem indicador formal.

## Licença

[MIT](LICENSE).
