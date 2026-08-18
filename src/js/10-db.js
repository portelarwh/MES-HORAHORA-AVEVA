/* 10-db.js — Camada IndexedDB e normalização dos registros de máquina. */
"use strict";

const DB={db:null};
function abrir(){return new Promise((res,rej)=>{
  const r=indexedDB.open('monitor-hh',1);
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
