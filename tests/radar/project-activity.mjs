import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const output = mkdtempSync(join(tmpdir(), 'lokislab-check-'));
try {
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', 'lib/radarProjectActivity.ts', '--outDir', output, '--target', 'es2020', '--module', 'commonjs', '--skipLibCheck']);
const {matchesProject} = (await import(pathToFileURL(join(output,'radarProjectActivity.js')).href)).default;
const core = [{url:'https://github.com/iamfatness/CoreVideo'}];
assert(matchesProject('https://github.com/iamfatness/CoreVideo/commit/123', core));
assert(!matchesProject('https://github.com/iamfatness/CoreVideoPro/commit/123', core));
assert(!matchesProject('https://github.com/iamfatness/Other/commit/123', core));
assert(!matchesProject('javascript:alert(1)', core));
assert(!matchesProject('https://github.com/iamfatness/CoreVideo/commit/123', [{url:'https://github.com/iamfatness'}]));
assert(matchesProject('https://stadiumsound.chrissabato.com/changelog', [{url:'https://stadiumsound.chrissabato.com/'}]));
assert(!matchesProject('https://chrissabato.com/post', [{url:'https://stadiumsound.chrissabato.com/'}]));
console.log('Project activity boundaries passed');

} finally { rmSync(output, {recursive:true,force:true}); }
