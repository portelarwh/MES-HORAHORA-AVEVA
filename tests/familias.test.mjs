/* Meta de OEE por família, com vigência por período. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, ts, dia, serie } from './harness.mjs';

const A = carregar();
const perto = (v, e, tol = 1e-9) => assert.ok(Math.abs(v - e) < tol, `esperado ~${e}, obtido ${v}`);
const T0 = ts(2026, 8, 17, 6, 0), T4 = ts(2026, 8, 17, 10, 0);
const h = n => '2026-08-17T' + String(n).padStart(2, '0');

const info = (meta, alvo, aten, fam) => ({
  metaHora: meta, catalogoId: 'c1', numero: 'CAT-A', tipo: 'blister',
  familiaId: 'f1', familia: fam || 'Família Y', alvoOee: alvo, atencaoOee: aten,
  vigencia: '01/08/2026 → em aberto'
});
const an = (o = {}) => A.analisarMaquina(MAQ_LOTE, [dia('m1', '2026-08-17', serie(T0, 241, 60))],
  { ini: T0, fim: T4, limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'programado', ...o });

test('sem família, o OEE fica sem meta e a cor é neutra, não vermelha', () => {
  const t = A.metricas(an(), T0, T4);
  assert.equal(t.alvoOee, null);
  assert.equal(A.clAlvo(t.oeeBase, t.alvoOee, t.atencaoOee), 'n');
  assert.equal(A.fmtPct(t.alvoOee), A.NAO_CALC);
  assert.ok(t.oeeBase != null, 'o OEE em si continua sendo calculado');
});

test('a meta de OEE da família colore o indicador', () => {
  const t = A.metricas(an({ metaPadrao: info(60000, 0.82, 0.74) }), T0, T4);
  assert.equal(t.alvoOee, 0.82);
  assert.equal(t.atencaoOee, 0.74);
  assert.equal(A.clAlvo(0.85, t.alvoOee, t.atencaoOee), 'g', 'acima da meta fica verde');
  assert.equal(A.clAlvo(0.78, t.alvoOee, t.atencaoOee), 'w', 'entre atenção e meta fica âmbar');
  assert.equal(A.clAlvo(0.70, t.alvoOee, t.atencaoOee), 'r', 'abaixo da atenção fica vermelho');
});

test('a mesma produção troca de cor quando a meta de OEE muda', () => {
  const facil = A.metricas(an({ metaPadrao: info(60000, 0.45, 0.40) }), T0, T4);
  const dificil = A.metricas(an({ metaPadrao: info(60000, 0.95, 0.90) }), T0, T4);
  assert.equal(facil.oeeBase, dificil.oeeBase, 'o OEE em si não muda');
  assert.ok(facil.oeeBase > 0.49 && facil.oeeBase < 0.5, 'a fixture roda a ~49,8% de OEE');
  assert.equal(A.clAlvo(facil.oeeBase, facil.alvoOee, facil.atencaoOee), 'g',
    '50% bate uma meta de 45%');
  assert.equal(A.clAlvo(dificil.oeeBase, dificil.alvoOee, dificil.atencaoOee), 'r',
    'os mesmos 50% ficam vermelhos contra uma meta de 95%');
});

test('a faixa de atenção fica entre o limite e a meta', () => {
  const t = A.metricas(an({ metaPadrao: info(60000, 0.60, 0.45) }), T0, T4);
  assert.equal(A.clAlvo(t.oeeBase, t.alvoOee, t.atencaoOee), 'w',
    '50% está entre a atenção de 45% e a meta de 60%');
});

test('período que cruza duas vigências usa a média ponderada pelos minutos', () => {
  /* 06h e 07h na meta antiga (80%), 08h e 09h na nova (90%) */
  const a = an({ metaPadrao: info(60000, 0.80, 0.72),
    metaHoras: new Map([[h(8), info(60000, 0.90, 0.81)], [h(9), info(60000, 0.90, 0.81)]]) });
  const t = A.metricas(a, T0, T4);
  perto(t.alvoOee, (0.80 * 120 + 0.90 * 120) / 240);
  perto(t.alvoOee, 0.85);
  perto(t.atencaoOee, (0.72 * 120 + 0.81 * 120) / 240);
});

test('cada hora usa a sua própria meta, sem média', () => {
  const a = an({ metaPadrao: info(60000, 0.80, 0.72),
    metaHoras: new Map([[h(8), info(60000, 0.90, 0.81)]]) });
  const h7 = A.metricas(a, ts(2026, 8, 17, 7, 0), ts(2026, 8, 17, 8, 0));
  const h8 = A.metricas(a, ts(2026, 8, 17, 8, 0), ts(2026, 8, 17, 9, 0));
  assert.equal(h7.alvoOee, 0.80);
  assert.equal(h8.alvoOee, 0.90);
});

test('as famílias do recorte são listadas com os minutos de cada uma', () => {
  const a = an({ metaPadrao: info(60000, 0.80, 0.72, 'Blister'),
    metaHoras: new Map([[h(8), info(60000, 0.90, 0.81, 'Sachê')]]) });
  const t = A.metricas(a, T0, T4);
  assert.equal(t.familias.length, 1, 'mesmo familiaId agrupa numa entrada só');
  const b = an({ metaPadrao: { ...info(60000, 0.80, 0.72, 'Blister'), familiaId: 'fA' },
    metaHoras: new Map([[h(8), { ...info(60000, 0.90, 0.81, 'Sachê'), familiaId: 'fB' }]]) });
  const t2 = A.metricas(b, T0, T4);
  assert.equal(t2.familias.length, 2);
  assert.equal(t2.familias[0].min, 180, 'a família com mais minutos vem primeiro');
  assert.equal(t2.familias[1].min, 60);
});

test('hora sem meta de OEE não puxa a média para baixo — fica de fora', () => {
  const semAlvo = { ...info(60000, null, null), familiaId: null, familia: null };
  const a = an({ metaPadrao: info(60000, 0.80, 0.72),
    metaHoras: new Map([[h(8), semAlvo], [h(9), semAlvo]]) });
  const t = A.metricas(a, T0, T4);
  perto(t.alvoOee, 0.80, 1e-9);
});

test('clAlvo devolve neutro quando não há meta ou o valor não é calculável', () => {
  assert.equal(A.clAlvo(null, 0.85, 0.76), 'n');
  assert.equal(A.clAlvo(0.9, null, null), 'n');
  assert.equal(A.clAlvo(0.9, 0, 0), 'n');
  assert.equal(A.clAlvo(0.5, 0.85, 0), 'r', 'sem limite de atenção, abaixo da meta é vermelho');
});

test('a meta de OEE não interfere no OEE nem na meta de peças', () => {
  const sem = A.metricas(an({ metaPadrao: info(60000, null, null) }), T0, T4);
  const com = A.metricas(an({ metaPadrao: info(60000, 0.95, 0.9) }), T0, T4);
  assert.equal(sem.oeeBase, com.oeeBase);
  assert.equal(sem.planMetaBase, com.planMetaBase);
  assert.equal(sem.metaEfetiva, com.metaEfetiva);
});
