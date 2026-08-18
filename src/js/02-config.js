/* 02-config.js — Preferências do usuário e catálogo do que pode ser exibido.

   As preferências (cards visíveis, seções, base de cálculo, limiares) ficam no
   localStorage, separadas dos dados de produção, que continuam no IndexedDB.
   Trocar de preferência nunca toca em registro importado; apagar a base nunca
   apaga preferência. */
"use strict";

const PREFS_KEY='hh-prefs';
const PREFS_VER=1;

/* Catálogo dos cards. [id, título, grupo, padrão]
   grupo serve só para agrupar o seletor; a ordem aqui é a ordem na tela. */
const CARDS=[
  ['producao','Produção','Produção',1],
  ['primeiro','Primeira marcação','Período',1],
  ['ultimo','Última marcação','Período',1],
  ['periodo','Período selecionado','Período',1],
  ['dados','Tempo com dados','Período',1],
  ['contagem','Contagem do contador','Produção',1],
  ['semdados','Tempo sem dados','Período',1],
  ['meta','Meta proporcional','Desempenho',1],
  ['oee','OEE da base escolhida','Desempenho',1],
  ['oeeprog','OEE programado','Desempenho',0],
  ['oeeobs','OEE observado','Desempenho',0],
  ['oeeoper','OEE operacional','Desempenho',0],
  ['oeeparcial','OEE parcial','Desempenho',1],
  ['oeemarc','OEE entre marcações','Desempenho',0],
  ['parado','Tempo parado','Paradas',1],
  ['disp','Disponibilidade','Paradas',0],
  ['ritmo','Ritmo médio','Cadência',1],
  ['interv','Intervalo entre incrementos','Cadência',1],
  ['qualidade','Qualidade dos dados','Dados',1],
  ['abono','Abono e hora extra','Lançamentos',1],
  ['refugo','Refugo e retrabalho','Lançamentos',1],
  ['paradajust','Parada justificada','Lançamentos',1]
];

/* Seções da análise. [id, rótulo, padrão] */
const OPCOES=[
  ['meta','Linha de meta',1],['cap','Linha de capacidade',1],['rot','Rótulos no gráfico',1],
  ['acum','Acumulado',0],['turno','Fechamento por turno',1],['hora','Detalhe por hora',1],
  ['cad','Cadência',1],['registros','Registros individuais',0],['qual','Qualidade dos dados',1],
  ['valid','Painel de validação',1],['dgn','Diagnóstico',1],['rastro','Rastreabilidade dos cálculos',1]
];

/* Bases de cálculo. O rótulo aparece nos cards e no relatório, para que o
   número nunca fique sem dizer contra o que foi medido. */
const BASES=[
  ['marcacoes','Da primeira à última marcação','tempo entre o primeiro e o último registro do contador, menos abono — a produção começa quando a primeira caixa é contada'],
  ['programado','Período selecionado','duração do período menos abono'],
  ['observado','Janela com dados','tempo coberto pelos registros menos abono'],
  ['operacional','Tempo rodando','tempo com dados menos abono e menos paradas'],
  ['parcial','Até o último registro','do início do período até a última marcação, menos abono']
];
const rotuloBase=b=>(BASES.find(x=>x[0]===b)||BASES[0])[1];
const descBase=b=>(BASES.find(x=>x[0]===b)||BASES[0])[2];

function prefsPadrao(){
  const cards={},secoes={};
  for(const [k,,,d] of CARDS)cards[k]=!!d;
  for(const [k,,d] of OPCOES)secoes[k]=!!d;
  return{v:PREFS_VER,cards,secoes,base:'marcacoes',gran:'hora',tipo:'auto',
    limParada:3,limSemDados:30,borda:'todos',auto:false,autoSeg:120,
    hDe:'00:00',hAte:'00:00',regFiltro:'todos',regPag:200};
}

let PREFS=prefsPadrao();

/* Mescla defensiva: preferência gravada por versão anterior nunca derruba a
   aplicação, e chave nova ganha o padrão. */
function mesclaPrefs(base,salvo){
  if(!salvo||typeof salvo!=='object')return base;
  const out={...base,...salvo};
  out.v=PREFS_VER;
  out.cards={...base.cards,...(salvo.cards||{})};
  out.secoes={...base.secoes,...(salvo.secoes||{})};
  for(const k of Object.keys(out.cards))if(!CARDS.some(c=>c[0]===k))delete out.cards[k];
  for(const k of Object.keys(out.secoes))if(!OPCOES.some(c=>c[0]===k))delete out.secoes[k];
  if(!BASES.some(b=>b[0]===out.base))out.base=base.base;
  if(!(out.limParada>0))out.limParada=base.limParada;
  if(!(out.limSemDados>0))out.limSemDados=base.limSemDados;
  if(!(out.autoSeg>=30))out.autoSeg=base.autoSeg;
  if(!(out.regPag>0))out.regPag=base.regPag;
  return out;
}
function carregarPrefs(){
  let salvo=null;
  try{salvo=JSON.parse(localStorage.getItem(PREFS_KEY)||'null')}catch(e){salvo=null}
  PREFS=mesclaPrefs(prefsPadrao(),salvo);
  return PREFS;
}
function salvarPrefs(){
  try{localStorage.setItem(PREFS_KEY,JSON.stringify(PREFS))}catch(e){/* modo privativo: segue sem persistir */}
}
const cardAtivo=k=>PREFS.cards[k]!==false;
const secaoAtiva=k=>PREFS.secoes[k]!==false;

if(typeof module!=='undefined'&&module.exports)module.exports={
  CARDS,OPCOES,BASES,prefsPadrao,mesclaPrefs,rotuloBase,descBase};
