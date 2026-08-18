/* harness.mjs — Carrega os módulos puros do src/ num contexto isolado.

   Os arquivos de src/js são scripts clássicos de escopo global, por decisão de
   arquitetura (precisam abrir em file://). Para testá-los sem transformar o
   projeto em módulos ES, eles são concatenados na mesma ordem do index.html e
   avaliados num contexto de vm, exatamente como o navegador faria. Nenhum
   arquivo de produção é alterado por causa dos testes. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUROS = ['01-format.js', '02-config.js', '20-csv.js', '40-metrics.js', '41-quality.js'];

function fonte() {
  let src = 'var module={exports:{}};globalThis.API={};\n';
  for (const f of PUROS) {
    src += `/* === ${f} === */\n`;
    src += readFileSync(join(raiz, 'src', 'js', f), 'utf8');
    src += `\n;Object.assign(globalThis.API,module.exports);module={exports:{}};\n`;
  }
  return src;
}

export function carregar() {
  const ctx = vm.createContext({
    console,
    localStorage: (() => { const m = new Map(); return {
      getItem: k => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: k => m.delete(k) }; })()
  });
  vm.runInContext(fonte(), ctx, { filename: 'modulos-puros.js' });
  return ctx.API;
}

/* --- fixtures sintéticas -------------------------------------------------
   Dados inventados existem SÓ aqui, para os testes. Nenhum dado real de
   produção entra no repositório. */
export const MAQ_LOTE = { id: 'm1', nome: 'LINHA TESTE', modo: 'lote', porInc: 1000,
  unid: 'caixa', cap: 120000, meta: 90000, offset: 1, cor: '#000' };
export const MAQ_UNID = { ...MAQ_LOTE, id: 'm2', modo: 'unidade', porInc: 1, unid: 'peça' };

export const ts = (a, mes, d, h, mi, s = 0, ms = 0) => new Date(a, mes - 1, d, h, mi, s, ms).getTime();
export const dia = (maquinaId, data, pts) => ({ chave: maquinaId + '|' + data, maquinaId, data, pts });

/* Um ponto a cada `passoS` segundos, incremento de 1 em 1. */
export function serie(t0, n, passoS, valor0 = 1000000) {
  const pts = [];
  let v = valor0, t = t0;
  for (let i = 0; i < n; i++) { pts.push([t, v]); t += passoS * 1000; v += 1; }
  return pts;
}
