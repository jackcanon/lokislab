import fs from 'fs';
import path from 'path';

// Single source of truth for the news/archive page.
// Reads the same drafts directory and trusted-news.json that the homepage uses,
// so the news page always reflects what the site is actually publishing.
export type ArticleListItem = {
  slug: string;
  title: string;
  date: string;
  href: string;
  excerpt: string;
  source: string;
  isLocal: boolean;
  image?: string; // Optional featured image URL
};

function parseFrontmatter(raw: string): { title: string; date: string; body: string } {
  let title = '';
  let date = '';
  let body = raw;

  const fmStart = raw.indexOf('---\n');
  if (fmStart === 0) {
    const fmEnd = raw.indexOf('\n---', 4);
    if (fmEnd !== -1) {
      const fmBlock = raw.slice(4, fmEnd);
      body = raw.slice(fmEnd + 4);

      for (const line of fmBlock.split('\n')) {
        const t = line.match(/^title:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (t) title = t[1] || t[2]?.trim() || title;

        const d = line.match(/^date:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (d) date = d[1] || d[2]?.trim() || date;
      }
    }
  }

  if (!title) {
    const h1 = body.match(/^#\s+([^\n]+)/m);
    if (h1) title = h1[1].trim();
  }

  return { title, date, body };
}

function excerptFromBody(body: string, maxLen = 180): string {
  const text = body
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/[#*`_~]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function buildSlug(filename: string): string {
  const withoutExt = filename.replace(/\.md$/, '');
  // For LL articles, use the full filename slug (e.g., LL-011-launch-note.md -> ll-011-launch-note)
  // This ensures all article links work consistently across the site
  return withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Image mappings for featured articles (slug -> image path)
const IMAGE_MAP: Record<string, string> = {
  'apple-new-mac-mini-mac-studio-local-ai-2026': '/images/products/Apple-Mac-mini-hero-260825.jpg',
};

export function articleList(): ArticleListItem[] {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  let files: string[];
  try {
    files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
  } catch {
    files = [];
  }

  const items: ArticleListItem[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(draftsDir, file), 'utf-8');
    const { title, date, body } = parseFrontmatter(raw);
    const slug = buildSlug(file);
    const isLocal = slug.startsWith('ll-') || slug.startsWith('apple-');

    return {
      slug,
      title: title || file.replace(/\.md$/, '').replace(/-/g, ' '),
      date,
      href: `/articles/${slug}`,
      excerpt: excerptFromBody(body),
      source: 'Loki\'s Lab',
      isLocal,
      image: IMAGE_MAP[slug], // Add optional featured image
    };
  });

  return items.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });
}

// Parse the real shape of data/trusted-news.json.
// The scraper writes { generated_at, sources, items[] } and individual
// items use { source, title, href, date, excerpt } OR the flat
// { title, date, href, excerpt, source, reachability } form.
type TrustedRawShape =
  | { generated_at?: string; sources?: string[]; items?: TrustedItem[] }
  | { items?: TrustedItem[] }
  | TrustedItem[];

type TrustedItem = {
  source?: string;
  title?: string;
  href?: string;
  date?: string;
  excerpt?: string;
  reachability?: number | string;
};

function isTrustedItem(value: unknown): value is TrustedItem {
  return Boolean(value && typeof value === 'object');
}

function parseTrustedNews(raw: string): ArticleListItem[] {
  let parsed: TrustedRawShape;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const items: TrustedItem[] = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (isTrustedItem(entry)) items.push(entry);
    }
  } else if (parsed && typeof parsed === 'object') {
    const root = parsed as Record<string, unknown>;

    // First try the named array the scraper writes.
    if (Array.isArray(root.items)) {
      for (const entry of root.items) {
        if (isTrustedItem(entry)) items.push(entry);
      }
    }

    // Also pick up any top-level arrays the scraper may have emitted.
    for (const key of Object.keys(root)) {
      const value = root[key];
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (isTrustedItem(entry)) items.push(entry);
        }
      }
    }
  }

  return items
    .filter(isTrustedItem)
    .map((item) => {
      const title = (item.title as string) || 'Untitled';
      const href = (item.href as string) || '#';
      const date = (item.date as string) || '';
      const excerpt = (item.excerpt as string) || '';
      const source = (item.source as string) || 'Trusted wire';

      // Skip non-link placeholders / internal markers.
      if (!href || href === '#' || href.startsWith('#')) return null;

      return {
        slug: '',
        title,
        date,
        href,
        excerpt: excerpt || `${source} — ${title}`,
        source,
        isLocal: false,
      } as ArticleListItem;
    })
    .filter((item): item is ArticleListItem => item !== null) as ArticleListItem[];
}

export function allTrustedItems(): ArticleListItem[] {
  const local = articleList();
  let news: ArticleListItem[] = [];

  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data', 'trusted-news.json'),
      'utf-8',
    );
    news = parseTrustedNews(raw);
  } catch {
    // No trusted-news.json yet — news list will only contain local articles.
  }

  // Merge, de-duplicating by href so a link does not appear twice.
  const seen = new Set<string>();
  const merged: ArticleListItem[] = [];

  const add = (item: ArticleListItem) => {
    const key = item.href + '|' + item.date + '|' + item.title;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };

  // Local articles first (newest first, already sorted).
  for (const item of local) add(item);

  // Trusted wire items after, newest first using the date they carry.
  const sortedNews = news.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
  for (const item of sortedNews) add(item);

  return merged;
}
