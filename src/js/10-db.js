/* 10-db.js — Camada IndexedDB e normalização dos registros de máquina.

   Banco `monitor-hh`, versão 3.

   Migração 2 -> 3: cria o store `familias`, que guarda a família do catálogo e
   as metas de OEE com vigência por período. Aditiva como a anterior.

   Migração 1 -> 2: cria os stores `catalogos` e `programacao`. É uma migração
   puramente aditiva — nenhum store existente é tocado, nenhum keyPath muda e
   nenhum registro é reescrito. Uma base da versão 1 abre na 2 com todos os
   dados intactos e os dois stores novos vazios; a análise cai no fallback da
   meta cadastrada na máquina até que algum catálogo seja criado.

   As preferências de tela ficam no localStorage (02-config.js), fora do banco
   de produção. */
"use strict";

const DB={db:null};
const DB_NOME='monitor-hh',DB_VER=3;
function abrir(){return new Promise((res,rej)=>{
  const r=indexedDB.open(DB_NOME,DB_VER);
  r.onupgradeneeded=e=>{
    const d=e.target.result,de=e.oldVersion;
    /* Criação idempotente: vale tanto para banco novo quanto para base v1. */
    ['maquinas','turnos','ajustes','catalogos','familias'].forEach(s=>{
      if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'})});
    ['dias','programacao'].forEach(s=>{
      if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'chave'})});
    if(de&&de<DB_VER)console.info('[monitor] base migrada da versão '+de+' para '+DB_VER+' — nenhum registro alterado');
  };
  r.onsuccess=e=>{DB.db=e.target.result;res()};
  r.onerror=()=>rej(r.error);
  r.onblocked=()=>rej(new Error('outra aba está com a versão anterior do banco aberta'));});}
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

/* Programação de catálogo por hora, uma linha por máquina e dia:
   { chave:"maqId|AAAA-MM-DD", maquinaId, data, horas:{ "6":catalogoId, ... } }
   Espelha o formato de `dias` — ler um intervalo é um range da chave primária. */
function programacaoDoIntervalo(maquinaId,de,ate){
  const faixa=IDBKeyRange.bound(maquinaId+'|'+de,maquinaId+'|'+ate+'￿');
  return req(stx('programacao','readonly').getAll(faixa));
}
const chaveProg=(maquinaId,data)=>maquinaId+'|'+data;

/* Uma família guarda as metas de OEE com vigência: [{de, ate, alvo, atencao}].
   `ate` vazio significa vigência aberta, sem data de fim. */
function normalizaFamilia(f){
  f.metas=(Array.isArray(f.metas)?f.metas:[])
    .filter(v=>v&&v.de)
    .map(v=>({de:v.de,ate:v.ate||'',alvo:+v.alvo||0,atencao:+v.atencao||0}))
    .sort((a,b)=>a.de.localeCompare(b.de));
  return f;
}
function normaliza(m){
  if(m.porInc===undefined){m.porInc=m.tubos||1;m.modo=(m.tubos&&m.tubos>1)?'lote':'unidade'}
  if(!m.modo)m.modo='lote';
  if(!m.unid)m.unid=m.modo==='unidade'?'peça':'caixa';
  return m;
}
async function recarregar(){
  MAQ=(await getAll('maquinas')).map(normaliza).sort((a,b)=>a.nome.localeCompare(b.nome));
  CAT=(await getAll('catalogos')).sort((a,b)=>String(a.numero).localeCompare(String(b.numero),'pt-BR',{numeric:true}));
  FAM=(await getAll('familias')).map(normalizaFamilia).sort((a,b)=>a.nome.localeCompare(b.nome));
  TUR=(await getAll('turnos')).sort((a,b)=>hm(a.inicio)-hm(b.inicio));
  AJU=(await getAll('ajustes')).sort((a,b)=>(b.data+(b.inicio||'')).localeCompare(a.data+(a.inicio||'')));
  $('c_maq').textContent=MAQ.length;$('c_tur').textContent=TUR.length;
  $('c_aju').textContent=AJU.length;$('c_cat').textContent=CAT.length;
  montarBorda();montarSeletorCatalogo();
}
