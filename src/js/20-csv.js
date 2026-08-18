/* 20-csv.js — Leitura de CSV, detecção de separador, número e formato de data. */
"use strict";

function splitLine(s,d){const o=[];let c='',q=false;
  for(let i=0;i<s.length;i++){const ch=s[i];
    if(ch==='"'){if(q&&s[i+1]==='"'){c+='"';i++}else q=!q}
    else if(ch===d&&!q){o.push(c);c=''}else c+=ch}
  o.push(c);return o.map(x=>x.trim());}
function parseCSV(t){
  const L=t.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/).filter(x=>x.trim()!=='');
  if(L.length<2)throw new Error('o arquivo tem menos de duas linhas');
  const d=(L[0].split(';').length>L[0].split(',').length)?';':',';
  const head=splitLine(L[0],d),rows=[];
  for(let i=1;i<L.length;i++){const p=splitLine(L[i],d);if(p.length>=head.length)rows.push(p)}
  return{head,rows};}
function toNum(s){if(s==null)return NaN;let t=String(s).trim();if(!t)return NaN;
  if(t.includes(',')&&t.includes('.'))t=t.replace(/\./g,'').replace(',','.');else if(t.includes(','))t=t.replace(',','.');
  return parseFloat(t);}
function detectFmt(v){let a=0,b=0,ap=false;
  for(const x of v){const m=String(x).match(/^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m){if(+m[1]>12)b++;if(+m[2]>12)a++}if(/\b(AM|PM)\b/i.test(x))ap=true}
  if(b>0&&a===0)return'dmy';if(a>0&&b===0)return'mdy';return ap?'mdy':'dmy';}
function parseDate(s,fmt){const t=String(s).trim();
  let m=t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,3}))?/);
  if(m)return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0),+((m[7]||'0').padEnd(3,'0')));
  m=t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[T ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,3}))?\s*(AM|PM)?/i);
  if(!m)return null;
  let A=+m[1],B=+m[2],Y=+m[3];if(Y<100)Y+=2000;
  const da=fmt==='dmy'?A:B,mo=fmt==='dmy'?B:A;
  let h=+m[4];const ap=(m[8]||'').toUpperCase();
  if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;
  const d=new Date(Y,mo-1,da,h,+m[5],+(m[6]||0),+((m[7]||'0').padEnd(3,'0')));
  return isNaN(d.getTime())?null:d;}
