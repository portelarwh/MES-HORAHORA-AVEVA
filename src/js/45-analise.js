/* 45-analise.js — Orquestração da análise: lê os filtros da tela, carrega os
   dias necessários do IndexedDB, chama o motor puro de 40-metrics.js e guarda
   o resultado em LAST. Nenhuma fórmula mora aqui. */
"use strict";

/* --- janela exata --------------------------------------------------------
   ini = data De + horário De. fim = data Até + horário Até, com a convenção
   de que 00:00 no campo Até significa "até o fim daquele dia". */
function janelaSelecionada(){
  const de=$('a_de').value,ate=$('a_ate').value;
  if(!de||!ate)return null;
  const hDe=$('a_hde').value||'00:00',hAte=$('a_hate').value||'00:00';
  const pd=de.split('-').map(Number),pa=ate.split('-').map(Number);
  const ini=new Date(pd[0],pd[1]-1,pd[2],0,0,0,0).getTime()+hm(hDe)*60000;
  let fim=new Date(pa[0],pa[1]-1,pa[2],0,0,0,0).getTime()+hm(hAte)*60000;
  if(hm(hAte)===0)fim+=86400000;                 // 00:00 = fim do dia escolhido
  return{ini,fim,de,ate,hDe,hAte,valida:fim>ini};
}
const isoDeMs=ms=>iso(new Date(ms));

/* --- filtros rápidos ----------------------------------------------------- */
function turnoAtual(agora){
  if(!TUR.length)return null;
  const oc=turnosNoIntervalo(TUR,agora-86400000,agora+86400000,null);
  return oc.find(t=>t.aCheio<=agora&&agora<t.bCheio)||null;
}
function aplicarRapido(k){
  const agora=new Date(),hoje=iso(agora);
  const set=(d1,h1,d2,h2)=>{$('a_de').value=d1;$('a_hde').value=h1;$('a_ate').value=d2;$('a_hate').value=h2};
  if(k==='hoje')set(hoje,'00:00',hoje,'00:00');
  else if(k==='ontem'){const o=iso(new Date(agora.getTime()-86400000));set(o,'00:00',o,'00:00')}
  else if(k==='24h'){const a=new Date(agora.getTime()-86400000);
    set(iso(a),hhmm(a),hoje,hhmm(agora))}
  else if(k==='7d'){const a=new Date(agora.getTime()-6*86400000);set(iso(a),'00:00',hoje,'00:00')}
  else if(k==='mes'){const a=new Date(agora.getFullYear(),agora.getMonth(),1);set(iso(a),'00:00',hoje,'00:00')}
  else if(k==='turno'){
    const t=turnoAtual(agora.getTime());
    if(!t){toast('Cadastre os turnos para usar esse filtro');return}
    const a=new Date(t.aCheio);set(iso(a),hhmm(a),iso(agora),hhmm(agora));
  }
  guardarFiltros();rodarAnalise();
}

function guardarFiltros(){
  PREFS.hDe=$('a_hde').value||'00:00';
  PREFS.hAte=$('a_hate').value||'00:00';
  PREFS.gran=$('a_gran').value;
  PREFS.tipo=$('a_tipo').value;
  PREFS.base=$('a_base').value;
  PREFS.limParada=+$('a_lim').value||3;
  PREFS.limSemDados=+$('a_limsd').value||30;
  PREFS.borda=$('a_borda').value||'todos';
  salvarPrefs();
}

/* --- estado da última análise ------------------------------------------- */
let ASSINATURA='';
const assinaturaDe=AS=>AS.map(A=>A.maq.id+':'+A.pts.length+':'+(A.pts.length?A.pts[A.pts.length-1][0]:0)).join('|');

/* Quando o turno em si está fora da janela mas ele absorveu caixas adiantadas
   que estão dentro, a linha existe só para mostrar essa produção — sem tempo,
   não há meta nem OEE a calcular. */
function statusTurno(bk,t,agora){
  if(bk.soProducao)return{k:'antecipada',rot:'Produção antecipada'};
  if(bk.bCheio>agora&&bk.aCheio<=agora)return{k:'andamento',rot:'Em andamento'};
  if(bk.aCheio>agora)return{k:'futuro',rot:'Ainda não começou'};
  if(!t.regs)return{k:'semdados',rot:'Sem dados'};
  if(bk.recortado)return{k:'parcial',rot:'Recortado pelo filtro'};
  return{k:'completo',rot:'Fechado'};
}
/* Recorte de tempo e recorte de produção podem divergir (turno anexado). */
const medir=(A,bk)=>metricas(A,bk.a,bk.b,bk.aProd==null?null:{a:bk.aProd,b:bk.bProd});

