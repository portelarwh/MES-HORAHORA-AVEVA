/* Motor de cálculo: janela exata, produção, tempos, OEE e meta proporcional.
   Cobre os cenários obrigatórios de período, delta, reset e lançamentos. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, MAQ_UNID, ts, dia, serie } from './harness.mjs';

const A = carregar();
const an = (maq, dias, o = {}) => A.analisarMaquina(maq, dias,
  { limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'programado', ...o });
const perto = (v, esperado, tol = 1e-6) =>
  assert.ok(Math.abs(v - esperado) < tol, `esperado ~${esperado}, obtido ${v}`);

/* Uma hora cheia com um registro por minuto: 60 pontos, 59 incrementos. */
const T0 = ts(2026, 8, 17, 6, 0);
const HORA = [T0, ts(2026, 8, 17, 7, 0)];
const umaHora = () => [dia('m1', '2026-08-17', serie(T0, 60, 60))];

test('cenário 1 — período completo: produção, tempos e OEE fecham entre si', () => {
  const a = an(MAQ_LOTE, umaHora(), { ini: HORA[0], fim: HORA[1] });
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(t.regs, 60);
  assert.equal(t.inc, 59);
  assert.equal(t.pcs, 59000);
  perto(t.dur, 60);
  perto(t.comDados, 59);          // do primeiro ao último registro
  perto(t.semDados, 1);           // o minuto final, sem registro
  perto(t.programado, 60);
  perto(t.observado, 59);
  perto(t.operacional, 59);
  perto(t.parcial, 59);
  perto(t.oee.programado, 59000 / 120000);
  perto(t.oee.observado, 59000 / (120000 * 59 / 60));
  perto(t.atingBase, 59000 / 90000);
  perto(t.planMetaBase, 90000);
});

test('cenário 26 — cálculos respeitam o intervalo exato, não a extensão dos dados', () => {
  const a = an(MAQ_LOTE, umaHora(), { ini: ts(2026, 8, 17, 6, 10), fim: ts(2026, 8, 17, 6, 20) });
  const t = A.metricas(a, ts(2026, 8, 17, 6, 10), ts(2026, 8, 17, 6, 20));
  perto(t.dur, 10);
  assert.equal(t.regs, 10);       // 06:10 .. 06:19
  assert.equal(t.inc, 10);        // inclui o incremento de 06:10, vindo de 06:09
  assert.equal(t.pcs, 10000);
  perto(t.programado, 10);
});

test('cenário 3 e 4 — buckets começam e terminam no meio da hora, sem inventar hora cheia', () => {
  const ini = ts(2026, 8, 17, 7, 20), fim = ts(2026, 8, 17, 9, 40);
  const B = A.bucketsDe('hora', ini, fim, [], null);
  assert.equal(B.length, 3);
  assert.equal(B[0].a, ini); assert.equal(B[0].b, ts(2026, 8, 17, 8, 0));
  assert.equal(B[0].parcial, true);
  assert.equal(B[1].parcial, false);
  assert.equal(B[2].b, fim); assert.equal(B[2].parcial, true);
  assert.equal(B.reduce((s, b) => s + (b.b - b.a), 0), fim - ini);
});

test('cenário 5 — a série atravessa a meia-noite e o incremento não se perde', () => {
  const dias = [
    dia('m1', '2026-08-17', [[ts(2026, 8, 17, 23, 59, 0), 1000], [ts(2026, 8, 17, 23, 59, 30), 1001]]),
    dia('m1', '2026-08-18', [[ts(2026, 8, 18, 0, 0, 30), 1002], [ts(2026, 8, 18, 0, 1, 0), 1003]])
  ];
  const ini = ts(2026, 8, 17, 23, 0), fim = ts(2026, 8, 18, 1, 0);
  const a = an(MAQ_LOTE, dias, { ini, fim });
  const t = A.metricas(a, ini, fim);
  assert.equal(t.inc, 3);                       // 1000→1003, inclusive o pulo da meia-noite
  const cruza = a.eventos.find(e => e.t === ts(2026, 8, 18, 0, 0, 30));
  assert.ok(cruza, 'o evento que cruza a meia-noite existe');
  assert.equal(cruza.delta, 1);
  assert.equal(cruza.contabiliza, true);
});

