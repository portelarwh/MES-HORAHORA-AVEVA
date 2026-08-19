/* 00-core.js — Estado global, helpers de DOM, tema, navegação e rede de
   segurança contra erro isolado. Formatação vive em 01-format.js. */
"use strict";

let MAQ=[],TUR=[],AJU=[],CAT=[],FAM=[],LAST=null,PRONTO=false;

const $=i=>document.getElementById(i);
const el=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e;};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAL=['#2A6FB0','#D97706','#1B8A5A','#8B4FBF','#C33C4E','#0E8F9E','#B0761F','#5D6BC0'];

function toast(m){const t=$('toast');if(!t)return;t.textContent=m;t.classList.add('on');
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2800);}

/* Um dado inválido em uma seção não pode derrubar a tela inteira: cada bloco
   de render é embrulhado aqui e vira um aviso no lugar do bloco. */
function protegido(nome,fn,aoFalhar){
  try{return fn()}
  catch(e){
    console.error('[monitor] falha em '+nome,e);
    toast('Não foi possível montar: '+nome);
    if(typeof aoFalhar==='function')aoFalhar(e);
    return null;
  }
}

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
