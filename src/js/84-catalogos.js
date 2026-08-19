/* 84-catalogos.js — Cadastro de catálogos e programação de catálogo por hora.

   Um catálogo é o produto que a linha está rodando, e cada um tem a sua meta
   em peças por hora. A meta usada num período não é mais um número fixo da
   máquina: é a meta do catálogo que estava rodando em cada hora.

   Cadeia de fallback da meta de peças, do mais específico para o mais geral:
     1. catálogo programado para aquela hora;
     2. catálogo padrão da máquina;
     3. meta cadastrada na própria máquina.

   A meta de OEE não vive no catálogo: vive na FAMÍLIA a que ele pertence, e
   com vigência por período — a meta de OEE muda de tempos em tempos, e o
   histórico não pode ser reescrito quando ela muda. Cada hora resolve a sua
   meta de OEE pela data daquela hora. */
"use strict";
const catPorId=id=>CAT.find(c=>c.id===id)||null;
const famPorId=id=>FAM.find(f=>f.id===id)||null;
/* Vigência que cobre a data: a mais recente que já começou e ainda não terminou.
   `ate` vazio é vigência aberta. */
function vigenciaNaData(fam,data){
  if(!fam||!fam.metas)return null;
  let achada=null;
  for(const v of fam.metas){
    if(v.de>data)continue;
    if(v.ate&&v.ate<data)continue;
    if(!achada||v.de>achada.de)achada=v;
  }
  return achada;
}
const pctTxt=v=>v==null?NAO_CALC:nf1(v*100)+'%';
const rotuloCat=c=>c?esc(c.numero)+(c.tipo?' · '+esc(c.tipo):''):'—';

