/* 75-export.js — Exportações em CSV. Toda exportação usa exatamente a mesma
   janela, os mesmos limiares e a mesma base de cálculo da tela: o arquivo
   nunca traz um recorte diferente do que o usuário está vendo. */
"use strict";

const csvTxt=v=>{const s=String(v??'');return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvNum=(v,d)=>v==null||!Number.isFinite(v)?'':v.toFixed(d===undefined?2:d).replace('.',',');
const csvPct=r=>r==null?'':(r*100).toFixed(1).replace('.',',');
const csvData=ms=>ms==null?'':dtBR(ms);

function baixarCSV(nome,linhas){
  const txt='﻿'+linhas.map(r=>r.map(csvTxt).join(';')).join('\r\n');
  const a=document.createElement('a');
  const url=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));
  a.href=url;a.download=nome;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function sufixoJanela(){
  const f=ms=>iso(new Date(ms))+'_'+hhmm(new Date(ms)).replace(':','');
  return f(LAST.ini)+'-'+f(LAST.fim);
}
const cabecalhoJanela=()=>[
  ['Periodo_inicio',dtBR(LAST.ini)],['Periodo_fim',dtBR(LAST.fim)],
  ['Base_de_calculo',rotuloBase(LAST.base)],
  ['Contagem_dos_incrementos',rotuloContagem(LAST.contagem)],
  ['Limiar_parada_min',csvNum(LAST.lim,1)],['Limiar_sem_dados_min',csvNum(LAST.limSD,1)],
  ['Turno_desconsiderado',LAST.excl?(TUR.find(t=>t.id===LAST.excl)||{}).nome||LAST.excl:'nenhum'],
  ['Gerado_em',dtBR(LAST.geradoEm.getTime())],[]
];

const COLS_METRICA=['Registros','Incrementos','Pecas','Adiantadas_inc',
  'Fora_de_turno_inc','Data_incerta_inc','Borda_inc','Nao_atribuido',
  'Leitura_inicial','Leitura_final','Contagem_inicia_em',
  'Catalogos','Familias','Meta_OEE_%','Atencao_OEE_%','Meta_efetiva_pecas_h','Meta_pecas','Atingimento_%','Planejado_pecas','OEE_base_%',
  'OEE_marcacoes_%','OEE_turno_%','OEE_programado_%','OEE_observado_%','OEE_operacional_%','OEE_parcial_%',
  'Periodo_min','Com_dados_min','Sem_dados_min','Parado_min','Abono_min',
  'Marcacoes_min','Turno_cadastrado_min','Programado_min','Observado_min','Operacional_min','Parcial_min',
  'Cobertura_%','Disponibilidade_%','Ritmo_pecas_h','Intervalo_s'];
const linhaMetrica=l=>[nf0(l.regs),nf0(l.inc),nf0(l.pcs),nf0(l.incAbsorvido),
  nf0(l.incForaTurno),nf0(l.incAposLacuna),nf0(l.incBorda),nf0(l.naoAtrib),
  nf0(l.leituraIni),nf0(l.leituraFim),nf0(l.contagemInicial),
  (l.catalogos||[]).map(k=>k.numero||'sem catalogo').join(' + '),
  (l.familias||[]).map(f=>f.familia||'sem familia').join(' + '),
  csvPct(l.alvoOee),csvPct(l.atencaoOee),csvNum(l.metaEfetiva,0),
  csvNum(l.planMetaBase,0),csvPct(l.atingBase),csvNum(l.planCapBase,0),csvPct(l.oeeBase),
  csvPct(l.oee.marcacoes),csvPct(l.oee.turno),csvPct(l.oee.programado),csvPct(l.oee.observado),
  csvPct(l.oee.operacional),csvPct(l.oee.parcial),
  csvNum(l.dur,1),csvNum(l.comDados,1),csvNum(l.semDados,1),csvNum(l.parado,1),csvNum(l.abono,1),
  csvNum(l.marcacoes,1),csvNum(l.turno,1),csvNum(l.programado,1),csvNum(l.observado,1),
  csvNum(l.operacional,1),csvNum(l.parcial,1),
  csvPct(l.cobertura),csvPct(l.disp),csvNum(l.ritmo,0),csvNum(l.interv,1)];
const nf0=v=>v==null||!Number.isFinite(v)?'':String(Math.round(v));

function exportarCSV(tipo){
  if(!LAST){toast('Rode a análise primeiro');return}
  const L=cabecalhoJanela().slice();
  let nome='producao';
  if(tipo==='periodo'){
    nome='periodo';
    L.push(['Maquina','Inicio','Fim',...COLS_METRICA]);
    for(const A of LAST.AS)L.push([A.maq.nome,dtBR(LAST.ini),dtBR(LAST.fim),...linhaMetrica(A.tot)]);
  }else if(tipo==='turno'){
    nome='turnos';
    L.push(['Maquina','Dia','Turno','Status','Anexado','Recortado',
      'Tempo_inicio','Tempo_fim','Producao_inicio','Producao_fim',...COLS_METRICA]);
    for(const A of LAST.AS)for(const l of A.turnos)
      L.push([A.maq.nome,l.bk.dia,l.bk.rot,l.status.rot,l.bk.anexado?'sim':'nao',
        l.bk.recortado?'sim':'nao',dtBR(l.a),dtBR(l.b),dtBR(l.pa),dtBR(l.pb),...linhaMetrica(l)]);
  }else if(tipo==='hora'){
    nome='horas';
    L.push(['Maquina','Inicio','Fim','Hora_cheia',...COLS_METRICA]);
    for(const A of LAST.AS)for(const l of A.horas)
      L.push([A.maq.nome,dtBR(l.a),dtBR(l.b),l.bk.parcial?'nao':'sim',...linhaMetrica(l)]);
  }else if(tipo==='registros'){
    nome='registros';
    L.push(['Maquina','Data_hora','Contador','Delta','Pecas','Intervalo_s','Classificacao','Contabilizado']);
    for(const A of LAST.AS)for(const r of registrosDe(A)){
      const e=r.ev;
      L.push([A.maq.nome,csvData(r.t),nf0(r.valor),e?nf0(e.delta):'',
        e?nf0(e.contabiliza?e.delta*A.pc:0):'',e?csvNum(e.gapS,1):'',
        r.marcas.map(m=>CLS_REG[m][0]).join(' + '),e?(e.contabiliza?'sim':'nao'):'']);
    }
  }else if(tipo==='paradas'){
    nome='paradas';
    L.push(['Maquina','Tipo','Inicio','Fim','Duracao_min','Pecas_equivalentes']);
    for(const A of LAST.AS){
      for(const p of A.paradas)L.push([A.maq.nome,'Parada detectada',dtBR(p.a),dtBR(p.b),
        csvNum(p.min,1),nf0(A.maq.cap>0?p.min/60*A.maq.cap:null)]);
      for(const g of A.lacunas)L.push([A.maq.nome,'Ausencia de dados',dtBR(g.a),dtBR(g.b),
        csvNum(g.min,1),'']);
    }
  }else return;
  baixarCSV('mes-'+nome+'-'+sufixoJanela()+'.csv',L);
  toast('CSV gerado com a janela e os filtros da tela');
}
