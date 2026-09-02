import path from 'path';
import fs from 'fs';

interface ArticleInfo {
  slug: string;
  title: string;
  date: string;
  href: string;
}

/**
 * Scan content/drafts/*.md for article frontmatter.
 * Each draft file must have YAML frontmatter with title and date.
 * Returns articles sorted by date (newest first), then by slug.
 */
export function scanLokiArticles(): ArticleInfo[] {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  const parsed: ArticleInfo[] = [];

  if (!fs.existsSync(draftsDir)) {
    return parsed;
  }

  const files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(draftsDir, file), 'utf-8');

    // Parse YAML frontmatter between --- markers
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      // No frontmatter — try to extract title from first H1
      const h1Match = raw.match(/^#\s+(.+)$/m);
      const title = h1Match ? h1Match[1].trim() : file.replace(/\.md$/, '').replace(/^LL-\d+-/, '').replace(/-/g, ' ');
      parsed.push({
        slug: file.replace(/\.md$/, ''),
        title,
        date: '',
        href: `/articles/${file.replace(/\.md$/, '')}`,
      });
      continue;
    }

    const fm = fmMatch[1];
    const lines = fm.split('\n');

    let title = '';
    let date = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('title:')) {
        // Extract value: title: "text" or title: text
        const m = trimmed.match(/^title:\s*"?([^"]+)"?$/);
        if (m) title = m[1].trim();
      } else if (trimmed.startsWith('date:')) {
        // Extract value: date: "YYYY-MM-DD" or date: YYYY-MM-DD
        const m = trimmed.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?$/);
        if (m) date = m[1].trim();
      }
    }

    // Fallback: first H1 in body
    if (!title) {
      const h1Match = raw.match(/^#\s+(.+)$/m);
      if (h1Match) title = h1Match[1].trim();
    }

    // Fallback: derive from filename
    if (!title) {
      title = file.replace(/\.md$/, '').replace(/^LL-\d+-/, '').replace(/-/g, ' ');
    }

    if (!title) continue; // skip files with no title at all

    parsed.push({
      slug: file.replace(/\.md$/, ''),
      title,
      date,
      href: `/articles/${file.replace(/\.md$/, '')}`,
    });
  }

  // Sort: newest date first, then alphabetically by slug
  return parsed.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}