async function rodarAnalise(opts){
  opts=opts||{};
  const J=janelaSelecionada();
  const sel=[...document.querySelectorAll('#a_maqs input:checked')].map(i=>i.value);
  if(!J||!J.valida||!sel.length){
    $('a_out').innerHTML='';$('a_vazio').style.display='block';LAST=null;
    $('a_vazio').textContent=!J?'Escolha a data inicial e a data final.'
      :!J.valida?'O fim do período precisa ser depois do início.'
      :'Escolha ao menos uma máquina.';
    return;
  }
  guardarFiltros();
  const base=PREFS.base,gran=PREFS.gran;
  const lim=PREFS.limParada,limSD=Math.max(PREFS.limParada,PREFS.limSemDados);
  const excl=PREFS.borda.startsWith('sem:')?PREFS.borda.slice(4):null;
  /* um dia de folga de cada lado para que o registro imediatamente anterior e
     o posterior à janela classifiquem corretamente as bordas */
  const deK=isoDeMs(J.ini-86400000),ateK=isoDeMs(J.fim+86400000);

  const AS=[];
  for(const id of sel){
    const m=MAQ.find(x=>x.id===id);if(!m)continue;
    let dias=[];
    try{dias=await diasDoIntervalo(id,deK,ateK)}
    catch(e){console.error('[monitor] leitura da base falhou',e);toast('Falha ao ler a base local')}
    AS.push(analisarMaquina(m,dias,{ini:J.ini,fim:J.fim,limParadaMin:lim,
      limSemDadosMin:limSD,ajustes:AJU,base}));
  }
  if(!AS.length){$('a_out').innerHTML='';$('a_vazio').style.display='block';
    $('a_vazio').textContent='Nenhuma das máquinas selecionadas existe mais no cadastro.';LAST=null;return}
  $('a_vazio').style.display='none';

  const BT=turnosNoIntervalo(TUR,J.ini,J.fim,excl);
  const B=bucketsDe(gran,J.ini,J.fim,TUR,excl);
  const BH=bucketsDe('hora',J.ini,J.fim);
  const agora=Date.now();
  const ctx={turnosSobrepostos:BT.some(t=>t.sobreposto),semTurnos:!TUR.length};

  for(const A of AS){
    A.tot=metricas(A,J.ini,J.fim);
    A.linhas=B.map(bk=>({bk,...medir(A,bk)}));
    A.horas=BH.map(bk=>({bk,...medir(A,bk)}));
    A.turnos=BT.map(bk=>{const m=medir(A,bk);
      return{bk,...m,status:statusTurno(bk,m,agora)}})
      /* linha só de produção antecipada sem nenhuma caixa é ruído */
      .filter(l=>!(l.bk.soProducao&&!l.regs));
    A.qual=qualidade(A,A.tot);
    A.valid=validacoes(A,A.tot,ctx);
  }

  const nova=assinaturaDe(AS),mudou=nova!==ASSINATURA;
  ASSINATURA=nova;
  LAST={AS,B,BT,BH,gran,base,lim,limSD,excl,agora,
    ini:J.ini,fim:J.fim,de:J.de,ate:J.ate,hDe:J.hDe,hAte:J.hAte,
    geradoEm:new Date(),dadosMudaram:mudou};
  protegido('a análise',renderAnalise,()=>{$('a_out').innerHTML=
    '<div class="dg crit"><span class="lb">ERRO</span><div><div class="tt">A tela não pôde ser montada</div>'
    +'<div class="bd">Os dados continuam guardados. Reduza o período ou desmarque seções e tente de novo.</div></div></div>'});
  return mudou;
}

/* --- limpar relatório ----------------------------------------------------
   Limpa só a tela. Nada é removido do IndexedDB — apagar a base é outro botão,
   na aba Base de dados. */
function limparRelatorio(){
  LAST=null;ASSINATURA='';
  $('a_out').innerHTML='';
  $('relbox').classList.remove('on');
  $('rel').innerHTML='';
  $('a_vazio').style.display='block';
  $('a_vazio').textContent='Relatório limpo. A base de dados continua intacta — clique em Atualizar para analisar de novo.';
  toast('Relatório limpo — nenhum registro foi apagado');
}

/* --- atualização automática ---------------------------------------------
   Distingue o que aconteceu: buscar dados novos é uma coisa, redesenhar a
   mesma análise é outra. A mensagem nunca afirma o que não houve. */
let AUTO_T=null;
function pararAuto(){if(AUTO_T){clearInterval(AUTO_T);AUTO_T=null}}
function ligarAuto(){
  pararAuto();
  const seg=Math.max(30,+$('a_autoseg').value||120);
  PREFS.autoSeg=seg;PREFS.auto=true;salvarPrefs();
  AUTO_T=setInterval(async()=>{
    if(!LAST)return;
    await recarregar();
    const mudou=await rodarAnalise({silencioso:true});
    $('a_autoinfo').textContent=(mudou?'Novos registros na base — análise refeita às '
      :'Nada novo na base — apenas recalculado às ')+hhmm(new Date());
  },seg*1000);
  $('a_autoinfo').textContent='Verificando a base a cada '+seg+' s.';
}
