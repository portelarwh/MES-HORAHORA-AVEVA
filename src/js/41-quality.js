/* 41-quality.js — Qualidade dos dados e painel de validação. Módulo puro.

   A qualidade não julga a produção: julga o quanto dá para confiar nos números
   apresentados. Um turno com OEE alto e cobertura de 40% é um turno sem dados,
   não um turno bom. */
"use strict";

const QUAL_ROT={boa:'Boa',aceitavel:'Aceitável',ruim:'Ruim',sem:'Sem dados'};
const QUAL_CLASSE={boa:'g',aceitavel:'w',ruim:'r',sem:'n'};

function qualidade(A,t){
  const o=A.origem||{duplicados:0,foraDeOrdem:0,frac:0};
  const graves=(o.frac>0?1:0)+(o.foraDeOrdem>0?1:0)+(t.naoAtrib>0?1:0)+(t.incAposLacuna>0?1:0);
  const cob=t.cobertura;                 // null quando o período tem duração zero
  let classe;
  if(!t.regs)classe='sem';
  else if(cob!=null&&cob>=.98&&!graves)classe='boa';
  else if(cob!=null&&cob>=.85&&graves<=1)classe='aceitavel';
  else classe='ruim';
  return{classe,rotulo:QUAL_ROT[classe],cor:QUAL_CLASSE[classe],cobertura:cob,
    registros:t.regs,incrementos:t.inc,semAlteracao:t.semAlt,resets:t.resets,
    naoAtribuido:t.naoAtrib,dataIncerta:(t.incAposLacuna||0)+(t.incBorda||0),
    aposLacuna:t.incAposLacuna||0,naBorda:t.incBorda||0,
    lacunas:t.nLac,minutosSemDados:t.semDados,
    duplicados:o.duplicados,foraDeOrdem:o.foraDeOrdem,fracionados:o.frac,
    deltasMaiores:A.deltasMaiores||0};
}

