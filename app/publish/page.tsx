'use client';

// /publish — the human door to the same pipeline agents use (POST /api/publish).
// Paste markdown (or drop a .md file), optionally attach images, hit Publish.
// The publish token is remembered in this browser only.

import { useEffect, useState, type FormEvent } from 'react';

type Result =
  | { ok: true; slug: string; url: string; commitUrl: string; files: string[]; note?: string }
  | { ok: false; error: string };

const TOKEN_KEY = 'lokislab_publish_token';

export default function PublishPage() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [slug, setSlug] = useState('');
  const [dek, setDek] = useState('');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');
  const [hero, setHero] = useState('');
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {
      /* private mode etc. */
    }
  }, []);

  // Pull a title out of a pasted document's frontmatter or first H1 if the field is empty.
  useEffect(() => {
    if (title || !body) return;
    const fm = body.match(/^---\r?\n[\s\S]*?^title:\s*"?([^"\n]+)"?/m);
    const h1 = body.match(/^#\s+(.+)$/m);
    const guess = fm?.[1] || h1?.[1];
    if (guess) setTitle(guess.trim());
  }, [body, title]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = (await res.json()) as Result;
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-md border border-[#aaa194] bg-[#f5f0ea] px-3 py-2 text-sm text-[#17201f] outline-none focus:border-[#b74627]';
  const label = 'mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#5b6560]';

  return (
    <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
      <section className="mx-auto max-w-3xl px-5 py-14 md:px-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">Publish</p>
        <h1 className="display-serif mb-3 text-4xl leading-[1.03] tracking-[-0.035em] md:text-5xl">
          Post a Lab Note.
        </h1>
        <p className="mb-10 max-w-xl text-sm leading-7 text-[#4c5652]">
          Paste markdown, attach images if you have them, publish. This commits to GitHub and Vercel
          rebuilds the site — your article is live in about two minutes. Agents use the same endpoint:
          <code className="ml-1 rounded bg-[#d4c9b5] px-1 py-0.5 font-mono text-xs">POST /api/publish</code>.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className={label} htmlFor="token">Publish token</label>
            <input id="token" type="password" className={input} value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" />
          </div>

          <div>
            <label className={label} htmlFor="title">Title</label>
            <input id="title" name="title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className={label} htmlFor="date">Date (optional, defaults to today)</label>
              <input id="date" name="date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="slug">Slug (optional)</label>
              <input id="slug" name="slug" className={input} placeholder="derived-from-title" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="dek">Dek / one-line summary (optional)</label>
            <input id="dek" name="dek" className={input} value={dek} onChange={(e) => setDek(e.target.value)} />
          </div>

          <div>
            <label className={label} htmlFor="tags">Tags, comma-separated (optional)</label>
            <input id="tags" name="tags" className={input} placeholder="Apple, local AI" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <div>
            <label className={label} htmlFor="body">Article markdown</label>
            <textarea
              id="body"
              name="body"
              className={`${input} min-h-[360px] font-mono text-xs leading-5`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'Your article in markdown. The Title field above is the headline; a leading # H1 here is dropped. Frontmatter is fine too; it is merged.'}
            />
            <p className="mt-2 text-xs text-[#8f9a95]">
              …or upload a .md file instead:{' '}
              <input type="file" name="bodyFile" accept=".md,.markdown,text/markdown,text/plain" className="text-xs" />
            </p>
          </div>

          <div>
            <label className={label} htmlFor="images">Images (optional, ≤3.5 MB each)</label>
            <input
              id="images"
              name="images"
              type="file"
              accept="image/*"
              multiple
              className="text-sm"
              onChange={(e) => setImageNames(Array.from(e.target.files || []).map((f) => f.name))}
            />
            <p className="mt-2 text-xs text-[#8f9a95]">
              Reference them in the markdown as <code className="font-mono">![alt](file-name.jpg)</code>; paths are rewritten on publish.
            </p>
            {imageNames.length > 0 && (
              <div className="mt-3">
                <label className={label} htmlFor="hero">Featured image</label>
                <select id="hero" name="hero" className={input} value={hero} onChange={(e) => setHero(e.target.value)}>
                  <option value="">None</option>
                  {imageNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
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
        </form>

        {result && (
          <div
            className={`mt-10 rounded-lg border-2 p-5 text-sm ${
              result.ok ? 'border-[#2d6953] bg-[#e5f0f0]' : 'border-[#b74627] bg-[#f0e5d8]'
            }`}
          >
            {result.ok ? (
              <>
                <p className="mb-2 font-semibold text-[#2d6953]">Committed. Vercel is rebuilding now.</p>
                <p>
                  Article URL (live in ~2 min):{' '}
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
      </section>
    </main>
  );
}
