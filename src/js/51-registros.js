/* 51-registros.js — Detalhe por hora com expansão e lista dos registros
   individuais do contador (cada caixa, com o carimbo real do historian).

   Nenhum horário é gerado aqui. Um incremento de 5 aparece como um registro
   só, no instante em que o historian o gravou — nunca como cinco registros
   espalhados em horários inventados. */
"use strict";

const CLS_REG={
  producao:['Produção','g'],semalteracao:['Sem alteração','n'],reset:['Reset','w'],
  multiplo:['Incremento múltiplo','w'],parada:['Após parada','w'],lacuna:['Após lacuna','r'],
  inicial:['Primeiro do período','n']
};
const FILTROS_REG=[['todos','Todos'],['producao','Só com produção'],['semalteracao','Só sem alteração'],
  ['reset','Só resets'],['multiplo','Só incrementos > 1'],['parada','Após parada'],['lacuna','Após lacuna']];

/* Um registro pode carregar mais de uma marca; a primeira define o filtro. */
function marcasDoRegistro(r){
  const m=[];
  if(!r.ev)m.push('inicial');
  else{
    if(r.ev.reset)m.push('reset');
    if(r.ev.classe===SEMDADOS)m.push('lacuna');
    else if(r.ev.classe===PARADA)m.push('parada');
    if(r.ev.delta===0)m.push('semalteracao');
    else if(r.ev.delta>1)m.push('multiplo');
    else m.push('producao');
  }
  return m;
}
function registrosDe(A,a,b){
  const mp=new Map(A.eventos.map(e=>[e.t,e]));
  const out=[];
  for(const p of A.dentro){
    if(a!=null&&(p[0]<a||p[0]>=b))continue;
    const r={t:p[0],valor:p[1],ev:mp.get(p[0])||null};
    r.marcas=marcasDoRegistro(r);
    out.push(r);
  }
  return out;
}
const filtraRegistros=(L,f)=>f==='todos'?L:L.filter(r=>r.marcas.includes(f));

function linhasRegistros(A,L){
  return L.map(r=>{
    const e=r.ev;
    const tags=r.marcas.map(m=>`<span class="pill p-${CLS_REG[m][1]}">${CLS_REG[m][0]}</span>`).join(' ');
    return `<tr><td>${dtBR(r.t)}</td><td>${nf(r.valor)}</td>`
      +`<td>${e?nf(e.delta):NAO_CALC}</td>`
      +`<td>${e?nf(e.contabiliza?e.delta*A.pc:0):NAO_CALC}</td>`
      +`<td>${e?fmtIntervalo(e.gapS):NAO_CALC}</td>`
      +`<td style="text-align:left;font-family:Inter,sans-serif">${tags}</td>`
      +`<td>${e?(e.contabiliza?'sim':'não'):'—'}</td></tr>`;
  }).join('');
}
const CAB_REG='<thead><tr><th>Data e hora do registro</th><th>Contador</th><th>Δ</th><th>Peças</th>'
  +'<th>Intervalo</th><th>Classificação</th><th>Contabilizado</th></tr></thead>';

/* --- detalhe por hora ---------------------------------------------------- */
function tabelaHoras(A,linhas){
  const c=A.maq,u=c.modo==='unidade'?'Inc.':esc(c.unid[0].toUpperCase()+c.unid.slice(1))+'s';
  let h='<thead><tr>'
    +'<th rowspan="2">Hora</th><th rowspan="2">Regs</th>'
    +'<th class="grp" colspan="3">Produção</th>'
    +'<th class="grp" colspan="2">Desempenho</th>'
    +'<th class="grp" colspan="4">Tempo (min)</th>'
    +'<th class="grp" colspan="2">Cadência</th></tr><tr>'
    +`<th class="sep">${u}</th><th>Peças</th><th>vs anterior</th>`
    +'<th class="sep">Meta</th><th>OEE</th>'
    +'<th class="sep">Com dados</th><th>Sem dados</th><th>Parado</th><th>Abono</th>'
    +'<th class="sep">Ritmo/h</th><th>Interv. (s)</th></tr></thead><tbody>';
  let ant=null;
  for(const l of linhas){
    const rot=(l.bk.dia?l.bk.dia+' ':'')+l.bk.rot
      +(l.bk.parcial?` <span class="tag">${hhmm(new Date(l.a))}–${hhmm(new Date(l.b))}</span>`:'');
    h+=`<tr class="exp" data-a="${l.a}" data-b="${l.b}" tabindex="0" role="button" aria-expanded="false">`
      +`<td><span class="cx">▸</span> ${rot}</td><td>${nf(l.regs)}</td>`
      +`<td class="sep">${nf(l.inc)}</td><td>${nf(l.pcs)}</td>`
      +`<td>${seta(l.pcs,ant)}</td>`
      +`<td class="sep">${pill(l.atingBase)}</td><td>${pill(l.oeeBase,.85)}</td>`
      +`<td class="sep">${nf1(l.comDados)}</td><td>${l.semDados>0?nf1(l.semDados):'—'}</td>`
      +`<td>${l.parado>0?nf1(l.parado):'—'}</td><td>${l.abono>0?nf1(l.abono):'—'}</td>`
      +`<td class="sep">${fmtVal(l.ritmo)}</td><td>${fmtSeg(l.interv)}</td></tr>`;
    ant=l.pcs;
  }
  const t=A.tot;
  return h+`</tbody><tfoot><tr><td>Total do período</td><td>${nf(t.regs)}</td>`
    +`<td class="sep">${nf(t.inc)}</td><td>${nf(t.pcs)}</td><td>${NAO_CALC}</td>`
    +`<td class="sep">${fmtPct(t.atingBase)}</td><td>${fmtPct(t.oeeBase)}</td>`
    +`<td class="sep">${nf1(t.comDados)}</td><td>${nf1(t.semDados)}</td>`
    +`<td>${nf1(t.parado)}</td><td>${nf1(t.abono)}</td>`
    +`<td class="sep">${fmtVal(t.ritmo)}</td><td>${fmtSeg(t.interv)}</td></tr></tfoot>`;
}

