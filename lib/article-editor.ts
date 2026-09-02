'use server';

import fs from 'fs';
import path from 'path';

const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts');

export async function saveArticle(
  slug: string,
  frontmatter: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const filePath = path.join(DRAFTS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `Draft not found: ${slug}.md` };
  }

  try {
    const newContent = `---
${frontmatter}
---

${body}
`;
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function listArticles(): Promise<
  { slug: string; title: string; date: string; pinned: boolean; excerpt: string }[]
> {
  if (!fs.existsSync(DRAFTS_DIR)) return [];

  const files = fs.readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const results: { slug: string; title: string; date: string; pinned: boolean; excerpt: string }[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf-8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      const fm = match[1];
      const get = (k: string) => {
        const m = fm.match(new RegExp(`^${k}:\\s*"([^"]+)"`, 'm'));
        return m ? m[1] : '';
      };

      const slug = file.replace(/\.md$/, '');
      results.push({
        slug,
        title: get('short_title') || get('title') || slug,
        date: get('date') || '',
        pinned: fm.includes('pin: true'),
        excerpt: get('excerpt') || '',
      });
    } catch {
      // skip malformed files
    }
  }

  return results.sort((a, b) => {
    if (a.pinned) return -1;
    if (b.pinned) return 1;
    return (a.date || '').localeCompare(b.date || '');
  });
}
