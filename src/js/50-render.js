/* 50-render.js — Montagem dos cartões, tabelas e diagnóstico. */
"use strict";

const OPCOES=[['meta','Meta',1],['cap','Capacidade',1],['rot','Rótulos',1],['acum','Acumulado',0],
  ['turno','Fechamento por turno',1],['cad','Cadência',1],['tab','Detalhe por período',1],['dgn','Diagnóstico',1]];
const opAtivo=k=>{const i=document.querySelector('#a_ops input[value="'+k+'"]');return i?i.checked:false};

function cardsHTML(A){
  const c=A.maq,t=A.tot,pc=pecas(c);
  const unid=c.modo==='unidade'?'incremento':c.unid;
  const eq=c.modo==='unidade'?'1 incremento = 1 peça':'1 '+esc(unid)+' = '+nf(pc)+' peças';
  const K=[];
  K.push(['Produção',nf(t.pcs)+' peças',nf(t.inc)+' '+esc(unid)+(t.inc===1?'':'s'),'c',eq]);
  K.push(['Meta do período',nf(t.planMeta)+' peças',
    'atingimento '+nf1(t.ating*100)+'% · '+(t.pcs>=t.planMeta?'+':'')+nf(t.pcs-t.planMeta),cl(t.ating),
    nf(c.meta)+' peças/h × '+hDur(t.planej)+' disponíveis']);
  K.push(['OEE do período',nf1(t.oee*100)+'%','produzido ÷ planejado',cl(t.oee/.85),
    nf(t.pcs)+' ÷ '+nf(t.planCap)+' ('+nf(c.cap)+' peças/h × '+hDur(t.planej)+')']);
  K.push(['OEE parcial',nf1(t.oeeParcial*100)+'%','até o último registro '+(t.ultimo?hhmm(new Date(t.ultimo)):'—'),
    cl(t.oeeParcial/.85),'janela de '+hDur(t.parcialMin)+' desde o primeiro registro']);
  K.push(['Janela de dados',hDur(t.janela),
    (t.ultimo?hhmm(new Date(A.primeiro))+' às '+hhmm(new Date(A.ultimo)):'—'),'o',
    'disponível '+hDur(t.planej)+' · rodando '+hDur(t.oper)]);
  K.push(['Tempo parado',nf1(t.parauto)+' min',t.npar+' paradas acima do limiar',cl(1-t.parauto/Math.max(1,t.planej)),
    'disponibilidade '+nf1(t.disp*100)+'%']);
  K.push(['Intervalo entre '+esc(unid)+'s',t.interv?nf1(t.interv)+' s':'—',
    'média na janela de dados','c',
    (t.intervOper?'sem paradas '+nf1(t.intervOper)+' s · ':'')+(A.tcP10?'melhor sustentado '+nf1(A.tcP10)+' s':'')]);
  K.push(['Ritmo médio',nf(t.ritmo),'peças/h na janela de dados',cl(t.ritmo/c.meta),
    'sem paradas '+nf(t.ritmoOper)+' peças/h']);
  if(t.abono>0||t.extra>0)
    K.push(['Abono / hora extra',nf1(t.abono)+' / '+nf1(t.extra),'minutos','o',
      (t.abono>0?'abono descontado da meta e do planejado':'')+(t.extra>0?(t.abono>0?' · ':'')+'extra ≈ '+nf(t.ritmoOper*t.extra/60)+' peças':'')]);
  if(t.refugo>0||t.retrab>0)
    K.push(['Refugo / retrabalho',nf(t.refugo)+' / '+nf(t.retrab),'peças lançadas',cl(t.bom/Math.max(1,t.pcs)),
      'produção boa '+nf(t.bom)+' · OEE líquido '+nf1(t.oeeLiq*100)+'%']);
  if(t.paradaJust>0)
    K.push(['Parada justificada',nf1(t.paradaJust)+' min',
      t.motivos.length?t.motivos.slice(0,2).join(', '):'sem motivo informado','o',
      nf1(t.paradaJust/Math.max(1,t.parauto)*100)+'% do tempo parado está justificado']);
  return K.map(([k,v,u,x,e])=>`<div class="kpi ${x}"><div class="k"><span class="dot"></span>${k}</div>`
    +`<div class="v">${v}</div><div class="u">${u}</div>${e?`<div class="eq">${e}</div>`:''}</div>`).join('');
}

