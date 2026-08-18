/* 00-core.js — Estado global, utilitários, tema e navegação entre abas. */
"use strict";

let MAQ=[],TUR=[],AJU=[],LAST=null,PRONTO=false;

const $=i=>document.getElementById(i);
const el=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e;};
const nf=n=>Math.round(n||0).toLocaleString('pt-BR');
const nf1=n=>(n||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const nf2=n=>(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad2=n=>String(n).padStart(2,'0');
const hhmm=d=>pad2(d.getHours())+':'+pad2(d.getMinutes());
const iso=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const brDate=s=>s.split('-').reverse().join('/');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=s=>{const p=String(s||'0:0').split(':');return (+p[0])*60+(+p[1]);};
const hDur=m=>Math.floor(m/60)+'h'+pad2(Math.round(m%60));
const PAL=['#2A6FB0','#D97706','#1B8A5A','#8B4FBF','#C33C4E','#0E8F9E','#B0761F','#5D6BC0'];
const pecas=m=>m.modo==='unidade'?1:(m.porInc||1);
const cl=a=>a>=1?'g':a>=.85?'w':'r';
const ovl=(a1,a2,b1,b2)=>Math.max(0,(Math.min(a2,b2)-Math.max(a1,b1))/60000);

function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2800);}

function setTema(t){
  document.documentElement.dataset.theme=t;
  $('t_light').setAttribute('aria-pressed',String(t==='light'));
  $('t_dark').setAttribute('aria-pressed',String(t==='dark'));
  try{localStorage.setItem('hh-tema',t)}catch(e){}
  if(LAST)requestAnimationFrame(desenhar);
}
$('t_light').addEventListener('click',()=>setTema('light'));
$('t_dark').addEventListener('click',()=>setTema('dark'));
(function(){let t=null;try{t=localStorage.getItem('hh-tema')}catch(e){}
  setTema(t||((window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'));})();
const cvar=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const TH=()=>({tx:cvar('--tx'),tx2:cvar('--tx2'),tx3:cvar('--tx3'),line:cvar('--line'),card:cvar('--card'),
  card2:cvar('--card2'),accent:cvar('--accent'),meta:cvar('--meta'),ok:cvar('--ok'),warn:cvar('--warn'),bad:cvar('--bad')});

function mostrar(v){
  document.querySelectorAll('nav.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v===v)));
  document.querySelectorAll('.view').forEach(d=>d.classList.toggle('on',d.id==='v_'+v));
  if(v==='dados'&&PRONTO)montarDados();
  if(v==='analise'&&LAST)requestAnimationFrame(desenhar);
}
document.querySelectorAll('nav.tabs button').forEach(b=>b.addEventListener('click',()=>mostrar(b.dataset.v)));
