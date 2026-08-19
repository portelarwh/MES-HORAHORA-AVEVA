/* 40-metrics.js — Motor de cálculo. Módulo puro: nenhuma função aqui lê o DOM
   nem o estado global da tela, todas recebem o que precisam por parâmetro.
   É o módulo carregado pelos testes automatizados.

   Conceitos de tempo, do maior para o menor:

     período selecionado   fim − início do filtro (data + horário), exato
     tempo com dados       parte do período coberta por registros do contador
     tempo sem dados       período − tempo com dados (nunca vira parada)
     tempo programado      período − abono          -> base "período selecionado"
     tempo observado       tempo com dados − abono  -> base "janela com dados"
     tempo operacional     observado − paradas      -> base "tempo rodando"
     tempo parcial         início do período até a última marcação, − abono

   Parada e ausência de dados são coisas diferentes e nunca se confundem:
   o intervalo entre dois registros é classificado por dois limiares. */
"use strict";

const pecas=m=>m.modo==='unidade'?1:(m.porInc||1);

/* sobreposição de dois intervalos, em minutos */
const ovl=(a1,a2,b1,b2)=>Math.max(0,(Math.min(a2,b2)-Math.max(a1,b1))/60000);

/* --- segmentos: listas de {a,b} em ms, ordenadas e disjuntas ------------- */
function unirSegs(segs){
  const s=segs.filter(g=>g.b>g.a).sort((x,y)=>x.a-y.a),out=[];
  for(const g of s){
    const u=out[out.length-1];
    if(u&&g.a<=u.b)u.b=Math.max(u.b,g.b);else out.push({a:g.a,b:g.b});
  }
  return out;
}
function ovlSegs(segs,a,b){let s=0;for(const g of segs)s+=ovl(g.a,g.b,a,b);return s}
const dentroSegs=(segs,t)=>segs.some(g=>t>=g.a&&t<g.b);
function recortarSegs(segs,a,b){
  return segs.map(g=>({...g,a:Math.max(g.a,a),b:Math.min(g.b,b)})).filter(g=>g.b>g.a);
}
/* complemento de segs dentro de [ini,fim) */
function inverterSegs(segs,ini,fim){
  const u=unirSegs(recortarSegs(segs,ini,fim)),out=[];let p=ini;
  for(const g of u){if(g.a>p)out.push({a:p,b:g.a});p=Math.max(p,g.b)}
  if(p<fim)out.push({a:p,b:fim});
  return out;
}

/* --- classificação do intervalo entre dois registros --------------------- */
const NORMAL='normal',PARADA='parada',SEMDADOS='semdados';
function classificar(gapS,limParadaS,limSemDadosS){
  if(gapS>limSemDadosS)return SEMDADOS;
  if(gapS>limParadaS)return PARADA;
  return NORMAL;
}

/* --- série contínua ------------------------------------------------------
   Junta os dias importados numa única série ordenada. Ao contrário da versão
   anterior, a série NÃO é quebrada na meia-noite: um incremento entre 23h59 e
   00h01 deixa de ser perdido. A separação passa a ser feita pelos limiares,
   que é o critério real — dia é só a chave de armazenamento. */
function serieDePontos(dias){
  const mapa=new Map();
  let duplicados=0,foraDeOrdem=0,frac=0,anterior=-Infinity;
  for(const d of dias)for(const p of d.pts){
    const t=p[0],v=p[1];
    if(!Number.isFinite(t)||!Number.isFinite(v))continue;
    if(t<anterior)foraDeOrdem++;
    anterior=t;
    if(mapa.has(t)&&mapa.get(t)!==v)duplicados++;
    else if(mapa.has(t))duplicados++;
    if(!Number.isInteger(v))frac++;
    mapa.set(t,v);
  }
  const pts=[...mapa.entries()].sort((a,b)=>a[0]-b[0]);
  return{pts,duplicados,foraDeOrdem,frac};
}

/* --- meta por hora, vinda do catálogo -----------------------------------
   Cada hora de relógio pode rodar um catálogo diferente, com meta própria. A
   meta de um recorte é a média das metas horárias PONDERADA pelos minutos que
   o recorte ocupa em cada hora — assim um turno que troca de catálogo no meio
   fica com a meta certa, e uma hora inteira fica com a meta do seu catálogo. */
const chaveHora=ms=>{const d=new Date(ms);return iso(d)+'T'+pad2(d.getHours())};

