/* Contagem nas bordas da janela e depois de lacuna.

   Reproduz o caso relatado pela operação: puxando o dia 17/08, a primeira linha
   é o último registro válido do dia anterior (16/08 14:40). Do contador
   1.006.142 ao 1.006.167 foram 25 caixas; a versão anterior computava 24 porque
   descartava o incremento que vinha logo depois da lacuna noturna. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, ts, dia } from './harness.mjs';

const A = carregar();
const an = (dias, o = {}) => A.analisarMaquina(MAQ_LOTE, dias,
  { limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'marcacoes', ...o });

/* Os carimbos e os valores são os da tela relatada. */
const REAIS = [
  [ts(2026, 8, 16, 14, 40, 7, 500), 1006142],
  [ts(2026, 8, 17, 5, 12, 11, 692), 1006143],
  [ts(2026, 8, 17, 5, 21, 14,  76), 1006150],
  [ts(2026, 8, 17, 5, 21, 42, 955), 1006151],
  [ts(2026, 8, 17, 5, 37, 30, 254), 1006164],
  [ts(2026, 8, 17, 5, 38, 10, 728), 1006165],
  [ts(2026, 8, 17, 5, 43, 40, 278), 1006167]
];
const DIAS = [dia('m1', '2026-08-16', REAIS.slice(0, 1)), dia('m1', '2026-08-17', REAIS.slice(1))];
const INI = ts(2026, 8, 16, 0, 0), FIM = ts(2026, 8, 18, 0, 0);

test('a diferença das leituras é 25 caixas', () => {
  assert.equal(REAIS[REAIS.length - 1][1] - REAIS[0][1], 25);
});

test('padrão: as 25 caixas são contadas, nenhuma se perde na lacuna noturna', () => {
  const a = an(DIAS, { ini: INI, fim: FIM });
  const t = A.metricas(a, INI, FIM);
  assert.equal(t.inc, 25);
  assert.equal(t.inc, t.leituraFim - t.leituraIni, 'sem reset, a soma dos deltas fecha com as leituras');
  assert.equal(t.naoAtrib, 0);
  assert.equal(t.incAposLacuna, 1, 'a caixa registrada às 05:12 fica marcada como data incerta');
});

test('a primeira marcação nunca conta como produção — a contagem começa na segunda', () => {
  const a = an(DIAS, { ini: INI, fim: FIM });
  const primeiro = a.dentro[0];
  assert.equal(primeiro[0], REAIS[0][0]);
  assert.equal(a.eventos.some(e => e.t === primeiro[0]), false,
    'o primeiro registro não gera evento: ele é a referência');
  assert.equal(a.eventos.length, REAIS.length - 1);
  assert.equal(a.eventos.reduce((s, e) => s + e.delta, 0), 25);
});

test('modo "semLacuna" reproduz o comportamento antigo: 24 contadas, 1 reportada', () => {
  const a = an(DIAS, { ini: INI, fim: FIM, contagem: 'semLacuna' });
  const t = A.metricas(a, INI, FIM);
  assert.equal(t.inc, 24);
  assert.equal(t.naoAtrib, 1);
});

/* O relato pede para conferir o outro extremo: o último delta do dia. */
test('o último delta dentro da janela é sempre contado', () => {
  const a = an(DIAS, { ini: INI, fim: FIM });
  const ultimo = a.eventos[a.eventos.length - 1];
  assert.equal(ultimo.t, REAIS[REAIS.length - 1][0]);
  assert.equal(ultimo.delta, 2);
  assert.equal(ultimo.contabiliza, true);
});

test('janela que corta no meio: a caixa fica no dia em que foi registrada, sem sumir nem duplicar', () => {
  const corte = ts(2026, 8, 17, 0, 0);
  const a = an(DIAS, { ini: INI, fim: FIM });
  const total = A.metricas(a, INI, FIM).inc;
  const dia16 = A.metricas(a, INI, corte).inc;
  const dia17 = A.metricas(a, corte, FIM).inc;
  assert.equal(dia16, 0, 'em 16/08 só há a marcação de referência, sem incremento');
  assert.equal(dia17, 25, 'as 25 caixas caem no dia em que o historian as registrou');
  assert.equal(dia16 + dia17, total, 'a soma das janelas é igual ao total contínuo');
});

test('analisar só o dia 17 dá o mesmo resultado que analisar os dois dias', () => {
  const soDia17 = an(DIAS, { ini: ts(2026, 8, 17, 0, 0), fim: FIM });
  assert.equal(A.metricas(soDia17, ts(2026, 8, 17, 0, 0), FIM).inc, 25,
    'o registro anterior à janela serve de referência mesmo estando fora dela');
});

test('borda com parada curta: incremento vindo de antes da janela é contado e sinalizado', () => {
  const pts = [[ts(2026, 8, 17, 5, 55), 100], [ts(2026, 8, 17, 6, 4), 104]];   // 9 min: parada
  const ini = ts(2026, 8, 17, 6, 0), fim = ts(2026, 8, 17, 7, 0);
  const a = an([dia('m1', '2026-08-17', pts)], { ini, fim });
  const t = A.metricas(a, ini, fim);
  assert.equal(t.inc, 4);
  assert.equal(t.incBorda, 4, 'marcado como vindo do registro anterior à janela');
  const estrito = an([dia('m1', '2026-08-17', pts)], { ini, fim, contagem: 'semLacuna' });
  assert.equal(A.metricas(estrito, ini, fim).inc, 0, 'no modo estrito esse incremento fica de fora');
});

test('a hora expandida mostra as caixas da hora e a soma das horas fecha com o dia', () => {
  const a = an(DIAS, { ini: INI, fim: FIM });
  const B = A.bucketsDe('hora', ts(2026, 8, 17, 0, 0), FIM, [], null);
  const soma = B.reduce((s, bk) => s + A.metricas(a, bk.a, bk.b).inc, 0);
  assert.equal(soma, 25);
  const h5 = B.find(bk => new Date(bk.a).getHours() === 5);
  assert.equal(A.metricas(a, h5.a, h5.b).inc, 25, 'todas as caixas foram registradas na hora 05');
});
