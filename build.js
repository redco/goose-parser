/* eslint import/no-extraneous-dependencies: ['error', {devDependencies: true}] */
const rimraf = require('rimraf');
const cp = require('child_process');
const fs = require('fs');
const pkg = require('./package.json');

rimraf.sync('build');
delete pkg.private;
delete pkg.devDependencies;
delete pkg.scripts;
delete pkg.directories;
fs.mkdirSync('build');
fs.writeFileSync('build/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
fs.writeFileSync('build/LICENSE', fs.readFileSync('LICENSE', 'utf-8'), 'utf-8');
fs.writeFileSync('build/README.md', fs.readFileSync('README.md', 'utf-8'), 'utf-8');
cp.spawnSync('cp', ['-R', 'lib', 'build/lib']);