function horasDaJanela(ini,fim,metaHoras,padrao){
  const out=[];
  const d=new Date(ini);d.setMinutes(0,0,0);
  const num=v=>Number.isFinite(v)&&v>0?v:null;
  for(let t=d.getTime();t<fim;t+=3600000){
    const info=(metaHoras&&metaHoras.get(chaveHora(t)))||padrao||null;
    out.push({a:t,b:t+3600000,
      metaHora:info?num(info.metaHora):null,
      catalogoId:info?info.catalogoId:null,numero:info?info.numero:null,tipo:info?info.tipo:null,
      cor:info?info.cor:null,lote:info?info.lote:null,
      familiaId:info?info.familiaId:null,familia:info?info.familia:null,
      alvoOee:info?num(info.alvoOee):null,atencaoOee:info?num(info.atencaoOee):null,
      vigencia:info?info.vigencia:null});
  }
  return out;
}
/* Média ponderada da meta de peças e da meta de OEE, mais a lista de catálogos
   e de famílias que o recorte atravessou. A meta de OEE é ponderada da mesma
   forma que a de peças: um recorte que pega duas vigências fica com o alvo
   proporcional aos minutos de cada uma. */
function metaDoRecorte(horas,a,b){
  let min=0,peso=0,semMeta=0;
  let minOee=0,pesoAlvo=0,pesoAten=0;
  const usados=new Map(),familias=new Map(),lotes=new Map();
  for(const h of horas){
    if(h.b<=a)continue;
    if(h.a>=b)break;
    const m=ovl(h.a,h.b,a,b);
    if(m<=0)continue;
    min+=m;
    if(h.lote){const u=lotes.get(h.lote)||{lote:h.lote,a:h.a,b:h.b,min:0};
      u.a=Math.min(u.a,h.a);u.b=Math.max(u.b,h.b);u.min+=m;lotes.set(h.lote,u)}
    if(h.alvoOee!=null){
      minOee+=m;pesoAlvo+=m*h.alvoOee;pesoAten+=m*(h.atencaoOee!=null?h.atencaoOee:h.alvoOee);
      const fk=h.familiaId||'_';
      const fu=familias.get(fk)||{familiaId:h.familiaId,familia:h.familia,
        alvoOee:h.alvoOee,atencaoOee:h.atencaoOee,vigencia:h.vigencia,min:0};
      fu.min+=m;familias.set(fk,fu);
    }
    if(h.metaHora==null){semMeta+=m;continue}
    peso+=m*h.metaHora;
    const k=h.catalogoId||'_';
    const u=usados.get(k)||{catalogoId:h.catalogoId,numero:h.numero,tipo:h.tipo,
      cor:h.cor,familia:h.familia,metaHora:h.metaHora,min:0};
    u.min+=m;usados.set(k,u);
  }
  const comMeta=min-semMeta;
  return{metaEfetiva:comMeta>0?peso/comMeta:null,minutos:min,minutosSemMeta:semMeta,
    alvoOee:minOee>0?pesoAlvo/minOee:null,
    atencaoOee:minOee>0?pesoAten/minOee:null,
    catalogos:[...usados.values()].sort((x,y)=>y.min-x.min),
    familias:[...familias.values()].sort((x,y)=>y.min-x.min),
    lotes:[...lotes.values()].sort((x,y)=>x.a-y.a)};
}

