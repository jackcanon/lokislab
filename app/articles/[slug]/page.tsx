import fs from 'fs';
import path from 'path';
import { ArticleView } from '@/components/ArticleView';
import { notFound } from 'next/navigation';

// Build-time list of all article pages we can render.
// This covers LL-NN-NN drafts AND named articles like the Apple Mac story.
export async function generateStaticParams() {
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');
  let files: string[];
  try {
    files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
  } catch {
    files = [];
  }

  // Generate slugs for EVERY article, both short (ll-011) and full (ll-011-launch-note).
  // This ensures Next.js SSG serves both URL forms at build time.
  // Also generate the raw filename as a slug so direct filename URLs work.
  const result: { slug: string }[] = [];
  for (const file of files) {
    const withoutExt = file.replace(/\.md$/, '');
    const llMatch = withoutExt.match(/^LL-(\d+)-(.+)/);
    if (llMatch) {
      const num = llMatch[1];
      const rest = llMatch[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      result.push({ slug: `ll-${num}` });              // ll-011
      result.push({ slug: `ll-${num}-${rest}` });      // ll-011-launch-note
    } else {
      result.push({ slug: withoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
    }
  }
  return result;
}

type Frontmatter = {
  title: string;
  date: string;
  authorName: string;
  authorLabel: string;
  image: string;
  imageAlt: string;
  dek: string;
};

function parseFrontmatter(raw: string): { body: string; fm: Frontmatter } {
  const fm: Frontmatter = {
    title: '',
    date: '',
    authorName: 'Jack Blair',
    authorLabel: 'Writer & tester',
    image: '',
    imageAlt: '',
    dek: '',
  };

  let body = raw;
  const fmStart = raw.indexOf('---\n');
  if (fmStart === 0) {
    const fmEnd = raw.indexOf('\n---', 4);
    if (fmEnd !== -1) {
      const fmBlock = raw.slice(4, fmEnd);
      body = raw.slice(fmEnd + 4);

      for (const line of fmBlock.split('\n')) {
        // title: "..." or title: ...
        const t = line.match(/^title:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (t) fm.title = t[1] || t[2]?.trim() || fm.title;

        // date: "..." or date: ...
        const d = line.match(/^date:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (d) fm.date = d[1] || d[2]?.trim() || fm.date;

        const im = line.match(/^image:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (im) fm.image = im[1] || im[2]?.trim() || fm.image;
        const ia = line.match(/^image_alt:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (ia) fm.imageAlt = ia[1] || ia[2]?.trim() || fm.imageAlt;
        const dk = line.match(/^dek:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (dk) fm.dek = dk[1] || dk[2]?.trim() || fm.dek;

        // author_slug: "jack" is our canonical mapping to Jack Blair.
        // Only honor an explicit author: line when author_slug is absent.
        const as = line.match(/^author_slug:\s*"([^"]+)"/);
        if (as && as[1] === 'jack' && !fm.authorName) {
          fm.authorName = 'Jack Blair';
          fm.authorLabel = 'Writer & tester';
        }

        // explicit author: "Jack Blair" — only if we do not already know the author
        const au = line.match(/^author:\s*(?:"([^"]+)"|([^"\n]+))/);
        if (au && !fm.authorName) {
          fm.authorName = au[1] || au[2]?.trim() || fm.authorName;
        }
      }

      // Fallback title from first H1 in body
      if (!fm.title) {
        const h1 = body.match(/^#\s+([^\n]+)/m);
        if (h1) fm.title = h1[1].trim();
      }
    }
  }

  return { body, fm };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draftsDir = path.join(process.cwd(), 'content', 'drafts');

  let files: string[];
  try {
    files = fs.readdirSync(draftsDir).filter((f) => f.endsWith('.md'));
  } catch {
    notFound();
  }

  // Find the file that produces this slug
  let matchingFile: string | undefined;

  // 1) LL-NN slugs — resolve both ll-011 and ll-011-launch-note variants
  const llMatch = slug.match(/^ll-(\d+)(?:-(.+))?$/i);
  if (llMatch) {
    const num = llMatch[1];
    const rest = llMatch[2] ? llMatch[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
    // Try matching against actual filenames (case-insensitive)
    const candidates = rest
      ? [`LL-${num}-${rest}`, `LL-${num}`]
      : [`LL-${num}`, `ll-${num}`];
    matchingFile = files.find((f) => {
      const base = f.replace(/\.md$/, '');
      return candidates.some((c) => base.toLowerCase() === c.toLowerCase());
    });
  }

  // 2) Named article slugs (e.g. apple-new-mac-mini-mac-studio-local-ai-2026)
  if (!matchingFile) {
    const normalizedTarget = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    for (const f of files) {
      const normalizedFile = f
        .replace(/\.md$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (normalizedFile === normalizedTarget) {
        matchingFile = f;
        break;
      }
    }
  }

  if (!matchingFile) notFound();

  const raw = fs.readFileSync(path.join(draftsDir, matchingFile), 'utf-8');
  const { body, fm } = parseFrontmatter(raw);

  return (
    <ArticleView
      title={fm.title}
      date={fm.date}
      dek={fm.dek}
      image={fm.image}
      imageAlt={fm.imageAlt}
      body={body}
      authorName={fm.authorName}
      authorLabel={fm.authorLabel}
    />
  );
}
