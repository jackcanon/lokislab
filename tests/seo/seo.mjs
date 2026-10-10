import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const output = mkdtempSync(join(tmpdir(), 'lokislab-check-'));
try {
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'lib/seo.ts', 'lib/crawlPolicy.ts', '--outDir', output, '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck']);
const {jsonLd, pageMetadata, isoDate} = (await import(pathToFileURL(join(output,'seo.js')).href)).default;
const {prefersMarkdown} = (await import(pathToFileURL(join(output,'crawlPolicy.js')).href)).default;
const adversarial = {title:'</script><script>alert(1)</script>'};
assert(!jsonLd(adversarial).includes('<'));
assert.deepEqual(JSON.parse(jsonLd(adversarial)),adversarial);
assert.equal(pageMetadata('/radar/projects/stadium-sound','Stadium Sound','Project').alternates.canonical,'https://lokislab.org/radar/projects/stadium-sound');
assert.equal(isoDate(''),undefined);
assert.equal(isoDate('not a date'),undefined);
assert.equal(isoDate('2026-10-10'),'2026-10-10');
console.log('Structured data safety, canonical URLs and date checks passed');

assert(prefersMarkdown('text/markdown'));
assert(!prefersMarkdown('text/html,application/xhtml+xml,*/*;q=0.8'));
assert(!prefersMarkdown('text/markdown;q=0'));
assert(!prefersMarkdown('text/markdown;q=0.2,text/html;q=1'));
console.log('Browser/Markdown format preference checks passed');

} finally { rmSync(output, {recursive:true,force:true}); }
