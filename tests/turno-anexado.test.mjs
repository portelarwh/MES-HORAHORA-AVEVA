/* Regras de contagem e de turno anexado.

   Cenário real da linha: o 3º turno é de limpeza, não é produtivo, mas às vezes
   os funcionários adiantam caixas para o 1º turno. O 1º turno começa com essas
   caixas na conta, e continua sendo medido pelo horário cadastrado. */
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
const perto = (v, e, tol = 1e-6) => assert.ok(Math.abs(v - e) < tol, `esperado ~${e}, obtido ${v}`);
const an = (maq, dias, o = {}) => A.analisarMaquina(maq, dias,
  { ini: DIA_INI, fim: DIA_FIM, limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'marcacoes', ...o });
const medir = (a, bk) => A.metricas(a, bk.a, bk.b, bk.aProd == null ? null : { a: bk.aProd, b: bk.bProd });

/* 20 caixas adiantadas das 05:00 às 06:00 e produção normal das 06:00 às 14:00.
   O contador indica a PRÓXIMA caixa: começa em 1 e nada foi produzido ainda. */
function linhaComAdiantadas() {
  const pts = [];
  let v = 1;                                        // leitura 1 = zero caixas prontas
  pts.push([ts(2026, 8, 17, 5, 0), v]);
  for (let i = 0; i < 20; i++) pts.push([ts(2026, 8, 17, 5, 0) + (i + 1) * 2 * 60000, ++v]);  // 05:02..05:40
  for (let i = 0; i < 160; i++) pts.push([ts(2026, 8, 17, 6, 0) + (i + 1) * 3 * 60000, ++v]); // 06:03..14:00
  return [dia('m1', '2026-08-17', pts)];
}

test('contador indica a próxima caixa: a primeira leitura não é produção', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  assert.equal(t.leituraIni, 1, 'a primeira leitura do período é o início da contagem');
  assert.equal(t.contagemInicial, 1);
  assert.equal(t.leituraFim, 181);
  assert.equal(t.inc, 180, 'leitura 181 com contagem iniciando em 1 são 180 caixas concluídas');
  assert.equal(t.inc, t.leituraFim - t.leituraIni, 'sem reset, incrementos = diferença das leituras');
});

test('reset usa o início da contagem: leitura 1 depois do reset é zero produzido', () => {
  const pts = [[ts(2026, 8, 17, 5, 0), 450], [ts(2026, 8, 17, 6, 0), 1], [ts(2026, 8, 17, 6, 3), 2]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { limSemDadosMin: 120 });
  const ev = a.eventos.find(e => e.reset);
  assert.equal(ev.delta, 0, 'voltar para a leitura 1 não conta nenhuma caixa');
  assert.equal(a.eventos[a.eventos.length - 1].delta, 1, 'a leitura seguinte conta a caixa 1');
});

test('base "marcações": o OEE do período vai da primeira à última caixa', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  perto(t.marcacoes, 540);                          // 05:00 -> 14:00
  perto(t.dur, 1440);                               // o filtro pede o dia inteiro
  perto(t.oee.marcacoes, t.pcs / (MAQ_LOTE.cap * 540 / 60));
  assert.equal(t.base, 'marcacoes');
  assert.equal(t.tempoBase, t.marcacoes);
  assert.ok(t.oee.marcacoes > t.oee.programado,
    'medir pela janela das marcações não pune as horas em que a linha nem estava contando');
});

test('meta proporcional segue a base das marcações, não o horário do filtro', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  perto(t.planMetaBase, MAQ_LOTE.meta * 540 / 60);
  assert.notEqual(Math.round(t.planMetaBase), Math.round(MAQ_LOTE.meta * 1440 / 60));
});

test('turno anexado: a produção adiantada entra, as horas do turno de limpeza não', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3');
  const primeiro = B.find(b => b.turnoId === 't1');
  assert.ok(primeiro.anexado, 'o 1º turno recebeu a janela do 3º');
  assert.equal(primeiro.a, ts(2026, 8, 17, 6, 0), 'o tempo continua começando às 06:00');
  assert.equal(primeiro.aProd, DIA_INI, 'a produção é contada desde o início do período');

  const l = medir(a, primeiro);
  perto(l.dur, 500, 1e-6);                          // 06:00 -> 14:20, o horário cadastrado
  assert.equal(l.incAbsorvido, 20, 'as 20 caixas adiantadas foram absorvidas');
  assert.equal(l.inc, 180, 'as 20 adiantadas mais as 160 do turno');
  perto(l.oee.programado, l.pcs / (MAQ_LOTE.cap * 500 / 60));
});

test('sem a regra, o denominador do 1º turno herdaria as horas do 3º', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3');
  const primeiro = B.find(b => b.turnoId === 't1');
  const comRegra = medir(a, primeiro);
  const semRegra = A.metricas(a, primeiro.aProd, primeiro.b);   // janela única, como antes
  assert.ok(semRegra.dur > comRegra.dur + 300,
    'a janela única traria mais de 5 h a mais de turno de limpeza para o denominador');
  assert.ok(comRegra.oee.programado > semRegra.oee.programado,
    'a regra evita que o turno seguinte seja punido pelas horas que apenas herdou');
});