/* Expansão: mostra apenas os registros dentro da janela daquela linha. */
function ligarExpansao(tbl,A){
  tbl.addEventListener('click',e=>{
    const tr=e.target.closest('tr.exp');if(!tr||!tbl.contains(tr))return;
    alternarExpansao(tr,A);
  });
  tbl.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const tr=e.target.closest('tr.exp');if(!tr)return;
    e.preventDefault();alternarExpansao(tr,A);
  });
}
function alternarExpansao(tr,A){
  const aberto=tr.getAttribute('aria-expanded')==='true';
  const prox=tr.nextElementSibling;
  if(aberto){
    if(prox&&prox.classList.contains('det'))prox.remove();
    tr.setAttribute('aria-expanded','false');
    tr.querySelector('.cx').textContent='▸';
    return;
  }
  const a=+tr.dataset.a,b=+tr.dataset.b;
  const L=registrosDe(A,a,b);
  const td=el('td');
  td.colSpan=tr.children.length;
  td.innerHTML=L.length
    ?`<div class="subwrap"><div class="subtit">${nf(L.length)} registro(s) entre `
      +`${dtBR(a,'min')} e ${dtBR(b,'min')} — carimbos reais do historian</div>`
      +`<table class="sub">${CAB_REG}<tbody>${linhasRegistros(A,L)}</tbody></table></div>`
    :`<div class="subwrap"><div class="subtit">Nenhum registro do contador nesta janela.</div></div>`;
  const nova=el('tr','det');nova.appendChild(td);
  tr.parentNode.insertBefore(nova,tr.nextSibling);
  tr.setAttribute('aria-expanded','true');
  tr.querySelector('.cx').textContent='▾';
}

/* Renderização progressiva: períodos longos não montam 700 linhas de uma vez. */
function blocoPaginado(host,total,render,rotulo){
  let n=0;
  const passo=PREFS.regPag||200;
  const info=el('div','pagbar');
  const mais=el('button','act');mais.type='button';
  const passoFn=()=>{
    n=Math.min(total.length,n+passo);
    render(total.slice(0,n));
    info.querySelector('.pginfo').textContent=`${nf(n)} de ${nf(total.length)} ${rotulo}`;
    mais.style.display=n>=total.length?'none':'';
  };
  info.innerHTML='<span class="pginfo"></span>';
  mais.textContent='Mostrar mais';
  mais.addEventListener('click',passoFn);
  info.appendChild(mais);
  host.appendChild(info);
  passoFn();
  return info;
}

function secaoHoras(out){
  for(const A of LAST.AS){
    const s=secao(`<span class="swatch" style="background:${A.maq.cor}"></span>Detalhe por hora — ${esc(A.maq.nome)}`,
      'Clique em uma linha para ver os registros individuais daquela hora. '
      +'A primeira e a última linha podem ser frações de hora, quando o filtro começa ou termina no meio dela.',
      'horas:'+A.maq.id);
    const w=el('div','tblwrap'),tbl=el('table');
    w.appendChild(tbl);s.appendChild(w);
    const host=el('div');s.appendChild(host);
    blocoPaginado(host,A.horas,L=>{tbl.innerHTML=tabelaHoras(A,L)},'horas');
    ligarExpansao(tbl,A);
    out.appendChild(s);
  }
}

function secaoRegistros(out){
  for(const A of LAST.AS){
    const s=secao(`<span class="swatch" style="background:${A.maq.cor}"></span>Registros individuais — ${esc(A.maq.nome)}`,
      `Cada linha é uma marcação do contador dentro do período, com o carimbo original. `
      +`“Δ” é a diferença para o registro anterior; “Contabilizado” diz se o incremento entrou na produção do período.`,
      'registros:'+A.maq.id);
    const barra=el('div','bar-tools');
    barra.innerHTML='<div class="fld" style="min-width:210px"><label>Mostrar</label><select class="fReg">'
      +FILTROS_REG.map(([k,r])=>`<option value="${k}"${PREFS.regFiltro===k?' selected':''}>${r}</option>`).join('')
      +'</select></div>';
    s.appendChild(barra);
    const w=el('div','tblwrap'),tbl=el('table');
    tbl.style.minWidth='760px';
    w.appendChild(tbl);s.appendChild(w);
    const host=el('div');s.appendChild(host);
    const todos=registrosDe(A);
    const montar=()=>{
      host.innerHTML='';
      const L=filtraRegistros(todos,PREFS.regFiltro);
      if(!L.length){tbl.innerHTML='';host.innerHTML='<div class="empty">Nenhum registro com esse filtro no período.</div>';return}
      blocoPaginado(host,L,P=>{tbl.innerHTML=CAB_REG+'<tbody>'+linhasRegistros(A,P)+'</tbody>'},'registros');
    };
    barra.querySelector('.fReg').addEventListener('change',ev=>{
      PREFS.regFiltro=ev.target.value;salvarPrefs();montar();
    });
    montar();
    out.appendChild(s);
  }
}
