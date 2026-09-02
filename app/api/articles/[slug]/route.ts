import { NextResponse } from 'next/server';
import { saveArticle } from '@/lib/article-editor';
import { isAdminAuthenticated } from '@/lib/admin-auth';

interface ArticleResponse {
  article: { slug: string };
  frontmatter: Record<string, string>;
  body: string;
}

function parseFrontmatter(fm: string): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = ['title', 'short_title', 'date', 'category', 'author', 'excerpt'];
  for (const k of keys) {
    const m = fm.match(new RegExp(`^${k}:\\s*"([^"]+)"`, 'm'));
    if (m) { result[k] = m[1]; continue; }
    const m2 = fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
    if (m2) { result[k] = m2[1].trim(); }
  }
  result.pin = fm.includes('pin: true') ? 'true' : '';
  return result;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const fs = await import('fs/promises');
  const path = await import('path');

  const filePath = path.join(process.cwd(), 'content', 'drafts', `${slug}.md`);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.includes('ENOENT')) {
      return NextResponse.json(
        { error: `Article not found: ${slug}` },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    return NextResponse.json(
      { error: 'No frontmatter found in this draft' },
      { status: 400 }
    );
  }

  const fm = fmMatch[1];
  const body = raw.slice(fmMatch[0].length).trim();

  return NextResponse.json({
    article: { slug },
    frontmatter: parseFrontmatter(fm),
    body,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const payload = await request.json() as { frontmatter: string; body: string };

  const result = await saveArticle(slug, payload.frontmatter, payload.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
