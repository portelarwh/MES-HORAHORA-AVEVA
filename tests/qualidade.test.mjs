/* Qualidade dos dados, painel de validação e preferências. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregar, MAQ_LOTE, ts, dia, serie } from './harness.mjs';

const A = carregar();
const T0 = ts(2026, 8, 17, 6, 0), T1 = ts(2026, 8, 17, 7, 0);
const an = (maq, dias, o = {}) => A.analisarMaquina(maq, dias,
  { ini: T0, fim: T1, limParadaMin: 3, limSemDadosMin: 30, ajustes: [], base: 'programado', ...o });

test('cenário 16 — carimbos duplicados são mesclados e contados', () => {
  const pts = [[T0, 1000], [T0, 1001], [T0 + 60000, 1002]];
  const s = A.serieDePontos([dia('m1', '2026-08-17', pts)]);
  assert.equal(s.pts.length, 2);
  assert.equal(s.duplicados, 1);
  assert.equal(s.pts[0][1], 1001, 'prevalece o último valor lido');
});

test('cenário 17 — carimbos fora de ordem são reordenados e sinalizados', () => {
  const pts = [[T0 + 120000, 1002], [T0, 1000], [T0 + 60000, 1001]];
  const s = A.serieDePontos([dia('m1', '2026-08-17', pts)]);
  assert.equal(s.foraDeOrdem, 1);
  assert.deepEqual([...s.pts.map(p => p[1])], [1000, 1001, 1002]);
});

test('cenário 15 — valores fracionados são contados como anomalia', () => {
  const pts = [[T0, 1000.5], [T0 + 60000, 1001.5]];
  const s = A.serieDePontos([dia('m1', '2026-08-17', pts)]);
  assert.equal(s.frac, 2);
});

test('pontos inválidos não derrubam a série', () => {
  const pts = [[T0, 1000], [NaN, 1001], [T0 + 60000, null], [T0 + 120000, 1002]];
  const s = A.serieDePontos([dia('m1', '2026-08-17', pts)]);
  assert.equal(s.pts.length, 2);
});

test('cobertura cheia é classificada como boa', () => {
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', serie(T0, 61, 60))]);
  const t = A.metricas(a, T0, T1);
  const q = A.qualidade(a, t);
  assert.equal(q.classe, 'boa');
  assert.ok(q.cobertura > 0.99);
});

test('cobertura baixa é classificada como ruim e gera validação crítica', () => {
  const pts = [[T0, 1000], [T0 + 60000, 1001], [T0 + 55 * 60000, 1002]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)]);
  const t = A.metricas(a, T0, T1);
  const q = A.qualidade(a, t);
  assert.equal(q.classe, 'ruim');
  const V = A.validacoes(a, t, {});
  assert.ok(V.some(v => v.codigo === 'COBERTURA' && v.nivel === 'crit'));
});

test('período sem registro é classificado como sem dados, não como ruim de máquina', () => {
  const a = an(MAQ_LOTE, []);
  const t = A.metricas(a, T0, T1);
  assert.equal(A.qualidade(a, t).classe, 'sem');
  assert.ok(A.validacoes(a, t, {}).some(v => v.codigo === 'SEM-DADOS'));
});

test('capacidade e meta ausentes aparecem no painel de validação', () => {
  const a = an({ ...MAQ_LOTE, cap: 0, meta: 0 }, [dia('m1', '2026-08-17', serie(T0, 61, 60))]);
  const t = A.metricas(a, T0, T1);
  const V = A.validacoes(a, t, {});
  assert.ok(V.some(v => v.codigo === 'CAPACIDADE'));
  assert.ok(V.some(v => v.codigo === 'META'));
});

test('incremento vindo depois de lacuna é contado e marcado como data incerta', () => {
  const pts = [[T0, 1000], [T0 + 50 * 60000, 1090], [T0 + 51 * 60000, 1091]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)]);
  const t = A.metricas(a, T0, T1);
  assert.equal(t.inc, 91, 'nenhuma caixa some da contagem');
  assert.equal(t.incAposLacuna, 90);
  assert.equal(t.naoAtrib, 0);
  const q = A.qualidade(a, t);
  assert.equal(q.dataIncerta, 90);
  assert.ok(A.validacoes(a, t, {}).some(v => v.codigo === 'DATA-INCERTA'));
});

test('no modo "semLacuna" o mesmo incremento é reportado como não atribuído', () => {
  const pts = [[T0, 1000], [T0 + 50 * 60000, 1090], [T0 + 51 * 60000, 1091]];
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', pts)], { contagem: 'semLacuna' });
  const t = A.metricas(a, T0, T1);
  assert.equal(t.inc, 1);
  assert.equal(t.naoAtrib, 90);
  assert.ok(A.validacoes(a, t, {}).some(v => v.codigo === 'NAO-ATRIBUIDO'));
});

test('turnos sobrepostos e ausência de turnos chegam ao painel', () => {
  const a = an(MAQ_LOTE, [dia('m1', '2026-08-17', serie(T0, 61, 60))]);
  const t = A.metricas(a, T0, T1);
  const V = A.validacoes(a, t, { turnosSobrepostos: true, semTurnos: true });
  assert.equal(V.filter(v => v.codigo === 'TURNOS').length, 2);
});

test('preferências: padrão completo, mescla defensiva e descarte de chave morta', () => {
  const p = A.prefsPadrao();
  assert.equal(Object.keys(p.cards).length, A.CARDS.length);
  assert.equal(p.base, 'marcacoes', 'o padrão passou a ser a janela da primeira à última marcação');
  const m = A.mesclaPrefs(p, { base: 'inexistente', limParada: -1, cards: { producao: false, zumbi: true } });
  assert.equal(m.base, 'marcacoes', 'base inválida cai no padrão');
  assert.equal(m.limParada, p.limParada, 'limiar inválido cai no padrão');
  assert.equal(m.cards.producao, false, 'a escolha do usuário é preservada');
  assert.equal(A.mesclaPrefs(p, { contagem: 'inventado' }).contagem, 'tudo', 'contagem inválida cai no padrão');
  assert.equal('zumbi' in m.cards, false, 'card que não existe mais é descartado');
  assert.equal(A.mesclaPrefs(p, null).base, 'marcacoes');
});

test('todo card do catálogo tem rótulo e grupo', () => {
  for (const [id, rot, grupo] of A.CARDS) {
    assert.ok(id && rot && grupo, 'card mal definido: ' + id);
  }
  const ids = A.CARDS.map(c => c[0]);
  assert.equal(new Set(ids).size, ids.length, 'não há id de card repetido');
});
