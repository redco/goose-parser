/* eslint import/no-extraneous-dependencies: ['error', {devDependencies: true}] */
const rimraf = require('rimraf');
const cp = require('child_process');
const fs = require('fs');
const pkg = require('./package.json');

rimraf.sync('build');
cp.spawnSync('babel', ['lib', '-d', 'build/lib'], { stdio: 'inherit' });
delete pkg.private;
delete pkg.devDependencies;
delete pkg.scripts;
delete pkg['pre-commit'];
delete pkg['lint-staged'];
fs.writeFileSync('build/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
fs.writeFileSync('build/LICENSE', fs.readFileSync('LICENSE', 'utf-8'), 'utf-8');
fs.writeFileSync('build/README.md', fs.readFileSync('README.md', 'utf-8'), 'utf-8');
fs.writeFileSync('build/index.js', fs.readFileSync('index.js', 'utf-8'), 'utf-8');
cp.spawnSync('cp', ['-R', 'vendor', 'build/vendor']);