test('cenário 12 e 13 — delta 1 e delta maior que 1 usam o carimbo real, sem horário inventado', () => {
  const pts = [[T0, 1000], [T0 + 60000, 1001], [T0 + 120000, 1006]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { ini: HORA[0], fim: HORA[1] });
  assert.equal(a.eventos.length, 2);            // dois eventos, não seis
  assert.equal(a.eventos[0].delta, 1);
  assert.equal(a.eventos[1].delta, 5);
  assert.equal(a.eventos[1].t, T0 + 120000);
  assert.equal(a.deltasMaiores, 1);
  assert.equal(a.dentro.length, 3);             // nenhum registro foi criado
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(t.inc, 6);
  assert.equal(t.pcs, 6000);
});

test('cenário 11 e 17 — registro sem alteração não é produção', () => {
  const pts = [[T0, 1000], [T0 + 60000, 1000], [T0 + 120000, 1000], [T0 + 180000, 1001]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { ini: HORA[0], fim: HORA[1] });
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(t.inc, 1);
  assert.equal(t.semAlt, 2);
  assert.equal(a.semAlteracao, 2);
});

test('cenário 14 — reset do contador usa o offset da máquina e é sinalizado', () => {
  const pts = [[T0, 1005], [T0 + 60000, 3]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { ini: HORA[0], fim: HORA[1] });
  assert.equal(a.resets, 1);
  assert.equal(a.eventos[0].reset, true);
  assert.equal(a.eventos[0].delta, 2);          // 3 − offset 1
});

test('cenário 10 — um único registro no período não gera produção nem janela', () => {
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', [[ts(2026, 8, 17, 6, 30), 1000]])],
    { ini: HORA[0], fim: HORA[1] });
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(t.regs, 1);
  assert.equal(t.inc, 0);
  perto(t.comDados, 0);
  assert.equal(t.oee.observado, null, 'sem janela com dados o OEE observado não é calculável');
  assert.equal(t.primeiroReg, t.ultimoReg);
});

test('cenário 9 — turno sem nenhum dado: nada é estimado e nada vira parada', () => {
  const a = an(MAQ_LOTE, [], { ini: HORA[0], fim: HORA[1] });
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(t.regs, 0);
  assert.equal(t.pcs, 0);
  perto(t.semDados, 60);
  perto(t.parado, 0, 1e-9);
  assert.equal(t.oee.observado, null);
  assert.equal(t.oee.parcial, null);
  assert.equal(t.parcial, null);
  perto(t.oee.programado, 0);                   // programado existe: produziu zero em 60 min
});

test('cenário 8 — turno sem produção difere de turno sem dados', () => {
  const pts = serie(T0, 60, 60).map(([t]) => [t, 1000]);
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { ini: HORA[0], fim: HORA[1] });
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(t.pcs, 0);
  perto(t.comDados, 59);
  assert.equal(t.oee.observado, 0);             // calculável e igual a zero
  assert.equal(t.atingBase, 0);
});

test('parada e ausência de dados são separadas pelos dois limiares', () => {
  const pts = [
    [T0, 1000],
    [T0 + 10 * 60000, 1001],                    // 10 min: parada
    [T0 + 60 * 60000, 1002],                    // 50 min: ausência de dados
    [T0 + 61 * 60000, 1003]
  ];
  const ini = T0, fim = T0 + 120 * 60000;
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { ini, fim });
  const t = A.metricas(a, ini, fim);
  assert.equal(a.paradas.length, 1);
  perto(a.paradas[0].min, 10);
  assert.ok(a.lacunas.some(l => Math.abs(l.min - 50) < 1e-6), 'a lacuna de 50 min existe');
  perto(t.parado, 10);
  perto(t.semDados, 50 + 59);                   // a lacuna mais o tempo após o último registro
  assert.equal(t.inc, 3, 'todo delta conta, inclusive o que veio depois da lacuna');
  assert.equal(t.incAposLacuna, 1, 'o incremento de depois da lacuna fica marcado como data incerta');
  assert.equal(t.naoAtrib, 0);
});

