#!/usr/bin/env node
/**
 * Gera dist/mes-horahora.html: um único arquivo com todo o CSS e JS embutidos.
 * Essa versão abre com duplo clique, sem servidor, e é a que vai para o chão de fábrica.
 *
 *   node tools/build.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');
const dist = join(raiz, 'dist');
const ler = p => readFileSync(p, 'utf8');
const ordenados = d => readdirSync(join(src, d)).filter(f => !f.startsWith('.')).sort();

const versao = JSON.parse(ler(join(raiz, 'package.json'))).version;
const html = ler(join(src, 'index.html'));

const css = ordenados('css').map(f => `/* === ${f} === */\n${ler(join(src, 'css', f))}`).join('\n');
const js  = ordenados('js').map(f => `/* === ${f} === */\n${ler(join(src, 'js', f))}`).join('\n');

const saida = html
  .replace(/ {2}<link rel="stylesheet"[^>]*>\n?/g, '')
  .replace('</head>', `  <style>\n${css}\n  </style>\n</head>`)
  .replace(/<script src="js\/[^"]+"><\/script>\n?/g, '')
  .replace('</body>', `<script>\n${js}\n</script>\n</body>`)
  .replace('<title>', `<!-- MES Hora a Hora — AVEVA · v${versao} · build ${new Date().toISOString().slice(0, 10)} -->\n  <title>`);

mkdirSync(dist, { recursive: true });
const destino = join(dist, 'mes-horahora.html');
writeFileSync(destino, saida, 'utf8');

const kb = (Buffer.byteLength(saida, 'utf8') / 1024).toFixed(1);
console.log(`dist/mes-horahora.html gerado — ${kb} KB, ${ordenados('css').length} CSS + ${ordenados('js').length} JS embutidos.`);
