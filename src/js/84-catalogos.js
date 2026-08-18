/* 84-catalogos.js — Cadastro de catálogos e programação de catálogo por hora.

   Um catálogo é o produto que a linha está rodando, e cada um tem a sua meta
   em peças por hora. A meta usada num período não é mais um número fixo da
   máquina: é a meta do catálogo que estava rodando em cada hora.

   Cadeia de fallback, do mais específico para o mais geral:
     1. catálogo programado para aquela hora;
     2. catálogo padrão da máquina;
     3. meta cadastrada na própria máquina. */
"use strict";

const catPorId=id=>CAT.find(c=>c.id===id)||null;
const rotuloCat=c=>c?esc(c.numero)+(c.tipo?' · '+esc(c.tipo):''):'—';

/* --- cadastro ------------------------------------------------------------ */
function formCatalogo(c){
  const novo=!c;
  c=c||{id:uid(),numero:'',tipo:'',metaHora:90000,obs:''};
  $('dlg_t').textContent=novo?'Cadastrar catálogo':'Editar catálogo';
  $('dlg_p').textContent='A meta é sempre em peças por hora, e vale para as horas em que este catálogo estiver programado.';
  $('dlg_b').innerHTML=`<div class="grid">
    <div class="fld"><label for="f_cnum">Número do catálogo</label><input id="f_cnum" value="${esc(c.numero)}" placeholder="CAT-1024"></div>
    <div class="fld"><label for="f_ctipo">Tipo do catálogo</label><input id="f_ctipo" value="${esc(c.tipo)}" placeholder="Blister 12un"></div>
    <div class="fld"><label for="f_cmeta">Meta (peças/h)</label><input type="number" id="f_cmeta" value="${c.metaHora}" min="0" step="100"></div>
  </div>
  <div class="fld" style="margin-top:14px"><label for="f_cobs">Observação</label><textarea id="f_cobs" placeholder="particularidades de setup, formato, restrições...">${esc(c.obs||'')}</textarea></div>`;
  $('dlg_f').innerHTML='';
  const x=el('button','act');x.type='button';x.textContent='Cancelar';
  x.addEventListener('click',()=>$('dlg').close());
  const s=el('button','act pri');s.type='button';s.textContent='Salvar';
  s.addEventListener('click',async()=>{
    const numero=$('f_cnum').value.trim();
    if(!numero){toast('Informe o número do catálogo');return}
    const meta=+$('f_cmeta').value;
    if(!(meta>0)){toast('A meta precisa ser maior que zero');return}
    await put('catalogos',{id:c.id,numero,tipo:$('f_ctipo').value.trim(),
      metaHora:meta,obs:$('f_cobs').value.trim()});
    $('dlg').close();await recarregar();
    montarCatalogos();montarMaquinas();
    if(LAST)await rodarAnalise();
    toast('Catálogo salvo')});
  $('dlg_f').append(x,s);$('dlg').showModal();
}

function montarCatalogos(){
  const w=$('k_lista');
  if(!CAT.length){
    w.innerHTML='<div class="empty">Nenhum catálogo cadastrado. Sem catálogo, a meta usada é a que está no cadastro da máquina.</div>';
    return;
  }
  w.innerHTML='';
  for(const c of CAT){
    const d=el('div','item');
    const usos=MAQ.filter(m=>m.catalogoId===c.id).map(m=>m.nome);
    d.innerHTML=`<span class="bar" style="background:var(--meta)"></span>
      <div><div class="nm">${esc(c.numero)}${c.tipo?' <span class="tag">'+esc(c.tipo)+'</span>':''}</div>
      <div class="ds">meta ${nf(c.metaHora)} peças/h${usos.length?' · padrão em '+esc(usos.join(', ')):''}</div>
      ${c.obs?'<div class="ds" style="margin-top:3px;font-style:italic">'+esc(c.obs)+'</div>':''}</div><span class="sp"></span>`;
    const e=el('button','act');e.type='button';e.textContent='Editar';
    e.addEventListener('click',()=>formCatalogo(c));
    const x=el('button','act dgr');x.type='button';x.textContent='Excluir';
    x.addEventListener('click',async()=>{
      if(!confirm('Excluir o catálogo '+c.numero+'?\n\nAs horas programadas com ele voltam a usar a meta da máquina. Nenhum registro de produção é apagado.'))return;
      await del('catalogos',c.id);await recarregar();
      montarCatalogos();montarMaquinas();
      if(LAST)await rodarAnalise();
      toast('Catálogo excluído')});
    d.append(e,x);w.appendChild(d);
  }
}
$('k_novo').addEventListener('click',()=>formCatalogo(null));