function seta(atual,ant){
  if(ant==null||ant===0)return '<span class="arw eq">—</span>';
  const d=(atual-ant)/ant*100;
  if(Math.abs(d)<1)return '<span class="arw eq">≈ 0%</span>';
  return `<span class="arw ${d>0?'up':'dn'}">${d>0?'▲':'▼'} ${nf1(Math.abs(d))}%</span>`;
}

function tabelaDetalhe(A){
  const c=A.maq,unid=c.modo==='unidade'?'Inc.':esc(c.unid[0].toUpperCase()+c.unid.slice(1))+'s';
  let h='<thead><tr>'
    +'<th rowspan="2">Período</th><th rowspan="2">Regs</th>'
    +'<th class="grp" colspan="2">Produção</th>'
    +'<th class="grp" colspan="3">Desempenho</th>'
    +'<th class="grp" colspan="3">Tempo (min)</th>'
    +'<th class="grp" colspan="2">Cadência</th></tr><tr>'
    +`<th class="sep">${unid}</th><th>Peças</th>`
    +'<th class="sep">vs anterior</th><th>Meta</th><th>OEE</th>'
    +'<th class="sep">Disponível</th><th>Parado</th><th>Abono</th>'
    +'<th class="sep">Ritmo/h</th><th>Interv. (s)</th></tr></thead><tbody>';
  const vis=A.linhas.filter(l=>l.janela>0||l.abono>0);
  let ant=null;
  for(const l of vis){
    h+=`<tr><td>${(l.bk.dia&&LAST.gran!=='dia'?l.bk.dia+' ':'')+l.bk.rot}</td><td>${l.ap}</td>`
      +`<td class="sep">${nf(l.inc)}</td><td>${nf(l.pcs)}</td>`
      +`<td class="sep">${seta(l.pcs,ant)}</td>`
      +`<td><span class="pill p-${cl(l.ating)}">${nf1(l.ating*100)}%</span></td>`
      +`<td><span class="pill p-${cl(l.oee/.85)}">${nf1(l.oee*100)}%</span></td>`
      +`<td class="sep">${nf1(l.planej)}</td><td>${l.parauto>0?nf1(l.parauto):'—'}</td><td>${l.abono>0?nf1(l.abono):'—'}</td>`
      +`<td class="sep">${nf(l.ritmo)}</td><td>${l.interv?nf1(l.interv):'—'}</td></tr>`;
    ant=l.pcs;
  }
  const t=A.tot;
  return h+`</tbody><tfoot><tr><td>Total</td><td>${nf(t.ap)}</td>`
    +`<td class="sep">${nf(t.inc)}</td><td>${nf(t.pcs)}</td>`
    +`<td class="sep">—</td><td>${nf1(t.ating*100)}%</td><td>${nf1(t.oee*100)}%</td>`
    +`<td class="sep">${nf1(t.planej)}</td><td>${nf1(t.parauto)}</td><td>${nf1(t.abono)}</td>`
    +`<td class="sep">${nf(t.ritmo)}</td><td>${t.interv?nf1(t.interv):'—'}</td></tr></tfoot>`;
}