/* Lista de validações do período. nivel: 'crit' | 'aten' | 'info' */
function validacoes(A,t,ctx){
  const V=[],c=A.maq,q=qualidade(A,t);
  const add=(nivel,codigo,titulo,detalhe)=>V.push({nivel,codigo,titulo,detalhe,maquina:c.nome});

  if(!t.regs)
    add('crit','SEM-DADOS','Nenhum registro no período selecionado',
      'A janela escolhida não tem marcação do contador. Nenhum indicador de produção é calculável.');
  else if(q.cobertura!=null&&q.cobertura<.85)
    add('crit','COBERTURA','Cobertura de dados em '+fmtPct(q.cobertura),
      'Só '+hDur(t.comDados)+' das '+hDur(t.dur)+' do período têm registro. '
      +'O tempo sem dados não foi contado como parada nem como produção.');
  else if(q.cobertura!=null&&q.cobertura<.98)
    add('aten','COBERTURA','Cobertura de dados em '+fmtPct(q.cobertura),
      hDur(t.semDados)+' do período sem registro, em '+t.nLac+' lacuna(s).');

  if(t.naoAtrib>0)
    add('aten','NAO-ATRIBUIDO',nf(t.naoAtrib)+' incrementos não atribuídos',
      'Vieram depois de uma lacuna ou do registro anterior à janela, sem como afirmar em que momento foram produzidos, '
      +'e o modo de contagem escolhido os deixa fora da produção. Para somá-los, troque a contagem para '
      +'“todo incremento conta, a partir da segunda marcação”.');
  if(t.incAposLacuna>0)
    add('aten','DATA-INCERTA',nf(t.incAposLacuna)+' incrementos com data incerta',
      'Apareceram no primeiro registro depois de uma ausência de dados de '+hDur(t.semDados)+' no total. '
      +'Estão contados na produção, no carimbo em que o historian os registrou, mas o instante real da produção '
      +'está em algum ponto da lacuna.');
  if(t.incBorda>0)
    add('info','BORDA',nf(t.incBorda)+' incrementos vindos do registro anterior à janela',
      'O primeiro registro do período trouxe um incremento acumulado desde a marcação anterior, que está fora da janela. '
      +'Está contado aqui porque foi registrado aqui — a primeira marcação em si nunca conta como produção.');

  if(q.fracionados>0)
    add('crit','FRACIONADO',nf(q.fracionados)+' registros com valor quebrado',
      'O contador deveria ser sempre inteiro. Verifique se o historian está interpolando em modo analógico em vez de degrau.');

  if(q.foraDeOrdem>0)
    add('crit','ORDEM',nf(q.foraDeOrdem)+' carimbos fora de ordem no arquivo',
      'A série foi reordenada por carimbo de tempo antes do cálculo, mas a exportação de origem está inconsistente.');

  if(q.duplicados>0)
    add('aten','DUPLICADO',nf(q.duplicados)+' carimbos repetidos',
      'Carimbos iguais foram mesclados, prevalecendo o último valor lido. Reimportação do mesmo período não duplica produção.');

  /* O contador indica a próxima unidade: leitura igual ao início da contagem
     significa nada produzido ainda, e não uma unidade pronta. */
  if(t.leituraIni!=null&&c.offset>0&&t.leituraIni===c.offset)
    add('info','CONTAGEM','O período começa no início da contagem',
      'A primeira leitura é '+nf(t.leituraIni)+', igual ao início cadastrado. Como o contador indica a próxima unidade, '
      +'nada havia sido produzido nesse instante.');
  if(t.incAbsorvido>0)
    add('info','ANTECIPADA',nf(t.incAbsorvido)+' incrementos adiantados absorvidos',
      'Vieram de antes do início do turno, pelo turno desconsiderado. Entram na produção deste turno, '
      +'mas as horas do turno anexado não entram no denominador da meta nem do OEE.');

  if(q.resets>0)
    add('info','RESET',nf(q.resets)+' reinícios de contagem',
      'O contador voltou para trás. O incremento passou a ser o valor lido menos o offset de '+nf(c.offset||0)+' da máquina.');

  if(q.deltasMaiores>0)
    add('info','DELTA','Incrementos maiores que 1 em '+nf(q.deltasMaiores)+' registros',
      'Registrados no carimbo real em que apareceram. Nenhum horário intermediário foi criado para distribuí-los.');

  if(!(c.cap>0))
    add('crit','CAPACIDADE','Capacidade da máquina não cadastrada',
      'Sem capacidade em peças/h não há OEE. O indicador aparece como não calculável.');
  if(!(c.meta>0))
    add('crit','META','Meta da máquina não cadastrada',
      'Sem meta em peças/h não há atingimento. O indicador aparece como não calculável.');

  if(A.tcP10&&c.cap>0){
    const pico=3600/A.tcP10*A.pc;
    if(pico>c.cap*1.02)
      add('aten','PICO','Cadência de pico acima da capacidade cadastrada',
        'A melhor cadência sustentada foi '+nf(pico)+' peças/h contra '+nf(c.cap)+' cadastradas. Enquanto isso não for revisto, o OEE fica otimista.');
  }
  if(A.limParadaMin>=A.limSemDadosMin)
    add('aten','LIMIAR','Limiar de parada maior ou igual ao de ausência de dados',
      'Com os dois limiares colados, toda parada longa é classificada como ausência de dados. Aumente o limiar de ausência.');

  if(ctx&&ctx.turnosSobrepostos)
    add('aten','TURNOS','Turnos cadastrados se sobrepõem',
      'O fim de um turno passa do início do seguinte. As janelas foram recortadas para que nenhum registro entre em dois turnos.');
  if(ctx&&ctx.semTurnos)
    add('info','TURNOS','Nenhum turno cadastrado',
      'O fechamento por turno fica indisponível até que ao menos um turno seja cadastrado.');
  return V;
}

if(typeof module!=='undefined'&&module.exports)module.exports={qualidade,validacoes,QUAL_ROT,QUAL_CLASSE};
