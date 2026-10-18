// tools/lint.js — ruleaza ESLint (vezi eslint.config.js) pe codul aplicatiei si al serverului.
//   node tools/lint.js        (cu --fix pentru corectari automate)
'use strict';
var cp = require('child_process');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var eslint = path.join(__dirname, 'node_modules', 'eslint', 'bin', 'eslint.js');
if (!require('fs').existsSync(eslint)) { console.error('Lipseste eslint: cd tools && npm install'); process.exit(2); }
var args = [eslint, '-c', path.join(__dirname, 'eslint.config.js'), '--max-warnings', '0', 'games', 'sw.js', 'server'];
// fisierele din radacina (config.js, shell.js...) — fara sa lasam ESLint sa intre in tools/ sau dist/
require('fs').readdirSync(ROOT).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) { args.push(f); });
if (process.argv.indexOf('--fix') !== -1) args.push('--fix');
var r = cp.spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
if (r.status === 0) console.log('lint ok');
process.exit(r.status);