function tabelaTurnos(A){
  const c=A.maq,unid=c.modo==='unidade'?'Inc.':esc(c.unid[0].toUpperCase()+c.unid.slice(1))+'s';
  let h='<thead><tr>'
    +'<th rowspan="2">Turno</th>'
    +'<th class="grp" colspan="2">Produção</th>'
    +'<th class="grp" colspan="3">Horas trabalhadas</th>'
    +'<th class="grp" colspan="2">Planejado (peças)</th>'
    +'<th class="grp" colspan="2">OEE</th>'
    +'<th rowspan="2">Meta</th></tr><tr>'
    +`<th class="sep">${unid}</th><th>Peças</th>`
    +'<th class="sep">Turno</th><th>Com dados</th><th>Parado</th>'
    +'<th class="sep">Turno cheio</th><th>Até último reg.</th>'
    +'<th class="sep">Fechado</th><th>Parcial</th></tr></thead><tbody>';
  let T={inc:0,pcs:0,dur:0,jan:0,par:0,planT:0,planP:0,meta:0};
  for(const l of A.turnos){
    const planP=c.cap*(l.parcialMin/60);
    h+=`<tr><td>${l.bk.dia} · ${esc(l.bk.rot)}${l.bk.anexado?' <span class="tag">+ borda</span>':''}</td>`
      +`<td class="sep">${nf(l.inc)}</td><td>${nf(l.pcs)}</td>`
      +`<td class="sep">${hDur(l.durTurno)}</td><td>${hDur(l.janela)}</td><td>${nf1(l.parauto)} min</td>`
      +`<td class="sep">${nf(l.planTurno)}</td><td>${nf(planP)}</td>`
      +`<td class="sep"><span class="pill p-${cl(l.oeeTurno/.85)}">${nf1(l.oeeTurno*100)}%</span></td>`
      +`<td><span class="pill p-${cl(l.oeeParcial/.85)}">${nf1(l.oeeParcial*100)}%</span></td>`
      +`<td><span class="pill p-${cl(l.ating)}">${nf1(l.ating*100)}%</span></td></tr>`;
    T.inc+=l.inc;T.pcs+=l.pcs;T.dur+=l.durTurno;T.jan+=l.janela;T.par+=l.parauto;
    T.planT+=l.planTurno;T.planP+=planP;T.meta+=l.planMeta;
  }
  return h+`</tbody><tfoot><tr><td>Total geral</td>`
    +`<td class="sep">${nf(T.inc)}</td><td>${nf(T.pcs)}</td>`
    +`<td class="sep">${hDur(T.dur)}</td><td>${hDur(T.jan)}</td><td>${nf1(T.par)} min</td>`
    +`<td class="sep">${nf(T.planT)}</td><td>${nf(T.planP)}</td>`
    +`<td class="sep">${T.planT>0?nf1(T.pcs/T.planT*100):'—'}%</td>`
    +`<td>${T.planP>0?nf1(T.pcs/T.planP*100):'—'}%</td>`
    +`<td>${T.meta>0?nf1(T.pcs/T.meta*100):'—'}%</td></tr></tfoot>`;
}

function chip(A){return `<span class="tag"><span class="swatch" style="background:${A.maq.cor};margin-right:5px"></span>${esc(A.maq.nome)}</span>`;}

