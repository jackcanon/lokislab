// POST /api/publish — the one door for publishing an article.
//
// Auth:    Authorization: Bearer <LOKISLAB_PUBLISH_TOKEN>
// Body:    application/json  → { title, body, date?, slug?, dek?, tags?, author?, hero?, images?: [{name, base64}] }
//          multipart/form-data → fields title, body, date, slug, dek, tags (comma-separated), author, hero;
//                                files under "images" (repeatable) — used by /publish page.
// Result:  { ok: true, slug, url, commitUrl, files[] } — Vercel rebuilds from the commit (~1–3 min).
//
// Env (set in Vercel → Project → Settings → Environment Variables):
//   LOKISLAB_PUBLISH_TOKEN  shared secret agents/humans send as the Bearer token
//   LOKISLAB_GITHUB_TOKEN   GitHub fine-grained PAT, Contents: read+write on jackcanon/lokislab
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { publishArticleToGitHub, type PublishArticleInput, type PublishImage } from '@/lib/github-publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel serverless request bodies are capped at ~4.5 MB. Keep images small
// (or publish the article first, then add images in a second request).
const MAX_IMAGE_BYTES = 3_500_000;

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function authorized(request: Request): boolean {
  const expected = process.env.LOKISLAB_PUBLISH_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 && timingSafeEqual(token, expected);
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: 'POST /api/publish',
    auth: 'Authorization: Bearer <LOKISLAB_PUBLISH_TOKEN>',
    json: {
      title: 'string (required)',
      body: 'markdown string (required; may include its own --- frontmatter)',
      date: 'YYYY-MM-DD (optional, default today)',
      slug: 'string (optional, derived from title)',
      dek: 'one-line summary (optional)',
      tags: ['string'],
      author: 'string (optional, default Jack Blair)',
      hero: 'file name of one of images[] to use as featured image (optional)',
      images: [{ name: 'hero.jpg', base64: '<base64 bytes>' }],
    },
    configured: {
      publishToken: Boolean(process.env.LOKISLAB_PUBLISH_TOKEN),
      githubToken: Boolean(process.env.LOKISLAB_GITHUB_TOKEN),
    },
  });
}

async function parseMultipart(form: FormData): Promise<PublishArticleInput> {
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const images: PublishImage[] = [];
  for (const entry of form.getAll('images')) {
    if (typeof entry === 'string' || !entry || entry.size === 0) continue;
    if (entry.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image "${entry.name}" is ${(entry.size / 1e6).toFixed(1)} MB; max is ${MAX_IMAGE_BYTES / 1e6} MB per request. Resize it or add it in a separate request.`);
    }
    const buf = Buffer.from(await entry.arrayBuffer());
    images.push({ name: entry.name, base64: buf.toString('base64') });
  }
  // The body may arrive as a pasted textarea or as an uploaded .md file.
  let body = str('body') || '';
  const bodyFile = form.get('bodyFile');
  if (!body && bodyFile && typeof bodyFile !== 'string' && bodyFile.size > 0) {
    body = Buffer.from(await bodyFile.arrayBuffer()).toString('utf-8');
  }
  return {
    title: str('title') || '',
    body,
    date: str('date'),
    slug: str('slug'),
    dek: str('dek'),
    author: str('author'),
    hero: str('hero'),
    tags: str('tags')?.split(',').map((t) => t.trim()).filter(Boolean),
    images,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.LOKISLAB_PUBLISH_TOKEN || !process.env.LOKISLAB_GITHUB_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'Publishing is not configured: set LOKISLAB_PUBLISH_TOKEN and LOKISLAB_GITHUB_TOKEN in Vercel.' },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let input: PublishArticleInput;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      input = await parseMultipart(await request.formData());
    } else {
      const json = (await request.json()) as PublishArticleInput;
      input = json;
      for (const img of input.images || []) {
        const bytes = Math.floor((img.base64?.length || 0) * 0.75);
        if (bytes > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { ok: false, error: `Image "${img.name}" exceeds ${MAX_IMAGE_BYTES / 1e6} MB; send it in a separate request or resize it.` },
            { status: 413 },
          );
        }
      }
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Bad request' }, { status: 400 });
  }

  try {
    const result = await publishArticleToGitHub(input, process.env.LOKISLAB_GITHUB_TOKEN);
    return NextResponse.json({
      ok: true,
      ...result,
      note: 'Committed to GitHub. Vercel is rebuilding; the article URL goes live in roughly 1–3 minutes.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    const status = /required|slug|date must/.test(message) ? 400 : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
