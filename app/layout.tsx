import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Loki's Lab — Local AI, tested",
  description:
    'Independent local AI benchmarks, practical guides, and signal-rich news for builders.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Site-wide header — visible on every page */}
        <header className="sticky top-0 z-50 border-b border-[#aaa194] bg-[#ece5d8]/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-14">
            <Link
              href="/"
              className="flex items-center gap-3 group"
              aria-label="Loki's Lab home"
            >
              <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-sm bg-[#17201f] text-[#ece5d8]">
                <span className="absolute left-[8px] top-[2px] -rotate-12 font-serif text-2xl font-black">
                  L
                </span>
                <span className="absolute bottom-[1px] right-[7px] rotate-[168deg] font-serif text-2xl font-black text-[#d26743]">
                  L
                </span>
              </span>
              <span className="font-serif text-xl font-bold tracking-tight text-[#17201f] group-hover:text-[#b74627] transition-colors">
                Loki&apos;s Lab
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#5b6560]">
              <Link href="/" className="hover:text-[#b74627] transition-colors">
                Home
              </Link>
              <Link href="/test/results" className="hover:text-[#b74627] transition-colors">
                Leaderboard
              </Link>
              <Link href="/news" className="hover:text-[#b74627] transition-colors">
                News
              </Link>
              <Link href="/test" className="hover:text-[#b74627] transition-colors">
                Test
              </Link>
            </nav>
          </div>
        </header>

        {children}

        {/* Site-wide footer — consistent across all pages */}
        <footer className="bg-[#ece5d8] mt-20">
          <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 px-5 py-10 text-sm md:flex-row md:items-end md:px-10 lg:px-14">
            <div>
              <p className="display-serif text-2xl font-bold">Loki&apos;s Lab</p>
              <p className="mt-2 text-[#626a66]">Gain meaning, not AI noise.</p>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs leading-5 text-[#626a66]">
              <div className="flex flex-col gap-1">
                <p>Independent testing · Public methodology</p>
                <p>Built on Asgard · Deployed on Vercel</p>
              </div>
              <Link
                href="https://github.com/jackcanon/lokislab"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#b74627] transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.7 1.028 1.593 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Source
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