function diagnosticos(){
  const {AS}=LAST,D=[];
  for(const A of AS){
    const c=A.maq,t=A.tot,mq=chip(A);
    D.push([t.ating>=1?'ok':t.ating>=.9?'aten':'crit','META',mq,
      t.ating>=1?'Meta do período atingida':'Meta do período não atingida',
      `Produção de <b>${nf(t.pcs)}</b> peças contra <b>${nf(t.planMeta)}</b> planejadas pela meta — <b>${nf1(t.ating*100)}%</b>. `
      +`A base é ${nf(c.meta)} peças/h aplicados a ${hDur(t.planej)} de tempo disponível`
      +(t.abono>0?`, já líquidos de ${nf1(t.abono)} min de abono.`:'.')]);
    D.push([t.oee>=.85?'ok':t.oee>=.7?'aten':'crit','OEE',mq,
      `OEE de ${nf1(t.oee*100)}% no período`,
      `<b>${nf(t.pcs)}</b> peças produzidas contra <b>${nf(t.planCap)}</b> planejadas pela capacidade `
      +`(${nf(c.cap)} peças/h × ${hDur(t.planej)}). A diferença de <b>${nf(t.planCap-t.pcs)}</b> peças é o total a recuperar.`]);
    const pd=t.parauto/60*c.cap,pv=Math.max(0,c.cap-t.ritmoOper)*(t.oper/60);
    D.push([pv>pd?'crit':'aten','PERDA',mq,
      pv>pd?'A maior perda é de cadência':'A maior perda é de parada',
      `Paradas somaram <b>${nf1(t.parauto)}</b> min, equivalentes a <b>${nf(pd)}</b> peças na velocidade nominal. `
      +`Rodando abaixo da capacidade a linha deixou <b>${nf(pv)}</b> peças, porque o ritmo com a máquina em operação foi `
      +`<b>${nf(t.ritmoOper)}</b> contra os ${nf(c.cap)} peças/h de capacidade.`]);
    if(A.paradas.length){
      const top=A.paradas.slice(0,3);
      D.push([top[0].min>=10?'crit':'aten','PARADAS',mq,
        `${A.paradas.length} interrupções somando ${nf1(t.parauto)} min`,
        'As maiores foram '+top.map(p=>{const a=new Date(p.ini),b=new Date(p.fim);
          return `<b>${pad2(a.getDate())}/${pad2(a.getMonth()+1)} ${hhmm(a)}→${hhmm(b)}</b> (${nf1(p.min)} min)`}).join(', ')
        +'. Compare com o apontamento do MES antes de tratar como perda de máquina.']);
    }
    if(A.tcP10){
      const pico=3600/A.tcP10*pecas(c);
      if(pico>c.cap*1.02) D.push(['aten','CAPACIDADE',mq,'Cadência de pico acima do cadastro',
        `A melhor cadência sustentada foi <b>${nf(pico)}</b> peças/h, acima dos ${nf(c.cap)} cadastrados. `
        +'Enquanto isso não for revisto, o OEE fica otimista.']);
    }
    if(A.frac) D.push(['crit','DADOS',mq,`${A.frac} registros com valor quebrado`,
      'O contador deveria ser sempre inteiro. Verifique se o historian está interpolando em modo analógico em vez de degrau.']);
  }
  if(AS.length>1){
    const o=AS.slice().sort((a,b)=>b.tot.oee-a.tot.oee),a=o[0],z=o[o.length-1];
    D.push(['info','COMPARAÇÃO','',`${esc(a.maq.nome)} lidera em OEE, ${esc(z.maq.nome)} fica atrás`,
      `<b>${nf1(a.tot.oee*100)}%</b> contra <b>${nf1(z.tot.oee*100)}%</b>, com ritmo em operação de `
      +`<b>${nf(a.tot.ritmoOper)}</b> e <b>${nf(z.tot.ritmoOper)}</b> peças/h. `
      +`Se rodam o mesmo produto, os ${nf(Math.abs(a.tot.ritmoOper-z.tot.ritmoOper))} peças/h de diferença são o alvo mais barato do período.`]);
  }
  return D;
}

