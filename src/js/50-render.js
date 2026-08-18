/* 50-render.js — Cartões, fechamento por turno, qualidade, validação,
   diagnóstico e rastreabilidade. Só monta HTML a partir do que 40/41
   calcularam: nenhuma fórmula é refeita aqui. */
"use strict";

const alvo=(r,a)=>r==null?null:r/a;
const chip=A=>`<span class="tag"><span class="swatch" style="background:${A.maq.cor};margin-right:5px"></span>${esc(A.maq.nome)}</span>`;
const nomeUnid=c=>c.modo==='unidade'?'incremento':c.unid;
const plural=(n,u)=>nf(n)+' '+esc(u)+(n===1?'':'s');

/* --- cartões ------------------------------------------------------------- */
function cardsDe(A){
  const c=A.maq,t=A.tot,q=A.qual,u=nomeUnid(c),bs=rotuloBase(t.base);
  const eqInc=c.modo==='unidade'?'1 incremento = 1 peça':'1 '+esc(u)+' = '+nf(A.pc)+' peças';
  const oeeCard=(id,tit,r,tempo,extra)=>[id,tit,fmtPct(r),
    tempo==null?'base não calculável':'base de '+hDur(tempo),cl(alvo(r,.85)),extra];
  const bonusTurno=t.incForaTurno>0
    ? ' · '+nf(t.pcsForaTurno)+' peças produzidas fora de turno cadastrado entram como bônus' : '';
  const M={
    producao:()=>['producao','Produção',nf(t.pcs)+' peças',plural(t.inc,u),'c',
      eqInc
      +(t.incAbsorvido>0?' · inclui '+nf(t.incAbsorvido)+' '+esc(u)+'s adiantados antes do início do turno':'')
      +(t.incAposLacuna>0?' · '+nf(t.incAposLacuna)+' com data incerta, vindos depois de lacuna':'')
      +(t.naoAtrib>0?' · '+nf(t.naoAtrib)+' incrementos não atribuídos':'')],
    primeiro:()=>['primeiro','Primeira marcação',t.primeiroReg==null?NAO_CALC:dtBR(t.primeiroReg),
      'primeiro registro dentro do período','o',
      t.primeiroReg==null?'nenhum registro na janela'
        :'começou '+hDur((t.primeiroReg-t.a)/60000)+' depois do início do período'],
    ultimo:()=>['ultimo','Última marcação',t.ultimoReg==null?NAO_CALC:dtBR(t.ultimoReg),
      'último registro dentro do período','o',
      t.ultimoReg==null?'nenhum registro na janela'
        :'faltam '+hDur((t.b-t.ultimoReg)/60000)+' para o fim do período'],
    periodo:()=>['periodo','Período selecionado',hDur(t.dur),
      dtBR(t.a,'min')+' → '+dtBR(t.b,'min'),'c','programado '+hDur(t.programado)+' (menos abono)'],
    dados:()=>['dados','Tempo com dados',hDur(t.comDados),'cobertura '+fmtPct(t.cobertura),
      cl(t.cobertura),'observado '+hDur(t.observado)+' · rodando '+hDur(t.operacional)],
    semdados:()=>['semdados','Tempo sem dados',hDur(t.semDados),
      t.nLac+' lacuna'+(t.nLac===1?'':'s')+' no período',t.semDados>0?'w':'g',
      'não é parada: é ausência de registro e fica fora do denominador observado'],
    meta:()=>['meta','Meta proporcional',fmtVal(t.planMetaBase)+' peças',
      'atingimento '+fmtPct(t.atingBase),cl(t.atingBase),
      nf(c.meta)+' peças/h × '+hDur(t.tempoBase)+' · base: '+bs],
    oee:()=>oeeCard('oee','OEE — '+bs,t.oeeBase,t.tempoBase,
      fmtVal(t.pcs)+' ÷ '+fmtVal(t.planCapBase)+' ('+nf(c.cap)+' peças/h × '+hDur(t.tempoBase)+')'
      +(t.base==='turno'?bonusTurno:'')),
    oeeprog:()=>oeeCard('oeeprog','OEE programado',t.oee.programado,t.programado,'período selecionado menos abono'),
    oeeobs:()=>oeeCard('oeeobs','OEE observado',t.oee.observado,t.observado,'só o tempo coberto por registros'),
    oeeoper:()=>oeeCard('oeeoper','OEE operacional',t.oee.operacional,t.operacional,'observado menos as paradas detectadas'),
    oeeparcial:()=>oeeCard('oeeparcial','OEE parcial',t.oee.parcial,t.parcial,
      t.ultimoReg==null?'sem registro no período':'do início do período até '+dtBR(t.ultimoReg,'min')),
    oeeturno:()=>oeeCard('oeeturno','OEE pelo turno cadastrado',t.oee.turno,t.turno,
      t.turno==null?'nenhum turno cadastrado cobre o período'
        :hDur(t.emTurno)+' de turno cadastrado no período'+bonusTurno),
    oeemarc:()=>oeeCard('oeemarc','OEE entre marcações',t.oee.marcacoes,t.marcacoes,
      t.primeiroReg==null?'sem registro no período'
        :dtBR(t.primeiroReg,'min')+' → '+dtBR(t.ultimoReg,'min')),
    parado:()=>['parado','Tempo parado',fmtMin(t.parado),
      t.nPar+' parada'+(t.nPar===1?'':'s')+' acima de '+nf1(A.limParadaMin)+' min',
      cl(alvo(t.disp,1)),'disponibilidade '+fmtPct(t.disp)],
    disp:()=>['disp','Disponibilidade',fmtPct(t.disp),'rodando ÷ observado',cl(t.disp),
      hDur(t.operacional)+' de '+hDur(t.observado)],
    ritmo:()=>['ritmo','Ritmo médio',fmtVal(t.ritmo),'peças/h na janela com dados',
      cl(alvo(t.ritmo,c.meta)),'sem paradas '+fmtVal(t.ritmoOper)+' peças/h'],
    /* Ciclo é medido sobre o tempo em que a máquina estava rodando; o intervalo
       do card seguinte é a média no relógio, que inclui as paradas. Os dois
       existem porque respondem a perguntas diferentes. */
    ciclo:()=>{
      const nominal=c.cap>0?3600/(c.cap/A.pc):null;
      const desvio=razao(t.intervOper,nominal);
      return['ciclo','Tempo de ciclo médio',fmtSeg(t.intervOper),
        'por '+esc(u)+', sobre o tempo rodando',cl(razao(nominal,t.intervOper)),
        'mediana '+fmtSeg(A.tcMed)+' · melhor sustentado '+fmtSeg(A.tcP10)
        +(nominal!=null?' · nominal '+fmtSeg(nominal):'')
        +(desvio!=null?' ('+(desvio>=1?'+':'')+nf1((desvio-1)*100)+'% contra o cadastro)':'')];
    },
    interv:()=>['interv','Intervalo entre '+esc(u)+'s',fmtSeg(t.interv),
      'média na janela com dados','c',
      (t.intervOper!=null?'sem paradas '+fmtSeg(t.intervOper)+' · ':'')
      +(A.tcP10!=null?'melhor sustentado '+fmtSeg(A.tcP10):'')],
    qualidade:()=>['qualidade','Qualidade dos dados',q.rotulo,
      'cobertura '+fmtPct(q.cobertura)+' · '+nf(q.registros)+' registros',q.cor,
      [q.lacunas?q.lacunas+' lacuna(s)':'',q.resets?q.resets+' reset(s)':'',
       q.fracionados?q.fracionados+' valor(es) quebrado(s)':'',
       q.foraDeOrdem?q.foraDeOrdem+' fora de ordem':''].filter(Boolean).join(' · ')||'sem anomalia detectada'],
    abono:()=>(t.abono>0||t.extra>0)?['abono','Abono / hora extra',
      nf1(t.abono)+' / '+nf1(t.extra),'minutos','o',
      (t.abono>0?'abono sai da meta e do planejado':'')
      +(t.extra>0?(t.abono>0?' · ':'')+'extra ≈ '+fmtVal(t.ritmoOper==null?null:t.ritmoOper*t.extra/60)+' peças':'')]:null,
    refugo:()=>(t.refugo>0||t.retrab>0)?['refugo','Refugo / retrabalho',
      nf(t.refugo)+' / '+nf(t.retrab),'peças lançadas',cl(razao(t.bom,t.pcs)),
      'produção boa '+nf(t.bom)+' · OEE líquido '+fmtPct(t.oeeLiq)]:null,
    paradajust:()=>t.paradaJust>0?['paradajust','Parada justificada',fmtMin(t.paradaJust),
      t.motivos.length?esc(t.motivos.slice(0,2).join(', ')):'sem motivo informado','o',
      fmtPct(razao(t.paradaJust,t.parado))+' do tempo parado está justificado']:null
  };
  const out=[];
  for(const [id] of CARDS){
    if(!cardAtivo(id)||!M[id])continue;
    const k=M[id]();if(k)out.push(k);
  }
  return out;
}
function cardsHTML(A){
  const K=cardsDe(A);
  if(!K.length)return '<div class="empty">Nenhum cartão selecionado. Use o botão “Escolher cartões”.</div>';
  return K.map(([id,k,v,u,x,e])=>`<div class="kpi ${x}" data-card="${id}"><div class="k"><span class="dot"></span>${k}</div>`
    +`<div class="v">${v}</div><div class="u">${u}</div>${e?`<div class="eq">${e}</div>`:''}</div>`).join('');
}

