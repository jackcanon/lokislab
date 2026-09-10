// Publish articles to the site by committing them to GitHub.
//
// Why: the site is static-first. `content/drafts/*.md` is the only article
// source, Vercel rebuilds on every push to `main`, and Vercel's filesystem is
// read-only at runtime — so "save to disk" style editors can never work here.
// The one write path that does work is a commit. This module makes one commit
// (markdown + any images) via the GitHub Git Data API, no git binary needed.

const GITHUB_API = 'https://api.github.com';

export const PUBLISH_REPO = process.env.LOKISLAB_GITHUB_REPO || 'jackcanon/lokislab';
export const PUBLISH_BRANCH = process.env.LOKISLAB_GITHUB_BRANCH || 'main';
export const DRAFTS_DIR = 'content/drafts';
export const IMAGES_DIR = 'public/images/articles';
export const SITE_URL = process.env.LOKISLAB_SITE_URL || 'https://lokislab.org';

export interface PublishImage {
  /** File name, e.g. "hero.jpg". Stored under public/images/articles/<slug>/ */
  name: string;
  /** Raw bytes as base64 (no data: prefix). */
  base64: string;
}

export interface PublishArticleInput {
  title: string;
  /** Markdown body. May include its own `---` frontmatter; we merge, never drop it. */
  body: string;
  /** YYYY-MM-DD. Defaults to today (America/Phoenix). */
  date?: string;
  /** URL slug. Defaults to a kebab-case of the title. */
  slug?: string;
  /** One-line summary shown under the title on the News page. */
  dek?: string;
  author?: string;
  tags?: string[];
  /** Name of one of `images` to use as the featured/hero image. */
  hero?: string;
  images?: PublishImage[];
  /** Commit message override. */
  message?: string;
}

export interface PublishResult {
  slug: string;
  path: string;
  url: string;
  commitSha: string;
  commitUrl: string;
  files: string[];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function todayPhoenix(): string {
  // America/Phoenix has no DST: fixed UTC-7.
  const d = new Date(Date.now() - 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'image';
  return base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
}

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Split an incoming markdown document into (frontmatter lines, body). */
function splitFrontmatter(raw: string): { fm: string[]; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: [], body: raw };
  return { fm: m[1].split(/\r?\n/), body: raw.slice(m[0].length) };
}

/**
 * Build the final markdown file. Frontmatter keys we set win over keys in the
 * supplied body's frontmatter; unknown keys from the body are preserved.
 */
export function buildArticleMarkdown(input: PublishArticleInput, slug: string, imageUrls: Record<string, string>): string {
  const { fm: incomingFm, body: rawBody } = splitFrontmatter(input.body.replace(/^\uFEFF/, ''));

  // Rewrite image references that point at uploaded files: ![x](hero.jpg) or
  // ![x](assets/hero.jpg) → ![x](/images/articles/<slug>/hero.jpg)
  let body = rawBody;
  for (const [name, url] of Object.entries(imageUrls)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    body = body.replace(new RegExp(`\\]\\((?:\\./)?(?:assets/|images/)?${esc}\\)`, 'g'), `](${url})`);
  }

  // Drop a leading H1 that duplicates the title — the page renders the title itself.
  const titleRe = new RegExp(`^#\\s+${input.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`);
  body = body.replace(titleRe, '');

  const ours: Record<string, string | undefined> = {
    title: yamlString(input.title),
    slug,
    date: input.date || todayPhoenix(),
    updated: input.date || todayPhoenix(),
    status: 'published',
    section: 'Lab Notes',
    author: yamlString(input.author || 'Jack Blair'),
    author_slug: 'jack',
    dek: input.dek ? yamlString(input.dek) : undefined,
    image: input.hero && imageUrls[safeFileName(input.hero)] ? imageUrls[safeFileName(input.hero)] : undefined,
  };

  const lines: string[] = [];
  const written = new Set<string>();
  for (const [k, v] of Object.entries(ours)) {
    if (v === undefined) continue;
    lines.push(`${k}: ${v}`);
    written.add(k);
  }
  if (input.tags && input.tags.length) {
    lines.push('tags:');
    for (const t of input.tags) lines.push(`  - ${t}`);
    written.add('tags');
  }
  // Preserve any extra keys the author supplied (skip ones we own; skip list bodies of skipped keys).
  let skippingList = false;
  for (const line of incomingFm) {
    if (/^\s+-\s/.test(line) || /^\s+\S/.test(line)) {
      if (!skippingList) lines.push(line);
      continue;
    }
    const key = line.match(/^([A-Za-z_][\w-]*):/)?.[1];
    if (!key) continue;
    skippingList = written.has(key);
    if (!skippingList) lines.push(line);
  }

  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}

async function gh<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Commit an article (and optional images) to the repo in a single commit.
 * Requires a GitHub token with `contents: write` on the repo.
 */
export async function publishArticleToGitHub(input: PublishArticleInput, token: string): Promise<PublishResult> {
  if (!input.title?.trim()) throw new Error('title is required');
  if (!input.body?.trim()) throw new Error('body is required');
  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error('could not derive a slug from the title');
  if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('date must be YYYY-MM-DD');

  const images = (input.images || []).map((img) => ({ name: safeFileName(img.name), base64: img.base64 }));
  const imageUrls: Record<string, string> = {};
  for (const img of images) imageUrls[img.name] = `/images/articles/${slug}/${img.name}`;

  const markdown = buildArticleMarkdown(input, slug, imageUrls);
  const articlePath = `${DRAFTS_DIR}/${slug}.md`;

  // 1) Current head of the branch.
  const ref = await gh<{ object: { sha: string } }>(token, 'GET', `/repos/${PUBLISH_REPO}/git/ref/heads/${PUBLISH_BRANCH}`);
  const headSha = ref.object.sha;
  const headCommit = await gh<{ tree: { sha: string } }>(token, 'GET', `/repos/${PUBLISH_REPO}/git/commits/${headSha}`);

  // 2) Blobs.
  const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  const mdBlob = await gh<{ sha: string }>(token, 'POST', `/repos/${PUBLISH_REPO}/git/blobs`, {
    content: Buffer.from(markdown, 'utf-8').toString('base64'),
    encoding: 'base64',
  });
  tree.push({ path: articlePath, mode: '100644', type: 'blob', sha: mdBlob.sha });
  for (const img of images) {
    const blob = await gh<{ sha: string }>(token, 'POST', `/repos/${PUBLISH_REPO}/git/blobs`, {
      content: img.base64,
      encoding: 'base64',
    });
    tree.push({ path: `${IMAGES_DIR}/${slug}/${img.name}`, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // 3) Tree + commit + move the branch.
  const newTree = await gh<{ sha: string }>(token, 'POST', `/repos/${PUBLISH_REPO}/git/trees`, {
    base_tree: headCommit.tree.sha,
    tree,
  });
  const commit = await gh<{ sha: string; html_url: string }>(token, 'POST', `/repos/${PUBLISH_REPO}/git/commits`, {
    message: input.message || `Publish article: ${input.title}`,
    tree: newTree.sha,
    parents: [headSha],
  });
  await gh(token, 'PATCH', `/repos/${PUBLISH_REPO}/git/refs/heads/${PUBLISH_BRANCH}`, { sha: commit.sha });

  return {
    slug,
    path: articlePath,
    url: `${SITE_URL}/articles/${slug}`,
    commitSha: commit.sha,
    commitUrl: commit.html_url,
    files: tree.map((t) => t.path),
  };
}
