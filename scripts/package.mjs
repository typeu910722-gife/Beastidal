// Builds the download package: build/beastidal-web-<version>.zip, the same folder the Windows ZIP ships
// (dist/ plus the local server and the start files), and build/site/ with dist/ alone for the website deploy.
// Run with `npm run package`. Needs the `zip` command.
import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || 'unknown';
const name = `beastidal-web-${pkg.version}`;
const stage = `build/${name}`;

rmSync('build', { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
cpSync('dist', `${stage}/dist`, { recursive: true, filter: src => !/smoke-|\/shots\//.test(src) });
for (const f of ['server.mjs', 'start-windows.bat', '開始遊玩.txt', 'README.md']) copyFileSync(f, `${stage}/${f}`);
writeFileSync(
  `${stage}/BUILD-INFO.txt`,
  [
    `Beastidal ${pkg.version}`,
    `commit ${commit}`,
    `built ${new Date().toISOString()}`,
    'Serve dist/ with any static server, or run node server.mjs.'
  ].join('\n') + '\n'
);

const zip = spawnSync('zip', ['-qr', `${name}.zip`, name], { cwd: 'build', stdio: 'inherit' });
if (zip.status !== 0) {
  console.error('zip failed; is the zip command installed?');
  process.exit(1);
}
cpSync('dist', 'build/site', { recursive: true });
console.log(`Package: build/${name}.zip (commit ${commit})`);
console.log('Website deploy folder: build/site/');
