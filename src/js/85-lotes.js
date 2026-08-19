/* 85-lotes.js — Lote por hora e o filtro que recorta a janela ao lote.

   O lote é texto livre, gravado por máquina e hora no mesmo registro da
   programação do catálogo. Ao contrário do catálogo, ele não é pré-cadastrado:
   um lote novo aparece a cada batelada, e obrigar um cadastro antes seria
   atrito puro. A lista do filtro é derivada do que já foi lançado no período. */
"use strict";

/* --- leitura ------------------------------------------------------------- */
const chaveHoraMs=ms=>{const d=new Date(ms);return iso(d)+'T'+pad2(d.getHours())};

/* Lotes distintos lançados no intervalo, com a janela que cada um ocupa. */
function lotesDaProgramacao(progs,ini,fim){
  const m=new Map();
  for(const p of progs||[])for(const [h,lote] of Object.entries(p.lotes||{})){
    const nome=String(lote||'').trim();if(!nome)continue;
    const pd=p.data.split('-').map(Number);
    const a=new Date(pd[0],pd[1]-1,pd[2],+h,0,0,0).getTime(),b=a+3600000;
    if(b<=ini||a>=fim)continue;
    const u=m.get(nome)||{lote:nome,a:Infinity,b:-Infinity,horas:0};
    u.a=Math.min(u.a,a);u.b=Math.max(u.b,b);u.horas++;
    m.set(nome,u);
  }
  return [...m.values()].sort((x,y)=>x.a-y.a);
}
/* Janela do lote: do início da primeira hora ao fim da última, recortada na
   janela que o usuário pediu. É "o intervalo das bandejas daquele lote". */
function janelaDoLote(progsPorMaquina,lote,ini,fim){
  let a=Infinity,b=-Infinity,horas=0;
  for(const progs of progsPorMaquina){
    for(const L of lotesDaProgramacao(progs,ini,fim)){
      if(L.lote!==lote)continue;
      a=Math.min(a,L.a);b=Math.max(b,L.b);horas+=L.horas;
    }
  }
  if(!horas)return null;
  const ra=Math.max(a,ini),rb=Math.min(b,fim);
  return rb>ra?{ini:ra,fim:rb,horas,lote}:null;
}

/* --- escrita ------------------------------------------------------------- */
async function aplicarLoteNoPeriodo(lote){
  if(!LAST){toast('Rode a análise primeiro');return}
  const nome=String(lote||'').trim();
  if(!nome){toast('Informe o lote');return}
  const horas=horasDoPeriodo(LAST.ini,LAST.fim);
  for(const A of LAST.AS)
    await gravarProgramacao(A.maq.id,horas.map(h=>({data:h.data,hora:h.hora,lote:nome})));
  await rodarAnalise();
  toast('Lote '+nome+' aplicado a '+nf(horas.length)+' hora(s)');
}
async function limparLotesDoPeriodo(){
  if(!LAST){toast('Rode a análise primeiro');return}
  if(!confirm('Remover o lote de todas as horas do período?\n\nNenhum registro de produção é apagado.'))return;
  const horas=horasDoPeriodo(LAST.ini,LAST.fim);
  for(const A of LAST.AS)
    await gravarProgramacao(A.maq.id,horas.map(h=>({data:h.data,hora:h.hora,lote:''})));
  await rodarAnalise();
  toast('Lotes do período removidos');
}
async function definirLoteDaHora(maquinaId,ms,lote){
  const d=new Date(ms);
  await gravarProgramacao(maquinaId,[{data:iso(d),hora:d.getHours(),lote}]);
  await rodarAnalise();
  toast(String(lote||'').trim()?'Lote das '+pad2(d.getHours())+'h atualizado'
    :'Lote removido das '+pad2(d.getHours())+'h');
}

/* --- seletor do filtro ---------------------------------------------------- */
/* Preenchido com o que existe no período, para não filtrar por um lote que
   não está ali. Mantém a escolha atual quando ela continua disponível. */
function montarSeletorLote(lotes){
  const s=$('a_lote');if(!s)return;
  const atual=s.value;
  s.innerHTML='<option value="">— todos os lotes —</option>'
    +(lotes||[]).map(L=>`<option value="${esc(L.lote)}">${esc(L.lote)} — ${L.horas} h · `
      +`${hhmm(new Date(L.a))} às ${hhmm(new Date(L.b))}</option>`).join('');
  s.value=[...s.options].some(o=>o.value===atual)?atual:'';
  PREFS.lote=s.value;
}