function seta(atual,ant){
  if(ant==null||!Number.isFinite(ant)||ant===0)return '<span class="arw eq">'+NAO_CALC+'</span>';
  const d=(atual-ant)/ant*100;
  if(Math.abs(d)<1)return '<span class="arw eq">≈ 0%</span>';
  return `<span class="arw ${d>0?'up':'dn'}">${d>0?'▲':'▼'} ${nf1(Math.abs(d))}%</span>`;
}
const pill=(r,a)=>`<span class="pill p-${cl(alvo(r,a||1))}">${fmtPct(r)}</span>`;

/* --- fechamento por turno ------------------------------------------------ */
/* Duas janelas por linha: a produção pode vir de antes do turno (caixas
   adiantadas pelo turno anexado), mas o tempo é sempre o horário cadastrado. */
function tabelaTurnos(A){
  const c=A.maq,u=c.modo==='unidade'?'Inc.':esc(c.unid[0].toUpperCase()+c.unid.slice(1))+'s';
  let h='<thead><tr>'
    +'<th rowspan="2">Turno</th><th rowspan="2">Status</th>'
    +'<th class="grp" colspan="3">Produção</th>'
    +'<th class="grp" colspan="4">Tempo (h)</th>'
    +'<th class="grp" colspan="4">OEE</th>'
    +'<th rowspan="2">Meta</th><th rowspan="2">Qualidade</th></tr><tr>'
    +`<th class="sep">${u}</th><th>Peças</th><th>Adiantadas</th>`
    +'<th class="sep">No período</th><th>Com dados</th><th>Sem dados</th><th>Parado</th>'
    +'<th class="sep">Marcações</th><th>Programado</th><th>Observado</th><th>Parcial</th></tr></thead><tbody>';
  const T={inc:0,pcs:0,ant:0,dur:0,com:0,sem:0,par:0,pProg:0,pObs:0,pMarc:0,mBase:0};
  const st=k=>k==='completo'?'g':k==='semdados'?'r':k==='antecipada'?'n':'w';
  if(!A.turnos.length)h+='<tr><td colspan="14" style="text-align:center;color:var(--tx3)">Nenhum turno cobre o período selecionado.</td></tr>';
  for(const l of A.turnos){
    h+=`<tr><td>${l.bk.dia} · ${esc(l.bk.rot)}`
      +`${l.bk.anexado?' <span class="tag">+ turno anexado</span>':''}`
      +`${l.bk.recortado&&!l.bk.soProducao?' <span class="tag">recortado</span>':''}</td>`
      +`<td style="text-align:left"><span class="pill p-${st(l.status.k)}">${l.status.rot}</span></td>`
      +`<td class="sep">${nf(l.inc)}</td><td>${nf(l.pcs)}</td>`
      +`<td>${l.incAbsorvido>0?nf(l.incAbsorvido):'—'}</td>`
      +`<td class="sep">${hDur(l.dur)}</td><td>${hDur(l.comDados)}</td><td>${hDur(l.semDados)}</td><td>${fmtMin(l.parado)}</td>`
      +`<td class="sep">${pill(l.oee.marcacoes,.85)}</td><td>${pill(l.oee.programado,.85)}</td>`
      +`<td>${pill(l.oee.observado,.85)}</td><td>${pill(l.oee.parcial,.85)}</td>`
      +`<td>${pill(l.atingBase)}</td>`
      +`<td>${fmtPct(l.cobertura)}</td></tr>`;
    T.inc+=l.inc;T.pcs+=l.pcs;T.ant+=l.incAbsorvido;T.dur+=l.dur;T.com+=l.comDados;
    T.sem+=l.semDados;T.par+=l.parado;
    T.pProg+=l.planCap.programado||0;T.pObs+=l.planCap.observado||0;
    T.pMarc+=l.planCap.marcacoes||0;T.mBase+=l.planMetaBase||0;
  }
  return h+`</tbody><tfoot><tr><td>Total geral</td><td></td>`
    +`<td class="sep">${nf(T.inc)}</td><td>${nf(T.pcs)}</td><td>${T.ant>0?nf(T.ant):'—'}</td>`
    +`<td class="sep">${hDur(T.dur)}</td><td>${hDur(T.com)}</td><td>${hDur(T.sem)}</td><td>${fmtMin(T.par)}</td>`
    +`<td class="sep">${pct(T.pcs,T.pMarc)}</td><td>${pct(T.pcs,T.pProg)}</td>`
    +`<td>${pct(T.pcs,T.pObs)}</td><td>${NAO_CALC}</td>`
    +`<td>${pct(T.pcs,T.mBase)}</td><td>${pct(T.com,T.dur)}</td></tr></tfoot>`;
}