/* --- análise de uma máquina dentro da janela exata ----------------------- */
/* opts: {ini, fim, limParadaMin, limSemDadosMin, ajustes, base} */
function analisarMaquina(maq,dias,opts){
  const ini=opts.ini,fim=opts.fim;
  const limParadaS=Math.max(0,opts.limParadaMin||0)*60;
  const limSemDadosS=Math.max(limParadaS/60,opts.limSemDadosMin||0)*60;
  const S=serieDePontos(dias),pts=S.pts,pc=pecas(maq);

  const contarTudo=opts.contagem!=='semLacuna';
  const eventos=[],paradas=[],lacunas=[],cobertura=[];
  let resets=0,semAlteracao=0,deltasMaiores=0,naoAtribuido=0,eventosNaoAtrib=0;
  let incAposLacuna=0,incBorda=0;

  for(let i=1;i<pts.length;i++){
    const t0=pts[i-1][0],t=pts[i][0],gapS=(t-t0)/1000;
    const classe=classificar(gapS,limParadaS,limSemDadosS);
    if(classe===SEMDADOS)lacunas.push({a:t0,b:t,origem:'lacuna'});
    else cobertura.push({a:t0,b:t});
    if(classe===PARADA)paradas.push({a:t0,b:t,min:gapS/60});

    if(t<ini||t>=fim)continue;                     // fora da janela exata
    let delta=pts[i][1]-pts[i-1][1],reset=false;
    if(delta<0){reset=true;resets++;delta=Math.max(0,pts[i][1]-(maq.offset||0))}
    if(delta===0)semAlteracao++;
    if(delta>1)deltasMaiores++;
    /* A primeira marcação da janela não tem incremento próprio: ela é a
       referência. A partir da segunda, todo delta conta, sempre no carimbo em
       que o historian o registrou — nenhum horário é inventado para distribuí-lo.

       Dois casos ficam com a DATA incerta, e são marcados para o painel de
       qualidade sem deixarem de ser contados:
         aposLacuna — o intervalo anterior é ausência de dados;
         naBorda    — o registro anterior está fora da janela analisada.
       O modo 'semLacuna' os exclui da contagem, para quem prefere não somar
       produção que não consegue localizar no tempo. */
    const aposLacuna=classe===SEMDADOS,naBorda=t0<ini;
    const contabiliza=contarTudo||(!aposLacuna&&(!naBorda||classe===NORMAL));
    if(contabiliza){
      if(aposLacuna&&delta>0)incAposLacuna+=delta;
      if(naBorda&&delta>0)incBorda+=delta;
    }else if(delta>0){naoAtribuido+=delta;eventosNaoAtrib++}
    eventos.push({t,t0,gapS,delta,classe,reset,contabiliza,aposLacuna,naBorda,
      pecas:contabiliza?delta*pc:0});
  }

  /* ausência de dados antes do primeiro e depois do último registro da série */
  if(!pts.length)lacunas.push({a:ini,b:fim,origem:'vazio'});
  else{
    if(pts[0][0]>ini)lacunas.push({a:ini,b:Math.min(pts[0][0],fim),origem:'antes'});
    if(pts[pts.length-1][0]<fim)lacunas.push({a:Math.max(pts[pts.length-1][0],ini),b:fim,origem:'depois'});
  }

  const cob=unirSegs(recortarSegs(cobertura,ini,fim));
  const lac=inverterSegs(cob,ini,fim).map(g=>({...g,min:(g.b-g.a)/60000}));
  const par=recortarSegs(paradas,ini,fim).map(g=>({...g,min:(g.b-g.a)/60000}));

  const dentro=pts.filter(p=>p[0]>=ini&&p[0]<fim);
  const tcs=eventos.filter(e=>e.contabiliza&&e.delta>0).map(e=>e.gapS/e.delta).sort((a,b)=>a-b);
  const q=p=>tcs.length?tcs[Math.min(tcs.length-1,Math.floor(p*tcs.length))]:null;

  /* Sem catálogo programado nem catálogo padrão, a meta é a cadastrada na
     própria máquina: uma base sem nenhum catálogo continua calculando igual. */
  const metaPadrao=opts.metaPadrao||{
    metaHora:Number.isFinite(maq.meta)&&maq.meta>0?maq.meta:null,
    catalogoId:null,numero:null,tipo:'meta da máquina'};
  return{maq,pc,ini,fim,base:opts.base||'marcacoes',
    turnoSegs:opts.turnoSegs||[],metaPadrao,
    horasMeta:horasDaJanela(ini,fim,opts.metaHoras,metaPadrao),
    ajustes:opts.ajustes||[],pts,dentro,eventos,
    cobertura:cob,lacunas:lac.sort((a,b)=>b.min-a.min),
    paradas:par.sort((a,b)=>b.min-a.min),
    origem:{duplicados:S.duplicados,foraDeOrdem:S.foraDeOrdem,frac:S.frac},
    resets,semAlteracao,deltasMaiores,naoAtribuido,eventosNaoAtrib,
    incAposLacuna,incBorda,contagem:contarTudo?'tudo':'semLacuna',
    tcP10:q(.10),tcMed:q(.50),
    primeiro:dentro.length?dentro[0][0]:null,
    ultimo:dentro.length?dentro[dentro.length-1][0]:null,
    limParadaMin:limParadaS/60,limSemDadosMin:limSemDadosS/60};
}

