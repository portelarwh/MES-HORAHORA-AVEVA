/* 82-lancamentos.js — Abono, hora extra, parada justificada, refugo e retrabalho. */
"use strict";

const TIPO_TEMPO=['abono','extra','parada'];
function syncTipo(){
  const t=$('d_tipo').value,tempo=TIPO_TEMPO.includes(t);
  $('w_ini').classList.toggle('hide',!tempo);
  $('w_min').classList.toggle('hide',!tempo);
  $('w_qtd').classList.toggle('hide',tempo);
  $('w_un').classList.toggle('hide',tempo);
  $('d_help').innerHTML={
    abono:'<b>Abono</b> sai do tempo disponível: a meta e o planejado do OEE caem junto, então o indicador sobe. Use para reunião, treinamento, ginástica laboral.',
    extra:'<b>Hora extra</b> não muda a meta nem o planejado — o tempo trabalhado já está na janela dos dados. Ela aparece separada, para mostrar quanto da produção custou tempo pago a mais.',
    parada:'<b>Parada justificada</b> é informativa: dá nome a uma parada que o contador já detectou. Não altera o cálculo, mas aparece nos cartões e no relatório.',
    refugo:'<b>Refugo</b> entra na produção boa e no OEE líquido, sem alterar o OEE bruto — que mede o que a máquina entregou.',
    retrabalho:'<b>Retrabalho</b> é tratado como o refugo para efeito de produção boa, mas contabilizado separadamente.'
  }[t];
}
$('d_tipo').addEventListener('change',syncTipo);
function montarDia(){
  $('d_maq').innerHTML='<option value="*">Todas as máquinas</option>'
    +MAQ.map(m=>`<option value="${m.id}">${esc(m.nome)}</option>`).join('');
  syncTipo();
  const w=$('d_lista');
  if(!AJU.length){w.innerHTML='<div class="empty">Nenhum lançamento. Sem abono, o tempo disponível é a janela cheia coberta pelos dados.</div>';return}
  w.innerHTML='';
  const rot={abono:'Abono',extra:'Hora extra',parada:'Parada justificada',refugo:'Refugo',retrabalho:'Retrabalho'};
  const cor={abono:'var(--warn)',extra:'var(--accent)',parada:'var(--bad)',refugo:'var(--bad)',retrabalho:'var(--meta)'};
  for(const j of AJU){
    const m=j.maquinaId==='*'?{nome:'Todas as máquinas'}:MAQ.find(x=>x.id===j.maquinaId);
    const d=el('div','item');
    const val=TIPO_TEMPO.includes(j.tipo)?nf(j.minutos)+' min':nf(j.qtd)+(j.un==='inc'?' incrementos':' peças');
    d.innerHTML=`<span class="bar" style="background:${cor[j.tipo]||'var(--tx3)'}"></span>
      <div><div class="nm">${rot[j.tipo]||j.tipo} · ${val}</div>
      <div class="ds">${brDate(j.data)}${TIPO_TEMPO.includes(j.tipo)?' às '+j.inicio:''} · ${esc(m?m.nome:'máquina removida')}${j.obs?' · '+esc(j.obs):''}</div></div><span class="sp"></span>`;
    const x=el('button','act dgr');x.type='button';x.textContent='Excluir';
    x.addEventListener('click',async()=>{await del('ajustes',j.id);await recarregar();montarDia();toast('Lançamento removido')});
    d.appendChild(x);w.appendChild(d);
  }
}
$('d_add').addEventListener('click',async()=>{
  const data=$('d_data').value;if(!data){toast('Escolha a data');return}
  const tipo=$('d_tipo').value;
  const reg={id:uid(),maquinaId:$('d_maq').value,data,tipo,obs:$('d_obs').value.trim()};
  if(TIPO_TEMPO.includes(tipo)){
    const min=+$('d_min').value;if(!(min>0)){toast('Informe a duração em minutos');return}
    reg.inicio=$('d_ini').value;reg.minutos=min;
  }else{
    const q=+$('d_qtd').value;if(!(q>0)){toast('Informe a quantidade');return}
    reg.qtd=q;reg.un=$('d_un').value;
  }
  await put('ajustes',reg);await recarregar();montarDia();$('d_obs').value='';toast('Lançamento registrado');
});