/* --- qualidade e validação ---------------------------------------------- */
function painelQualidade(){
  let h='<thead><tr><th>Máquina</th><th>Classificação</th><th>Cobertura</th><th>Registros</th>'
    +'<th>Sem alteração</th><th>Deltas &gt; 1</th><th>Resets</th><th>Data incerta</th><th>Não atribuído</th>'
    +'<th>Lacunas</th><th>Quebrados</th><th>Duplicados</th><th>Fora de ordem</th></tr></thead><tbody>';
  for(const A of LAST.AS){
    const q=A.qual;
    h+=`<tr><td><span class="swatch" style="background:${A.maq.cor};margin-right:7px"></span>${esc(A.maq.nome)}</td>`
      +`<td><span class="pill p-${q.cor==='n'?'w':q.cor}">${q.rotulo}</span></td>`
      +`<td>${fmtPct(q.cobertura)}</td><td>${nf(q.registros)}</td><td>${nf(q.semAlteracao)}</td>`
      +`<td>${nf(q.deltasMaiores)}</td><td>${nf(q.resets)}</td>`
      +`<td>${q.dataIncerta>0?nf(q.dataIncerta):'—'}</td><td>${q.naoAtribuido>0?nf(q.naoAtribuido):'—'}</td>`
      +`<td>${nf(q.lacunas)} · ${hDur(q.minutosSemDados)}</td>`
      +`<td>${nf(q.fracionados)}</td><td>${nf(q.duplicados)}</td><td>${nf(q.foraDeOrdem)}</td></tr>`;
  }
  return h+'</tbody>';
}
function painelValidacao(){
  const V=LAST.AS.flatMap(A=>A.valid);
  if(!V.length)return '<div class="dg ok"><span class="lb">OK</span><div><div class="tt">Nenhum problema encontrado</div>'
    +'<div class="bd">Cobertura, cadastro e limiares estão consistentes no período analisado.</div></div></div>';
  const ordem={crit:0,aten:1,info:2};
  return V.slice().sort((a,b)=>ordem[a.nivel]-ordem[b.nivel]).map(v=>
    `<div class="dg ${v.nivel}"><span class="lb">${esc(v.codigo)}</span><div>`
    +`<div class="mq">${esc(v.maquina)}</div><div class="tt">${esc(v.titulo)}</div>`
    +`<div class="bd">${esc(v.detalhe)}</div></div></div>`).join('');
}

