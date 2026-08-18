/* 10-db.js — Camada IndexedDB e normalização dos registros de máquina.

   Banco `monitor-hh`, versão 1 — inalterada nesta revisão. Nenhum store novo,
   nenhuma mudança de keyPath: base e backup gerados por versões anteriores
   continuam sendo lidos sem conversão. As preferências de tela ficam no
   localStorage (02-config.js), fora do banco de produção. */
"use strict";

const DB={db:null};
const DB_NOME='monitor-hh',DB_VER=1;
function abrir(){return new Promise((res,rej)=>{
  const r=indexedDB.open(DB_NOME,DB_VER);
  r.onupgradeneeded=e=>{const d=e.target.result;
    ['maquinas','turnos','ajustes'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'})});
    if(!d.objectStoreNames.contains('dias'))d.createObjectStore('dias',{keyPath:'chave'});};
  r.onsuccess=e=>{DB.db=e.target.result;res()};r.onerror=()=>rej(r.error);});}
const stx=(s,m)=>DB.db.transaction(s,m).objectStore(s);
const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const getAll=s=>req(stx(s,'readonly').getAll());
const put=(s,v)=>req(stx(s,'readwrite').put(v));
const del=(s,k)=>req(stx(s,'readwrite').delete(k));
const get1=(s,k)=>req(stx(s,'readonly').get(k));
const clearS=s=>req(stx(s,'readwrite').clear());

/* A chave de `dias` é "maquinaId|AAAA-MM-DD", então um intervalo de datas de
   uma máquina é um range contíguo da chave primária. Lê só o que a análise
   precisa, em vez de trazer a base inteira para a memória. */
function diasDoIntervalo(maquinaId,de,ate){
  const faixa=IDBKeyRange.bound(maquinaId+'|'+de,maquinaId+'|'+ate+'￿');
  return req(stx('dias','readonly').getAll(faixa));
}

function normaliza(m){
  if(m.porInc===undefined){m.porInc=m.tubos||1;m.modo=(m.tubos&&m.tubos>1)?'lote':'unidade'}
  if(!m.modo)m.modo='lote';
  if(!m.unid)m.unid=m.modo==='unidade'?'peça':'caixa';
  return m;
}
async function recarregar(){
  MAQ=(await getAll('maquinas')).map(normaliza).sort((a,b)=>a.nome.localeCompare(b.nome));
  TUR=(await getAll('turnos')).sort((a,b)=>hm(a.inicio)-hm(b.inicio));
  AJU=(await getAll('ajustes')).sort((a,b)=>(b.data+(b.inicio||'')).localeCompare(a.data+(a.inicio||'')));
  $('c_maq').textContent=MAQ.length;$('c_tur').textContent=TUR.length;$('c_aju').textContent=AJU.length;
  montarBorda();
}
