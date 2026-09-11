// Regenerate the Hermes Day One lanes from the shared source, then extract the
// <main>/<aside> fragments the site renders and rewrite links to site routes.
//   node scripts/guides/build-hermes.mjs      (needs: npm i -D marked)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const src = path.join(root, 'content/guides/hermes-day-one/source');
const out = path.join(root, 'content/guides/hermes-day-one');

execSync('node build-guide.mjs', { cwd: src, stdio: 'inherit' });

const routes = {
  'index.html': '/guides/hermes-day-one',
  'linux.html': '/guides/hermes-day-one/linux',
  'mac.html': '/guides/hermes-day-one/mac',
  'windows.html': '/guides/hermes-day-one/windows',
};
for (const os of ['linux', 'mac', 'windows']) {
  const html = fs.readFileSync(path.join(src, `${os}.html`), 'utf-8');
  let aside = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/)[1];
  let main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
  for (const [k, v] of Object.entries(routes)) {
    aside = aside.replaceAll(`href="${k}"`, `href="${v}"`);
    main = main.replaceAll(`href="${k}"`, `href="${v}"`);
  }
  fs.writeFileSync(path.join(out, `${os}.toc.html`), aside.trim() + '\n');
  fs.writeFileSync(path.join(out, `${os}.body.html`), main.trim() + '\n');
  console.log(`wrote ${os}.body.html (${main.length} chars), ${os}.toc.html`);
}