/* --- lançamentos manuais ------------------------------------------------- */
function lancDe(ajustes,id,a,b,pc){
  const r={abono:0,extra:0,paradaJust:0,refugo:0,retrab:0,motivos:[],abonoSegs:[]};
  for(const j of ajustes||[]){
    if(j.maquinaId!==id&&j.maquinaId!=='*')continue;
    const p=String(j.data||'').split('-');
    if(p.length<3)continue;
    if(j.tipo==='refugo'||j.tipo==='retrabalho'){
      /* quantidade lançada por dia, rateada pela fatia do dia dentro do recorte */
      const d0=new Date(+p[0],+p[1]-1,+p[2]).getTime(),d1=d0+86400000;
      const o=ovl(d0,d1,a,b);
      if(o>0){
        const qt=(j.un==='inc'?(j.qtd||0)*pc:(j.qtd||0))*(o/1440);
        if(j.tipo==='refugo')r.refugo+=qt;else r.retrab+=qt;
      }
      continue;
    }
    const hh=String(j.inicio||'00:00').split(':');
    const i0=new Date(+p[0],+p[1]-1,+p[2],+hh[0]||0,+hh[1]||0).getTime();
    const i1=i0+(j.minutos||0)*60000;
    const o=ovl(i0,i1,a,b);
    if(o>0){
      if(j.tipo==='abono'){r.abono+=o;r.abonoSegs.push({a:Math.max(i0,a),b:Math.min(i1,b)})}
      else if(j.tipo==='extra')r.extra+=o;
      else if(j.tipo==='parada'){r.paradaJust+=o;if(j.obs)r.motivos.push(j.obs)}
    }
  }
  r.abonoSegs=unirSegs(r.abonoSegs);
  return r;
}

/* --- núcleo: métricas de um recorte -------------------------------------
   Duas janelas, que normalmente coincidem:

     [a, b)          janela de TEMPO — é o denominador de meta e OEE
     [pa, pb)        janela de PRODUÇÃO — é o numerador

   Elas se separam no fechamento de turno com turno anexado. O operador que
   recebe as caixas adiantadas pelo turno de limpeza conta essa produção, mas
   continua sendo medido pelo horário cadastrado do próprio turno. Sem essa
   separação, as horas do turno anexado entrariam no denominador e afundariam
   o OEE de quem apenas herdou o trabalho. */
