/* Turnos: virada de meia-noite, ausência de sobreposição, recorte na janela
   e a regra do turno desconsiderado. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, ts, dia, serie } from './harness.mjs';

const A = carregar();
const TUR = [
  { id: 't1', nome: '1º turno', inicio: '06:00', fim: '14:20' },
  { id: 't2', nome: '2º turno', inicio: '14:20', fim: '22:40' },
  { id: 't3', nome: '3º turno', inicio: '22:40', fim: '06:00' }
];
const DIA_INI = ts(2026, 8, 17, 0, 0), DIA_FIM = ts(2026, 8, 18, 0, 0);
const somaMin = L => L.reduce((s, x) => s + (x.b - x.a), 0) / 60000;

test('cenário 6 — o dia é coberto por ocorrências de turno que não se sobrepõem', () => {
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null);
  assert.equal(B.length, 4);                       // 3º da véspera, 1º, 2º e 3º do dia
  assert.equal(somaMin(B), 1440);
  for (let i = 0; i < B.length - 1; i++)
    assert.ok(B[i].b <= B[i + 1].a, 'nenhuma ocorrência invade a seguinte');
});

test('cenário 9 dos aceites — nenhum registro cai em dois turnos', () => {
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null);
  const marcas = [];
  for (let t = DIA_INI; t < DIA_FIM; t += 60000) marcas.push(t);
  for (const t of marcas) {
    const n = B.filter(b => b.a <= t && t < b.b).length;
    assert.equal(n, 1, 'o instante ' + new Date(t).toISOString() + ' pertence a exatamente um turno');
  }
});

test('turnos que viram a meia-noite mantêm a duração cadastrada', () => {
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null);
  const terceiro = B.filter(b => b.turnoId === 't3');
  assert.ok(terceiro.length >= 1);
  assert.equal(terceiro[terceiro.length - 1].durCadastrada, 440);   // 22:40 -> 06:00
});

test('cenário 7 — desconsiderar o 3º turno anexa a janela ao turno seguinte, sem perder tempo', () => {
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3');
  assert.ok(!B.some(b => b.turnoId === 't3'), 'o 3º turno não aparece como linha');
  assert.equal(somaMin(B), 1440, 'o período continua totalmente coberto');
  assert.ok(B.some(b => b.anexado), 'ao menos uma linha está marcada como anexada');
  for (let i = 0; i < B.length - 1; i++) assert.ok(B[i].b <= B[i + 1].a);
});

test('as ocorrências são recortadas na janela e sinalizadas', () => {
  const ini = ts(2026, 8, 17, 10, 0), fim = ts(2026, 8, 17, 16, 0);
  const B = A.turnosNoIntervalo(TUR, ini, fim, null);
  assert.equal(somaMin(B), 360);
  assert.equal(B[0].a, ini);
  assert.equal(B[B.length - 1].b, fim);
  assert.ok(B.every(b => b.recortado));
  assert.equal(B[0].durCadastrada, 500, 'a duração cadastrada do turno é preservada à parte');
});

test('turnos sobrepostos são recortados e sinalizados em vez de duplicarem registros', () => {
  const sobre = [
    { id: 's1', nome: 'A', inicio: '06:00', fim: '15:00' },
    { id: 's2', nome: 'B', inicio: '14:00', fim: '22:00' }
  ];
  const B = A.turnosNoIntervalo(sobre, DIA_INI, DIA_FIM, null);
  assert.ok(B.some(b => b.sobreposto), 'a sobreposição é sinalizada');
  for (let i = 0; i < B.length - 1; i++) assert.ok(B[i].b <= B[i + 1].a);
});

test('a produção do período bate com a soma dos turnos quando não há exclusão', () => {
  const T0 = ts(2026, 8, 17, 0, 0);
  const dias = [dia('m1', '2026-08-17', serie(T0, 1440, 60))];
  const a = A.analisarMaquina(MAQ_LOTE, dias,
    { ini: DIA_INI, fim: DIA_FIM, limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'programado' });
  const total = A.metricas(a, DIA_INI, DIA_FIM);
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null);
  const soma = B.reduce((s, b) => s + A.metricas(a, b.a, b.b).inc, 0);
  assert.equal(soma, total.inc);
});

test('bucketsDe por turno devolve as mesmas ocorrências', () => {
  const porTurno = A.bucketsDe('turno', DIA_INI, DIA_FIM, TUR, null);
  const direto = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null);
  assert.equal(porTurno.length, direto.length);
});

test('bucketsDe por dia respeita janela que começa e termina no meio do dia', () => {
  const ini = ts(2026, 8, 17, 10, 0), fim = ts(2026, 8, 19, 4, 0);
  const B = A.bucketsDe('dia', ini, fim, [], null);
  assert.equal(B.length, 3);
  assert.equal(B[0].a, ini);
  assert.equal(B[2].b, fim);
  assert.equal(B.reduce((s, b) => s + (b.b - b.a), 0), fim - ini);
});
