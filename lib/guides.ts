import fs from 'fs';
import path from 'path';

// Hermes Day One guide: three OS lanes generated from one shared source.
// Source of truth: content/guides/hermes-day-one/source/ (hermes-day-one.md +
// build-guide.mjs). The *.body.html / *.toc.html fragments beside it are the
// generated output the pages render. Rebuild flow is in docs/GUIDES.md.

export const HERMES_GUIDE_BASE = '/guides/hermes-day-one';

export const HERMES_OS = [
  { slug: 'linux', label: 'Linux', blurb: 'Terminal setup, with Ubuntu/Debian preparation.' },
  { slug: 'mac', label: 'Mac', blurb: 'Mac download or Terminal installation.' },
  { slug: 'windows', label: 'Windows', blurb: 'Native Windows download or PowerShell setup.' },
] as const;

export type HermesOs = (typeof HERMES_OS)[number]['slug'];

export function isHermesOs(s: string): s is HermesOs {
  return HERMES_OS.some((o) => o.slug === s);
}

export function readHermesLane(os: HermesOs): { body: string; toc: string } {
  const dir = path.join(process.cwd(), 'content', 'guides', 'hermes-day-one');
  return {
    body: fs.readFileSync(path.join(dir, `${os}.body.html`), 'utf-8'),
    toc: fs.readFileSync(path.join(dir, `${os}.toc.html`), 'utf-8'),
  };
}
