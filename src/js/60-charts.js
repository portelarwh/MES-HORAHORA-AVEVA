/* 60-charts.js — Gráfico de produção e faixa de cadência, em canvas puro.
   Sem biblioteca externa: rede corporativa costuma bloquear CDN e o arquivo
   único precisa funcionar offline. */
"use strict";

function setup(cv,h,forcaW){
  const dpr=window.devicePixelRatio||1;
  const w=forcaW||Math.max(320,cv.parentElement.getBoundingClientRect().width||600);
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  if(!forcaW)cv.style.height=h+'px';
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  return{x,w,h};
}
function desenhar(){if(!LAST)return;if($('ch'))protegido('o gráfico',()=>grafico($('ch'),null,null));
  if($('tl'))protegido('a cadência',cadencia);}

function grafico(cv,forcaW,forcaH){
  const T=forcaW?{tx:'#16202E',tx2:'#576578',tx3:'#8593A5',line:'#E1E6ED',card:'#fff',meta:'#D97706',
    ok:'#1B8A5A',warn:'#B27300',bad:'#C33C4E'}:TH();
  const {AS,B}=LAST,{x,w,h}=setup(cv,forcaH||340,forcaW);
  const acum=secaoAtiva('acum'),rot=secaoAtiva('rot');
  /* Cor por atingimento da meta daquele recorte: verde bateu, âmbar chegou
     perto, vermelho ficou longe, neutro não calculável. Com mais de uma
     máquina a identidade fica no contorno, para não perder quem é quem. */
  const porMeta=secaoAtiva('corMeta');
  const COR={g:T.ok||'#1B8A5A',w:T.warn||'#B27300',r:T.bad||'#C33C4E',n:T.tx3};
  const classeDe=l=>PREFS.corPor==='oee'
    ? clAlvo(l.oeeBase,l.alvoOee,l.atencaoOee)   // meta de OEE vigente da família
    : cl(l.atingBase);                           // atingimento da meta de peças
  const corDe=(A,i)=>porMeta?COR[classeDe(A.linhas[i])]:A.maq.cor;
  const idx=B.map((_,i)=>i).filter(i=>AS.some(A=>A.linhas[i].comDados>0||A.linhas[i].pcs>0));
  if(!idx.length){x.fillStyle=T.tx3;x.textAlign='center';x.font='14px Inter,sans-serif';
    x.fillText('Sem registro do contador no período selecionado',w/2,h/2);return}
  const series=AS.map(A=>{let ac=0;return idx.map(i=>{ac+=A.linhas[i].pcs;return acum?ac:A.linhas[i].pcs})});
  const metaMax=Math.max(...AS.map(a=>a.maq.meta||0)),capMax=Math.max(...AS.map(a=>a.maq.cap||0));
  let ymax=Math.max(...series.flat(),1);
  if(!acum){if(secaoAtiva('meta'))ymax=Math.max(ymax,metaMax);if(secaoAtiva('cap'))ymax=Math.max(ymax,capMax)}
  ymax*=1.14;
  const pad={t:16,r:14,b:idx.length>26?50:44,l:forcaW?54:68},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const Y=v=>pad.t+ih-(v/ymax)*ih,bw=iw/idx.length;
  x.textBaseline='middle';
  const e10=Math.pow(10,Math.floor(Math.log10(Math.max(1,ymax/5))));
  const gs=Math.max(1,Math.ceil(ymax/5/e10)*e10);
  x.font='500 '+(forcaW?9:11)+'px "IBM Plex Mono",monospace';
  for(let v=0;v<=ymax;v+=gs){
    x.strokeStyle=T.line;x.lineWidth=1;x.beginPath();x.moveTo(pad.l,Y(v));x.lineTo(w-pad.r,Y(v));x.stroke();
    x.fillStyle=T.tx3;x.textAlign='right';x.fillText(v>=1000?nf(v/1000)+'k':nf(v),pad.l-9,Y(v));
  }
  const tipo=PREFS.tipo;
  const barras=tipo==='barras'||(tipo==='auto'&&!acum&&idx.length<=26);
  if(barras){
    const gap=Math.min(4,bw*.06),tot=bw*.66,bwid=Math.max(2,(tot-gap*(AS.length-1))/AS.length);
    AS.forEach((A,k)=>series[k].forEach((v,j)=>{
      const cx=pad.l+bw*j+bw/2-tot/2+k*(bwid+gap),y=Y(v),hh=Math.max(1.5,pad.t+ih-y);
      x.fillStyle=corDe(A,idx[j]);x.beginPath();
      if(x.roundRect)x.roundRect(cx,y,bwid,hh,[4,4,0,0]);else x.rect(cx,y,bwid,hh);x.fill();
      if(porMeta&&AS.length>1){x.strokeStyle=A.maq.cor;x.lineWidth=1.6;x.stroke()}
      if(rot&&AS.length<=2&&bw>(forcaW?26:30)){x.fillStyle=T.tx;x.textAlign='center';
        x.font='600 '+(forcaW?8:10.5)+'px "IBM Plex Mono",monospace';
        x.fillText(v>=1000?nf(v/1000)+'k':nf(v),cx+bwid/2,y-8)}
    }));
  }else{
    AS.forEach((A,k)=>{
      x.strokeStyle=A.maq.cor;x.lineWidth=2.2;x.lineJoin='round';x.beginPath();
      series[k].forEach((v,j)=>{const px=pad.l+bw*j+bw/2;j?x.lineTo(px,Y(v)):x.moveTo(px,Y(v))});x.stroke();
      if(idx.length<=40)series[k].forEach((v,j)=>{const px=pad.l+bw*j+bw/2;
        x.fillStyle=corDe(A,idx[j]);x.beginPath();x.arc(px,Y(v),porMeta?4.2:3.2,0,7);x.fill();
        x.strokeStyle=porMeta?A.maq.cor:T.card;x.lineWidth=1.6;x.stroke()});
    });
  }
  const pulo=Math.max(1,Math.ceil(idx.length/(iw/(forcaW?38:52))));
  idx.forEach((i,j)=>{
    if(j%pulo)return;
    const cx=pad.l+bw*j+bw/2;
    x.fillStyle=T.tx2;x.textAlign='center';x.font='500 '+(forcaW?9.5:12)+'px Inter,sans-serif';
    x.fillText(B[i].rot,cx,h-pad.b+15);
    if(B[i].dia){x.fillStyle=T.tx3;x.font='500 '+(forcaW?8:10.5)+'px "IBM Plex Mono",monospace';
      x.fillText(B[i].dia,cx,h-pad.b+29)}
  });
  if(!acum&&secaoAtiva('cap')&&capMax>0){
    x.strokeStyle=T.tx3;x.lineWidth=1.4;x.setLineDash([]);
    x.beginPath();x.moveTo(pad.l,Y(capMax));x.lineTo(w-pad.r,Y(capMax));x.stroke();
    x.fillStyle=T.tx3;x.textAlign='left';x.font='500 '+(forcaW?8:10.5)+'px "IBM Plex Mono",monospace';
    x.fillText('capacidade '+nf(capMax/1000)+'k',pad.l+5,Y(capMax)-8);
  }
  if(!acum&&secaoAtiva('meta')){
    /* A meta pode mudar de hora para hora quando o catálogo troca, então a
       linha é um degrau que acompanha o planejado de cada recorte. */
    const A0=AS[0],metas=idx.map(i=>A0.linhas[i].planMetaBase);
    x.strokeStyle=T.meta;x.lineWidth=2;x.setLineDash([7,5]);x.beginPath();
    let desenhou=false;
    metas.forEach((mv,j)=>{
      if(mv==null||!isFinite(mv))return;
      const x0=pad.l+bw*j,x1=x0+bw,yv=Y(mv);
      if(!desenhou){x.moveTo(x0,yv);desenhou=true}else x.lineTo(x0,yv);
      x.lineTo(x1,yv);
    });
    if(desenhou)x.stroke();
    x.setLineDash([]);
    /* rótulo à direita para nunca colidir com o da capacidade, que fica à esquerda */
    const ref=metas.find(v=>v!=null&&isFinite(v));
    if(ref!=null){
      x.fillStyle=T.meta;x.textAlign='right';x.font='600 '+(forcaW?8:10.5)+'px "IBM Plex Mono",monospace';
      x.fillText('meta '+(ref>=1000?nf(ref/1000)+'k':nf(ref)),w-pad.r-5,Y(ref)-8);
    }
  }
}