function metricas(A,a,b,prod){
  const c=A.maq,pc=A.pc;
  const pa=prod&&prod.a!=null?prod.a:a, pb=prod&&prod.b!=null?prod.b:b;
  let inc=0,incAbsorvido=0,incForaTurno=0,regs=0,naoAtrib=0,semAlt=0,resets=0;
  let incAposLacuna=0,incBorda=0;
  const segsT=A.turnoSegs||[];
  let ultimoReg=null,primeiroReg=null,leituraIni=null,leituraFim=null;
  for(const e of A.eventos){
    if(e.t<pa||e.t>=pb)continue;
    if(e.contabiliza){
      inc+=e.delta;
      if(e.t<a)incAbsorvido+=e.delta;
      if(e.aposLacuna)incAposLacuna+=e.delta;
      if(e.naBorda)incBorda+=e.delta;
      /* Produção registrada fora de qualquer turno cadastrado: entra no
         numerador da base "turno" sem custar denominador — é o bônus das
         caixas adiantadas pelo turno desconsiderado. */
      if(segsT.length&&!dentroSegs(segsT,e.t))incForaTurno+=e.delta;
    }else if(e.delta>0)naoAtrib+=e.delta;
    if(e.delta===0)semAlt++;
    if(e.reset)resets++;
  }
  for(const p of A.dentro){
    if(p[0]<pa||p[0]>=pb)continue;
    regs++;
    if(primeiroReg==null){primeiroReg=p[0];leituraIni=p[1]}
    ultimoReg=p[0];leituraFim=p[1];
  }
  const dur=Math.max(0,(b-a)/60000);
  const comDados=ovlSegs(A.cobertura,a,b);
  const semDados=Math.max(0,dur-comDados);
  const parado=ovlSegs(A.paradas,a,b);
  const nPar=A.paradas.filter(p=>p.a>=a&&p.a<b).length;
  const nLac=A.lacunas.filter(l=>l.a>=a&&l.a<b).length;

  const L=lancDe(A.ajustes,c.id,a,b,pc);
  const abono=L.abono;
  const abonoCoberto=L.abonoSegs.reduce((s,g)=>s+ovlSegs(A.cobertura,g.a,g.b),0);

  const programado=Math.max(0,dur-abono);
  const observado=Math.max(0,comDados-abonoCoberto);
  const operacional=Math.max(0,observado-parado);
  /* Parcial: do início do recorte de tempo até a última marcação. Serve para
     turno em andamento — não cobra horas que ainda não aconteceram. */
  let parcial=null;
  if(ultimoReg!=null&&ultimoReg>a){
    const abonoAte=L.abonoSegs.reduce((s,g)=>s+ovl(g.a,g.b,a,ultimoReg),0);
    parcial=Math.max(0,(Math.min(ultimoReg,b)-a)/60000-abonoAte);
  }
  /* Turno cadastrado: só os minutos do recorte que caem dentro de uma ocorrência
     de turno cadastrada, já sem o turno desconsiderado. A produção feita fora
     desse tempo — as caixas adiantadas pelo turno de limpeza — continua no
     numerador, então entra como bônus e o indicador pode passar de 100%. */
  const emTurno=ovlSegs(A.turnoSegs||[],a,b);
  const abonoEmTurno=L.abonoSegs.reduce((s,g)=>s+ovlSegs(A.turnoSegs||[],g.a,g.b),0);
  const turno=(A.turnoSegs&&A.turnoSegs.length)?Math.max(0,emTurno-abonoEmTurno):null;
  /* Marcações: da primeira à última marcação do contador. É a base que
     corresponde ao comportamento real da linha — a produção começa quando a
     primeira caixa é contada, não quando o relógio do filtro vira. */
  let marcacoes=null;
  if(primeiroReg!=null&&ultimoReg!=null&&ultimoReg>primeiroReg){
    const abonoEntre=L.abonoSegs.reduce((s,g)=>s+ovl(g.a,g.b,primeiroReg,ultimoReg),0);
    marcacoes=Math.max(0,(ultimoReg-primeiroReg)/60000-abonoEntre);
  }
  const tempos={marcacoes,turno,programado,observado,operacional,parcial};

  const pcs=inc*pc;
  const bom=Math.max(0,pcs-L.refugo-L.retrab);
  const M=metaDoRecorte(A.horasMeta||[],a,b);
  const metaEfetiva=M.metaEfetiva;
  const planCap={},planMeta={},oee={},ating={};
  for(const k of Object.keys(tempos)){
    const t=tempos[k];
    planCap[k]=t==null?null:c.cap*(t/60);
    planMeta[k]=(t==null||metaEfetiva==null)?null:metaEfetiva*(t/60);
    oee[k]=razao(pcs,planCap[k]);
    ating[k]=razao(pcs,planMeta[k]);
  }
  const base=tempos[A.base]!==undefined?A.base:'marcacoes';
  return{a,b,pa,pb,dur,inc,incAbsorvido,pcsAbsorvido:incAbsorvido*pc,
    incForaTurno,pcsForaTurno:incForaTurno*pc,
    regs,naoAtrib,incAposLacuna,incBorda,semAlt,resets,nPar,nLac,
    leituraIni,leituraFim,contagemInicial:c.offset||0,
    comDados,semDados,parado,abono,abonoCoberto,
    extra:L.extra,paradaJust:L.paradaJust,refugo:L.refugo,retrab:L.retrab,motivos:L.motivos,
    marcacoes,turno,emTurno,programado,observado,operacional,parcial,tempos,
    metaEfetiva,catalogos:M.catalogos,minutosSemMeta:M.minutosSemMeta,
    alvoOee:M.alvoOee,atencaoOee:M.atencaoOee,familias:M.familias,lotes:M.lotes,
    primeiroReg,ultimoReg,pcs,bom,planCap,planMeta,oee,ating,
    base,oeeBase:oee[base],atingBase:ating[base],
    planCapBase:planCap[base],planMetaBase:planMeta[base],tempoBase:tempos[base],
    oeeLiq:razao(bom,planCap[base]),
    cobertura:razao(comDados,dur),
    disp:razao(operacional,observado),
    ritmo:razao(pcs,comDados/60),
    ritmoOper:razao(pcs,operacional/60),
    interv:razao(comDados*60,inc),
    intervOper:razao(operacional*60,inc)};
}

/* --- turnos -------------------------------------------------------------- */
/* Gera as ocorrências dos turnos que tocam [ini,fim), recortadas na janela.
   Garante que nenhuma ocorrência se sobreponha a outra — sem isso o mesmo
   registro entraria em dois turnos. Sobreposição de cadastro é sinalizada.

   Turno desconsiderado: a ocorrência escolhida deixa de existir como linha e
   sua PRODUÇÃO é absorvida pelo turno cronologicamente seguinte, que continua
   sendo medido pelo próprio horário cadastrado. É o caso do turno de limpeza
   que adianta caixas para o turno seguinte: o operador do primeiro turno já
   começa com essas caixas, mas o turno dele continua valendo das 06:00 às
   14:20 para efeito de meta e OEE. */