test('turno desconsiderado não duplica nem perde produção', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const total = A.metricas(a, DIA_INI, DIA_FIM);
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3');
  const soma = B.reduce((s, bk) => s + medir(a, bk).inc, 0);
  assert.equal(soma, total.inc);
  assert.ok(!B.some(b => b.turnoId === 't3'), 'o turno de limpeza não vira linha');
});

test('produção que sobra depois do último turno vira linha de produção antecipada', () => {
  const pts = serie(ts(2026, 8, 17, 23, 0), 20, 120);              // 23:00 -> 23:38
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)]);
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3');
  const antecipada = B.find(b => b.soProducao);
  assert.ok(antecipada, 'existe uma linha só de produção');
  const l = medir(a, antecipada);
  assert.equal(l.dur, 0);
  assert.ok(l.inc > 0, 'a produção aparece');
  assert.equal(l.oee.programado, null, 'sem tempo, não há OEE a calcular');
  assert.equal(A.fmtPct(l.oee.programado), A.NAO_CALC);
});

test('sem turno desconsiderado, produção e tempo usam a mesma janela', () => {
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null);
  for (const b of B) {
    assert.equal(b.aProd, b.a);
    assert.equal(b.bProd, b.b);
    assert.equal(!!b.anexado, false);
  }
  assert.equal(B.reduce((s, b) => s + (b.b - b.a), 0) / 60000, 1440);
});

/* --- base "Tempo cadastrado do turno" ----------------------------------- */
const segsDe = B => A.unirSegs(B.filter(t => t.b > t.a).map(t => ({ a: t.a, b: t.b })));

test('base do turno cadastrado usa só as horas de turno, não o período inteiro', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  a.turnoSegs = segsDe(A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null));
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  perto(t.dur, 1440);
  perto(t.turno, 1440, 1e-6);                  // três turnos cobrem o dia inteiro
  perto(t.oee.turno, t.oee.programado, 1e-9);
});

test('com o 3º turno desconsiderado, as horas dele saem do denominador', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  a.turnoSegs = segsDe(A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3'));
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  perto(t.turno, 1440 - 440);                  // 24h menos as 7h20 do turno de limpeza
  assert.ok(t.oee.turno > t.oee.programado,
    'medir só pelas horas de turno produtivo dá um OEE maior que medir pelo dia inteiro');
  perto(t.oee.turno, t.pcs / (MAQ_LOTE.cap * 1000 / 60));
});

test('as caixas adiantadas entram como bônus: a produção fica fora do denominador do turno', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  const B = A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3');
  a.turnoSegs = segsDe(B);
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  /* As 20 caixas das 05:00–05:40 foram feitas fora de qualquer turno cadastrado
     (o 3º foi desconsiderado), então contam no numerador sem custar denominador. */
  const semAdiantadas = (t.pcs - 20 * A.pecas(MAQ_LOTE)) / (MAQ_LOTE.cap * t.turno / 60);
  assert.ok(t.oee.turno > semAdiantadas, 'o bônus das adiantadas eleva o indicador');
});

test('sem turno cadastrado, a base do turno é não calculável e não vira zero', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  a.turnoSegs = [];
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  assert.equal(t.turno, null);
  assert.equal(t.oee.turno, null);
  assert.equal(A.fmtPct(t.oee.turno), A.NAO_CALC);
});

test('as bases entregam números diferentes entre si, como esperado', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  a.turnoSegs = segsDe(A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3'));
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  const vistos = new Set([t.oee.marcacoes, t.oee.turno, t.oee.programado].map(v => Math.round(v * 1e6)));
  assert.equal(vistos.size, 3, 'marcações, turno cadastrado e período selecionado são cálculos distintos');
  assert.ok(t.tempos.marcacoes < t.tempos.turno && t.tempos.turno < t.tempos.programado);
});

test('o bônus é a produção registrada fora de qualquer turno cadastrado', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  a.turnoSegs = segsDe(A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, 't3'));
  const t = A.metricas(a, DIA_INI, DIA_FIM);
  assert.equal(t.incForaTurno, 20, 'as 20 caixas das 05:00–05:40 caem no horário do turno desconsiderado');
  assert.equal(t.pcsForaTurno, 20 * A.pecas(MAQ_LOTE));
  /* Sem elas o mesmo denominador daria um OEE menor: é essa diferença o bônus. */
  perto(t.oee.turno - (t.pcs - t.pcsForaTurno) / (MAQ_LOTE.cap * t.turno / 60),
        t.pcsForaTurno / (MAQ_LOTE.cap * t.turno / 60), 1e-9);
});

test('com todos os turnos ativos não há bônus: tudo cai dentro de turno', () => {
  const a = an(MAQ_LOTE, linhaComAdiantadas());
  a.turnoSegs = segsDe(A.turnosNoIntervalo(TUR, DIA_INI, DIA_FIM, null));
  assert.equal(A.metricas(a, DIA_INI, DIA_FIM).incForaTurno, 0);
});
