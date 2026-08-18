/* Formatação e a política de "não calculável". */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, ts } from './harness.mjs';

const A = carregar();

test('razao devolve null em vez de zero quando o denominador não existe', () => {
  assert.equal(A.razao(10, 0), null);
  assert.equal(A.razao(10, null), null);
  assert.equal(A.razao(10, undefined), null);
  assert.equal(A.razao(10, -5), null);
  assert.equal(A.razao(0, 4), 0);
  assert.equal(A.razao(10, 4), 2.5);
});

test('percentual não calculável nunca é exibido como 0%', () => {
  assert.equal(A.pct(10, 0), A.NAO_CALC);
  assert.equal(A.fmtPct(null), A.NAO_CALC);
  assert.equal(A.fmtPct(0), '0,0%');
  assert.equal(A.fmtPct(0.8532), '85,3%');
});

test('números inválidos viram travessão, não zero', () => {
  assert.equal(A.nf(undefined), A.NAO_CALC);
  assert.equal(A.nf(NaN), A.NAO_CALC);
  assert.equal(A.nf(0), '0');
  assert.equal(A.nf1(null), A.NAO_CALC);
  assert.equal(A.hDur(null), A.NAO_CALC);
  assert.equal(A.fmtVal(null), A.NAO_CALC);
});

test('durações são formatadas em h e min', () => {
  assert.equal(A.hDur(0), '0h00');
  assert.equal(A.hDur(90), '1h30');
  assert.equal(A.hDur(500), '8h20');
});

test('dtBR preserva segundos e milissegundos do carimbo original', () => {
  assert.equal(A.dtBR(ts(2026, 8, 17, 6, 5, 23, 926)), '17/08/2026 06:05:23,926');
  assert.equal(A.dtBR(ts(2026, 8, 17, 6, 5, 23, 0)), '17/08/2026 06:05:23');
  assert.equal(A.dtBR(ts(2026, 8, 17, 6, 5, 23, 926), 'min'), '17/08/2026 06:05');
  assert.equal(A.dtBR(null), A.NAO_CALC);
});

test('hm e mh convertem horário e minutos nos dois sentidos', () => {
  assert.equal(A.hm('06:00'), 360);
  assert.equal(A.hm('22:40'), 1360);
  assert.equal(A.mh(360), '06:00');
  assert.equal(A.mh(1360), '22:40');
});

test('cl classifica sem confundir não calculável com ruim', () => {
  assert.equal(A.cl(null), 'n');
  assert.equal(A.cl(1), 'g');
  assert.equal(A.cl(0.9), 'w');
  assert.equal(A.cl(0.5), 'r');
});