function renderAnalise(){
  const {AS}=LAST,out=$('a_out');out.innerHTML='';
  const s1=el('section');
  s1.innerHTML='<h2>Resumo do período</h2><p class="lede">'+brDate(LAST.de)+' a '+brDate(LAST.ate)
    +' · agrupado por '+LAST.gran+' · paradas acima de '+nf1(LAST.lim)+' min</p>';
  for(const A of AS){
    const c=A.maq,h=el('div');
    h.innerHTML=`<h2 style="margin:16px 0 10px"><span class="swatch" style="background:${c.cor}"></span>${esc(c.nome)}`
      +`<span class="tag">${c.modo==='unidade'?'1 peça por incremento':nf(c.porInc)+' peças por '+esc(c.unid)}</span>`
      +`<span class="tag">capacidade ${nf(c.cap)} peças/h</span></h2>`;
    const g=el('div','kpis');g.innerHTML=cardsHTML(A);h.appendChild(g);s1.appendChild(h);
  }
  out.appendChild(s1);

  if(opAtivo('turno')&&LAST.BT.length){
    for(const A of AS){
      const s=el('section');
      s.innerHTML=`<h2><span class="swatch" style="background:${A.maq.cor}"></span>Fechamento por turno — ${esc(A.maq.nome)}</h2>`
        +`<p class="lede">OEE fechado usa a duração cadastrada do turno. OEE parcial usa a janela até o último registro — serve para turno em andamento.`
        +(LAST.excl?' A produção do turno excluído foi anexada ao turno seguinte.':'')+`</p>`;
      const w=el('div','tblwrap');w.innerHTML=tabelaTurnos(A);s.appendChild(w);out.appendChild(s);
    }
  }

  const s2=el('section');
  s2.innerHTML='<h2>'+(opAtivo('acum')?'Produção acumulada':'Produção por '+LAST.gran)+'</h2>'
    +'<p class="lede">Todas as máquinas na mesma linha do tempo.</p>';
  const c2=el('div','card'),lg=el('div');
  lg.style.cssText='display:flex;flex-wrap:wrap;gap:15px;font-size:13px;color:var(--tx2);margin-bottom:13px';
  lg.innerHTML=AS.map(A=>`<span><span class="swatch" style="background:${A.maq.cor};margin-right:6px"></span>${esc(A.maq.nome)}</span>`).join('')
    +(opAtivo('meta')?'<span><span style="display:inline-block;width:17px;border-top:2px dashed var(--meta);vertical-align:4px;margin-right:6px"></span>Meta</span>':'')
    +(opAtivo('cap')?'<span><span style="display:inline-block;width:17px;border-top:2px solid var(--tx3);vertical-align:4px;margin-right:6px"></span>Capacidade</span>':'');
  const bx=el('div','cvbox');bx.innerHTML='<canvas id="ch" height="340"></canvas>';
  c2.append(lg,bx);s2.appendChild(c2);out.appendChild(s2);

  if(opAtivo('cad')){
    const s3=el('section');
    s3.innerHTML='<h2>Cadência</h2><p class="lede">Cada traço é um registro do contador; a altura acompanha o tamanho do incremento. '
      +'Blocos vermelhos são paradas, faixas cinza no topo são os turnos. Períodos sem dados são comprimidos.</p>';
    const c3=el('div','card'),b3=el('div','cvbox');
    b3.innerHTML='<canvas id="tl" height="'+(52*AS.length+58)+'"></canvas>';
    c3.appendChild(b3);s3.appendChild(c3);out.appendChild(s3);
  }
  if(opAtivo('tab')){
    for(const A of AS){
      const s=el('section');
      s.innerHTML=`<h2><span class="swatch" style="background:${A.maq.cor}"></span>Detalhe por ${LAST.gran} — ${esc(A.maq.nome)}</h2>`
        +`<p class="lede">A coluna "vs anterior" compara as peças com o período imediatamente acima.</p>`;
      const w=el('div','tblwrap');w.innerHTML=tabelaDetalhe(A);s.appendChild(w);out.appendChild(s);
    }
    const ac=el('div','acts');
    ac.innerHTML='<button type="button" class="act" id="b_csv">Baixar CSV</button>';
    out.appendChild(ac);
    ac.querySelector('#b_csv').addEventListener('click',expCSV);
  }
  if(opAtivo('dgn')){
    const s=el('section');s.innerHTML='<h2>Diagnóstico</h2>';
    const d=el('div');
    d.innerHTML=diagnosticos().map(x=>`<div class="dg ${x[0]}"><span class="lb">${x[1]}</span>`
      +`<div>${x[2]?`<div class="mq">${x[2]}</div>`:''}<div class="tt">${x[3]}</div><div class="bd">${x[4]}</div></div></div>`).join('');
    s.appendChild(d);out.appendChild(s);
  }
  requestAnimationFrame(desenhar);
}
