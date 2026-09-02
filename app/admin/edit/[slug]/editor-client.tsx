'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { renderMarkdown } from '@/lib/markdown';

interface ArticleMeta {
  slug: string;
  title: string;
  date: string;
  pinned: boolean;
  excerpt: string;
}

interface ArticleResponse {
  article: ArticleMeta;
  frontmatter: Record<string, string>;
  body: string;
  error?: string;
}

const FM_KEYS = ['title', 'date', 'category', 'author', 'excerpt', 'short_title'];

export default function EditorClient() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string) || '';

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<ArticleMeta | null>(null);
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');
  const saveMsgRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    fetch(`/api/articles/${slug}`, { credentials: 'same-origin' })
      .then(async (r) => {
        const data = (await r.json()) as ArticleResponse;
        if (!r.ok) throw new Error(data.error || 'Failed to load article');
        setArticle(data.article);
        setFrontmatter(data.frontmatter);
        setBody(data.body);
      })
      .catch((err) => {
        setSaveError(err instanceof Error ? err.message : 'Failed to load article');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    setSaved(false);
    setSaveError('');
  }, [slug]);

  const handleSave = useCallback(async () => {
    setSaveError('');
    const fmLines = Object.entries(frontmatter)
      .filter(([, v]) => v.trim() !== '')
      .map(([k, v]) => `${k}: ${v.startsWith('"') ? v : `"${v}"`}`);
    const fm = fmLines.join('\n');

    try {
      const res = await fetch(`/api/articles/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontmatter: fm, body }),
      credentials: 'same-origin',
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setSaved(true);
        if (saveMsgRef.current) clearTimeout(saveMsgRef.current);
        saveMsgRef.current = setTimeout(() => setSaved(false), 4000);
      } else {
        setSaveError(data.error || 'Save failed');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Network error');
    }
  }, [slug, frontmatter, body]);

  const updateField = (key: string, value: string) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ece5d8] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b74627] border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-[#626a66]">Loading article…</p>
        </div>
      </div>
    );
  }

  if (saveError && !article) {
    return (
      <div className="min-h-screen bg-[#ece5d8] flex items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-red-700/40 bg-white/80 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">{saveError}</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 rounded-full bg-[#17201f] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#b74627]"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#ece5d8] flex items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-[#aaa194] bg-white/80 p-6 text-center">
          <p className="text-sm font-semibold text-[#b74627]">Article not found</p>
          <p className="mt-1 text-sm text-[#626a66]">Sorry, we couldn&apos;t find that draft.</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 rounded-full bg-[#17201f] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#b74627]"
          >
            Back to articles
          </button>
        </div>
      </div>
    );
  }

  const preview = renderMarkdown(body);

  return (
    <div className="min-h-screen bg-[#ece5d8] text-[#17201f] flex flex-col">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#aaa194] bg-[#ece5d8]/95 backdrop-blur py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push('/admin')}
            className="shrink-0 rounded-lg p-1.5 transition hover:bg-[#ddd5c4] sm:hidden"
            aria-label="Back to articles"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#17201f]" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-mono text-[#8f9a95]">{slug}</p>
            <h1 className="truncate text-base font-bold leading-tight sm:hidden">
              {article.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="rounded-full bg-[#2d6953] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-full bg-[#b74627] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#a03b20] active:scale-95 disabled:opacity-50 sm:block"
            aria-label="Save article"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="hidden xs:inline">Save</span>
          </button>
        </div>
      </header>

      {/* Error banner */}
      {saveError && article && (
        <div className="mx-4 mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 sm:mx-6 sm:mt-4">
          {saveError}
        </div>
      )}

      {/* Mobile tab toggle */}
      <div className="border-b border-[#aaa194] bg-white/50 sm:hidden">
        <div className="flex">
          <button
            onClick={() => setPreviewTab('edit')}
            className={`flex-1 border-b-2 px-4 py-2 text-center text-sm font-bold transition ${
              previewTab === 'edit'
                ? 'border-[#b74627] text-[#17201f]'
                : 'border-transparent text-[#626a66] hover:text-[#17201f]'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setPreviewTab('preview')}
            className={`flex-1 border-b-2 px-4 py-2 text-center text-sm font-bold transition ${
              previewTab === 'preview'
                ? 'border-[#b74627] text-[#17201f]'
                : 'border-transparent text-[#626a66] hover:text-[#17201f]'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className={`flex gap-4 ${previewTab === 'preview' ? 'flex-col' : 'hidden sm:flex'}`}>
            {/* Editor panel */}
            <div className={`flex-1 ${previewTab === 'preview' ? 'mt-4' : ''}`}>
              {/* Frontmatter editor */}
              <div className="mb-4 rounded-lg border border-[#aaa194] bg-white/70 p-4">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b74627]">
                  Frontmatter
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FM_KEYS.map((key) => {
                    const val = frontmatter[key] ?? '';
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    const isPinned = key === 'title' && article.pinned;

                    if (key === 'date' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      return (
                        <label key={key} className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-[#626a66]">{label}</span>
                          <input
                            type="date"
                            value={val}
                            onChange={(e) => updateField(key, e.target.value)}
                            className="rounded-md border border-[#ccc3b0] bg-white px-3 py-2 text-sm text-[#17201f] focus:border-[#b74627] focus:outline-none"
                          />
                        </label>
                      );
                    }

                    return (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-[#626a66]">
                          {label}
                          {isPinned && (
                            <span className="ml-1.5 rounded-full bg-[#b74627]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#b74627]">
                              Pinned
                            </span>
                          )}
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={
                            key === 'author' ? 'e.g. Jack' :
                            key === 'category' ? 'e.g. Testing' :
                            key === 'excerpt' ? 'Brief description for the feed' :
                            ''
                          }
                          className="rounded-md border border-[#ccc3b0] bg-white px-3 py-2 text-sm text-[#17201f] placeholder:text-[#b8afa2] focus:border-[#b74627] focus:outline-none"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Markdown editor */}
              <div className="mb-4">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b74627]">
                  Markdown
                </h2>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your article here…"
                  className="h-80 w-full resize-y rounded-lg border border-[#aaa194] bg-white p-4 text-sm leading-6 text-[#17201f] placeholder:text-[#b8afa2] focus:border-[#b74627] focus:outline-none font-mono"
                  style={{ minHeight: '320px' }}
                />
              </div>

              {/* Bottom actions */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#8f9a95]">
                  Changes save to the draft file on disk. Push to GitHub to publish.
                </p>
                <button
                  onClick={() => router.push('/admin')}
                  className="rounded-lg border border-[#aaa194] px-4 py-2 text-sm font-medium text-[#17201f] transition hover:bg-[#f7f3eb] sm:hidden"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Preview panel */}
            <div className={`${previewTab === 'preview' ? 'flex-1' : 'hidden sm:block'}`}>
              {/* Preview header */}
              <div className="mb-3 flex items-center justify-between border-b border-[#aaa194] pb-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2d6953]">
                  Live preview
                </h2>
                <span className="text-[10px] font-medium text-[#8f9a95]">
                  What readers will see
                </span>
              </div>

              {/* Rendered article preview */}
              <div className="rounded-lg border border-[#aaa194] bg-white/80 p-5 sm:p-8">
                {/* Simulated article header */}
                <div className="mb-6 border-b border-[#aaa194] pb-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b74627]">
                    <span>{article.date || 'Draft'}</span>
                    <span className="text-[#aaa194]">·</span>
                    <span>{article.title || 'Untitled'}</span>
                  </div>
                  <h1 className="mt-3 display-serif text-3xl font-bold leading-[0.9] tracking-tight">
                    {frontmatter.title || 'Untitled'}
                  </h1>
                  {frontmatter.author && (
                    <p className="mt-3 text-sm text-[#8f9a95]">By {frontmatter.author}</p>
                  )}
                </div>

                {/* Rendered body */}
                <div className="prose prose-lg max-w-none">
                  {preview.length === 0 ? (
                    <p className="text-[#8f9a95] italic">Start writing to see the preview…</p>
                  ) : (
                    preview
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
