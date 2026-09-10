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
  let listKey = '';
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && listKey) {
      fm[listKey] = fm[listKey] ? `${fm[listKey]}, ${item[1].trim()}` : item[1].trim();
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    listKey = v === '' ? kv[1] : '';
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

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const MAX_IMAGE_BYTES = 3_500_000;
const MAX_REQUEST_BYTES = 4_200_000;

/** Image file names referenced by the markdown (bare names, ./, assets/, images/ prefixes). */
function referencedImages(markdown: string): Set<string> {
  const names = new Set<string>();
  const re = /!\[[^\]]*\]\(\s*(?:\.\/)?(?:assets\/|images\/)?([^)\s"']+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const name = m[1].split('/').pop();
    if (name && !/^https?:/.test(m[1]) && !m[1].startsWith('/')) names.add(name);
  }
  return names;
}

/** Walk a dropped directory tree (DataTransfer) into flat Files. */
async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const entries: FileSystemEntry[] = [];
  for (const item of Array.from(dt.items)) {
    const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.();
    if (entry) entries.push(entry);
    else {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  const readDir = (dir: FileSystemDirectoryEntry) =>
    new Promise<FileSystemEntry[]>((resolve) => {
      const reader = dir.createReader();
      const all: FileSystemEntry[] = [];
      const step = () =>
        reader.readEntries((batch) => {
          if (!batch.length) resolve(all);
          else {
            all.push(...batch);
            step();
          }
        }, () => resolve(all));
      step();
    });
  const walk = async (entry: FileSystemEntry) => {
    if (entry.name.startsWith('.')) return;
    if (entry.isFile) {
      const f = await new Promise<File | null>((resolve) => (entry as FileSystemFileEntry).file(resolve, () => resolve(null)));
      if (f) out.push(f);
    } else if (entry.isDirectory) {
      for (const child of await readDir(entry as FileSystemDirectoryEntry)) await walk(child);
    }
  };
  for (const e of entries) await walk(e);
  return out;
}

type Ingest = { article: File | null; images: File[]; skipped: string[]; notes: string[] };

/**
 * Pick the article out of a Codex-style package: the .md with frontmatter
 * (largest if several), never "Image Notes"/"README"/"notes". Only images the
 * markdown actually references (plus a frontmatter image:) are uploaded.
 */
async function ingestPackage(files: File[]): Promise<Ingest & { text: string }> {
  const mds = files.filter((f) => /\.(md|markdown)$/i.test(f.name) && !f.name.startsWith('.'));
  const candidates: { file: File; text: string; hasFm: boolean }[] = [];
  for (const f of mds) {
    const text = await f.text();
    const isNotes = /(^|\b)(image notes|readme|notes|changelog)\b/i.test(f.name.replace(/\.(md|markdown)$/i, ''));
    candidates.push({ file: f, text, hasFm: /^\uFEFF?---\r?\n/.test(text) && !isNotes });
  }
  const pick =
    candidates.filter((c) => c.hasFm).sort((a, b) => b.text.length - a.text.length)[0] ||
    candidates.filter((c) => !/(image notes|readme)/i.test(c.file.name)).sort((a, b) => b.text.length - a.text.length)[0] ||
    null;
  const text = pick?.text || '';
  const wanted = referencedImages(text);
  const { fm } = splitFrontmatter(text);
  if (fm.image && !fm.image.startsWith('/') && !/^https?:/.test(fm.image)) wanted.add(fm.image.split('/').pop() || '');

  const images: File[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    if (f === pick?.file) continue;
    if (!IMAGE_EXT.test(f.name)) {
      skipped.push(f.name);
      continue;
    }
    if (!wanted.has(f.name)) {
      skipped.push(`${f.name} (not referenced in the article)`);
      continue;
    }
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    if (f.size > MAX_IMAGE_BYTES) notes.push(`${f.name} is ${(f.size / 1e6).toFixed(1)} MB — over the ${MAX_IMAGE_BYTES / 1e6} MB per-image limit; resize it.`);
    images.push(f);
  }
  for (const name of wanted) if (!seen.has(name)) notes.push(`Article references ${name} but the folder has no such file.`);
  const total = images.reduce((n, f) => n + f.size, 0) + text.length;
  if (total > MAX_REQUEST_BYTES) notes.push(`Package is ${(total / 1e6).toFixed(1)} MB; one publish request is capped around 4.2 MB. Resize the larger images.`);
  return { article: pick?.file || null, images, skipped, notes, text };
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
  const [pin, setPin] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('split');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [ingest, setIngest] = useState<{ folder: string; article: string; skipped: string[]; notes: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
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

  // When a pasted document carries frontmatter, fill the fields (force = replace what's there).
  function adoptFrontmatter(raw: string, force = false, imageNames: string[] = []) {
    const { fm } = splitFrontmatter(raw);
    const h1 = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (force || !title) setTitle(fm.title || h1 || (force ? '' : title));
    if (force || !dek) setDek(fm.dek || (force ? '' : dek));
    if (force || !date) setDate(/^\d{4}-\d{2}-\d{2}$/.test(fm.date || '') ? fm.date : force ? '' : date);
    if (force || !slug) setSlug(fm.slug || (force ? '' : slug));
    if (force && fm.tags !== undefined) setTags(fm.tags);
    if (force) {
      const heroName = fm.image ? fm.image.split('/').pop() || '' : '';
      setHero(imageNames.includes(heroName) ? heroName : '');
    }
  }

  async function loadPackage(files: File[], folderName: string) {
    const r = await ingestPackage(files);
    if (!r.article) {
      setIngest({ folder: folderName, article: '', skipped: r.skipped, notes: ['No markdown article found in that folder.'] });
      return;
    }
    setImages(r.images);
    setBody(r.text);
    adoptFrontmatter(r.text, true, r.images.map((f) => f.name));
    setResult(null);
    setIngest({ folder: folderName, article: r.article.name, skipped: r.skipped, notes: r.notes });
  }

  async function onFolder(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) => !f.name.startsWith('.'));
    const folder = (files[0] as File & { webkitRelativePath?: string })?.webkitRelativePath?.split('/')[0] || 'folder';
    await loadPackage(files, folder);
    e.target.value = '';
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const files = await filesFromDataTransfer(e.dataTransfer);
    if (files.length) await loadPackage(files, 'dropped folder');
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
    const fmImageName = fm.image ? fm.image.split('/').pop() || '' : '';
    const heroUrl = hero
      ? imageUrls[hero]
      : imageUrls[fmImageName] || (fm.image && fm.image.startsWith('/') ? fm.image : undefined);
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
    if (pin) form.set('pin', 'true');
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
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`rounded-lg border-2 border-dashed p-5 transition ${
                  dragging ? 'border-[#b74627] bg-[#f0e5d8]' : 'border-[#aaa194] bg-[#f5f0ea]'
                }`}
              >
                <p className={label}>Load an article package</p>
                <p className="mb-3 text-sm leading-6 text-[#4c5652]">
                  Drop the folder Codex produced here, or pick it. The article markdown, its frontmatter, and every
                  image it references are loaded into the form and previewed on the right. Nothing is published
                  until you press the button at the bottom.
                </p>
                <input
                  type="file"
                  className="text-sm"
                  onChange={onFolder}
                  {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                  multiple
                />
                {ingest && (
                  <div className="mt-3 text-xs leading-5 text-[#5b6560]">
                    <p>
                      <span className="font-semibold text-[#17201f]">{ingest.folder}</span>
                      {ingest.article && <> → article <span className="font-mono">{ingest.article}</span>, {images.length} image{images.length === 1 ? '' : 's'}</>}
                    </p>
                    {ingest.notes.map((n) => (
                      <p key={n} className="text-[#b74627]">⚠ {n}</p>
                    ))}
                    {ingest.skipped.length > 0 && <p>Not uploaded: {ingest.skipped.join(', ')}</p>}
                  </div>
                )}
              </div>

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

              <label className="flex items-start gap-3 text-sm text-[#4c5652]">
                <input type="checkbox" className="mt-1" checked={pin} onChange={(e) => setPin(e.target.checked)} />
                <span>
                  <span className="font-semibold text-[#17201f]">Pin as the News hero.</span> By default the hero is your most
                  recently published article. Tick this to hold this one at the top until you republish it unpinned.
                </span>
              </label>

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
