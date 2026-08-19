/* Meta por catálogo: por hora, ponderada no recorte, e acumulada. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, ts, dia, serie } from './harness.mjs';

const A = carregar();
const perto = (v, e, tol = 1e-6) => assert.ok(Math.abs(v - e) < tol, `esperado ~${e}, obtido ${v}`);
const T0 = ts(2026, 8, 17, 6, 0), T4 = ts(2026, 8, 17, 10, 0);

const CAT_A = { metaHora: 60000, catalogoId: 'ca', numero: 'CAT-A', tipo: 'blister' };
const CAT_B = { metaHora: 90000, catalogoId: 'cb', numero: 'CAT-B', tipo: 'sachê' };

/* Quatro horas de produção contínua, um registro por minuto. */
const dias = () => [dia('m1', '2026-08-17', serie(T0, 241, 60))];
const an = (o = {}) => A.analisarMaquina(MAQ_LOTE, dias(),
  { ini: T0, fim: T4, limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'programado', ...o });

const mapa = pares => new Map(pares);
const h = n => '2026-08-17T' + String(n).padStart(2, '0');

test('sem catálogo, a meta continua sendo a cadastrada na máquina', () => {
  const t = A.metricas(an(), T0, T4);
  assert.equal(t.metaEfetiva, MAQ_LOTE.meta);
  perto(t.planMeta.programado, MAQ_LOTE.meta * 4);
});

test('catálogo padrão da máquina substitui a meta cadastrada', () => {
  const t = A.metricas(an({ metaPadrao: CAT_A }), T0, T4);
  assert.equal(t.metaEfetiva, 60000);
  perto(t.planMeta.programado, 60000 * 4);
  assert.equal(t.catalogos.length, 1);
  assert.equal(t.catalogos[0].numero, 'CAT-A');
});

test('a hora programada vence o catálogo padrão', () => {
  const a = an({ metaPadrao: CAT_A, metaHoras: mapa([[h(8), CAT_B]]) });
  const hora8 = A.metricas(a, ts(2026, 8, 17, 8, 0), ts(2026, 8, 17, 9, 0));
  const hora7 = A.metricas(a, ts(2026, 8, 17, 7, 0), ts(2026, 8, 17, 8, 0));
  assert.equal(hora8.metaEfetiva, 90000, 'a hora 8 usa o catálogo programado');
  assert.equal(hora7.metaEfetiva, 60000, 'a hora 7 cai no catálogo padrão');
});

test('troca de catálogo no meio: a meta do período é a média ponderada pelos minutos', () => {
  /* 06h e 07h no CAT-A (60.000), 08h e 09h no CAT-B (90.000) */
  const a = an({ metaPadrao: CAT_A, metaHoras: mapa([[h(8), CAT_B], [h(9), CAT_B]]) });
  const t = A.metricas(a, T0, T4);
  perto(t.metaEfetiva, (60000 * 120 + 90000 * 120) / 240);
  perto(t.metaEfetiva, 75000);
  perto(t.planMeta.programado, 75000 * 4);
  assert.equal(t.catalogos.length, 2, 'os dois catálogos do período são listados');
  assert.deepEqual([...t.catalogos.map(c => c.numero)].sort(), ['CAT-A', 'CAT-B']);
});

test('recorte que começa no meio da hora pondera só os minutos que usa', () => {
  const a = an({ metaPadrao: CAT_A, metaHoras: mapa([[h(8), CAT_B]]) });
  /* 07:30 -> 08:30: meia hora em cada catálogo */
  const t = A.metricas(a, ts(2026, 8, 17, 7, 30), ts(2026, 8, 17, 8, 30));
  perto(t.metaEfetiva, 75000);
});

test('a meta acumulada é a soma das metas horárias, e fecha com a do período', () => {
  const a = an({ metaPadrao: CAT_A, metaHoras: mapa([[h(8), CAT_B], [h(9), CAT_B]]) });
  const B = A.bucketsDe('hora', T0, T4, [], null);
  const acumulado = B.reduce((s, bk) => s + A.metricas(a, bk.a, bk.b).planMeta.programado, 0);
  const periodo = A.metricas(a, T0, T4).planMeta.programado;
  perto(acumulado, periodo);
  perto(acumulado, 60000 + 60000 + 90000 + 90000);
});

test('a produção acumulada bate com a do período', () => {
  const a = an({ metaPadrao: CAT_A });
  const B = A.bucketsDe('hora', T0, T4, [], null);
  const soma = B.reduce((s, bk) => s + A.metricas(a, bk.a, bk.b).pcs, 0);
  assert.equal(soma, A.metricas(a, T0, T4).pcs);
});

test('atingimento por hora usa a meta daquela hora, não a média', () => {
  const a = an({ metaPadrao: CAT_A, metaHoras: mapa([[h(8), CAT_B]]) });
  const h7 = A.metricas(a, ts(2026, 8, 17, 7, 0), ts(2026, 8, 17, 8, 0));
  const h8 = A.metricas(a, ts(2026, 8, 17, 8, 0), ts(2026, 8, 17, 9, 0));
  assert.equal(h7.pcs, h8.pcs, 'as duas horas produziram o mesmo');
  assert.ok(h7.ating.programado > h8.ating.programado,
    'a hora com meta maior tem atingimento menor para a mesma produção');
  perto(h7.ating.programado, h7.pcs / 60000);
  perto(h8.ating.programado, h8.pcs / 90000);
});

test('catálogo com meta zerada deixa o atingimento não calculável, não zero', () => {
  const t = A.metricas(an({ metaPadrao: { ...CAT_A, metaHora: 0 } }), T0, T4);
  assert.equal(t.metaEfetiva, null);
  assert.equal(t.planMeta.programado, null);
  assert.equal(t.atingBase, null);
  assert.equal(A.fmtPct(t.atingBase), A.NAO_CALC);
});

test('horasDaJanela cobre o período inteiro e casa a chave da hora', () => {
  const H = A.horasDaJanela(ts(2026, 8, 17, 7, 20), ts(2026, 8, 17, 9, 40), null, CAT_A);
  assert.equal(H.length, 3, 'as três horas de relógio tocadas pelo período');
  assert.equal(A.chaveHora(ts(2026, 8, 17, 8, 45)), h(8));
  assert.ok(H.every(x => x.metaHora === 60000));
});

test('o OEE não muda com o catálogo — só a meta muda', () => {
  const semCat = A.metricas(an(), T0, T4);
  const comCat = A.metricas(an({ metaPadrao: CAT_A }), T0, T4);
  perto(comCat.oee.programado, semCat.oee.programado);
  assert.notEqual(comCat.ating.programado, semCat.ating.programado);
});
