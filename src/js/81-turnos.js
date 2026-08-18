/* 81-turnos.js — Cadastro de turnos e seletor de produção de borda. */
"use strict";

function formTurno(t){
  const novo=!t;t=t||{id:uid(),nome:'',inicio:'06:00',fim:'14:20'};
  $('dlg_t').textContent=novo?'Cadastrar turno':'Editar turno';
  $('dlg_p').textContent='Use o horário real de porta, não o contratual.';
  $('dlg_b').innerHTML=`<div class="grid">
    <div class="fld"><label>Nome</label><input id="f_tn" value="${esc(t.nome)}" placeholder="1º turno"></div>
    <div class="fld"><label>Início</label><input type="time" id="f_ti" value="${t.inicio}"></div>
    <div class="fld"><label>Fim</label><input type="time" id="f_tf" value="${t.fim}"></div></div>`;
  $('dlg_f').innerHTML='';
  const c=el('button','act');c.type='button';c.textContent='Cancelar';
  c.addEventListener('click',()=>$('dlg').close());
  const s=el('button','act pri');s.type='button';s.textContent='Salvar';
  s.addEventListener('click',async()=>{
    const nome=$('f_tn').value.trim();if(!nome){toast('Dê um nome ao turno');return}
    await put('turnos',{id:t.id,nome,inicio:$('f_ti').value,fim:$('f_tf').value});
    $('dlg').close();await recarregar();montarTurnos();toast('Turno salvo')});
  $('dlg_f').append(c,s);$('dlg').showModal();
}
function montarTurnos(){
  const w=$('t_lista');
  if(!TUR.length){w.innerHTML='<div class="empty">Nenhum turno cadastrado. Sem eles não há fechamento por turno nem OEE por turno.</div>';return}
  w.innerHTML='';
  for(const t of TUR){
    const dur=((hm(t.fim)-hm(t.inicio)+1440)%1440)||1440,d=el('div','item');
    d.innerHTML=`<span class="bar" style="background:var(--accent)"></span>
      <div><div class="nm">${esc(t.nome)}</div><div class="ds">${t.inicio} às ${t.fim} · ${hDur(dur)}${hm(t.fim)<=hm(t.inicio)?' · vira a meia-noite':''}</div></div><span class="sp"></span>`;
    const e=el('button','act');e.type='button';e.textContent='Editar';
    e.addEventListener('click',()=>formTurno(t));
    const x=el('button','act dgr');x.type='button';x.textContent='Excluir';
    x.addEventListener('click',async()=>{await del('turnos',t.id);await recarregar();montarTurnos();toast('Turno excluído')});
    d.append(e,x);w.appendChild(d);
  }
}
$('t_novo').addEventListener('click',()=>formTurno(null));
$('t_padrao').addEventListener('click',async()=>{
  for(const [nome,inicio,fim] of [['1º turno','06:00','14:20'],['2º turno','14:20','22:40'],['3º turno','22:40','06:00']])
    await put('turnos',{id:uid(),nome,inicio,fim});
  await recarregar();montarTurnos();toast('Três turnos criados — ajuste os horários se precisar')});

function montarBorda(){
  const s=$('a_borda'),atual=s.value;
  s.innerHTML='<option value="todos">Manter em cada turno cadastrado</option>'
    +TUR.map(t=>`<option value="sem:${t.id}">Não usar o ${esc(t.nome)} — anexar ao turno seguinte</option>`).join('');
  if(atual&&[...s.options].some(o=>o.value===atual))s.value=atual;
}
