/* 01-format.js — Formatação de números, datas, durações e a política de
   "valor não calculável". Módulo puro: não toca no DOM, é carregado pelos testes.

   Regra central do projeto: quando o denominador de um indicador não existe ou
   é zero, o indicador não vale 0% — ele é NÃO CALCULÁVEL. Toda razão passa por
   razao() e toda exibição de razão passa por fmtPct(), que devolve NAO_CALC. */
"use strict";

const NAO_CALC='—';
const finito=v=>typeof v==='number'&&Number.isFinite(v);

const nf=n=>finito(n)?Math.round(n).toLocaleString('pt-BR'):NAO_CALC;
const nf1=n=>finito(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}):NAO_CALC;
const nf2=n=>finito(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):NAO_CALC;

const pad2=n=>String(n).padStart(2,'0');
const pad3=n=>String(n).padStart(3,'0');

/* --- datas e horários --------------------------------------------------- */
const hhmm=d=>pad2(d.getHours())+':'+pad2(d.getMinutes());
const hhmmss=d=>hhmm(d)+':'+pad2(d.getSeconds());
const iso=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const brDate=s=>String(s).split('-').reverse().join('/');
const ddmm=d=>pad2(d.getDate())+'/'+pad2(d.getMonth()+1);

/* dtBR preserva a precisão do carimbo do historian: segundos sempre,
   milissegundos quando existirem. Nada de horário arredondado ou inventado. */
function dtBR(ms,prec){
  if(!finito(ms))return NAO_CALC;
  const d=new Date(ms);
  if(isNaN(d.getTime()))return NAO_CALC;
  let s=pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear()+' '+hhmmss(d);
  if(prec==='ms'||(prec!=='min'&&prec!=='s'&&d.getMilliseconds()))s+=','+pad3(d.getMilliseconds());
  if(prec==='min')s=pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear()+' '+hhmm(d);
  return s;
}
const dtCurto=ms=>finito(ms)?ddmm(new Date(ms))+' '+hhmmss(new Date(ms)):NAO_CALC;

/* "HH:MM" -> minutos desde a meia-noite */
const hm=s=>{const p=String(s||'0:0').split(':');const h=+p[0],m=+p[1];
  return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);};
/* minutos desde a meia-noite -> "HH:MM" */
const mh=m=>pad2(Math.floor(((m%1440)+1440)%1440/60))+':'+pad2(Math.round(((m%1440)+1440)%1440%60));

/* --- durações ----------------------------------------------------------- */
function hDur(min){
  if(!finito(min))return NAO_CALC;
  const neg=min<0,t=Math.abs(min);
  return (neg?'-':'')+Math.floor(t/60)+'h'+pad2(Math.round(t%60));
}
const fmtMin=m=>finito(m)?nf1(m)+' min':NAO_CALC;
const fmtSeg=s=>finito(s)?nf1(s)+' s':NAO_CALC;

/* --- razões e percentuais ----------------------------------------------- */
/* Devolve null — e não 0 — quando a conta não pode ser feita. */
function razao(num,den){
  if(!finito(num)||!finito(den)||den<=0)return null;
  return num/den;
}
const fmtPct=(r,dec)=>r==null?NAO_CALC:(dec===0?nf(r*100):nf1(r*100))+'%';
const pct=(num,den,dec)=>fmtPct(razao(num,den),dec);
/* valor absoluto que pode não existir */
const fmtVal=(v,f)=>v==null||!finito(v)?NAO_CALC:(f||nf)(v);

/* Classe de cor por atingimento: g >= 100%, w >= 85%, r abaixo.
   null (não calculável) fica neutro. */
const cl=a=>a==null||!finito(a)?'n':a>=1?'g':a>=.85?'w':'r';

if(typeof module!=='undefined'&&module.exports)module.exports={
  NAO_CALC,finito,nf,nf1,nf2,pad2,pad3,hhmm,hhmmss,iso,brDate,ddmm,dtBR,dtCurto,
  hm,mh,hDur,fmtMin,fmtSeg,razao,fmtPct,pct,fmtVal,cl};