test('modo "semLacuna" deixa fora o incremento vindo depois da lacuna', () => {
  const pts = [
    [T0, 1000], [T0 + 10 * 60000, 1001], [T0 + 60 * 60000, 1002], [T0 + 61 * 60000, 1003]
  ];
  const ini = T0, fim = T0 + 120 * 60000;
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { ini, fim, contagem: 'semLacuna' });
  const t = A.metricas(a, ini, fim);
  assert.equal(t.inc, 2);
  assert.equal(t.naoAtrib, 1);
  assert.equal(t.incAposLacuna, 0);
});

test('cenário 18 e 19 — abono sai de todas as bases, inclusive quando só parte cai no período', () => {
  const ajustes = [{ id: 'a1', maquinaId: 'm1', data: '2026-08-17', tipo: 'abono',
    inicio: '06:50', minutos: 20 }];                       // 06:50–07:10
  const a = an(MAQ_LOTE, umaHora(), { ini: HORA[0], fim: HORA[1], ajustes });
  const t = A.metricas(a, HORA[0], HORA[1]);
  perto(t.abono, 10);                                      // só 06:50–07:00 está no período
  perto(t.programado, 50);
  perto(t.observado, 59 - 9);                              // cobertura vai até 06:59
  perto(t.planMetaBase, 90000 * 50 / 60);
});

test('cenário 20 e 21 — capacidade ou meta zerada devolve não calculável, nunca 0%', () => {
  const semCap = an({ ...MAQ_LOTE, cap: 0 }, umaHora(), { ini: HORA[0], fim: HORA[1] });
  const t1 = A.metricas(semCap, HORA[0], HORA[1]);
  assert.equal(t1.oee.programado, null);
  assert.equal(t1.oeeBase, null);
  assert.equal(A.fmtPct(t1.oeeBase), A.NAO_CALC);

  const semMeta = an({ ...MAQ_LOTE, meta: 0 }, umaHora(), { ini: HORA[0], fim: HORA[1] });
  const t2 = A.metricas(semMeta, HORA[0], HORA[1]);
  assert.equal(t2.atingBase, null);
  assert.equal(A.fmtPct(t2.atingBase), A.NAO_CALC);
});

test('cenário 2 — turno em andamento: o OEE parcial ignora o tempo que ainda não passou', () => {
  const ini = ts(2026, 8, 17, 6, 0), fim = ts(2026, 8, 17, 14, 20);
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', serie(ini, 121, 60))], { ini, fim });
  const t = A.metricas(a, ini, fim);
  perto(t.dur, 500);
  perto(t.parcial, 120);                        // até 08:00, última marcação
  assert.ok(t.oee.parcial > t.oee.programado, 'parcial é maior que o programado do turno cheio');
  perto(t.oee.parcial, t.pcs / (120000 * 120 / 60));
});

test('modo unidade conta 1 peça por incremento', () => {
  const a = an(MAQ_UNID, umaHora(), { ini: HORA[0], fim: HORA[1] });
  const t = A.metricas(a, HORA[0], HORA[1]);
  assert.equal(a.pc, 1);
  assert.equal(t.pcs, 59);
});

test('as métricas não alteram os dados brutos', () => {
  const dias = umaHora();
  const antes = JSON.stringify(dias);
  const a = an(MAQ_LOTE, dias, { ini: HORA[0], fim: HORA[1] });
  A.metricas(a, HORA[0], HORA[1]);
  assert.equal(JSON.stringify(dias), antes);
});

test('cenário 22 — volume grande é processado sem estourar', () => {
  const n = 50000;
  const dias = [dia('m1', '2026-08-17', serie(T0, n, 1))];
  const fim = T0 + n * 1000;
  const t0 = Date.now();
  const a = an(MAQ_LOTE, dias, { ini: T0, fim });
  const t = A.metricas(a, T0, fim);
  assert.equal(t.inc, n - 1);
  assert.ok(Date.now() - t0 < 5000, 'a análise de 50 mil pontos leva menos de 5 s');
});