/* --- rastreabilidade ----------------------------------------------------- */
/* Mostra a conta com os números substituídos, para que qualquer indicador
   possa ser refeito na mão em reunião. */
function rastreabilidade(A){
  const c=A.maq,t=A.tot,bs=rotuloBase(t.base);
  const L=[
    ['Peças produzidas','incrementos × peças por incremento',
      nf(t.inc)+' × '+nf(A.pc),nf(t.pcs)+' peças'],
    ['Leitura do contador','a leitura indica a próxima unidade',
      fmtVal(t.leituraIni)+' → '+fmtVal(t.leituraFim)+' · inicia em '+nf(t.contagemInicial),
      nf(t.inc)+' concluídas'],
    ['Incrementos contados','soma dos deltas a partir da segunda marcação',
      nf(t.regs)+' registros'+(t.naoAtrib>0?' · '+nf(t.naoAtrib)+' fora da contagem':'')
      +(t.incAposLacuna>0?' · '+nf(t.incAposLacuna)+' com data incerta':''),nf(t.inc)],
    ['Período selecionado','fim − início',
      dtBR(t.a,'min')+' → '+dtBR(t.b,'min'),hDur(t.dur)],
    ['Tempo com dados','período − tempo sem dados',
      hDur(t.dur)+' − '+hDur(t.semDados),hDur(t.comDados)],
    ['Tempo programado','período − abono',
      hDur(t.dur)+' − '+fmtMin(t.abono),hDur(t.programado)],
    ['Tempo observado','tempo com dados − abono coberto',
      hDur(t.comDados)+' − '+fmtMin(t.abonoCoberto),hDur(t.observado)],
    ['Tempo operacional','observado − paradas detectadas',
      hDur(t.observado)+' − '+fmtMin(t.parado),hDur(t.operacional)],
    ['Tempo parcial','última marcação − início do período − abono',
      t.ultimoReg==null?NAO_CALC:dtBR(t.ultimoReg,'min')+' − '+dtBR(t.a,'min'),hDur(t.parcial)],
    ['Tempo de turno cadastrado','minutos do período dentro de turno cadastrado − abono',
      hDur(t.emTurno)+' − '+fmtMin(t.abono),hDur(t.turno)],
    ['Produção fora de turno cadastrado','entra no numerador da base do turno sem custar denominador',
      nf(t.incForaTurno)+' incrementos',nf(t.pcsForaTurno)+' peças'],
    ['Tempo entre marcações','última marcação − primeira marcação − abono',
      t.primeiroReg==null?NAO_CALC:dtBR(t.ultimoReg,'min')+' − '+dtBR(t.primeiroReg,'min'),hDur(t.marcacoes)],
    ['Meta proporcional ('+bs+')','meta por hora × base ÷ 60',
      nf(c.meta)+' × '+nf1(t.tempoBase)+' ÷ 60',fmtVal(t.planMetaBase)+' peças'],
    ['Atingimento','peças ÷ meta proporcional',
      nf(t.pcs)+' ÷ '+fmtVal(t.planMetaBase),fmtPct(t.atingBase)],
    ['Planejado pela capacidade ('+bs+')','capacidade por hora × base ÷ 60',
      nf(c.cap)+' × '+nf1(t.tempoBase)+' ÷ 60',fmtVal(t.planCapBase)+' peças'],
    ['OEE — '+bs,'peças ÷ planejado',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCapBase),fmtPct(t.oeeBase)],
    ['OEE programado','peças ÷ (capacidade × programado ÷ 60)',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCap.programado),fmtPct(t.oee.programado)],
    ['OEE observado','peças ÷ (capacidade × observado ÷ 60)',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCap.observado),fmtPct(t.oee.observado)],
    ['OEE operacional','peças ÷ (capacidade × operacional ÷ 60)',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCap.operacional),fmtPct(t.oee.operacional)],
    ['OEE parcial','peças ÷ (capacidade × parcial ÷ 60)',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCap.parcial),fmtPct(t.oee.parcial)],
    ['OEE pelo turno cadastrado','peças ÷ (capacidade × turno cadastrado ÷ 60)',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCap.turno),fmtPct(t.oee.turno)],
    ['OEE entre marcações','peças ÷ (capacidade × marcações ÷ 60)',
      nf(t.pcs)+' ÷ '+fmtVal(t.planCap.marcacoes),fmtPct(t.oee.marcacoes)],
    ['Disponibilidade','operacional ÷ observado',
      hDur(t.operacional)+' ÷ '+hDur(t.observado),fmtPct(t.disp)],
    ['Cobertura de dados','tempo com dados ÷ período',
      hDur(t.comDados)+' ÷ '+hDur(t.dur),fmtPct(t.cobertura)],
    ['Ritmo médio','peças ÷ tempo com dados em horas',
      nf(t.pcs)+' ÷ '+nf2(t.comDados/60),fmtVal(t.ritmo)+' peças/h'],
    ['Intervalo entre incrementos','tempo com dados em segundos ÷ incrementos',
      nf(t.comDados*60)+' ÷ '+nf(t.inc),fmtSeg(t.interv)]
  ];
  return '<thead><tr><th>Indicador</th><th>Fórmula</th><th>Números usados</th><th>Resultado</th></tr></thead><tbody>'
    +L.map(([a,b,c2,d])=>`<tr><td>${a}</td><td style="text-align:left;font-family:Inter,sans-serif">${b}</td>`
      +`<td>${c2}</td><td><b>${d}</b></td></tr>`).join('')+'</tbody>';
}