/* --- seletor do painel de análise ---------------------------------------- */
function montarSeletorCatalogo(){
  const s=$('a_cat');if(!s)return;
  const atual=s.value;
  s.innerHTML='<option value="">— escolha um catálogo —</option>'
    +CAT.map(c=>`<option value="${c.id}">${esc(c.numero)}${c.tipo?' · '+esc(c.tipo):''} — ${nf(c.metaHora)} peças/h</option>`).join('');
  if(atual&&[...s.options].some(o=>o.value===atual))s.value=atual;
}
const optsCatalogo=sel=>'<option value="">—</option>'
  +CAT.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.numero)}</option>`).join('');

/* --- programação por hora ------------------------------------------------
   Uma linha por máquina e dia, com um mapa de hora do dia para catálogo.
   Mesmo formato de `dias`: ler um intervalo é um range da chave primária. */
async function gravarHoras(maquinaId,alteracoes){
  const porDia=new Map();
  for(const {data,hora,catalogoId} of alteracoes){
    if(!porDia.has(data))porDia.set(data,[]);
    porDia.get(data).push([String(hora),catalogoId]);
  }
  for(const [data,pares] of porDia){
    const chave=chaveProg(maquinaId,data);
    const ex=await get1('programacao',chave);
    const horas={...((ex&&ex.horas)||{})};
    for(const [h,cid] of pares){if(cid)horas[h]=cid;else delete horas[h]}
    if(Object.keys(horas).length)await put('programacao',{chave,maquinaId,data,horas});
    else if(ex)await del('programacao',chave);
  }
}
/* Lista das horas de relógio que tocam [ini,fim). */
function horasDoPeriodo(ini,fim){
  const out=[];const d=new Date(ini);d.setMinutes(0,0,0);
  for(let t=d.getTime();t<fim;t+=3600000){
    const h=new Date(t);
    out.push({ms:t,data:iso(h),hora:h.getHours()});
  }
  return out;
}
async function aplicarCatalogoNoPeriodo(catalogoId){
  if(!LAST){toast('Rode a análise primeiro');return}
  if(!catalogoId){toast('Escolha um catálogo');return}
  const maqs=LAST.AS.map(A=>A.maq);
  const horas=horasDoPeriodo(LAST.ini,LAST.fim);
  for(const m of maqs)
    await gravarHoras(m.id,horas.map(h=>({data:h.data,hora:h.hora,catalogoId})));
  await rodarAnalise();
  toast(nf(horas.length)+' hora(s) programadas em '+maqs.length+' máquina(s)');
}
async function limparProgramacaoDoPeriodo(){
  if(!LAST){toast('Rode a análise primeiro');return}
  if(!confirm('Remover a programação de catálogo de todas as horas do período?\n\nAs horas voltam a usar o catálogo padrão da máquina. Nenhum registro de produção é apagado.'))return;
  const horas=horasDoPeriodo(LAST.ini,LAST.fim);
  for(const A of LAST.AS)
    await gravarHoras(A.maq.id,horas.map(h=>({data:h.data,hora:h.hora,catalogoId:''})));
  await rodarAnalise();
  toast('Programação do período removida');
}
/* Edição de uma hora só, a partir da tabela de detalhe por hora. */
async function definirCatalogoDaHora(maquinaId,ms,catalogoId){
  const d=new Date(ms);
  await gravarHoras(maquinaId,[{data:iso(d),hora:d.getHours(),catalogoId}]);
  await rodarAnalise();
  toast(catalogoId?'Catálogo aplicado às '+pad2(d.getHours())+'h':'Catálogo removido das '+pad2(d.getHours())+'h');
}

/* Monta o mapa hora -> meta que o motor de cálculo consome. */
async function metaHorasDaMaquina(maq,deK,ateK){
  const padraoCat=catPorId(maq.catalogoId);
  const metaPadrao=padraoCat
    ?{metaHora:padraoCat.metaHora,catalogoId:padraoCat.id,numero:padraoCat.numero,tipo:padraoCat.tipo}
    :{metaHora:Number.isFinite(maq.meta)&&maq.meta>0?maq.meta:null,catalogoId:null,
      numero:null,tipo:'meta da máquina'};
  const metaHoras=new Map();
  let progs=[];
  try{progs=await programacaoDoIntervalo(maq.id,deK,ateK)}
  catch(e){console.error('[monitor] programação não pôde ser lida',e)}
  for(const p of progs)for(const [h,cid] of Object.entries(p.horas||{})){
    const c=catPorId(cid);if(!c)continue;
    metaHoras.set(p.data+'T'+pad2(h),
      {metaHora:c.metaHora,catalogoId:c.id,numero:c.numero,tipo:c.tipo});
  }
  return{metaHoras,metaPadrao};
}
