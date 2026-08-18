/* 90-montagem.js — Ligação dos controles da análise e exportação em CSV. */
"use strict";

function montarAnalise(){
  const w=$('a_maqs');
  if(!MAQ.length)w.innerHTML='<span style="font-size:13.5px;color:var(--tx3)">Cadastre uma máquina para começar.</span>';
  else{
    w.innerHTML=MAQ.map((m,i)=>`<label class="opt${i===0?' on':''}"><input type="checkbox" value="${m.id}" ${i===0?'checked':''}>`
      +`<span class="sw" style="background:${m.cor}"></span>${esc(m.nome)}</label>`).join('');
    w.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>i.closest('.opt').classList.toggle('on',i.checked)));
  }
  if(!$('a_ops').children.length){
    $('a_ops').innerHTML=OPCOES.map(([k,r,d])=>`<label class="opt${d?' on':''}"><input type="checkbox" value="${k}" ${d?'checked':''}>${r}</label>`).join('');
    $('a_ops').querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{
      i.closest('.opt').classList.toggle('on',i.checked);if(LAST)renderAnalise()}));
  }
}
$('a_go').addEventListener('click',rodarAnalise);
['a_gran','a_tipo','a_lim','a_de','a_ate','a_borda'].forEach(id=>$(id).addEventListener('change',()=>{if(LAST)rodarAnalise()}));

function expCSV(){
  if(!LAST)return;
  const L=[['Maquina','Periodo','Registros','Incrementos','Pecas','Meta_pecas','Atingimento_%','Planejado_pecas','OEE_%','Disponivel_min','Parado_min','Abono_min','Ritmo_pecas_h','Intervalo_s']];
  for(const A of LAST.AS)for(const l of A.linhas){
    if(l.janela<=0&&l.abono<=0)continue;
    L.push([A.maq.nome,(l.bk.dia?l.bk.dia+' ':'')+l.bk.rot,l.ap,Math.round(l.inc),Math.round(l.pcs),
      Math.round(l.planMeta),(l.ating*100).toFixed(1).replace('.',','),Math.round(l.planCap),
      (l.oee*100).toFixed(1).replace('.',','),l.planej.toFixed(1).replace('.',','),
      l.parauto.toFixed(1).replace('.',','),l.abono.toFixed(1).replace('.',','),
      Math.round(l.ritmo),l.interv?l.interv.toFixed(1).replace('.',','):'']);
  }
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+L.map(r=>r.join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  a.download='producao-'+LAST.de+'_'+LAST.ate+'.csv';a.click();
}
