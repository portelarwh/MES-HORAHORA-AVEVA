/* 90-montagem.js — Ligação dos controles da aba Análise: máquinas, seções,
   seletor de cartões, filtros rápidos, limpar relatório e atualização
   automática. Nada de cálculo aqui. */
"use strict";

function montarAnalise(){
  const w=$('a_maqs');
  if(!MAQ.length)w.innerHTML='<span style="font-size:13.5px;color:var(--tx3)">Cadastre uma máquina para começar.</span>';
  else{
    const antes=new Set([...w.querySelectorAll('input:checked')].map(i=>i.value));
    w.innerHTML=MAQ.map((m,i)=>{
      const on=antes.size?antes.has(m.id):i===0;
      return `<label class="opt${on?' on':''}"><input type="checkbox" value="${m.id}"${on?' checked':''}>`
        +`<span class="sw" style="background:${m.cor}"></span>${esc(m.nome)}</label>`;
    }).join('');
    w.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{
      i.closest('.opt').classList.toggle('on',i.checked);if(LAST)rodarAnalise();
    }));
  }
  if(!$('a_ops').children.length){
    $('a_ops').innerHTML=OPCOES.map(([k,r])=>
      `<label class="opt${secaoAtiva(k)?' on':''}"><input type="checkbox" value="${k}"${secaoAtiva(k)?' checked':''}>${r}</label>`).join('');
    $('a_ops').querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{
      i.closest('.opt').classList.toggle('on',i.checked);
      PREFS.secoes[i.value]=i.checked;salvarPrefs();
      if(LAST)protegido('a análise',renderAnalise);
    }));
  }
}

/* --- seletor de cartões --------------------------------------------------
   A escolha é gravada em localStorage e sobrevive ao recarregamento. */
function dialogoCards(){
  $('dlg_t').textContent='Cartões do resumo';
  $('dlg_p').textContent='Escolha o que aparece no topo da análise. A seleção fica salva neste navegador.';
  const grupos=[...new Set(CARDS.map(c=>c[2]))];
  $('dlg_b').innerHTML=grupos.map(g=>
    `<div class="sublbl" style="margin-top:12px">${esc(g)}</div><div class="opts">`
    +CARDS.filter(c=>c[2]===g).map(([k,r])=>
      `<label class="opt${cardAtivo(k)?' on':''}"><input type="checkbox" data-card="${k}"${cardAtivo(k)?' checked':''}>${esc(r)}</label>`).join('')
    +'</div>').join('');
  $('dlg_b').querySelectorAll('input[data-card]').forEach(i=>i.addEventListener('change',()=>{
    i.closest('.opt').classList.toggle('on',i.checked);
    PREFS.cards[i.dataset.card]=i.checked;
  }));
  $('dlg_f').innerHTML='';
  const rest=el('button','act');rest.type='button';rest.textContent='Restaurar padrão';
  rest.addEventListener('click',()=>{PREFS.cards=prefsPadrao().cards;salvarPrefs();$('dlg').close();
    dialogoCards();if(LAST)protegido('a análise',renderAnalise)});
  const ok=el('button','act pri');ok.type='button';ok.textContent='Aplicar';
  ok.addEventListener('click',()=>{salvarPrefs();$('dlg').close();
    if(LAST)protegido('a análise',renderAnalise);toast('Seleção de cartões salva')});
  $('dlg_f').append(rest,ok);$('dlg').showModal();
}

/* --- aplicação das preferências nos controles ---------------------------- */
function montarBases(){
  $('a_base').innerHTML=BASES.map(([k,r,d])=>
    `<option value="${k}" title="${esc(d)}">${esc(r)}</option>`).join('');
}
function aplicarPrefsNaTela(){
  montarBases();
  $('a_hde').value=PREFS.hDe;$('a_hate').value=PREFS.hAte;
  $('a_gran').value=PREFS.gran;$('a_tipo').value=PREFS.tipo;$('a_base').value=PREFS.base;
  $('a_lim').value=PREFS.limParada;$('a_limsd').value=PREFS.limSemDados;
  $('a_autoseg').value=PREFS.autoSeg;
  $('a_basehelp').textContent=descBase(PREFS.base);
}

/* --- ligações ------------------------------------------------------------ */
$('a_go').addEventListener('click',()=>rodarAnalise());
$('a_cards').addEventListener('click',dialogoCards);
$('a_limpar').addEventListener('click',limparRelatorio);
$('a_base').addEventListener('change',()=>{$('a_basehelp').textContent=descBase($('a_base').value)});
['a_gran','a_tipo','a_lim','a_limsd','a_de','a_ate','a_hde','a_hate','a_borda','a_base']
  .forEach(id=>$(id).addEventListener('change',()=>{guardarFiltros();if(LAST)rodarAnalise()}));
document.querySelectorAll('#a_rapidos button[data-rap]')
  .forEach(b=>b.addEventListener('click',()=>aplicarRapido(b.dataset.rap)));
$('a_auto').addEventListener('change',e=>{
  if(e.target.checked)ligarAuto();
  else{pararAuto();PREFS.auto=false;salvarPrefs();$('a_autoinfo').textContent='Atualização automática desligada.'}
});
$('a_autoseg').addEventListener('change',()=>{if($('a_auto').checked)ligarAuto()});
