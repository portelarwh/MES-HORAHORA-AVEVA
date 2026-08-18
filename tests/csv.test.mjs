/* Leitura do CSV do historian: separador, decimal e formatos de data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar } from './harness.mjs';

const A = carregar();

test('detecta vírgula e ponto e vírgula como separador', () => {
  assert.deepEqual([...A.parseCSV('Time,Valor\n1,2').head], ['Time', 'Valor']);
  assert.deepEqual([...A.parseCSV('Time;Valor\n1;2').head], ['Time', 'Valor']);
});

test('remove BOM e aceita CRLF', () => {
  const r = A.parseCSV('﻿Time,Valor\r\n8/17/2026 6:00:00 AM,10\r\n');
  assert.deepEqual([...r.head], ['Time', 'Valor']);
  assert.equal(r.rows.length, 1);
});

test('arquivo com menos de duas linhas é recusado com mensagem', () => {
  assert.throws(() => A.parseCSV('Time,Valor'), /menos de duas linhas/);
});

test('número aceita ponto e vírgula decimal, com separador de milhar', () => {
  assert.equal(A.toNum('1006194'), 1006194);
  assert.equal(A.toNum('1.006.194,5'), 1006194.5);
  assert.equal(A.toNum('1006194,5'), 1006194.5);
  assert.ok(Number.isNaN(A.toNum('')));
});

test('parseDate cobre en-US com AM/PM, pt-BR e ISO', () => {
  const d1 = A.parseDate('8/17/2026 6:24:46.857 AM', 'mdy');
  assert.equal(d1.getMonth(), 7); assert.equal(d1.getDate(), 17);
  assert.equal(d1.getHours(), 6); assert.equal(d1.getMilliseconds(), 857);
  const d2 = A.parseDate('17/08/2026 18:24:46,857', 'dmy');
  assert.equal(d2.getDate(), 17); assert.equal(d2.getHours(), 18);
  const d3 = A.parseDate('2026-08-17 06:24:46.857');
  assert.equal(d3.getDate(), 17); assert.equal(d3.getHours(), 6);
  assert.equal(A.parseDate('não é data', 'dmy'), null);
});

test('12 PM é meio-dia e 12 AM é meia-noite', () => {
  assert.equal(A.parseDate('8/17/2026 12:00:00 PM', 'mdy').getHours(), 12);
  assert.equal(A.parseDate('8/17/2026 12:00:00 AM', 'mdy').getHours(), 0);
});

test('detectFmt usa dia acima de 12 para desambiguar', () => {
  assert.equal(A.detectFmt(['17/08/2026 06:00:00']), 'dmy');
  assert.equal(A.detectFmt(['08/17/2026 06:00:00']), 'mdy');
  assert.equal(A.detectFmt(['01/02/2026 6:00:00 AM']), 'mdy');
});