/* --- cadastro ------------------------------------------------------------ */
function formCatalogo(c){
  const novo=!c;
  c=c||{id:uid(),numero:'',tipo:'',familiaId:'',metaHora:90000,cor:PAL[CAT.length%PAL.length],obs:''};
  $('dlg_t').textContent=novo?'Cadastrar catálogo':'Editar catálogo';
  $('dlg_p').textContent='A meta é sempre em peças por hora, e vale para as horas em que este catálogo estiver programado.';
  $('dlg_b').innerHTML=`<div class="grid">
    <div class="fld"><label for="f_cnum">Número do catálogo</label><input id="f_cnum" value="${esc(c.numero)}" placeholder="CAT-1024"></div>
    <div class="fld"><label for="f_ctipo">Tipo do catálogo</label><input id="f_ctipo" value="${esc(c.tipo)}" placeholder="Blister 12un"></div>
    <div class="fld"><label for="f_cmeta">Meta (peças/h)</label><input type="number" id="f_cmeta" value="${c.metaHora}" min="0" step="100"></div>
    <div class="fld"><label for="f_cfam">Família</label><select id="f_cfam"><option value="">—</option>
      ${FAM.map(f=>`<option value="${f.id}"${f.id===c.familiaId?' selected':''}>${esc(f.nome)}</option>`).join('')}</select></div>
    <div class="fld"><label for="f_ccor">Cor do catálogo</label>
      <div class="corfld"><input type="color" id="f_ccor" value="${esc(c.cor||PAL[0])}">
      <span class="corhex" id="f_ccor_hex">${esc(c.cor||PAL[0])}</span></div></div>
  </div>
  <div class="fld" style="margin-top:14px"><label for="f_cobs">Observação</label><textarea id="f_cobs" placeholder="particularidades de setup, formato, restrições...">${esc(c.obs||'')}</textarea></div>`;
  $('f_ccor').addEventListener('input',()=>{$('f_ccor_hex').textContent=$('f_ccor').value});
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
      familiaId:$('f_cfam').value||'',metaHora:meta,cor:$('f_ccor').value,
      obs:$('f_cobs').value.trim()});
    $('dlg').close();await recarregar();
    montarCatalogos();montarFamilias();montarMaquinas();
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
    d.innerHTML=`<span class="bar" style="background:${esc(c.cor||'var(--meta)')}"></span>
      <div><div class="nm">${esc(c.numero)}${c.tipo?' <span class="tag">'+esc(c.tipo)+'</span>':''}</div>
      <div class="ds">meta ${nf(c.metaHora)} peças/h
        · família ${c.familiaId&&famPorId(c.familiaId)?esc(famPorId(c.familiaId).nome):'nenhuma'}${usos.length?' · padrão em '+esc(usos.join(', ')):''}</div>
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

/* --- famílias e metas de OEE por vigência -------------------------------- */
function formFamilia(f){
  const novo=!f;
  f=f||{id:uid(),nome:'',obs:'',metas:[]};
  const metas=f.metas.map(v=>({...v}));
  $('dlg_t').textContent=novo?'Cadastrar família':'Editar família';
  $('dlg_p').textContent='A meta de OEE vale por período. Ao mudar a data da análise, a ferramenta usa a meta que estava vigente naquela data.';
  const linhas=()=>metas.map((v,i)=>`<tr>
    <td><input type="date" data-i="${i}" data-c="de" value="${esc(v.de)}"></td>
    <td><input type="date" data-i="${i}" data-c="ate" value="${esc(v.ate||'')}" placeholder="em aberto"></td>
    <td><input type="number" data-i="${i}" data-c="alvo" value="${v.alvo?nf1(v.alvo*100).replace(',','.'):''}" min="1" max="100" step="0.5"></td>
    <td><input type="number" data-i="${i}" data-c="atencao" value="${v.atencao?nf1(v.atencao*100).replace(',','.'):''}" min="0" max="100" step="0.5"></td>
    <td><button type="button" class="act dgr" data-rm="${i}">Remover</button></td></tr>`).join('');
  const desenha=()=>{
    $('f_vig').innerHTML='<thead><tr><th>De</th><th>Até</th><th>Meta de OEE (%)</th><th>Atenção (%)</th><th></th></tr></thead>'
      +'<tbody>'+(metas.length?linhas()
        :'<tr><td colspan="5" style="text-align:center;color:var(--tx3)">Nenhuma vigência. Sem meta de OEE, os indicadores desta família ficam neutros.</td></tr>')+'</tbody>';
    $('f_vig').querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{
      const v=metas[+i.dataset.i],c=i.dataset.c;
      if(c==='de'||c==='ate')v[c]=i.value;
      else v[c]=(+i.value||0)/100;
    }));
    $('f_vig').querySelectorAll('button[data-rm]').forEach(b=>b.addEventListener('click',()=>{
      metas.splice(+b.dataset.rm,1);desenha();
    }));
  };
  $('dlg_b').innerHTML=`<div class="grid">
    <div class="fld"><label for="f_fnome">Nome da família</label><input id="f_fnome" value="${esc(f.nome)}" placeholder="Blister pequeno"></div>
    <div class="fld"><label for="f_fobs">Observação</label><input id="f_fobs" value="${esc(f.obs||'')}" placeholder="linha de produtos, restrições..."></div>
  </div>
  <div class="sublbl" style="margin-top:16px">Metas de OEE por vigência</div>
  <div class="tblwrap"><table id="f_vig" class="vig"></table></div>
  <div class="acts"><button type="button" class="act" id="f_vig_add">Adicionar vigência</button></div>
  <p class="note">A vigência mais recente que já começou e ainda não terminou é a que vale.
    Deixe <b>Até</b> em branco para vigência aberta. <b>Atenção</b> é o limite abaixo do qual o indicador fica vermelho;
    em branco, usa 90% da meta.</p>`;
  desenha();
  $('f_vig_add').addEventListener('click',()=>{
    const hoje=iso(new Date());
    const ult=metas[metas.length-1];
    metas.push({de:hoje,ate:'',alvo:ult?ult.alvo:.85,atencao:ult?ult.atencao:0});
    desenha();
  });
  $('dlg_f').innerHTML='';
  const x=el('button','act');x.type='button';x.textContent='Cancelar';
  x.addEventListener('click',()=>$('dlg').close());
  const sv=el('button','act pri');sv.type='button';sv.textContent='Salvar';
  sv.addEventListener('click',async()=>{
    const nome=$('f_fnome').value.trim();
    if(!nome){toast('Dê um nome à família');return}
    for(const v of metas){
      if(!v.de){toast('Toda vigência precisa de uma data inicial');return}
      if(v.ate&&v.ate<v.de){toast('A data final não pode ser antes da inicial');return}
      if(!(v.alvo>0)){toast('Informe a meta de OEE da vigência');return}
      if(!(v.atencao>0))v.atencao=v.alvo*.9;
    }
    await put('familias',{id:f.id,nome,obs:$('f_fobs').value.trim(),metas});
    $('dlg').close();await recarregar();
    montarFamilias();montarCatalogos();
    if(LAST)await rodarAnalise();
    toast('Família salva')});
  $('dlg_f').append(x,sv);$('dlg').showModal();
}

function montarFamilias(){
  const w=$('k_fam');
  if(!FAM.length){
    w.innerHTML='<div class="empty">Nenhuma família cadastrada. Sem família, os indicadores de OEE ficam sem meta e as cores ficam neutras.</div>';
    return;
  }
  w.innerHTML='';
  const hoje=iso(new Date());
  for(const f of FAM){
    const v=vigenciaNaData(f,hoje);
    const itens=CAT.filter(c=>c.familiaId===f.id);
    const d=el('div','item');
    d.innerHTML=`<span class="bar" style="background:var(--accent)"></span>
      <div><div class="nm">${esc(f.nome)}${f.obs?' <span class="tag">'+esc(f.obs)+'</span>':''}</div>
      <div class="ds">${f.metas.length?f.metas.length+' vigência(s)':'sem meta de OEE'}
        · hoje: ${v?'meta '+pctTxt(v.alvo)+' · atenção '+pctTxt(v.atencao):'sem vigência ativa'}
        · ${itens.length} catálogo(s)</div>
      ${f.metas.length?'<div class="ds" style="margin-top:3px">'+f.metas.map(m=>
        brDate(m.de)+' → '+(m.ate?brDate(m.ate):'em aberto')+': '+pctTxt(m.alvo)).join(' · ')+'</div>':''}
      </div><span class="sp"></span>`;
    const e=el('button','act');e.type='button';e.textContent='Editar';
    e.addEventListener('click',()=>formFamilia(f));
    const x=el('button','act dgr');x.type='button';x.textContent='Excluir';
    x.addEventListener('click',async()=>{
      if(!confirm('Excluir a família '+f.nome+'?\n\nOs catálogos dela ficam sem meta de OEE. Nenhum registro de produção é apagado.'))return;
      await del('familias',f.id);await recarregar();
      montarFamilias();montarCatalogos();
      if(LAST)await rodarAnalise();
      toast('Família excluída')});
    d.append(e,x);w.appendChild(d);
  }
}
$('k_fam_novo').addEventListener('click',()=>formFamilia(null));

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
const corCat=id=>{const c=catPorId(id);return c&&c.cor?c.cor:'transparent'};

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

/* Monta o mapa hora -> meta que o motor de cálculo consome.

   O mapa cobre TODA hora da janela, não só as programadas: a meta de OEE
   depende da data, então cada hora precisa resolver a própria vigência. */
function infoDoCatalogo(cat,data,padraoOee){
  const fam=cat&&cat.familiaId?famPorId(cat.familiaId):null;
  const vig=vigenciaNaData(fam,data);
  return{
    metaHora:cat?cat.metaHora:(padraoOee&&padraoOee.metaHora),
    catalogoId:cat?cat.id:null,numero:cat?cat.numero:null,tipo:cat?cat.tipo:null,
    cor:cat?cat.cor:null,
    familiaId:fam?fam.id:null,familia:fam?fam.nome:null,
    alvoOee:vig?vig.alvo:null,atencaoOee:vig?vig.atencao:null,
    vigencia:vig?brDate(vig.de)+' → '+(vig.ate?brDate(vig.ate):'em aberto'):null};
}
async function metaHorasDaMaquina(maq,deK,ateK,ini,fim){
  const padraoCat=catPorId(maq.catalogoId);
  const semCat={metaHora:Number.isFinite(maq.meta)&&maq.meta>0?maq.meta:null,
    catalogoId:null,numero:null,tipo:'meta da máquina',cor:null,
    familiaId:null,familia:null,alvoOee:null,atencaoOee:null,vigencia:null};

  const porHora=new Map();
  let progs=[];
  try{progs=await programacaoDoIntervalo(maq.id,deK,ateK)}
  catch(e){console.error('[monitor] programação não pôde ser lida',e)}
  for(const p of progs)for(const [h,cid] of Object.entries(p.horas||{}))
    porHora.set(p.data+'T'+pad2(h),cid);

  /* Resolve hora a hora: o catálogo pode ser o programado ou o padrão, e a
     vigência da meta de OEE depende da data daquela hora. */
  const metaHoras=new Map();
  const d=new Date(ini);d.setMinutes(0,0,0);
  for(let t=d.getTime();t<fim;t+=3600000){
    const dia=new Date(t),data=iso(dia);
    const chave=data+'T'+pad2(dia.getHours());
    const cat=catPorId(porHora.get(chave))||padraoCat;
    metaHoras.set(chave,cat?infoDoCatalogo(cat,data,semCat):{...semCat});
  }
  return{metaHoras,metaPadrao:semCat};
}
