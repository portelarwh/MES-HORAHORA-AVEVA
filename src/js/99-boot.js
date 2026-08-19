/* 99-boot.js — Abertura do banco, preferências e primeira renderização. */
"use strict";

(async function(){
  carregarPrefs();
  aplicarPrefsNaTela();
  try{await abrir()}
  catch(e){
    console.error('[monitor] IndexedDB indisponível',e);
    toast('Não foi possível abrir o banco local. Saia do modo privativo do navegador.');
    return;
  }
  await recarregar();
  const hoje=new Date();
  $('a_de').value=iso(new Date(hoje.getTime()-6*86400000));
  $('a_ate').value=iso(hoje);$('d_data').value=iso(hoje);
  montarMaquinas();montarTurnos();montarDia();montarFamilias();montarCatalogos();montarAnalise();
  await montarDados();
  PRONTO=true;
  if(!MAQ.length){
    await put('maquinas',{id:uid(),nome:'VAEB 01',etapa:'Packout',modo:'lote',porInc:1000,unid:'caixa',
      meta:90000,cap:115000,offset:1,cor:PAL[0],
      obs:'Contador registra caixa fechada; a contagem do lote abre em 1 mostrando a próxima caixa.'});
    await recarregar();montarMaquinas();montarAnalise();montarDia();montarCatalogos();await montarDados();
    mostrar('maquinas');toast('Criei a VAEB 01 como ponto de partida — edite ou adicione as outras');
  }
  if(PREFS.auto){$('a_auto').checked=true;ligarAuto()}
})();