/* --- diagnóstico --------------------------------------------------------- */
function diagnosticos(){
  const {AS}=LAST,D=[];
  for(const A of AS){
    const c=A.maq,t=A.tot,mq=chip(A),bs=rotuloBase(t.base);
    if(!t.regs){
      D.push(['crit','SEM DADOS',mq,'Nenhum registro no período',
        'A janela selecionada não tem marcação do contador para esta máquina. Nada foi estimado no lugar.']);
      continue;
    }
    D.push([t.atingBase==null?'info':t.atingBase>=1?'ok':t.atingBase>=.9?'aten':'crit','META',mq,
      t.atingBase==null?'Atingimento não calculável':t.atingBase>=1?'Meta do período atingida':'Meta do período não atingida',
      `Produção de <b>${nf(t.pcs)}</b> peças contra <b>${fmtVal(t.planMetaBase)}</b> da meta proporcional — <b>${fmtPct(t.atingBase)}</b>. `
      +`A base é ${nf(c.meta)} peças/h aplicados a ${hDur(t.tempoBase)} (${esc(bs)})`
      +(t.abono>0?`, já líquidos de ${nf1(t.abono)} min de abono.`:'.')]);
    D.push([t.oeeBase==null?'info':t.oeeBase>=.85?'ok':t.oeeBase>=.7?'aten':'crit','OEE',mq,
      `OEE de ${fmtPct(t.oeeBase)} sobre ${esc(bs.toLowerCase())}`,
      `<b>${nf(t.pcs)}</b> peças contra <b>${fmtVal(t.planCapBase)}</b> planejadas pela capacidade `
      +`(${nf(c.cap)} peças/h × ${hDur(t.tempoBase)}). `
      +(t.planCapBase!=null?`A diferença de <b>${nf(t.planCapBase-t.pcs)}</b> peças é o total a recuperar.`:'')]);
    if(t.semDados>0)
      D.push([t.cobertura!=null&&t.cobertura<.85?'crit':'aten','SEM DADOS',mq,
        `${hDur(t.semDados)} do período sem registro`,
        `A cobertura ficou em <b>${fmtPct(t.cobertura)}</b>, em ${t.nLac} lacuna(s). `
        +'Esse tempo não entrou como parada nem como produção — o OEE observado ignora a lacuna, o programado não.']);
    if(t.parado>0&&t.ritmoOper!=null){
      const pd=t.parado/60*c.cap,pv=Math.max(0,c.cap-t.ritmoOper)*(t.operacional/60);
      D.push([pv>pd?'crit':'aten','PERDA',mq,
        pv>pd?'A maior perda é de cadência':'A maior perda é de parada',
        `Paradas somaram <b>${nf1(t.parado)}</b> min, equivalentes a <b>${nf(pd)}</b> peças na velocidade nominal. `
        +`Rodando abaixo da capacidade a linha deixou <b>${nf(pv)}</b> peças, porque o ritmo em operação foi `
        +`<b>${nf(t.ritmoOper)}</b> contra os ${nf(c.cap)} peças/h de capacidade.`]);
    }
    if(A.paradas.length){
      const top=A.paradas.slice(0,3);
      D.push([top[0].min>=10?'crit':'aten','PARADAS',mq,
        `${A.paradas.length} interrupções somando ${nf1(t.parado)} min`,
        'As maiores foram '+top.map(p=>`<b>${dtCurto(p.a)} → ${dtCurto(p.b)}</b> (${nf1(p.min)} min)`).join(', ')
        +'. Compare com o apontamento do MES antes de tratar como perda de máquina.']);
    }
    if(A.qual.classe==='ruim')
      D.push(['crit','QUALIDADE',mq,'Qualidade dos dados classificada como ruim',
        'Os indicadores acima existem, mas não sustentam decisão sem antes corrigir a coleta. Veja o painel de validação.']);
  }
  if(AS.length>1){
    const com=AS.filter(a=>a.tot.oeeBase!=null);
    if(com.length>1){
      const o=com.slice().sort((a,b)=>b.tot.oeeBase-a.tot.oeeBase),a=o[0],z=o[o.length-1];
      D.push(['info','COMPARAÇÃO','',`${esc(a.maq.nome)} lidera em OEE, ${esc(z.maq.nome)} fica atrás`,
        `<b>${fmtPct(a.tot.oeeBase)}</b> contra <b>${fmtPct(z.tot.oeeBase)}</b>, com ritmo em operação de `
        +`<b>${fmtVal(a.tot.ritmoOper)}</b> e <b>${fmtVal(z.tot.ritmoOper)}</b> peças/h.`]);
    }
  }
  return D;
}

