// tools/eslint.config.js
//
// Configuratie ESLint pentru aplicatie: prinde variabile nedefinite (greseli de scriere ca `GameShard`),
// variabile nefolosite, redeclarari si alte greseli care altfel ies la iveala abia cand copilul ajunge
// pe acel drum din joc. Scripturile sunt globale (fara module), deci numele globale ale proiectului se
// scot automat din `var Nume = ...` de la inceputul de rand al fiecarui fisier.
//   node tools/lint.js
'use strict';
const globals = require('globals');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'server', 'tools', 'dist']);

function walk(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js') && f !== 'sw.js') out.push(p);
  }
  return out;
}

const clientFiles = walk(ROOT, []);
const exported = new Map();   // fisier -> numele globale pe care le defineste
const allNames = new Set();
for (const f of clientFiles) {
  const set = new Set();
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/^var (\w+) =/gm)) { set.add(m[1]); allNames.add(m[1]); }
  exported.set(f, set);
}

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', vars: 'local' }],
  'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'warn', 'no-self-assign': 'warn',
  'no-empty': ['warn', { allowEmptyCatch: true }], 'eqeqeq': ['warn', 'smart'],
  'no-constant-condition': 'warn', 'no-fallthrough': 'warn', 'no-extra-boolean-cast': 'warn'
};

module.exports = [
  ...clientFiles.map((f) => {
    const g = { ...globals.browser, APP_VERSION: 'readonly' };
    for (const n of allNames) if (!exported.get(f).has(n)) g[n] = 'readonly';
    return { files: [path.relative(ROOT, f)], languageOptions: { sourceType: 'script', ecmaVersion: 2022, globals: g }, rules };
  }),
  { files: ['sw.js'], languageOptions: { sourceType: 'script', ecmaVersion: 2022, globals: { ...globals.serviceworker } }, rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] } },
  { files: ['server/**/*.js'], languageOptions: { sourceType: 'commonjs', ecmaVersion: 2022, globals: { ...globals.node } }, rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] } }
];
