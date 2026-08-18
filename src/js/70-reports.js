/* 70-reports.js — Relatório A4, resumo de WhatsApp e texto de e-mail. */
"use strict";

const periodoTxt=()=>brDate(LAST.de)+(LAST.de===LAST.ate?'':' a '+brDate(LAST.ate));
const semTags=s=>String(s).replace(/<[^>]+>/g,'');

function relatorioA4(){
  if(!LAST){toast('Rode a análise primeiro');return}
  const {AS}=LAST,um=AS.length===1,A0=AS[0],c0=A0.maq,t0=A0.tot;
  const sum=AS.reduce((s,A)=>({pcs:s.pcs+A.tot.pcs,plan:s.plan+A.tot.planCap,meta:s.meta+A.tot.planMeta,
    par:s.par+A.tot.parauto,npar:s.npar+A.tot.npar}),{pcs:0,plan:0,meta:0,par:0,npar:0});
  const kpis=um?[
    ['Produção',nf(t0.pcs),'peças · '+nf(t0.inc)+' '+esc(c0.unid)+'s'],
    ['OEE',nf1(t0.oee*100)+'%','de '+nf(t0.planCap)+' planejadas'],
    ['Atingimento',nf1(t0.ating*100)+'%','meta '+nf(t0.planMeta)],
    ['Tempo disponível',hDur(t0.planej),'parado '+nf1(t0.parauto)+' min'],
    ['Intervalo médio',t0.interv?nf1(t0.interv)+' s':'—','entre '+esc(c0.unid)+'s']
  ]:[
    ['Produção total',nf(sum.pcs),'peças · '+AS.length+' máquinas'],
    ['OEE consolidado',sum.plan>0?nf1(sum.pcs/sum.plan*100)+'%':'—','de '+nf(sum.plan)+' planejadas'],
    ['Atingimento',sum.meta>0?nf1(sum.pcs/sum.meta*100)+'%':'—','meta '+nf(sum.meta)],
    ['Melhor OEE',esc(AS.slice().sort((a,b)=>b.tot.oee-a.tot.oee)[0].maq.nome),'no período'],
    ['Paradas',nf(sum.npar),nf1(sum.par)+' min no total']
  ];
  let esquerda;
  if(um&&A0.turnos.length){
    esquerda='<h4>Fechamento por turno</h4><table><thead><tr><th>Turno</th><th>Peças</th><th>Horas</th><th>OEE</th><th>Parcial</th></tr></thead><tbody>'
      +A0.turnos.map(l=>`<tr><td>${l.bk.dia} ${esc(l.bk.rot)}</td><td>${nf(l.pcs)}</td><td>${hDur(l.janela)}</td>`
        +`<td style="font-weight:700;color:${l.oeeTurno>=.85?'#1B8A5A':l.oeeTurno>=.7?'#B27300':'#C33C4E'}">${nf1(l.oeeTurno*100)}</td>`
        +`<td>${nf1(l.oeeParcial*100)}</td></tr>`).join('')
      +`</tbody><tfoot><tr><td>Total</td><td>${nf(t0.pcs)}</td><td>${hDur(t0.janela)}</td><td>${nf1(t0.oee*100)}</td><td>${nf1(t0.oeeParcial*100)}</td></tr></tfoot></table>`;
  }else if(um){
    esquerda='<h4>Produção por '+LAST.gran+'</h4><table><thead><tr><th>Período</th><th>Peças</th><th>Meta %</th><th>OEE %</th><th>Parado</th></tr></thead><tbody>'
      +A0.linhas.filter(l=>l.janela>0).slice(0,20).map(l=>
        `<tr><td>${(l.bk.dia&&LAST.gran!=='dia'?l.bk.dia+' ':'')+l.bk.rot}</td><td>${nf(l.pcs)}</td>`
        +`<td>${nf1(l.ating*100)}</td><td style="font-weight:700;color:${l.oee>=.85?'#1B8A5A':l.oee>=.7?'#B27300':'#C33C4E'}">${nf1(l.oee*100)}</td>`
        +`<td>${l.parauto>0?nf1(l.parauto):'—'}</td></tr>`).join('')
      +`</tbody><tfoot><tr><td>Total</td><td>${nf(t0.pcs)}</td><td>${nf1(t0.ating*100)}</td><td>${nf1(t0.oee*100)}</td><td>${nf1(t0.parauto)}</td></tr></tfoot></table>`;
  }else{
    esquerda='<h4>Comparativo por máquina</h4><table><thead><tr><th>Máquina</th><th>Peças</th><th>OEE %</th><th>Meta %</th><th>Ritmo</th><th>Parado</th></tr></thead><tbody>'
      +AS.map(A=>`<tr><td>${esc(A.maq.nome)}</td><td>${nf(A.tot.pcs)}</td>`
        +`<td style="font-weight:700;color:${A.tot.oee>=.85?'#1B8A5A':A.tot.oee>=.7?'#B27300':'#C33C4E'}">${nf1(A.tot.oee*100)}</td>`
        +`<td>${nf1(A.tot.ating*100)}</td><td>${nf(A.tot.ritmo)}</td><td>${nf1(A.tot.parauto)}</td></tr>`).join('')
      +`</tbody><tfoot><tr><td>Total</td><td>${nf(sum.pcs)}</td><td>${sum.plan>0?nf1(sum.pcs/sum.plan*100):'—'}</td>`
      +`<td>${sum.meta>0?nf1(sum.pcs/sum.meta*100):'—'}</td><td>—</td><td>${nf1(sum.par)}</td></tr></tfoot></table>`;
  }
  const todas=AS.flatMap(A=>A.paradas.map(p=>({...p,nm:A.maq.nome,cap:A.maq.cap}))).sort((a,b)=>b.min-a.min).slice(0,5);
  let direita='';
  if(todas.length){
    direita+='<h4>Maiores paradas</h4><table><thead><tr><th>Quando</th>'+(um?'':'<th>Máquina</th>')
      +'<th>Duração</th><th>Peças</th></tr></thead><tbody>'
      +todas.map(p=>{const a=new Date(p.ini),b=new Date(p.fim);
        return `<tr><td>${pad2(a.getDate())}/${pad2(a.getMonth()+1)} ${hhmm(a)}–${hhmm(b)}</td>`
          +(um?'':`<td style="text-align:left;font-family:Inter,sans-serif">${esc(p.nm)}</td>`)
          +`<td>${nf1(p.min)} min</td><td>${nf(p.min/60*p.cap)}</td></tr>`}).join('')+'</tbody></table>';
  }
  direita+='<h4>Leitura do período</h4>'+diagnosticos().slice(0,um?4:5).map(d=>
    `<div class="rp ${d[0]==='ok'?'g':d[0]==='crit'?'r':d[0]==='aten'?'w':''}">`
    +`<div class="rt">${semTags(d[3])}</div><div class="rd">${d[4]}</div></div>`).join('');

  $('rel').innerHTML=`
  <div class="rh">
    <div><h3>Relatório de produção${um?' — '+esc(c0.nome):''}</h3>
      <div class="rsub">${periodoTxt()} · agrupado por ${LAST.gran}${um?' · '+(c0.modo==='unidade'?'1 peça por incremento':nf(c0.porInc)+' peças por '+esc(c0.unid))+' · capacidade '+nf(c0.cap)+' peças/h':''}</div></div>
    <div class="rst">Emitido em ${new Date().toLocaleDateString('pt-BR')}<br>${hhmm(new Date())}</div>
  </div>
  <div class="rk">${kpis.map(([k,v,u])=>`<div><div class="lb">${k}</div><div class="vl">${v}</div><div class="un">${u}</div></div>`).join('')}</div>
  <h4>Produção contra meta</h4>
  <div class="leg">${AS.map(A=>`<span><span style="background:${A.maq.cor}"></span>${esc(A.maq.nome)}</span>`).join('')}
    <span><span style="background:#D97706"></span>Meta</span></div>
  <canvas id="relch" height="190"></canvas>
  <div class="cols" style="margin-top:4px"><div>${esquerda}</div><div>${direita}</div></div>
  <div class="rf"><span>OEE = produzido ÷ (capacidade × tempo disponível). Tempo disponível = janela dos dados menos abono.</span><span>${periodoTxt()}</span></div>`;
  $('relbox').classList.add('on');
  requestAnimationFrame(()=>{grafico($('relch'),712,190);$('relbox').scrollIntoView({behavior:'smooth',block:'start'})});
}
$('r_a4').addEventListener('click',relatorioA4);
$('r_close').addEventListener('click',()=>$('relbox').classList.remove('on'));
$('r_print').addEventListener('click',()=>{
  document.body.classList.add('imprimir-rel');
  const limpa=()=>document.body.classList.remove('imprimir-rel');
  window.addEventListener('afterprint',limpa,{once:true});
  setTimeout(()=>{window.print();setTimeout(limpa,1200)},60);
});

