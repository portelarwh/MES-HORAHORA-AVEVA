#!/usr/bin/env node
/**
 * Verificações estáticas que evitam os defeitos que já apareceram no projeto:
 *
 *  1. sintaxe de cada módulo;
 *  2. arquivo do src/ que ficou de fora do index.html (tela em branco);
 *  3. id duplicado no HTML;
 *  4. $('id') apontando para elemento que não existe em lugar nenhum;
 *  5. botão sem handler registrado.
 *
 *   node tools/check.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');
const html = readFileSync(join(src, 'index.html'), 'utf8');
const arquivosJs = readdirSync(join(src, 'js')).sort();
const js = arquivosJs.map(f => readFileSync(join(src, 'js', f), 'utf8')).join('\n');
let falhas = 0;
const erro = m => { console.error('  ✗ ' + m); falhas++; };

/* 1 e 2 — sintaxe e referência ------------------------------------------- */
for (const f of arquivosJs) {
  try {
    execFileSync(process.execPath, ['--check', join(src, 'js', f)], { stdio: 'pipe' });
  } catch (e) {
    erro(`sintaxe inválida em js/${f}\n${e.stderr}`);
    continue;
  }
  if (!html.includes(`js/${f}`)) erro(`js/${f} não está referenciado no index.html`);
}
for (const f of readdirSync(join(src, 'css')).sort())
  if (!html.includes(`css/${f}`)) erro(`css/${f} não está referenciado no index.html`);

/* ordem de carregamento: o index deve seguir a ordem alfabética dos arquivos */
const ordemHtml = [...html.matchAll(/js\/([\w.-]+\.js)/g)].map(m => m[1]);
if (ordemHtml.join(',') !== arquivosJs.join(','))
  erro(`a ordem dos <script> difere da ordem dos arquivos.\n    html: ${ordemHtml.join(' ')}\n    src : ${arquivosJs.join(' ')}`);

/* 3 — ids duplicados ------------------------------------------------------ */
const idsHtml = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const vistos = new Set(), repetidos = new Set();
for (const id of idsHtml) (vistos.has(id) ? repetidos : vistos).add(id);
if (repetidos.size) erro(`id duplicado no index.html: ${[...repetidos].join(', ')}`);

/* 4 — $('id') sem elemento correspondente ---------------------------------
   Considera também os ids criados dinamicamente pelos módulos, que aparecem
   como id="..." dentro dos templates. */
const idsDinamicos = [...js.matchAll(/id="([\w-]+)"/g)].map(m => m[1]);
const conhecidos = new Set([...idsHtml, ...idsDinamicos]);
const usados = new Set([...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]));
const orfaos = [...usados].filter(id => !conhecidos.has(id));
if (orfaos.length) erro(`$('id') sem elemento correspondente: ${orfaos.join(', ')}`);

/* 5 — botões do HTML sem handler ------------------------------------------
   Um botão com id precisa aparecer em algum addEventListener; os que agem por
   delegação usam data-* e são reconhecidos por aí. */
const semHandler = [];
for (const m of html.matchAll(/<button[^>]*>/g)) {
  const tag = m[0];
  const id = (tag.match(/\sid="([^"]+)"/) || [])[1];
  const temData = /\sdata-\w+=/.test(tag);
  if (!id) { if (!temData) semHandler.push(tag.slice(0, 60)); continue; }
  if (!js.includes(`$('${id}')`)) semHandler.push('#' + id);
}
if (semHandler.length) erro(`botão sem handler nem data-*: ${semHandler.join(', ')}`);

console.log(falhas
  ? `\n${falhas} problema(s) encontrado(s).`
  : 'Tudo certo: sintaxe válida, arquivos referenciados, ids únicos e botões ligados.');
process.exit(falhas ? 1 : 0);