/* --- montagem da tela ----------------------------------------------------
   Toda seção com chave é recolhível pelo próprio título. O recolhimento é só
   CSS sobre os irmãos do h2, então nenhum bloco precisa de estrutura extra, e
   o estado fica salvo por chave nas preferências. */
function secao(titulo,lede,chave){
  const s=el('section');
  const aberto=!chave||!PREFS.recolhidas[chave];
  if(chave){s.dataset.sec=chave;s.dataset.aberto=String(aberto)}
  s.innerHTML='<h2'+(chave?' class="sech" role="button" tabindex="0" aria-expanded="'+aberto+'"':'')+'>'
    +(chave?'<span class="cx">'+(aberto?'▾':'▸')+'</span>':'')+titulo+'</h2>'
    +(lede?'<p class="lede">'+lede+'</p>':'');
  return s;
}
function alternarSecao(sec){
  const chave=sec.dataset.sec;if(!chave)return;
  const aberto=sec.dataset.aberto!=='true';
  sec.dataset.aberto=String(aberto);
  const h=sec.querySelector('h2.sech');
  h.setAttribute('aria-expanded',String(aberto));
  h.querySelector('.cx').textContent=aberto?'▾':'▸';
  PREFS.recolhidas[chave]=!aberto;salvarPrefs();
  /* canvas medido enquanto escondido tem largura zero: só redesenha ao abrir */
  if(aberto&&sec.querySelector('canvas'))requestAnimationFrame(desenhar);
}
function todasSecoes(aberto){
  document.querySelectorAll('#a_out section[data-sec]').forEach(sec=>{
    if((sec.dataset.aberto==='true')!==aberto)alternarSecao(sec);
  });
}
$('a_out').addEventListener('click',e=>{
  const h=e.target.closest('h2.sech');
  if(h&&$('a_out').contains(h))alternarSecao(h.closest('section'));
});
$('a_out').addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const h=e.target.closest('h2.sech');
  if(!h)return;
  e.preventDefault();alternarSecao(h.closest('section'));
});
function renderAnalise(){
  const {AS}=LAST,out=$('a_out');out.innerHTML='';

  const s1=secao('Resumo do período',
    dtBR(LAST.ini,'min')+' → '+dtBR(LAST.fim,'min')+' · '+hDur((LAST.fim-LAST.ini)/60000)
    +' · base de cálculo: <b>'+esc(rotuloBase(LAST.base))+'</b> ('+esc(descBase(LAST.base))+')'
    +' · contagem: <b>'+esc(rotuloContagem(LAST.contagem))+'</b>'
    +' · parada acima de '+nf1(LAST.lim)+' min · sem dados acima de '+nf1(LAST.limSD)+' min','resumo');
  for(const A of AS){
    const c=A.maq,h=el('div');
    h.innerHTML=`<h2 style="margin:16px 0 10px"><span class="swatch" style="background:${c.cor}"></span>${esc(c.nome)}`
      +`<span class="tag">${c.modo==='unidade'?'1 peça por incremento':nf(c.porInc)+' peças por '+esc(c.unid)}</span>`
      +`<span class="tag">capacidade ${nf(c.cap)} peças/h</span>`
      +`<span class="tag">meta ${nf(c.meta)} peças/h</span>`
      +`<span class="pill p-${A.qual.cor==='n'?'w':A.qual.cor}">dados: ${A.qual.rotulo}</span></h2>`;
    const g=el('div','kpis');g.innerHTML=cardsHTML(A);h.appendChild(g);s1.appendChild(h);
  }
  out.appendChild(s1);

  if(secaoAtiva('turno')){
    for(const A of AS){
      const s=secao(`<span class="swatch" style="background:${A.maq.cor}"></span>Fechamento por turno — ${esc(A.maq.nome)}`,
        'Uma linha por ocorrência de turno dentro do período. As janelas são recortadas no filtro e nunca se sobrepõem, '
        +'então nenhum registro entra em dois turnos.'
        +(LAST.excl?' A produção do turno desconsiderado foi absorvida pelo turno seguinte, sem que as horas dele entrem no denominador.':''),
        'turno:'+A.maq.id);
      const w=el('div','tblwrap');w.innerHTML='<table>'+tabelaTurnos(A)+'</table>';s.appendChild(w);out.appendChild(s);
    }
  }

  const s2=secao(secaoAtiva('acum')?'Produção acumulada':'Produção por '+LAST.gran,
    'Todas as máquinas na mesma linha do tempo.','grafico');
  const c2=el('div','card'),lg=el('div');
  lg.style.cssText='display:flex;flex-wrap:wrap;gap:15px;font-size:13px;color:var(--tx2);margin-bottom:13px';
  lg.innerHTML=AS.map(A=>`<span><span class="swatch" style="background:${A.maq.cor};margin-right:6px"></span>${esc(A.maq.nome)}</span>`).join('')
    +(secaoAtiva('meta')?'<span><span style="display:inline-block;width:17px;border-top:2px dashed var(--meta);vertical-align:4px;margin-right:6px"></span>Meta</span>':'')
    +(secaoAtiva('cap')?'<span><span style="display:inline-block;width:17px;border-top:2px solid var(--tx3);vertical-align:4px;margin-right:6px"></span>Capacidade</span>':'');
  const bx=el('div','cvbox');bx.innerHTML='<canvas id="ch" height="340"></canvas>';
  c2.append(lg,bx);s2.appendChild(c2);out.appendChild(s2);

  if(secaoAtiva('cad')){
    const s3=secao('Cadência',
      'Cada traço é um registro do contador; a altura acompanha o tamanho do incremento. '
      +'Blocos vermelhos são paradas, hachura cinza é ausência de dados, faixas no topo são os turnos.','cadencia');
    const c3=el('div','card'),b3=el('div','cvbox');
    b3.innerHTML='<canvas id="tl" height="'+(52*AS.length+58)+'"></canvas>';
    c3.appendChild(b3);s3.appendChild(c3);out.appendChild(s3);
  }

  if(secaoAtiva('hora'))protegido('o detalhe por hora',()=>secaoHoras(out));
  if(secaoAtiva('registros'))protegido('os registros individuais',()=>secaoRegistros(out));

  if(secaoAtiva('qual')){
    const s=secao('Qualidade dos dados',
      'Mede a confiança nos números acima, não o desempenho da máquina.','qualidade');
    const w=el('div','tblwrap');w.innerHTML='<table>'+painelQualidade()+'</table>';s.appendChild(w);out.appendChild(s);
  }
  if(secaoAtiva('valid')){
    const s=secao('Painel de validação','O que precisa ser conferido antes de usar o número.','validacao');
    const d=el('div');d.innerHTML=painelValidacao();s.appendChild(d);out.appendChild(s);
  }
  if(secaoAtiva('dgn')){
    const s=secao('Diagnóstico','','diagnostico');
    const d=el('div');
    d.innerHTML=diagnosticos().map(x=>`<div class="dg ${x[0]}"><span class="lb">${x[1]}</span>`
      +`<div>${x[2]?`<div class="mq">${x[2]}</div>`:''}<div class="tt">${x[3]}</div><div class="bd">${x[4]}</div></div></div>`).join('');
    s.appendChild(d);out.appendChild(s);
  }
  if(secaoAtiva('rastro')){
    for(const A of AS){
      const s=secao(`<span class="swatch" style="background:${A.maq.cor}"></span>Rastreabilidade — ${esc(A.maq.nome)}`,
        'Cada indicador do período com a fórmula e os números que entraram nela.','rastro:'+A.maq.id);
      const w=el('div','tblwrap');w.innerHTML='<table>'+rastreabilidade(A)+'</table>';s.appendChild(w);out.appendChild(s);
    }
  }

  const sec=el('div','acts');
  sec.innerHTML='<button type="button" class="act" data-sec-todas="abrir">Expandir tudo</button>'
    +'<button type="button" class="act" data-sec-todas="fechar">Recolher tudo</button>';
  sec.querySelectorAll('button[data-sec-todas]').forEach(b=>
    b.addEventListener('click',()=>todasSecoes(b.dataset.secTodas==='abrir')));
  out.insertBefore(sec,out.firstChild);

  const ac=el('div','acts');
  ac.innerHTML='<button type="button" class="act" data-exp="periodo">CSV do período</button>'
    +'<button type="button" class="act" data-exp="turno">CSV por turno</button>'
    +'<button type="button" class="act" data-exp="hora">CSV por hora</button>'
    +'<button type="button" class="act" data-exp="registros">CSV dos registros</button>'
    +'<button type="button" class="act" data-exp="paradas">CSV de paradas e lacunas</button>';
  ac.querySelectorAll('button[data-exp]').forEach(b=>b.addEventListener('click',()=>exportarCSV(b.dataset.exp)));
  out.appendChild(ac);

  requestAnimationFrame(desenhar);
}