function turnosNoIntervalo(turnos,ini,fim,excluirId){
  if(!turnos||!turnos.length)return[];
  const out=[];
  const d=new Date(ini);d.setHours(0,0,0,0);d.setDate(d.getDate()-1);
  const limite=fim+86400000,maxDias=800;
  for(let k=0;k<maxDias&&d.getTime()<limite;k++){
    for(const t of turnos){
      const a=new Date(d);a.setHours(0,0,0,0);a.setMinutes(hm(t.inicio));
      const dur=((hm(t.fim)-hm(t.inicio)+1440)%1440)||1440;
      out.push({a:a.getTime(),b:a.getTime()+dur*60000,rot:t.nome,turnoId:t.id,
        durCadastrada:dur,dia:ddmm(a)});
    }
    d.setDate(d.getDate()+1);
  }
  out.sort((x,y)=>x.a-y.a||x.b-y.b);
  for(let i=0;i<out.length-1;i++){
    if(out[i].b>out[i+1].a){out[i].b=out[i+1].a;out[i].sobreposto=true;out[i+1].sobreposto=true}
  }
  let lista=out.filter(x=>x.b>x.a);
  if(excluirId){
    const keep=[];
    for(let i=0;i<lista.length;i++){
      if(lista[i].turnoId!==excluirId){keep.push(lista[i]);continue}
      let j=i+1;
      while(j<lista.length&&lista[j].turnoId===excluirId)j++;
      if(j<lista.length){
        const alvo=lista[j];
        alvo.aProd=Math.min(alvo.aProd==null?alvo.a:alvo.aProd,lista[i].a);
        alvo.anexado=true;alvo.minAnexados=(alvo.minAnexados||0)+(lista[j-1].b-lista[i].a)/60000;
      }else if(keep.length){
        const u=keep[keep.length-1];
        u.bProd=Math.max(u.bProd==null?u.b:u.bProd,lista[lista.length-1].b);
        u.anexado=true;u.minAnexados=(u.minAnexados||0)+(lista[lista.length-1].b-lista[i].a)/60000;
      }
      i=j-1;
    }
    lista=keep;
  }
  return lista.map(x=>{
    const aP=x.aProd==null?x.a:x.aProd,bP=x.bProd==null?x.b:x.bProd;
    const a=Math.max(x.a,ini),b=Math.min(x.b,fim);
    return{...x,aCheio:x.a,bCheio:x.b,aProdCheio:aP,bProdCheio:bP,
      a,b:Math.max(a,b),                       // janela de tempo, possivelmente vazia
      aProd:Math.max(aP,ini),bProd:Math.min(bP,fim),
      recortado:x.a<ini||x.b>fim,
      soProducao:b<=a};                        // o turno em si está fora da janela
  }).filter(x=>x.b>x.a||x.bProd>x.aProd);
}

/* --- recortes de período ------------------------------------------------- */
/* Todo bucket é recortado na janela: um período que começa 07h20 gera um
   primeiro bucket de 07h20 às 08h00, e não uma hora cheia inventada. */
function bucketsDe(gran,ini,fim,turnos,excluirId){
  if(gran==='turno')return turnosNoIntervalo(turnos,ini,fim,excluirId);
  const B=[],passoDia=gran==='dia';
  let a=ini;
  while(a<fim){
    const d=new Date(a),n=new Date(a);
    if(passoDia){n.setHours(0,0,0,0);n.setDate(n.getDate()+1)}
    else{n.setMinutes(0,0,0);n.setTime(n.getTime()+3600000)}
    const b=Math.min(n.getTime(),fim);
    B.push({a,b,rot:passoDia?ddmm(d):pad2(d.getHours())+'h',
      dia:passoDia?null:ddmm(d),
      parcial:(b-a)<(passoDia?86400000:3600000)});
    a=b;
  }
  return B;
}

if(typeof module!=='undefined'&&module.exports)module.exports={
  pecas,ovl,unirSegs,ovlSegs,dentroSegs,recortarSegs,inverterSegs,classificar,
  NORMAL,PARADA,SEMDADOS,serieDePontos,analisarMaquina,lancDe,metricas,
  turnosNoIntervalo,bucketsDe,chaveHora,horasDaJanela,metaDoRecorte};
