import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { renderMarkdown } from '@/lib/markdown';
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
};

function parseFrontmatter(raw: string): { body: string; fm: Frontmatter } {
  const fm: Frontmatter = {
    title: '',
    date: '',
    authorName: 'Jack Blair',
    authorLabel: 'Writer & tester',
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

  const content = renderMarkdown(body);
  const formattedDate =
    fm.date && !isNaN(new Date(fm.date).getTime())
      ? new Date(fm.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

  // Determine section label
  let sectionLabel = 'Article';
  if (slug.startsWith('ll-')) sectionLabel = 'Lab Notes';
  if (slug.startsWith('apple-')) sectionLabel = 'Lab Notes';

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 text-[#17201f] md:px-10 lg:px-14">
      <header className="mb-12 border-b border-[#aaa194] pb-6">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#b74627]">
          <span>{sectionLabel}</span>
          <span>·</span>
          <span>{formattedDate}</span>
        </div>
        <h1
          className="display-serif mt-4 text-[clamp(2.5rem,5vw,4rem)] leading-[0.9] tracking-[-0.04em] font-bold"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          {fm.title}
        </h1>
      </header>
      <div className="prose prose-lg prose-invert max-w-none">{content}</div>
      
      {/* Author bio section at end of article */}
      <div className="mt-16 border-t border-[#aaa194] pt-8">
        <div className="flex items-start gap-4">
          <Link href="/authors/jack" className="group">
            <span className="relative h-48 w-48 min-h-48 min-w-48 max-h-48 max-w-48 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[#ece5d8] group-hover:ring-[#b74627] transition block">
              <img
                src="/authors/jack.jpg"
                alt={`${fm.authorName} — author photo`}
                className="h-full w-full object-cover block"
              />
            </span>
          </Link>
          <div className="flex-1">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-[#17201f]">{fm.authorName}</h3>
              <p className="text-xs text-[#b74627] font-semibold">{fm.authorLabel}</p>
            </div>
            <p className="text-xs leading-6 text-[#4c5652] mb-3">
              Jack Blair is an independent documentary filmmaker, storyteller, and lifelong technology obsessive. Through Happy Jack Media, he explores overlooked human stories and experiments with new ways to create and connect. He founded Loki's Lab as a community where curious people can test local AI models, share what they learn, and discover what today's technology can do on the computers they already own.
            </p>
            <Link href="/authors/jack" className="inline-flex text-xs font-semibold text-[#b74627] hover:text-[#9a3a20] transition">
              View author profile →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
