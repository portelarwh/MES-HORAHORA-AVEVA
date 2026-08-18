/* 30-import.js — Fluxo de importação, escolha de máquina e mesclagem por dia. */
"use strict";

async function importar(files){
  if(!MAQ.length){toast('Cadastre uma máquina antes de importar');mostrar('maquinas');return}
  let maq=MAQ[0];
  if(MAQ.length>1){maq=await escolherMaquina();if(!maq)return}
  const log=$('i_log');log.innerHTML='';
  for(const f of files)await umArquivo(f,maq,log);
  await recarregar();montarAnalise();montarDados();
}
function escolherMaquina(){return new Promise(res=>{
  $('dlg_t').textContent='De qual máquina é este arquivo?';
  $('dlg_p').textContent='Os registros vão para o histórico da máquina escolhida.';
  $('dlg_b').innerHTML='';
  const box=el('div','pick');
  MAQ.forEach(m=>{const bt=el('button');bt.type='button';
    bt.innerHTML=`<span class="bar" style="background:${m.cor}"></span><span><span style="font-weight:600">${esc(m.nome)}</span><br>`
      +`<span style="font-size:12.5px;color:var(--tx2)">${m.modo==='unidade'?'1 peça por incremento':nf(m.porInc)+' peças por '+esc(m.unid)} · capacidade ${nf(m.cap)} peças/h</span></span>`;
    bt.addEventListener('click',()=>{$('dlg').close();res(m)});box.appendChild(bt)});
  $('dlg_b').appendChild(box);
  $('dlg_f').innerHTML='';
  const c=el('button','act');c.type='button';c.textContent='Cancelar';
  c.addEventListener('click',()=>{$('dlg').close();res(null)});
  $('dlg_f').appendChild(c);$('dlg').showModal();});}

function umArquivo(file,maq,log){return new Promise(res=>{
  const rd=new FileReader();
  rd.onload=async e=>{
    const linha=el('div','dg');
    try{
      const RAW=parseCSV(e.target.result);
      let ti=+$('i_ct').value,vi=+$('i_cv').value;
      if(ti<0){ti=RAW.head.findIndex(h=>/time|data|hora|date|stamp/i.test(h));if(ti<0)ti=0}
      if(vi<0){vi=RAW.head.findIndex((h,i)=>i!==ti&&!isNaN(toNum(RAW.rows[0][i])));if(vi<0)vi=(ti===0?1:0)}
      const fm=$('i_fmt').value,fmt=fm==='auto'?detectFmt(RAW.rows.slice(0,200).map(r=>r[ti])):fm;
      const porDia=new Map();let ruins=0;
      for(const r of RAW.rows){
        const d=parseDate(r[ti],fmt),v=toNum(r[vi]);
        if(!d||isNaN(v)){ruins++;continue}
        const k=iso(d);if(!porDia.has(k))porDia.set(k,[]);porDia.get(k).push([d.getTime(),v]);
      }
      if(!porDia.size)throw new Error('nenhum registro válido');
      let novos=0,tot=0;
      for(const [dia,arr] of porDia){
        const chave=maq.id+'|'+dia,ex=await get1('dias',chave);
        const mapa=new Map((ex?ex.pts:[]).map(p=>[p[0],p[1]]));
        const antes=mapa.size;
        for(const p of arr)mapa.set(p[0],p[1]);
        const pts=[...mapa.entries()].sort((a,b)=>a[0]-b[0]);
        await put('dias',{chave,maquinaId:maq.id,data:dia,pts});
        novos+=mapa.size-antes;tot+=pts.length;
      }
      linha.className='dg ok';
      linha.innerHTML=`<span class="lb">OK</span><div><div class="tt">${esc(file.name)} → ${esc(maq.nome)}</div>`
        +`<div class="bd"><b>${nf(novos)}</b> registros novos em <b>${porDia.size}</b> dia(s) · ${nf(tot)} no total após mesclar`
        +(ruins?` · ${ruins} linhas ignoradas`:'')+`</div></div>`;
    }catch(ex){
      linha.className='dg crit';
      linha.innerHTML=`<span class="lb">ERRO</span><div><div class="tt">${esc(file.name)}</div><div class="bd">${esc(ex.message)}. Confira as colunas e o formato da data.</div></div>`;
    }
    log.appendChild(linha);res();
  };
  rd.onerror=()=>{const l=el('div','dg crit');
    l.innerHTML=`<span class="lb">ERRO</span><div><div class="tt">${esc(file.name)}</div><div class="bd">Não foi possível abrir o arquivo.</div></div>`;
    log.appendChild(l);res()};
  rd.readAsText(file,'utf-8');});}

const dz=$('drop');
dz.addEventListener('click',()=>$('file').click());
dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file').click()}});
['dragenter','dragover'].forEach(v=>dz.addEventListener(v,e=>{e.preventDefault();dz.classList.add('over')}));
['dragleave','drop'].forEach(v=>dz.addEventListener(v,e=>{e.preventDefault();dz.classList.remove('over')}));
dz.addEventListener('drop',e=>{const f=[...e.dataTransfer.files];if(f.length)importar(f)});
$('file').addEventListener('change',e=>{const f=[...e.target.files];if(f.length)importar(f);e.target.value=''});
