/* 80-maquinas.js — Cadastro de máquinas. */
"use strict";

function formMaquina(m){
  const novo=!m;
  m=m||{id:uid(),nome:'',etapa:'',modo:'lote',porInc:1000,unid:'caixa',meta:90000,cap:115000,
    offset:1,cor:PAL[MAQ.length%PAL.length],obs:''};
  $('dlg_t').textContent=novo?'Cadastrar máquina':'Editar máquina';
  $('dlg_p').textContent='Capacidade e meta são sempre em peças por hora.';
  $('dlg_b').innerHTML=`<div class="grid">
    <div class="fld"><label>Nome</label><input id="f_nome" value="${esc(m.nome)}" placeholder="VAEB 01"></div>
    <div class="fld"><label>Etapa / posto</label><input id="f_etapa" value="${esc(m.etapa)}" placeholder="Packout"></div>
    <div class="fld"><label>Cada incremento do contador vale</label>
      <select id="f_modo"><option value="unidade" ${m.modo==='unidade'?'selected':''}>1 peça (unidade)</option>
      <option value="lote" ${m.modo==='lote'?'selected':''}>Um lote de X peças</option></select></div>
    <div class="fld"><label>Peças por incremento</label><input type="number" id="f_por" value="${m.porInc}" min="1"></div>
    <div class="fld"><label>Nome do incremento</label><input id="f_unid" value="${esc(m.unid)}" placeholder="caixa, rack, palete"></div>
    <div class="fld"><label>Capacidade (peças/h)</label><input type="number" id="f_cap" value="${m.cap}" min="1" step="100"></div>
    <div class="fld"><label>Meta (peças/h)</label><input type="number" id="f_meta" value="${m.meta}" min="1" step="100"></div>
    <div class="fld"><label>Contagem do lote inicia em</label><input type="number" id="f_off" value="${m.offset}" min="0"></div>
    <div class="fld"><label>Cor no gráfico</label><select id="f_cor">${PAL.map(c=>`<option value="${c}" ${c===m.cor?'selected':''}>${c}</option>`).join('')}</select></div>
  </div>
  <div class="fld" style="margin-top:14px"><label>Como ela trabalha</label><textarea id="f_obs" placeholder="produto, formato, particularidades de setup, gargalo...">${esc(m.obs)}</textarea></div>
  <p class="note" id="f_prev"></p>`;
  const sync=()=>{
    const u=$('f_modo').value==='unidade';
    $('f_por').disabled=u;$('f_unid').disabled=u;
    if(u)$('f_por').value=1;
    const por=u?1:(+$('f_por').value||1),cap=+$('f_cap').value||0,meta=+$('f_meta').value||0;
    const un=esc($('f_unid').value||'lote');
    $('f_prev').innerHTML=u
      ?`Cada incremento é <b>1 peça</b>. Capacidade de <b>${nf(cap)}</b> e meta de <b>${nf(meta)}</b> peças por hora.`
      :`Cada incremento é <b>1 ${un}</b> = <b>${nf(por)}</b> peças. Capacidade de <b>${nf(cap)}</b> peças/h equivale a `
       +`<b>${nf1(cap/por)}</b> ${un}s por hora, ou <b>${nf1(3600/(cap/por))}</b> s por ${un}. `
       +`Meta de <b>${nf(meta)}</b> peças/h = <b>${nf1(meta/por)}</b> ${un}s por hora.`;
  };
  ['f_por','f_unid','f_cap','f_meta'].forEach(i=>$(i).addEventListener('input',sync));
  $('f_modo').addEventListener('change',sync);sync();
  $('dlg_f').innerHTML='';
  const c=el('button','act');c.type='button';c.textContent='Cancelar';
  c.addEventListener('click',()=>$('dlg').close());
  const s=el('button','act pri');s.type='button';s.textContent='Salvar';
  s.addEventListener('click',async()=>{
    const nome=$('f_nome').value.trim();
    if(!nome){toast('Dê um nome para a máquina');return}
    const modo=$('f_modo').value;
    await put('maquinas',{id:m.id,nome,etapa:$('f_etapa').value.trim(),modo,
      porInc:modo==='unidade'?1:(+$('f_por').value||1),unid:$('f_unid').value.trim()||'caixa',
      meta:+$('f_meta').value||1,cap:+$('f_cap').value||1,offset:+$('f_off').value||0,
      cor:$('f_cor').value,obs:$('f_obs').value.trim()});
    $('dlg').close();await recarregar();
    montarMaquinas();montarAnalise();montarDia();montarDados();toast('Máquina salva');});
  $('dlg_f').append(c,s);$('dlg').showModal();
}
function montarMaquinas(){
  const w=$('m_lista');
  if(!MAQ.length){w.innerHTML='<div class="empty">Nenhuma máquina cadastrada. A importação precisa saber de qual equipamento é o arquivo.</div>';return}
  w.innerHTML='';
  for(const m of MAQ){
    const d=el('div','item'),pc=pecas(m);
    d.innerHTML=`<span class="bar" style="background:${m.cor}"></span>
      <div><div class="nm">${esc(m.nome)}${m.etapa?' <span class="tag">'+esc(m.etapa)+'</span>':''}</div>
      <div class="ds">${m.modo==='unidade'?'1 peça por incremento':nf(m.porInc)+' peças por '+esc(m.unid)}
        · capacidade ${nf(m.cap)} peças/h = ${nf1(m.cap/pc)} ${m.modo==='unidade'?'inc':esc(m.unid)+'s'}/h
        · meta ${nf(m.meta)} peças/h · lote inicia em ${m.offset}</div>
      ${m.obs?'<div class="ds" style="margin-top:3px;font-style:italic">'+esc(m.obs)+'</div>':''}</div><span class="sp"></span>`;
    const e=el('button','act');e.type='button';e.textContent='Editar';
    e.addEventListener('click',()=>formMaquina(m));
    const x=el('button','act dgr');x.type='button';x.textContent='Excluir';
    x.addEventListener('click',async()=>{
      if(!confirm('Excluir '+m.nome+'? Os registros de produção continuam guardados.'))return;
      await del('maquinas',m.id);await recarregar();
      montarMaquinas();montarAnalise();montarDia();montarDados();toast('Máquina excluída')});
    d.append(e,x);w.appendChild(d);
  }
}
$('m_novo').addEventListener('click',()=>formMaquina(null));
