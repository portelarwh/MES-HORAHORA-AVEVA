/* 40-metrics.js — Motor de métricas: janela, tempo disponível, OEE, turnos. */
"use strict";

async function carregarPontos(id,de,ate){
  return (await getAll('dias')).filter(r=>r.maquinaId===id&&r.data>=de&&r.data<=ate)
    .sort((a,b)=>a.data.localeCompare(b.data));
}
function analisarMaquina(maq,dias,limMin){
  const ev=[],janelas=[],paradas=[];let resets=0,frac=0;
  const limS=limMin*60;
  for(const d of dias){
    const pts=d.pts;if(pts.length<2)continue;
    janelas.push({ini:pts[0][0],fim:pts[pts.length-1][0]});
    for(const p of pts)if(!Number.isInteger(p[1]))frac++;
    for(let i=1;i<pts.length;i++){
      let dd=pts[i][1]-pts[i-1][1];
      if(dd<0){resets++;dd=Math.max(0,pts[i][1]-(maq.offset||0))}
      const gap=(pts[i][0]-pts[i-1][0])/1000;
      ev.push({t:pts[i][0],t0:pts[i-1][0],gap,inc:dd});
      if(gap>limS)paradas.push({ini:pts[i-1][0],fim:pts[i][0],min:gap/60});
    }
  }
  const tcs=ev.filter(e=>e.inc>0).map(e=>e.gap/e.inc).sort((a,b)=>a-b);
  const q=p=>tcs.length?tcs[Math.min(tcs.length-1,Math.floor(p*tcs.length))]:null;
  return{maq,ev,janelas,paradas:paradas.sort((a,b)=>b.min-a.min),resets,frac,
    tcP10:q(.10),tcMed:q(.50),
    primeiro:janelas.length?Math.min(...janelas.map(j=>j.ini)):0,
    ultimo:janelas.length?Math.max(...janelas.map(j=>j.fim)):0};
}
function lancDe(id,a,b,pc){
  const r={abono:0,extra:0,paradaJust:0,refugo:0,retrab:0,motivos:[]};
  for(const j of AJU){
    if(j.maquinaId!==id&&j.maquinaId!=='*')continue;
    const p=j.data.split('-');
    if(j.tipo==='refugo'||j.tipo==='retrabalho'){
      const d0=new Date(+p[0],+p[1]-1,+p[2]).getTime();
      if(d0>=a-86400000&&d0<b&&ovl(d0,d0+86400000,a,b)>0){
        const qt=(j.un==='inc'?j.qtd*pc:j.qtd)*(ovl(d0,d0+86400000,a,b)/1440);
        if(j.tipo==='refugo')r.refugo+=qt;else r.retrab+=qt;
      }
      continue;
    }
    const hh=(j.inicio||'00:00').split(':');
    const i0=new Date(+p[0],+p[1]-1,+p[2],+hh[0],+hh[1]).getTime();
    const o=ovl(i0,i0+(j.minutos||0)*60000,a,b);
    if(o>0){
      if(j.tipo==='abono')r.abono+=o;
      else if(j.tipo==='extra')r.extra+=o;
      else if(j.tipo==='parada'){r.paradaJust+=o;if(j.obs)r.motivos.push(j.obs)}
    }
  }
  return r;
}
function turnosNoIntervalo(ini,fim,excluirId){
  const out=[];
  let d=new Date(ini);d.setHours(0,0,0,0);d.setDate(d.getDate()-1);
  for(let k=0;k<420&&d.getTime()<fim+86400000;k++){
    for(const t of TUR){
      const a=new Date(d);a.setHours(0,0,0,0);a.setMinutes(hm(t.inicio));
      const dur=((hm(t.fim)-hm(t.inicio)+1440)%1440)||1440;
      out.push({a:a.getTime(),b:a.getTime()+dur*60000,rot:t.nome,turnoId:t.id,
        dia:pad2(a.getDate())+'/'+pad2(a.getMonth()+1)});
    }
    d.setDate(d.getDate()+1);
  }
  out.sort((x,y)=>x.a-y.a);
  if(excluirId){
    const keep=[];
    for(let i=0;i<out.length;i++){
      if(out[i].turnoId!==excluirId){keep.push(out[i]);continue}
      let j=i+1;
      while(j<out.length&&out[j].turnoId===excluirId)j++;
      if(j<out.length){out[j].a=Math.min(out[j].a,out[i].a);out[j].anexado=true}
      else if(keep.length){keep[keep.length-1].b=Math.max(keep[keep.length-1].b,out[i].b);keep[keep.length-1].anexado=true}
    }
    return keep.filter(x=>x.b>ini&&x.a<fim);
  }
  return out.filter(x=>x.b>ini&&x.a<fim);
}
function bucketsDe(gran,ini,fim,excluirId){
  if(gran==='dia'){
    const B=[];let d=new Date(ini);d.setHours(0,0,0,0);
    while(d.getTime()<fim){const n=new Date(d);n.setDate(n.getDate()+1);
      B.push({a:d.getTime(),b:n.getTime(),rot:pad2(d.getDate())+'/'+pad2(d.getMonth()+1)});d=n}
    return B;
  }
  if(gran==='turno'&&TUR.length) return turnosNoIntervalo(ini,fim,excluirId);
  const B=[];let d=new Date(ini);d.setMinutes(0,0,0);
  while(d.getTime()<fim){const n=new Date(d.getTime()+3600000);
    B.push({a:d.getTime(),b:n.getTime(),rot:pad2(d.getHours())+'h',dia:pad2(d.getDate())+'/'+pad2(d.getMonth()+1)});d=n}
  return B;
}
/* núcleo: métricas de um recorte de tempo para uma máquina */
function metricas(A,a,b){
  const c=A.maq,pc=pecas(c);
  let inc=0,ap=0,parauto=0,npar=0,cob=0,ultimo=0;
  for(const e of A.ev)if(e.t>=a&&e.t<b){inc+=e.inc;ap++;if(e.t>ultimo)ultimo=e.t}
  for(const j of A.janelas){cob+=ovl(j.ini,j.fim,a,b);
    if(j.ini>=a&&j.ini<b&&!ap)ultimo=Math.max(ultimo,j.ini)}
  for(const p of A.paradas){const o=ovl(p.ini,p.fim,a,b);if(o>0){parauto+=o;if(p.ini>=a&&p.ini<b)npar++}}
  const L=lancDe(c.id,a,b,pc);
  const janela=cob;                                  // tempo coberto pelos dados
  const planej=Math.max(0,janela-L.abono);            // tempo disponível
  const oper=Math.max(0,planej-parauto);              // tempo efetivamente rodando
  const pcs=inc*pc;
  const bom=Math.max(0,pcs-L.refugo-L.retrab);
  const capH=c.cap,metaH=c.meta;
  const planCap=capH*(planej/60);                     // planejado = velocidade x tempo disponível
  const planMeta=metaH*(planej/60);
  const parcialMin=ultimo?Math.max(0,(ultimo-Math.max(a,A.primeiro||a))/60000-L.abono):0;
  const planParcial=capH*(parcialMin/60);
  return{a,b,inc,ap,npar,janela,planej,oper,parauto,pcs,bom,
    abono:L.abono,extra:L.extra,paradaJust:L.paradaJust,refugo:L.refugo,retrab:L.retrab,motivos:L.motivos,
    ultimo,parcialMin,planCap,planMeta,
    oee:planCap>0?pcs/planCap:0,
    oeeParcial:planParcial>0?pcs/planParcial:0,
    oeeLiq:planCap>0?bom/planCap:0,
    ating:planMeta>0?pcs/planMeta:0,
    ritmo:janela>0?pcs/(janela/60):0,
    ritmoOper:oper>0?pcs/(oper/60):0,
    disp:planej>0?oper/planej:0,
    interv:inc>0?(janela*60)/inc:null,
    intervOper:inc>0?(oper*60)/inc:null};
}
async function rodarAnalise(){
  const de=$('a_de').value,ate=$('a_ate').value;
  const sel=[...document.querySelectorAll('#a_maqs input:checked')].map(i=>i.value);
  if(!de||!ate||!sel.length){$('a_out').innerHTML='';$('a_vazio').style.display='block';LAST=null;return}
  const lim=+$('a_lim').value||3,gran=$('a_gran').value;
  const bd=$('a_borda').value||'todos';
  const excl=bd.startsWith('sem:')?bd.slice(4):null;
  const AS=[];
  for(const id of sel){
    const m=MAQ.find(x=>x.id===id);if(!m)continue;
    const dias=await carregarPontos(id,de,ate);if(!dias.length)continue;
    AS.push(analisarMaquina(m,dias,lim));
  }
  if(!AS.length){$('a_out').innerHTML='';$('a_vazio').style.display='block';LAST=null;
    toast('Nenhum dado importado nesse período');return}
  $('a_vazio').style.display='none';
  const ini=Math.min(...AS.map(a=>a.primeiro)),fim=Math.max(...AS.map(a=>a.ultimo));
  const B=bucketsDe(gran,ini,fim,excl);
  const BT=TUR.length?turnosNoIntervalo(ini,fim,excl):[];
  for(const A of AS){
    A.linhas=B.map(bk=>({bk,...metricas(A,bk.a,bk.b)}));
    A.turnos=BT.map(bk=>{
      const m=metricas(A,bk.a,bk.b);
      const durTurno=(bk.b-bk.a)/60000;
      const planTurno=A.maq.cap*Math.max(0,durTurno-m.abono)/60;
      return{bk,...m,durTurno,planTurno,oeeTurno:planTurno>0?m.pcs/planTurno:0};
    }).filter(x=>x.janela>0||x.abono>0);
    A.tot=metricas(A,ini,fim+1);
  }
  LAST={AS,B,BT,ini,fim,gran,lim,de,ate,excl};
  renderAnalise();
}
