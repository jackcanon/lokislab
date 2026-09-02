import { listArticles } from '@/lib/article-editor';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import Link from 'next/link';

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    return (
      <div className="min-h-screen bg-[#ece5d8] flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-[#aaa194] bg-white/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#b74627]/15">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#b74627]" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="display-serif text-xl font-bold">Article Editor</h1>
          <p className="mt-1 text-sm text-[#626a66]">
            Loki's Lab · Draft editor
          </p>
          <p className="mt-6 text-xs font-medium text-[#8f9a95]">
            Sign in to continue
          </p>
          <form action="/admin/login" method="post" className="mt-4 flex gap-2">
            <input
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className="flex-1 rounded-md border border-[#ccc3b0] bg-white px-3 py-2 text-sm text-[#17201f] placeholder:text-[#b8afa2] focus:border-[#b74627] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-[#b74627] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#a03b20] active:scale-95"
            >
              Sign in
            </button>
          </form>
          <Link
            href="https://lokislab.org"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-full bg-[#17201f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#b74627]"
          >
            View live site
          </Link>
        </div>
      </div>
    );
  }

  const articles = await listArticles();

  return (
    <div className="min-h-screen bg-[#ece5d8] text-[#17201f] px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between border-b border-[#aaa194] pb-4">
        <div>
          <h1 className="display-serif text-2xl font-bold tracking-tight">
            Article Editor
          </h1>
          <p className="mt-1 text-sm text-[#626a66]">
            Loki's Lab · Draft editor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-[#aaa194] px-3 py-1.5 text-xs font-medium text-[#626a66] transition hover:bg-[#f7f3eb]"
            >
              Sign out
            </button>
          </form>
          <Link
            href="https://lokislab.org"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#17201f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#b74627]"
          >
            View live site
          </Link>
        </div>
      </header>

      {/* Article list */}
      <div className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#b74627]">
          All articles
        </h2>
        {articles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#9f968a] p-6 text-center text-sm text-[#626a66]">
            No drafts yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/admin/edit/${a.slug}`}
                className="group flex flex-col gap-1 rounded-lg border border-[#aaa194] bg-white/60 p-4 transition hover:border-[#b74627]"
              >
                <div className="flex items-center gap-2">
                  {a.pinned && (
                    <span className="shrink-0 rounded-full bg-[#b74627] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Pinned
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-[#8f9a95] font-medium">
                    {a.slug}
                  </span>
                </div>
                <h3 className="display-serif text-lg leading-snug group-hover:text-[#b74627]">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="line-clamp-2 text-sm leading-5 text-[#5b6560]">
                    {a.excerpt}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 text-[11px] text-[#8f9a95]">
                  {a.date && <span>{a.date}</span>}
                  {a.date && <span className="text-[#aaa194]">·</span>}
                  <span>
                    {a.pinned ? 'Pinned · ' : ''}
                    Edit
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-8 border-t border-[#aaa194] pt-4 text-center text-xs text-[#8f9a95]">
        <p>
          Edit a draft → preview it → save → push to GitHub → Vercel deploys.
          Changes are saved to the .md file on disk.
        </p>
        <p className="mt-1">
          Last updated: {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
