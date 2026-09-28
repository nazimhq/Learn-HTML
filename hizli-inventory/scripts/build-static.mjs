/**
 * Builds the static bundle for a plain web host (cPanel, Netlify, S3, ...).
 *
 * Next.js refuses to statically export a project that contains API route
 * handlers, because those need a Node server. This script moves app/api out of
 * the way for the duration of the export and always puts it back, so the
 * server build (`npm run build`) keeps working afterwards.
 *
 * Output: ./out  — upload its *contents* to public_html.
 */
import {execSync} from 'node:child_process';
import {copyFileSync, existsSync, readdirSync, renameSync, rmSync} from 'node:fs';
import {join} from 'node:path';

const root = process.cwd();
const api = join(root, 'app', 'api');
const parked = join(root, '.api-parked');

if (existsSync(parked)) rmSync(parked, {recursive: true, force: true});
const moved = existsSync(api);
if (moved) renameSync(api, parked);

try {
  rmSync(join(root, 'out'), {recursive: true, force: true});
  execSync('npx next build', {stdio: 'inherit', env: {...process.env, STATIC_EXPORT: '1'}});

  // next build empties ./out, so the host files are copied in afterwards
  const extras = join(root, 'static-extras');
  if (existsSync(extras)) {
    for (const name of readdirSync(extras)) copyFileSync(join(extras, name), join(root, 'out', name));
  }
  for (const doc of ['ARCHITECTURE.md', 'HANDOVER-PROMPT.md']) {
    if (existsSync(join(root, doc))) copyFileSync(join(root, doc), join(root, 'out', doc));
  }

  console.log('\nStatic bundle written to ./out — upload its contents to public_html');
} finally {
  if (moved) renameSync(parked, api);
}
