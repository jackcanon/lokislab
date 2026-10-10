import { readArticle } from '@/lib/articleContent';
import { pageMetadata, siteURL, isoDate } from '@/lib/seo';
import StructuredData from '@/components/seo/StructuredData';
import fs from 'fs';
import path from 'path';
import { ArticleView } from '@/components/ArticleView';

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


export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {fm, body, canonicalSlug} = readArticle((await params).slug);
  const description = fm.dek || body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*`_~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const meta = pageMetadata(`/articles/${canonicalSlug}`, `${fm.title} — Loki's Lab`, description);
  return {...meta, authors: [{name: fm.authorName}], openGraph: {...meta.openGraph, type: 'article', publishedTime: isoDate(fm.date), authors: [fm.authorName], ...(fm.image ? {images: [fm.image]} : {})}};
}

export default async function ArticlePage({params}: {params: Promise<{slug: string}>}) {
  const {body, fm, canonicalSlug} = readArticle((await params).slug);
  return (
    <>
    <StructuredData data={{'@context': 'https://schema.org', '@type': 'Article', headline: fm.title, description: fm.dek || undefined, datePublished: isoDate(fm.date), author: {'@type': 'Person', name: fm.authorName, ...(fm.authorName === 'Jack Blair' ? {url: `${siteURL}/authors/jack`} : {})}, publisher: {'@id': `${siteURL}/#organization`}, mainEntityOfPage: `${siteURL}/articles/${canonicalSlug}`, ...(fm.image ? {image: new URL(fm.image, siteURL).href} : {})}} />
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
    </>
  );
}
