/* 70-reports.js — Relatório executivo A4, resumo de WhatsApp e texto de
   e-mail. Todos declaram a janela exata, a base de cálculo e as fórmulas
   usadas: o número sai da ferramenta junto com o critério que o produziu. */
"use strict";

const periodoTxt=()=>dtBR(LAST.ini,'min')+' a '+dtBR(LAST.fim,'min');
const semTags=s=>String(s).replace(/<[^>]+>/g,'');
const corOEE=r=>r==null?'#8593A5':r>=.85?'#1B8A5A':r>=.7?'#B27300':'#C33C4E';
const RODAPE_FORMULAS=()=>'OEE = peças ÷ (capacidade × base ÷ 60). Meta proporcional = meta × base ÷ 60. '
  +'Base desta emissão: '+rotuloBase(LAST.base)+' — '+descBase(LAST.base)+'. '
  +'Tempo sem dados é ausência de registro e não é contado como parada.';

function relatorioA4(){
  if(!LAST){toast('Rode a análise primeiro');return}
  const {AS}=LAST,um=AS.length===1,A0=AS[0],c0=A0.maq,t0=A0.tot;
  const sum=AS.reduce((s,A)=>({pcs:s.pcs+A.tot.pcs,plan:s.plan+(A.tot.planCapBase||0),
    meta:s.meta+(A.tot.planMetaBase||0),par:s.par+A.tot.parado,npar:s.npar+A.tot.nPar,
    sem:s.sem+A.tot.semDados}),{pcs:0,plan:0,meta:0,par:0,npar:0,sem:0});
  const kpis=um?[
    ['Produção',nf(t0.pcs),'peças · '+nf(t0.inc)+' '+esc(c0.unid)+'s'],
    ['OEE',fmtPct(t0.oeeBase),'de '+fmtVal(t0.planCapBase)+' planejadas'],
    ['Atingimento',fmtPct(t0.atingBase),'meta '+fmtVal(t0.planMetaBase)],
    ['Base do cálculo',hDur(t0.tempoBase),rotuloBase(t0.base)],
    ['Cobertura',fmtPct(t0.cobertura),'sem dados '+hDur(t0.semDados)]
  ]:[
    ['Produção total',nf(sum.pcs),'peças · '+AS.length+' máquinas'],
    ['OEE consolidado',pct(sum.pcs,sum.plan),'de '+nf(sum.plan)+' planejadas'],
    ['Atingimento',pct(sum.pcs,sum.meta),'meta '+nf(sum.meta)],
    ['Base do cálculo',rotuloBase(LAST.base),'igual para todas'],
    ['Paradas',nf(sum.npar),nf1(sum.par)+' min no total']
  ];
  let esquerda;
  if(um&&A0.turnos.length){
    esquerda='<h4>Fechamento por turno</h4><table><thead><tr><th>Turno</th><th>Status</th><th>Peças</th>'
      +'<th>Com dados</th><th>OEE</th><th>Parcial</th></tr></thead><tbody>'
      +A0.turnos.map(l=>`<tr><td>${l.bk.dia} ${esc(l.bk.rot)}</td>`
        +`<td style="text-align:left;font-family:Inter,sans-serif">${l.status.rot}</td>`
        +`<td>${nf(l.pcs)}${l.incAbsorvido>0?' <small>(+'+nf(l.incAbsorvido)+')</small>':''}</td><td>${hDur(l.comDados)}</td>`
        +`<td style="font-weight:700;color:${corOEE(l.oeeBase)}">${fmtPct(l.oeeBase)}</td>`
        +`<td>${fmtPct(l.oee.parcial)}</td></tr>`).join('')
      +`</tbody><tfoot><tr><td>Total</td><td></td><td>${nf(t0.pcs)}</td><td>${hDur(t0.comDados)}</td>`
      +`<td>${fmtPct(t0.oeeBase)}</td><td>${fmtPct(t0.oee.parcial)}</td></tr></tfoot></table>`;
  }else if(um){
    const vis=A0.horas.filter(l=>l.regs>0).slice(0,20);
    esquerda='<h4>Produção por hora</h4><table><thead><tr><th>Hora</th><th>Peças</th><th>Meta %</th>'
      +'<th>OEE %</th><th>Sem dados</th><th>Parado</th></tr></thead><tbody>'
      +vis.map(l=>`<tr><td>${(l.bk.dia?l.bk.dia+' ':'')+l.bk.rot}</td><td>${nf(l.pcs)}</td>`
        +`<td>${fmtPct(l.atingBase)}</td>`
        +`<td style="font-weight:700;color:${corOEE(l.oeeBase)}">${fmtPct(l.oeeBase)}</td>`
        +`<td>${l.semDados>0?nf1(l.semDados):'—'}</td><td>${l.parado>0?nf1(l.parado):'—'}</td></tr>`).join('')
      +`</tbody><tfoot><tr><td>Total</td><td>${nf(t0.pcs)}</td><td>${fmtPct(t0.atingBase)}</td>`
      +`<td>${fmtPct(t0.oeeBase)}</td><td>${nf1(t0.semDados)}</td><td>${nf1(t0.parado)}</td></tr></tfoot></table>`;
  }else{
    esquerda='<h4>Comparativo por máquina</h4><table><thead><tr><th>Máquina</th><th>Peças</th><th>OEE %</th>'
      +'<th>Meta %</th><th>Cobertura</th><th>Parado</th></tr></thead><tbody>'
      +AS.map(A=>`<tr><td>${esc(A.maq.nome)}</td><td>${nf(A.tot.pcs)}</td>`
        +`<td style="font-weight:700;color:${corOEE(A.tot.oeeBase)}">${fmtPct(A.tot.oeeBase)}</td>`
        +`<td>${fmtPct(A.tot.atingBase)}</td><td>${fmtPct(A.tot.cobertura)}</td>`
        +`<td>${nf1(A.tot.parado)}</td></tr>`).join('')
      +`</tbody><tfoot><tr><td>Total</td><td>${nf(sum.pcs)}</td><td>${pct(sum.pcs,sum.plan)}</td>`
      +`<td>${pct(sum.pcs,sum.meta)}</td><td>—</td><td>${nf1(sum.par)}</td></tr></tfoot></table>`;
  }
  const todas=AS.flatMap(A=>A.paradas.map(p=>({...p,nm:A.maq.nome,cap:A.maq.cap})))
    .sort((a,b)=>b.min-a.min).slice(0,5);
  let direita='';
  if(todas.length){
    direita+='<h4>Maiores paradas</h4><table><thead><tr><th>Quando</th>'+(um?'':'<th>Máquina</th>')
      +'<th>Duração</th><th>Peças</th></tr></thead><tbody>'
      +todas.map(p=>`<tr><td>${dtCurto(p.a)}–${hhmm(new Date(p.b))}</td>`
        +(um?'':`<td style="text-align:left;font-family:Inter,sans-serif">${esc(p.nm)}</td>`)
        +`<td>${nf1(p.min)} min</td><td>${p.cap>0?nf(p.min/60*p.cap):NAO_CALC}</td></tr>`).join('')
      +'</tbody></table>';
  }
  const lac=AS.flatMap(A=>A.lacunas.map(g=>({...g,nm:A.maq.nome}))).sort((a,b)=>b.min-a.min).slice(0,4);
  if(lac.length){
    direita+='<h4>Ausência de dados</h4><table><thead><tr><th>Quando</th>'+(um?'':'<th>Máquina</th>')
      +'<th>Duração</th></tr></thead><tbody>'
      +lac.map(g=>`<tr><td>${dtCurto(g.a)}–${hhmm(new Date(g.b))}</td>`
        +(um?'':`<td style="text-align:left;font-family:Inter,sans-serif">${esc(g.nm)}</td>`)
        +`<td>${nf1(g.min)} min</td></tr>`).join('')+'</tbody></table>';
  }
  direita+='<h4>Leitura do período</h4>'+diagnosticos().slice(0,um?4:5).map(d=>
    `<div class="rp ${d[0]==='ok'?'g':d[0]==='crit'?'r':d[0]==='aten'?'w':''}">`
    +`<div class="rt">${semTags(d[3])}</div><div class="rd">${d[4]}</div></div>`).join('');

  $('rel').innerHTML=`
  <div class="rh">
    <div><h3>Relatório de produção${um?' — '+esc(c0.nome):''}</h3>
      <div class="rsub">${periodoTxt()} · base: ${esc(rotuloBase(LAST.base))}${um?' · '+(c0.modo==='unidade'?'1 peça por incremento':nf(c0.porInc)+' peças por '+esc(c0.unid))+' · capacidade '+nf(c0.cap)+' peças/h':''}</div></div>
    <div class="rst">Emitido em ${new Date().toLocaleDateString('pt-BR')}<br>${hhmm(new Date())}</div>
  </div>
  <div class="rk">${kpis.map(([k,v,u])=>`<div><div class="lb">${k}</div><div class="vl">${v}</div><div class="un">${u}</div></div>`).join('')}</div>
  <h4>Produção contra meta</h4>
  <div class="leg">${AS.map(A=>`<span><span style="background:${A.maq.cor}"></span>${esc(A.maq.nome)}</span>`).join('')}
    <span><span style="background:#D97706"></span>Meta</span></div>
  <canvas id="relch" height="190"></canvas>
  <div class="cols" style="margin-top:4px"><div>${esquerda}</div><div>${direita}</div></div>
  ${um?blocoRastro(A0):''}
  <div class="rf"><span>${RODAPE_FORMULAS()}</span><span>${periodoTxt()}</span></div>`;
  $('relbox').classList.add('on');
  requestAnimationFrame(()=>{protegido('o gráfico do relatório',()=>grafico($('relch'),712,190));
    $('relbox').scrollIntoView({behavior:'smooth',block:'start'})});
}
/* Bloco de rastreabilidade impresso no A4: fórmula e números de cada base. */
function blocoRastro(A){
  const t=A.tot,c=A.maq;
  const L=[
    ['Marcações','última − primeira marcação',t.primeiroReg==null?NAO_CALC:dtBR(t.primeiroReg,'min')+' → '+dtBR(t.ultimoReg,'min'),hDur(t.marcacoes),t.oee.marcacoes],
    ['Programado','período − abono',hDur(t.dur)+' − '+nf1(t.abono)+' min',hDur(t.programado),t.oee.programado],
    ['Observado','com dados − abono',hDur(t.comDados)+' − '+nf1(t.abonoCoberto)+' min',hDur(t.observado),t.oee.observado],
    ['Operacional','observado − paradas',hDur(t.observado)+' − '+nf1(t.parado)+' min',hDur(t.operacional),t.oee.operacional],
    ['Parcial','última marcação − início do período',t.ultimoReg==null?NAO_CALC:dtBR(t.ultimoReg,'min'),hDur(t.parcial),t.oee.parcial]
  ];
  return '<h4>Bases de cálculo e fórmulas</h4><table><thead><tr><th>Base</th><th>Definição</th>'
    +'<th>Conta</th><th>Tempo</th><th>Planejado</th><th>OEE</th></tr></thead><tbody>'
    +L.map(([a,b,cc,d,e],i)=>`<tr><td>${a}</td>`
      +`<td style="text-align:left;font-family:Inter,sans-serif">${b}</td><td>${cc}</td><td>${d}</td>`
      +`<td>${fmtVal(t.planCap[['marcacoes','programado','observado','operacional','parcial'][i]])}</td>`
      +`<td style="font-weight:700;color:${corOEE(e)}">${fmtPct(e)}</td></tr>`).join('')
    +`</tbody></table><div style="font-size:7pt;color:#8593A5;margin-top:3px">`
    +`Leitura do contador ${fmtVal(t.leituraIni)} → ${fmtVal(t.leituraFim)} (indica a próxima unidade, contagem inicia em ${nf(t.contagemInicial)}). `
    +`Peças = ${nf(t.inc)} incrementos × ${nf(A.pc)} = ${nf(t.pcs)}. `
    +`Planejado = ${nf(c.cap)} peças/h × base ÷ 60. Meta = ${nf(c.meta)} peças/h × base ÷ 60.</div>`;
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
  let t=`*Produção ${periodoTxt()}*\n_base: ${rotuloBase(LAST.base)}_\n`;
  for(const A of AS){
    const x=A.tot,c=A.maq;
    const ic=x.oeeBase==null?'⬜':x.oeeBase>=.85?'✅':x.oeeBase>=.7?'⚠️':'🔴';
    t+=`\n${ic} *${c.nome}*\n`;
    t+=`${nf(x.pcs)} pçs (${nf(x.inc)} ${c.unid}s)\n`;
    t+=`OEE *${fmtPct(x.oeeBase)}* · meta ${fmtPct(x.atingBase)}\n`;
    t+=`${hDur(x.tempoBase)} de base · parou ${nf1(x.parado)} min em ${x.nPar}x\n`;
    t+=`Dados: ${A.qual.rotulo} · cobertura ${fmtPct(x.cobertura)}`;
    t+=x.semDados>0?` · sem dados ${hDur(x.semDados)}\n`:`\n`;
    if(A.turnos.length)for(const l of A.turnos)
      t+=`  ${l.bk.dia} ${l.bk.rot}: ${nf(l.pcs)} pçs · OEE ${fmtPct(l.oee.programado)} (${l.status.rot})\n`;
    if(x.refugo>0||x.retrab>0)t+=`Refugo ${nf(x.refugo)} · retrab. ${nf(x.retrab)}\n`;
    if(A.paradas.length){const p=A.paradas[0];t+=`Maior parada ${dtCurto(p.a)} · ${nf1(p.min)} min\n`}
  }
  return t;
}
function textoEmail(){
  const {AS}=LAST;
  const sum=AS.reduce((s,A)=>({pcs:s.pcs+A.tot.pcs,plan:s.plan+(A.tot.planCapBase||0),
    meta:s.meta+(A.tot.planMetaBase||0)}),{pcs:0,plan:0,meta:0});
  const oee=razao(sum.pcs,sum.plan);
  const assunto=`Produção ${dtBR(LAST.ini,'min')} a ${dtBR(LAST.fim,'min')} — OEE ${fmtPct(oee)}`
    +(AS.length===1?` (${AS[0].maq.nome})`:` (${AS.length} máquinas)`);
  let b=`Assunto: ${assunto}\n\nPrezados,\n\nSegue o fechamento de produção de ${periodoTxt()}, `
    +`apurado a partir do contador do historian.\n\n`;
  b+=`JANELA E CRITÉRIO\nPeríodo: ${periodoTxt()}\nBase de cálculo: ${rotuloBase(LAST.base)} — ${descBase(LAST.base)}\n`;
  b+=`Limiar de parada: ${nf1(LAST.lim)} min · limiar de ausência de dados: ${nf1(LAST.limSD)} min\n\n`;
  b+=`RESUMO\nProdução: ${nf(sum.pcs)} peças\nPlanejado pela capacidade: ${nf(sum.plan)} peças\nOEE: ${fmtPct(oee)}\n`;
  b+=`Meta do período: ${nf(sum.meta)} peças — atingimento ${pct(sum.pcs,sum.meta)}\n\n`;
  for(const A of AS){
    const x=A.tot,c=A.maq;
    b+=`${c.nome.toUpperCase()}\n`;
    b+=`- Produção: ${nf(x.pcs)} peças (${nf(x.inc)} ${c.unid}s, ${nf(A.pc)} peças cada)\n`;
    if(x.naoAtrib>0)b+=`- Não atribuído: ${nf(x.naoAtrib)} incrementos vindos após lacuna ou borda, fora da contagem\n`;
    b+=`- Primeira marcação: ${x.primeiroReg==null?NAO_CALC:dtBR(x.primeiroReg)}\n`;
    b+=`- Última marcação: ${x.ultimoReg==null?NAO_CALC:dtBR(x.ultimoReg)}\n`;
    b+=`- Tempo: período ${hDur(x.dur)}, com dados ${hDur(x.comDados)}, sem dados ${hDur(x.semDados)}, rodando ${hDur(x.operacional)}\n`;
    b+=`- Leitura do contador: ${fmtVal(x.leituraIni)} → ${fmtVal(x.leituraFim)} (indica a próxima unidade, contagem inicia em ${nf(x.contagemInicial)})\n`;
    if(x.incAbsorvido>0)b+=`- Adiantadas absorvidas: ${nf(x.incAbsorvido)} incrementos feitos antes do início do turno\n`;
    b+=`- OEE entre marcações ${fmtPct(x.oee.marcacoes)} | programado ${fmtPct(x.oee.programado)} | observado ${fmtPct(x.oee.observado)} | operacional ${fmtPct(x.oee.operacional)} | parcial ${fmtPct(x.oee.parcial)}\n`;
    b+=`- Meta proporcional (${rotuloBase(x.base)}): ${fmtVal(x.planMetaBase)} peças — atingimento ${fmtPct(x.atingBase)}\n`;
    b+=`- Paradas: ${x.nPar} somando ${nf1(x.parado)} min — disponibilidade ${fmtPct(x.disp)}\n`;
    b+=`- Qualidade dos dados: ${A.qual.rotulo} (cobertura ${fmtPct(x.cobertura)}, ${x.nLac} lacuna(s))\n`;
    b+=`- Intervalo médio entre ${c.unid}s: ${fmtSeg(x.interv)}\n`;
    if(x.abono>0)b+=`- Abono: ${nf1(x.abono)} min, descontados de todas as bases\n`;
    if(x.extra>0)b+=`- Hora extra: ${nf1(x.extra)} min\n`;
    if(x.refugo>0||x.retrab>0)b+=`- Refugo ${nf(x.refugo)} e retrabalho ${nf(x.retrab)} peças — OEE líquido ${fmtPct(x.oeeLiq)}\n`;
    if(A.turnos.length){
      b+=`- Por turno:\n`;
      for(const l of A.turnos)
        b+=`   ${l.bk.dia} ${l.bk.rot} [${l.status.rot}]: ${nf(l.pcs)} peças`
          +(l.incAbsorvido>0?` (inclui ${nf(l.incAbsorvido)} adiantadas)`:'')
          +` em ${hDur(l.comDados)} com dados — OEE ${fmtPct(l.oeeBase)} (parcial ${fmtPct(l.oee.parcial)})\n`;
    }
    if(A.paradas.length)
      b+=`- Maiores paradas: `+A.paradas.slice(0,3).map(p=>`${dtCurto(p.a)}-${hhmm(new Date(p.b))} (${nf1(p.min)} min)`).join('; ')+`\n`;
    if(A.lacunas.length)
      b+=`- Maiores lacunas de dados: `+A.lacunas.slice(0,3).map(g=>`${dtCurto(g.a)}-${hhmm(new Date(g.b))} (${nf1(g.min)} min)`).join('; ')+`\n`;
    b+=`\n`;
  }
  b+=`PONTOS DE ATENÇÃO\n`+diagnosticos().slice(0,4).map((d,i)=>`${i+1}. ${semTags(d[3])} — ${semTags(d[4])}`).join('\n');
  b+=`\n\nCRITÉRIO\n${RODAPE_FORMULAS()} As paradas vêm da ausência de incremento no contador e devem ser `
    +`confrontadas com o apontamento do MES.\n\nAtenciosamente,\n`;
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
