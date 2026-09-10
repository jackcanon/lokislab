'use client';

// /publish — the human door to the same pipeline agents use (POST /api/publish).
// Write on the left, see the finished page on the right — rendered by the same
// ArticleView + markdown renderer the live /articles route uses, so the preview
// is the page. Nothing is committed until you press Publish.

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArticleView } from '@/components/ArticleView';

type Result =
  | { ok: true; slug: string; url: string; commitUrl: string; files: string[]; note?: string }
  | { ok: false; error: string };

const TOKEN_KEY = 'lokislab_publish_token';
const DRAFT_KEY = 'lokislab_publish_draft';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mirror of the server's frontmatter handling so the preview matches the commit. */
function splitFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const m = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: raw };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    fm[kv[1]] = v;
  }
  return { fm, body: raw.slice(m[0].length) };
}

function excerpt(body: string, maxLen = 180): string {
  const text = body
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/[#*`_~]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return text.length <= maxLen ? text : text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

export default function PublishPage() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [slug, setSlug] = useState('');
  const [dek, setDek] = useState('');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');
  const [hero, setHero] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('split');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const imagesInput = useRef<HTMLInputElement>(null);

  // Remember the token and an unsent draft in this browser.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
      const draft = window.localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const d = JSON.parse(draft) as Partial<Record<'title' | 'date' | 'slug' | 'dek' | 'tags' | 'body', string>>;
        setTitle(d.title || '');
        setDate(d.date || '');
        setSlug(d.slug || '');
        setDek(d.dek || '');
        setTags(d.tags || '');
        setBody(d.body || '');
      }
    } catch {
      /* private mode etc. */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, date, slug, dek, tags, body }));
    } catch {
      /* ignore */
    }
  }, [title, date, slug, dek, tags, body]);

  // Object URLs for attached images so ![alt](file.jpg) previews with the real file.
  const imageUrls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of images) map[f.name] = URL.createObjectURL(f);
    return map;
  }, [images]);
  useEffect(() => () => Object.values(imageUrls).forEach((u) => URL.revokeObjectURL(u)), [imageUrls]);

  // When a pasted document carries frontmatter, offer its fields once.
  function adoptFrontmatter(raw: string) {
    const { fm } = splitFrontmatter(raw);
    if (fm.title && !title) setTitle(fm.title);
    if (fm.dek && !dek) setDek(fm.dek);
    if (fm.date && !date && /^\d{4}-\d{2}-\d{2}$/.test(fm.date)) setDate(fm.date);
    if (fm.slug && !slug) setSlug(fm.slug);
    if (!fm.title && !title) {
      const h1 = raw.match(/^#\s+(.+)$/m);
      if (h1) setTitle(h1[1].trim());
    }
  }

  async function onBodyFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setBody(text);
    adoptFrontmatter(text);
    e.target.value = '';
  }

  function onImages(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setImages(files);
    if (hero && !files.some((f) => f.name === hero)) setHero('');
  }

  // What the committed file will look like, minus the frontmatter block.
  const preview = useMemo(() => {
    const effectiveSlug = slugify(slug || title) || 'your-slug';
    const { fm, body: rawBody } = splitFrontmatter(body);
    let text = rawBody.replace(/^\s*#\s+[^\n]+\n+/, '');
    for (const [name, url] of Object.entries(imageUrls)) {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`\\]\\((?:\\./)?(?:assets/|images/)?${esc}\\)`, 'g'), `](${url})`);
    }
    const heroUrl = hero ? imageUrls[hero] : fm.image || undefined;
    return {
      slug: effectiveSlug,
      title: title || fm.title || 'Untitled',
      date: date || fm.date || todayLocal(),
      dek: dek || fm.dek || '',
      image: heroUrl,
      body: text,
      url: `https://lokislab.org/articles/${effectiveSlug}`,
    };
  }, [title, date, slug, dek, body, hero, imageUrls]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    const form = new FormData();
    form.set('title', title);
    form.set('body', body);
    if (date) form.set('date', date);
    if (slug) form.set('slug', slug);
    if (dek) form.set('dek', dek);
    if (tags) form.set('tags', tags);
    if (hero) form.set('hero', hero);
    for (const f of images) form.append('images', f, f.name);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = (await res.json()) as Result;
      setResult(json);
      if (json.ok) {
        try {
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-md border border-[#aaa194] bg-[#f5f0ea] px-3 py-2 text-sm text-[#17201f] outline-none focus:border-[#b74627]';
  const label = 'mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#5b6560]';
  const tab = (m: typeof mode) =>
    `rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
      mode === m ? 'border-[#17201f] bg-[#17201f] text-[#f5f0ea]' : 'border-[#aaa194] text-[#5b6560] hover:border-[#17201f]'
    }`;

  const showWrite = mode !== 'preview';
  const showPreview = mode !== 'write';

  return (
    <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
      <section className="mx-auto max-w-[1600px] px-5 py-10 md:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">Publish</p>
            <h1 className="display-serif text-3xl leading-[1.03] tracking-[-0.035em] md:text-4xl">Post a Lab Note.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#4c5652]">
              The preview on the right is rendered by the same code as the live article page. Nothing is committed
              until you press Publish; then Vercel rebuilds and it is live in about two minutes.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={tab('write')} onClick={() => setMode('write')}>Write</button>
            <button type="button" className={tab('split')} onClick={() => setMode('split')}>Side by side</button>
            <button type="button" className={tab('preview')} onClick={() => setMode('preview')}>Preview</button>
          </div>
        </div>

        <div className={`grid gap-8 ${mode === 'split' ? 'lg:grid-cols-2' : ''}`}>
          {showWrite && (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className={label} htmlFor="token">Publish token</label>
                <input id="token" type="password" className={input} value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" />
              </div>

              <div>
                <label className={label} htmlFor="title">Title (this is the headline; a leading # H1 in the body is dropped)</label>
                <input id="title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={label} htmlFor="date">Date (defaults to today)</label>
                  <input id="date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="slug">Slug</label>
                  <input id="slug" className={input} placeholder={slugify(title) || 'derived-from-title'} value={slug} onChange={(e) => setSlug(e.target.value)} />
                  <p className="mt-1 truncate text-xs text-[#8f9a95]">{preview.url}</p>
                </div>
              </div>

              <div>
                <label className={label} htmlFor="dek">Dek / one-line summary</label>
                <input id="dek" className={input} value={dek} onChange={(e) => setDek(e.target.value)} />
              </div>

              <div>
                <label className={label} htmlFor="tags">Tags (comma-separated)</label>
                <input id="tags" className={input} placeholder="Apple, local AI" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>

              <div>
                <label className={label} htmlFor="body">Article markdown</label>
                <textarea
                  id="body"
                  className={`${input} min-h-[420px] font-mono text-xs leading-5`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={() => adoptFrontmatter(body)}
                  placeholder={'Your article in markdown. Frontmatter is fine; its title/dek/date fill the fields above.'}
                />
                <p className="mt-2 text-xs text-[#8f9a95]">
                  …or load a .md file:{' '}
                  <input type="file" accept=".md,.markdown,text/markdown,text/plain" className="text-xs" onChange={onBodyFile} />
                </p>
              </div>

              <div>
                <label className={label} htmlFor="images">Images (≤3.5 MB each)</label>
                <input ref={imagesInput} id="images" type="file" accept="image/*" multiple className="text-sm" onChange={onImages} />
                <p className="mt-2 text-xs text-[#8f9a95]">
                  Reference them as <code className="font-mono">![alt](file-name.jpg)</code>. They land at{' '}
                  <code className="font-mono">/images/articles/{preview.slug}/</code>. The featured image shows on the
                  News card and under the headline — if you also reference it inline it appears twice.
                </p>
                {images.length > 0 && (
                  <div className="mt-3">
                    <label className={label} htmlFor="hero">Featured image</label>
                    <select id="hero" className={input} value={hero} onChange={(e) => setHero(e.target.value)}>
                      <option value="">None</option>
                      {images.map((f) => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[#b74627] px-6 py-3 text-sm font-semibold text-[#f5f0ea] transition hover:bg-[#9a3a20] disabled:opacity-60"
              >
                {busy ? 'Publishing…' : 'Publish article'}
              </button>

              {result && (
                <div
                  className={`rounded-lg border-2 p-5 text-sm ${
                    result.ok ? 'border-[#2d6953] bg-[#e5f0f0]' : 'border-[#b74627] bg-[#f0e5d8]'
                  }`}
                >
                  {result.ok ? (
                    <>
                      <p className="mb-2 font-semibold text-[#2d6953]">Committed. Vercel is rebuilding now.</p>
                      <p>
                        Live in ~2 min:{' '}
                        <a className="font-semibold text-[#b74627] underline" href={result.url} target="_blank" rel="noreferrer">
                          {result.url}
                        </a>
                      </p>
                      <p className="mt-1">
                        Commit:{' '}
                        <a className="text-[#b74627] underline" href={result.commitUrl} target="_blank" rel="noreferrer">
                          {result.commitUrl.split('/').pop()?.slice(0, 7)}
                        </a>
                      </p>
                      <p className="mt-2 text-xs text-[#5b6560]">Files: {result.files.join(', ')}</p>
                    </>
                  ) : (
                    <p className="font-semibold text-[#b74627]">Error: {result.error}</p>
                  )}
                </div>
              )}
            </form>
          )}

          {showPreview && (
            <div className="min-w-0">
              {/* How it will look on /news */}
              <p className={label}>News card</p>
              <div className="mb-6 rounded-lg border-2 border-[#b74627] bg-[#f5f0ea] p-5">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b74627]">
                  <span className="h-3 w-3 rounded-full bg-[#b74627]" /> Featured: Latest
                </div>
                {preview.image && (
                  <div className="mb-4 overflow-hidden rounded-lg">
                    <img src={preview.image} alt={preview.title} className="h-40 w-full object-cover" />
                  </div>
                )}
                <h2 className="display-serif mb-2 text-2xl leading-[1.1] tracking-[-0.03em]">{preview.title}</h2>
                <p className="text-sm leading-6 text-[#4c5652]">{preview.dek || excerpt(preview.body)}</p>
                <p className="mt-3 text-xs text-[#8f9a95]">Jack Blair · {preview.date}</p>
              </div>

              {/* The article page itself */}
              <p className={label}>Article page</p>
              <div className="overflow-hidden rounded-lg border border-[#aaa194] bg-[#ece5d8]">
                <ArticleView
                  title={preview.title}
                  date={preview.date}
                  dek={preview.dek}
                  image={preview.image}
                  body={preview.body}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
