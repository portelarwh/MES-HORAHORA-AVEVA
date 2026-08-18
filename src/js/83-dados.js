/* 83-dados.js — Cobertura da base, backup e restauração. */
"use strict";

async function montarDados(){
  const all=await getAll('dias'),porMaq=new Map();let pts=0;
  for(const r of all){pts+=r.pts.length;
    if(!porMaq.has(r.maquinaId))porMaq.set(r.maquinaId,{dias:0,pts:0,min:'9999',max:'0'});
    const o=porMaq.get(r.maquinaId);o.dias++;o.pts+=r.pts.length;
    if(r.data<o.min)o.min=r.data;if(r.data>o.max)o.max=r.data;}
  $('db_kpis').innerHTML=[
    ['Máquinas',nf(MAQ.length),'cadastradas','c'],['Turnos',nf(TUR.length),'cadastrados','c'],
    ['Dias com dados',nf(all.length),'somando todas as máquinas','o'],
    ['Registros guardados',nf(pts),'pontos do contador','o']
  ].map(([k,v,u,x])=>`<div class="kpi ${x}"><div class="k"><span class="dot"></span>${k}</div><div class="v">${v}</div><div class="u">${u}</div></div>`).join('');
  let b='<thead><tr><th>Máquina</th><th>Dias</th><th>Registros</th><th>Primeiro dia</th><th>Último dia</th></tr></thead><tbody>';
  if(!porMaq.size)b+='<tr><td colspan="5" style="text-align:center;color:var(--tx3)">Nada importado ainda.</td></tr>';
  for(const [id,o] of porMaq){
    const m=MAQ.find(x=>x.id===id);
    b+=`<tr><td><span class="swatch" style="background:${m?m.cor:'var(--tx3)'};margin-right:7px"></span>${esc(m?m.nome:'(máquina removida)')}</td>`
      +`<td>${o.dias}</td><td>${nf(o.pts)}</td><td>${brDate(o.min)}</td><td>${brDate(o.max)}</td></tr>`;
  }
  $('db_tbl').innerHTML=b+'</tbody>';
}
$('db_exp').addEventListener('click',async()=>{
  const bk={versao:3,exportado:new Date().toISOString(),maquinas:await getAll('maquinas'),
    turnos:await getAll('turnos'),ajustes:await getAll('ajustes'),dias:await getAll('dias')};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(bk)],{type:'application/json'}));
  a.download='backup-monitor-hh-'+iso(new Date())+'.json';a.click();toast('Backup gerado')});
$('db_imp').addEventListener('click',()=>$('db_file').click());
$('db_file').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=async ev=>{
    try{
      const bk=JSON.parse(ev.target.result);
      for(const m of bk.maquinas||[])await put('maquinas',normaliza(m));
      for(const t of bk.turnos||[])await put('turnos',t);
      for(const j of bk.ajustes||[])await put('ajustes',j);
      for(const d of bk.dias||[]){
        const ex=await get1('dias',d.chave);
        if(ex){const mp=new Map(ex.pts.map(p=>[p[0],p[1]]));for(const p of d.pts)mp.set(p[0],p[1]);
          d.pts=[...mp.entries()].sort((a,b)=>a[0]-b[0])}
        await put('dias',d);
      }
      await recarregar();montarMaquinas();montarTurnos();montarDia();montarAnalise();montarDados();
      toast('Backup restaurado e mesclado');
    }catch(x){toast('Arquivo de backup inválido')}
  };
  rd.readAsText(f);e.target.value=''});
$('db_del').addEventListener('click',async()=>{
  if(!confirm('Apagar todos os registros de produção? Máquinas, turnos e lançamentos são mantidos.'))return;
  await clearS('dias');await montarDados();
  $('a_out').innerHTML='';$('a_vazio').style.display='block';$('relbox').classList.remove('on');LAST=null;
  toast('Registros de produção apagados')});