function textoWhats(){
  const {AS}=LAST;
  let t=`*Produção ${periodoTxt()}*\n`;
  for(const A of AS){
    const x=A.tot,c=A.maq,ic=x.oee>=.85?'✅':x.oee>=.7?'⚠️':'🔴';
    t+=`\n${ic} *${c.nome}*\n`;
    t+=`${nf(x.pcs)} pçs (${nf(x.inc)} ${c.unid}s)\n`;
    t+=`OEE *${nf1(x.oee*100)}%* · meta ${nf1(x.ating*100)}%\n`;
    t+=`${hDur(x.planej)} disponíveis · parou ${nf1(x.parauto)} min em ${x.npar}x\n`;
    if(A.turnos.length)for(const l of A.turnos)
      t+=`  ${l.bk.rot}: ${nf(l.pcs)} pçs · OEE ${nf1(l.oeeTurno*100)}%\n`;
    if(x.refugo>0||x.retrab>0)t+=`Refugo ${nf(x.refugo)} · retrab. ${nf(x.retrab)}\n`;
    if(A.paradas.length){const p=A.paradas[0];t+=`Maior parada ${hhmm(new Date(p.ini))} · ${nf1(p.min)} min\n`}
  }
  return t;
}
function textoEmail(){
  const {AS}=LAST;
  const sum=AS.reduce((s,A)=>({pcs:s.pcs+A.tot.pcs,plan:s.plan+A.tot.planCap,meta:s.meta+A.tot.planMeta}),{pcs:0,plan:0,meta:0});
  const oee=sum.plan>0?sum.pcs/sum.plan:0;
  const assunto=`Produção ${periodoTxt()} — OEE ${nf1(oee*100)}%`
    +(AS.length===1?` (${AS[0].maq.nome})`:` (${AS.length} máquinas)`);
  let b=`Assunto: ${assunto}\n\nPrezados,\n\nSegue o fechamento de produção de ${periodoTxt()}, apurado a partir do contador do historian.\n\n`;
  b+=`RESUMO\nProdução: ${nf(sum.pcs)} peças\nPlanejado pela capacidade: ${nf(sum.plan)} peças\nOEE: ${nf1(oee*100)}%\n`;
  b+=`Meta do período: ${nf(sum.meta)} peças — atingimento ${sum.meta>0?nf1(sum.pcs/sum.meta*100):'—'}%\n\n`;
  for(const A of AS){
    const x=A.tot,c=A.maq;
    b+=`${c.nome.toUpperCase()}\n`;
    b+=`- Produção: ${nf(x.pcs)} peças (${nf(x.inc)} ${c.unid}s, ${nf(pecas(c))} peças cada)\n`;
    b+=`- Tempo: janela de ${hDur(x.janela)}, disponível ${hDur(x.planej)}, rodando ${hDur(x.oper)}\n`;
    b+=`- OEE: ${nf1(x.oee*100)}% — ${nf(x.pcs)} produzidas contra ${nf(x.planCap)} planejadas (${nf(c.cap)} peças/h)\n`;
    b+=`- Meta: ${nf1(x.ating*100)}% de ${nf(x.planMeta)} peças\n`;
    b+=`- Paradas: ${x.npar} somando ${nf1(x.parauto)} min — disponibilidade ${nf1(x.disp*100)}%\n`;
    b+=`- Intervalo médio entre ${c.unid}s: ${x.interv?nf1(x.interv)+' s':'—'}\n`;
    if(x.abono>0)b+=`- Abono: ${nf1(x.abono)} min, descontados do tempo disponível\n`;
    if(x.extra>0)b+=`- Hora extra: ${nf1(x.extra)} min\n`;
    if(x.refugo>0||x.retrab>0)b+=`- Refugo ${nf(x.refugo)} e retrabalho ${nf(x.retrab)} peças — OEE líquido ${nf1(x.oeeLiq*100)}%\n`;
    if(A.turnos.length){
      b+=`- Por turno:\n`;
      for(const l of A.turnos)
        b+=`   ${l.bk.dia} ${l.bk.rot}: ${nf(l.pcs)} peças em ${hDur(l.janela)} — OEE ${nf1(l.oeeTurno*100)}% (parcial ${nf1(l.oeeParcial*100)}%)\n`;
    }
    if(A.paradas.length)
      b+=`- Maiores paradas: `+A.paradas.slice(0,3).map(p=>{const a=new Date(p.ini),z=new Date(p.fim);
        return `${pad2(a.getDate())}/${pad2(a.getMonth()+1)} ${hhmm(a)}-${hhmm(z)} (${nf1(p.min)} min)`}).join('; ')+`\n`;
    b+=`\n`;
  }
  b+=`PONTOS DE ATENÇÃO\n`+diagnosticos().slice(0,4).map((d,i)=>`${i+1}. ${semTags(d[3])} — ${semTags(d[4])}`).join('\n');
  b+=`\n\nCritério: OEE = produzido dividido pelo planejado, sendo o planejado a capacidade da máquina multiplicada pelo tempo disponível. `
    +`O tempo disponível é a janela coberta pelos dados menos o abono lançado. As paradas vêm da ausência de incremento no contador e devem ser confrontadas com o apontamento do MES.\n\nAtenciosamente,\n`;
  return{assunto,corpo:b};
}
function mostrarTexto(titulo,sub,texto,mail){
  $('dlg_t').textContent=titulo;$('dlg_p').textContent=sub;
  $('dlg_b').innerHTML='<textarea class="txout" id="tx_out" readonly></textarea>';
  $('tx_out').value=texto;$('dlg_f').innerHTML='';
  const fechar=el('button','act');fechar.type='button';fechar.textContent='Fechar';
  fechar.addEventListener('click',()=>$('dlg').close());
  const copiar=el('button','act pri');copiar.type='button';copiar.textContent='Copiar';
  copiar.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(texto);copiar.textContent='Copiado'}
    catch{$('tx_out').select();document.execCommand('copy');copiar.textContent='Copiado'}
    setTimeout(()=>copiar.textContent='Copiar',1600);});
  $('dlg_f').append(fechar);
  if(mail){
    const m=el('button','act');m.type='button';m.textContent='Abrir no e-mail';
    m.addEventListener('click',()=>{
      const corpo=mail.corpo.split('\n').slice(2).join('\n');
      location.href='mailto:?subject='+encodeURIComponent(mail.assunto)+'&body='+encodeURIComponent(corpo.slice(0,1800));});
    $('dlg_f').append(m);
  }
  $('dlg_f').append(copiar);$('dlg').showModal();
}
$('r_wa').addEventListener('click',()=>{if(!LAST){toast('Rode a análise primeiro');return}
  mostrarTexto('Resumo para WhatsApp','Já formatado com asteriscos para colar na conversa.',textoWhats())});
$('r_em').addEventListener('click',()=>{if(!LAST){toast('Rode a análise primeiro');return}
  const m=textoEmail();mostrarTexto('Texto para e-mail','Assunto na primeira linha.',m.corpo,m)});
