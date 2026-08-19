/* Lote por hora e o recorte da janela pelo lote. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, ts, dia, serie } from './harness.mjs';

const A = carregar();
const T0 = ts(2026, 8, 17, 6, 0), T8 = ts(2026, 8, 17, 14, 0);
const h = n => '2026-08-17T' + String(n).padStart(2, '0');
const cat = lote => ({ metaHora: 60000, catalogoId: 'c1', numero: 'CAT-A', tipo: 'blister',
  cor: '#1565c0', familiaId: null, familia: null, alvoOee: null, atencaoOee: null,
  vigencia: null, lote });

/* 06h–09h no lote A, 10h–13h no lote B */
const mapa = () => new Map([6, 7, 8, 9].map(n => [h(n), cat('L-A')])
  .concat([10, 11, 12, 13].map(n => [h(n), cat('L-B')])));
const an = (o = {}) => A.analisarMaquina(MAQ_LOTE, [dia('m1', '2026-08-17', serie(T0, 481, 60))],
  { ini: T0, fim: T8, limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'programado',
    metaHoras: mapa(), metaPadrao: cat(null), ...o });

test('o período lista os lotes que atravessou, em ordem de tempo', () => {
  const t = A.metricas(an(), T0, T8);
  assert.equal(t.lotes.length, 2);
  assert.deepEqual([...t.lotes.map(l => l.lote)], ['L-A', 'L-B']);
  assert.equal(t.lotes[0].min, 240);
  assert.equal(t.lotes[1].min, 240);
});

test('cada hora carrega o seu próprio lote', () => {
  const a = an();
  const h7 = A.metricas(a, ts(2026, 8, 17, 7, 0), ts(2026, 8, 17, 8, 0));
  const h11 = A.metricas(a, ts(2026, 8, 17, 11, 0), ts(2026, 8, 17, 12, 0));
  assert.equal(h7.lotes[0].lote, 'L-A');
  assert.equal(h11.lotes[0].lote, 'L-B');
});

test('a janela do lote vai da primeira à última hora dele', () => {
  const a = an();
  const L = A.metricas(a, T0, T8).lotes.find(l => l.lote === 'L-B');
  assert.equal(L.a, ts(2026, 8, 17, 10, 0));
  assert.equal(L.b, ts(2026, 8, 17, 14, 0));
});

test('analisar só a janela do lote dá os mesmos números que somar as horas dele', () => {
  const a = an();
  const L = A.metricas(a, T0, T8).lotes.find(l => l.lote === 'L-B');
  const janela = A.metricas(a, L.a, L.b);
  const soma = A.bucketsDe('hora', L.a, L.b, [], null)
    .reduce((s, bk) => s + A.metricas(a, bk.a, bk.b).inc, 0);
  assert.equal(janela.inc, soma);
  assert.equal(janela.lotes.length, 1, 'só o lote filtrado aparece na janela dele');
  assert.equal(janela.lotes[0].lote, 'L-B');
});

test('a soma dos dois lotes fecha com o período inteiro', () => {
  const a = an();
  const t = A.metricas(a, T0, T8);
  const soma = t.lotes.reduce((s, L) => s + A.metricas(a, L.a, L.b).inc, 0);
  assert.equal(soma, t.inc);
});

test('hora sem lote não inventa lote nenhum', () => {
  const a = an({ metaHoras: new Map([[h(6), cat('L-A')]]) });
  const t = A.metricas(a, T0, T8);
  assert.equal(t.lotes.length, 1);
  assert.equal(t.lotes[0].min, 60, 'só a hora que tem lote conta');
  const h9 = A.metricas(a, ts(2026, 8, 17, 9, 0), ts(2026, 8, 17, 10, 0));
  assert.equal(h9.lotes.length, 0);
});

test('lote não interfere em produção, meta nem OEE', () => {
  const semLote = A.metricas(an({ metaHoras: new Map(), metaPadrao: cat(null) }), T0, T8);
  const comLote = A.metricas(an(), T0, T8);
  assert.equal(semLote.inc, comLote.inc);
  assert.equal(semLote.planMetaBase, comLote.planMetaBase);
  assert.equal(semLote.oeeBase, comLote.oeeBase);
});