/* --- faixa de cadência ---------------------------------------------------
   O eixo é comprimido nos trechos com cobertura: dias inteiros sem dado viram
   um divisor tracejado em vez de esticarem o eixo. */
function segmentos(){
  const {AS}=LAST,br=[];
  for(const A of AS)for(const g of A.cobertura)br.push([g.a,g.b]);
  if(!br.length)br.push([LAST.ini,LAST.fim]);
  br.sort((a,b)=>a[0]-b[0]);
  const m=[];
  for(const s of br){
    const folga=90000,a=s[0]-folga,b=s[1]+folga;
    if(m.length&&a<=m[m.length-1][1]+300000)m[m.length-1][1]=Math.max(m[m.length-1][1],b);
    else m.push([a,b]);
  }
  let acc=0;
  return m.map(s=>{const d=Math.max(1,s[1]-s[0]);const o={a:s[0],b:s[1],off:acc,dur:d};acc+=d;return o})
    .reduce((o,s)=>{o.segs.push(s);o.total=s.off+s.dur;return o},{segs:[],total:0});
}
function cadencia(){
  const T=TH(),{AS}=LAST,S=segmentos();
  if(!S.segs.length||!S.total)return;
  const {x,w,h}=setup($('tl'),52*AS.length+58);
  const pad={t:26,r:14,l:14},iw=w-pad.l-pad.r;
  const X=t=>{
    for(const s of S.segs){
      if(t<s.a)return pad.l+(s.off/S.total)*iw;
      if(t<=s.b)return pad.l+((s.off+(t-s.a))/S.total)*iw;
    }
    return pad.l+iw;
  };
  x.textBaseline='middle';
  if(LAST.BT.length){
    LAST.BT.forEach((t,i)=>{
      const a=X(t.a),b=X(t.b);
      if(b-a<2)return;
      x.fillStyle=i%2?T.card2:T.line;x.globalAlpha=.55;
      x.fillRect(a,pad.t-19,b-a,14);x.globalAlpha=1;
      if(b-a>52){x.fillStyle=T.tx3;x.textAlign='center';x.font='600 10px Inter,sans-serif';
        x.fillText(t.rot,(a+b)/2,pad.t-12)}
    });
  }
  AS.forEach((A,k)=>{
    const top=pad.t+k*52,bot=top+38;
    x.fillStyle=T.card2;
    if(x.roundRect){x.beginPath();x.roundRect(pad.l,top,iw,bot-top,6);x.fill()}else x.fillRect(pad.l,top,iw,bot-top);
    /* ausência de dados: hachura neutra, nunca a cor de parada */
    for(const g of A.lacunas){
      const a=X(g.a),b=X(g.b);if(b-a<.5)continue;
      x.save();x.beginPath();x.rect(a,top,Math.max(1,b-a),bot-top);x.clip();
      x.strokeStyle=T.tx3;x.globalAlpha=.30;x.lineWidth=1;
      for(let p=a-(bot-top);p<b+(bot-top);p+=6){x.beginPath();x.moveTo(p,bot);x.lineTo(p+(bot-top),top);x.stroke()}
      x.restore();x.globalAlpha=1;
    }
    for(const p of A.paradas){
      const a=X(p.a),b=X(p.b);
      x.fillStyle=T.bad;x.globalAlpha=.22;x.fillRect(a,top,Math.max(1.6,b-a),bot-top);x.globalAlpha=1;
      if(b-a>34){x.fillStyle=T.bad;x.textAlign='center';x.font='600 9.5px "IBM Plex Mono",monospace';
        x.fillText(nf1(p.min),(a+b)/2,top+9)}
    }
    const mx=Math.max(1,...A.eventos.map(e=>e.delta));
    for(const e of A.eventos){
      if(!e.contabiliza||e.delta<=0)continue;
      const px=X(e.t),al=Math.min(1,e.delta/mx);
      x.strokeStyle=A.maq.cor;x.globalAlpha=.4+al*.5;x.lineWidth=1;
      x.beginPath();x.moveTo(px,bot-2);x.lineTo(px,bot-2-(bot-top-6)*(.22+al*.72));x.stroke();
    }
    x.globalAlpha=1;
    x.fillStyle=A.maq.cor;x.textAlign='left';x.font='600 11.5px Inter,sans-serif';
    x.fillText(A.maq.nome,pad.l+7,top+9);
  });
  const y=pad.t+AS.length*52+4;
  S.segs.forEach((s,i)=>{
    const passo=s.dur>36*3600000?21600000:(s.dur>10*3600000?7200000:3600000);
    const d0=new Date(s.a);d0.setMinutes(0,0,0);
    for(let t=d0.getTime();t<=s.b;t+=passo){
      if(t<s.a)continue;
      const d=new Date(t),px=X(t);
      x.strokeStyle=T.line;x.lineWidth=1;x.beginPath();x.moveTo(px,pad.t);x.lineTo(px,y-6);x.stroke();
      x.fillStyle=T.tx3;x.textAlign='center';x.font='500 10.5px "IBM Plex Mono",monospace';
      x.fillText(pad2(d.getHours())+'h',px,y+4);
      if(d.getHours()===0||t===d0.getTime()){x.fillStyle=T.tx2;x.font='600 9.5px Inter,sans-serif';
        x.fillText(ddmm(d),px,y+16)}
    }
    if(i<S.segs.length-1){
      const px=pad.l+((s.off+s.dur)/S.total)*iw;
      x.strokeStyle=T.tx3;x.setLineDash([3,3]);x.lineWidth=1.5;
      x.beginPath();x.moveTo(px,pad.t-4);x.lineTo(px,y-6);x.stroke();x.setLineDash([]);
    }
  });
}
let rT;window.addEventListener('resize',()=>{clearTimeout(rT);rT=setTimeout(desenhar,150)});
