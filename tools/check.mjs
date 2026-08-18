#!/usr/bin/env node
/**
 * Confere a sintaxe de cada módulo e avisa se algum arquivo do src ficou
 * de fora do index.html — a causa mais provável de "a tela abre em branco".
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
let falhas = 0;

for (const f of readdirSync(join(src, 'js')).sort()) {
  try {
    execFileSync(process.execPath, ['--check', join(src, 'js', f)], { stdio: 'pipe' });
  } catch (e) {
    console.error(`sintaxe inválida em js/${f}\n${e.stderr}`);
    falhas++;
    continue;
  }
  if (!html.includes(`js/${f}`)) { console.error(`js/${f} não está referenciado no index.html`); falhas++; }
}
for (const f of readdirSync(join(src, 'css')).sort()) {
  if (!html.includes(`css/${f}`)) { console.error(`css/${f} não está referenciado no index.html`); falhas++; }
}

console.log(falhas ? `${falhas} problema(s) encontrado(s).` : 'Tudo certo: sintaxe válida e todos os arquivos referenciados.');
process.exit(falhas ? 1 : 0);
