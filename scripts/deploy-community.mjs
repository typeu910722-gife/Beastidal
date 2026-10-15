// Deploys the online message stele (docs/COMMUNITY.md) in one go:
//   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/deploy-community.mjs
// The token needs Workers Scripts: Edit, D1: Edit and (for the custom domain) Workers Routes / Zone DNS: Edit.
// Steps: find or create the D1 database `beastidal-community`, apply worker/schema.sql, write wrangler.toml with the
// Worker entry + assets + database, point dist/config.js's communityUrl at the site, and run `wrangler deploy`.
// Re-running is safe (the schema uses IF NOT EXISTS; an existing database is reused).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const DB = 'beastidal-community';
const root = new URL('..', import.meta.url).pathname;
const wrangler = (args, opts = {}) =>
  execFileSync('npx', ['--yes', 'wrangler@4', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts
  });

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error(
    'Set CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID) first — see the comment at the top of this file.'
  );
  process.exit(1);
}
const dry = process.argv.includes('--dry-run');

// 1. the database
let id = JSON.parse(wrangler(['d1', 'list', '--json'])).find(d => d.name === DB)?.uuid;
if (!id) {
  const out = wrangler(['d1', 'create', DB]);
  id = out.match(/database_id"?\s*[=:]\s*"([0-9a-f-]{36})"/)?.[1];
  if (!id) throw new Error('Could not read the new database id from:\n' + out);
  console.log('Created D1 database', id);
} else console.log('Using D1 database', id);
wrangler(['d1', 'execute', DB, '--remote', '--file', 'worker/schema.sql', '--yes'], { stdio: 'inherit' });

// 2. wrangler.toml: keep the site's name and route, add the Worker, its assets binding and the database
const toml = readFileSync(root + 'wrangler.toml', 'utf8');
const name = toml.match(/^name\s*=\s*"([^"]+)"/m)?.[1] || 'beastidal';
const route = toml.match(/pattern\s*=\s*"([^"]+)"/)?.[1];
const next = `name = "${name}"
main = "worker/community.js"
compatibility_date = "2025-09-01"

[assets]
directory = "./dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "${DB}"
database_id = "${id}"
${route ? `\n[[routes]]\npattern = "${route}"\ncustom_domain = true\n` : ''}`;
writeFileSync(root + 'wrangler.toml', next);

// 3. the game talks to its own origin
if (route) {
  const cfgPath = root + 'dist/config.js',
    cfg = readFileSync(cfgPath, 'utf8');
  writeFileSync(cfgPath, cfg.replace(/communityUrl:\s*'[^']*'/, `communityUrl: 'https://${route}'`));
}

// 4. deploy
wrangler(['deploy', ...(dry ? ['--dry-run'] : [])], { stdio: 'inherit' });
console.log(dry ? 'Dry run done.' : `Deployed. The stele is online${route ? ' at https://' + route : ''}.`);
