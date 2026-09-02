import { isAdminAuthenticated } from '@/lib/admin-auth';
import EditorClient from './editor-client';

export default async function EditArticlePage() {
  if (!(await isAdminAuthenticated())) {
    return (
      <div className="min-h-screen bg-[#ece5d8] flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-[#aaa194] bg-white/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#b74627]/15">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#b74627]" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="display-serif text-xl font-bold">Sign in required</h1>
          <p className="mt-1 text-sm text-[#626a66]">
            You need to sign in to edit articles.
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
          <p className="mt-3 text-xs text-[#8f9a95]">
            <a href="/admin" className="text-[#b74627] hover:underline">
              Back to articles
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <EditorClient />;
}
