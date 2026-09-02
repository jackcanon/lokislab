import { articleList, allTrustedItems } from '@/lib/articleList';
import Link from 'next/link';

type Filter = 'Lab Notes' | 'External news' | 'All';

export const metadata = {
  title: 'News & articles — Loki\'s Lab',
  description:
    'Every Loki\'s Lab article and trusted-wire item we have published or curated, in one place.',
};

const SECTION_LAB_NOTES: Filter = 'Lab Notes';
const SECTION_EXTERNAL: Filter = 'External news';
const SECTION_ALL: Filter = 'All';

function sectionFor(item: (typeof allTrustedItemsResult)[number]): Filter {
  if (item.isLocal) return SECTION_LAB_NOTES;
  return SECTION_EXTERNAL;
}

const allTrustedItemsResult = allTrustedItems();

export default function NewsPage() {
  const items = allTrustedItemsResult;
  const sections: Filter[] = [SECTION_LAB_NOTES, SECTION_EXTERNAL, SECTION_ALL];
  const selected: Filter = SECTION_ALL;
  const featuredItem = items.length > 0 ? items[0] : null;
  const otherItems = items.length > 1 ? items.slice(1) : [];

  return (
    <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
      <section className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 lg:px-14">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#b74627]">
              News & articles
            </p>
            <h1 className="display-serif text-4xl leading-[1.03] tracking-[-0.035em] md:text-6xl">
              What we&apos;ve written and gathered.
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#4c5652]">
            Lab Notes from our own testing, plus trusted-wire items selected from the people building
            local AI. Scroll through the whole list, or filter by section.
          </p>
        </div>

        {/* Featured article section */}
        {featuredItem && (
          <div className="mb-12 rounded-lg border-2 border-[#b74627] bg-[#f5f0ea] p-6 md:p-8">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b74627]">
              <span className="relative h-3 w-3 rounded-full bg-[#b74627]" />
              Featured: Latest
            </div>
            {/* Featured image - optional, shows if article has one */}
            {featuredItem.isLocal && featuredItem.image && (
              <div className="mb-6 overflow-hidden rounded-lg">
                <img
                  src={featuredItem.image}
                  alt={featuredItem.title}
                  className="h-64 w-full object-cover"
                  style={{ objectPosition: 'center -70%' }}
                />
              </div>
            )}
            <h2 className="display-serif mb-4 text-3xl leading-[1.1] tracking-[-0.03em] md:text-4xl">
              <Link href={featuredItem.href} className="hover:text-[#9a3a20] transition-colors">
                {featuredItem.title}
              </Link>
            </h2>
            <p className="mb-6 text-base leading-7 text-[#4c5652]">
              {featuredItem.excerpt}
            </p>
            {featuredItem.isLocal && (
              <div className="mb-4 flex items-center gap-3 text-sm text-[#8f9a95]">
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                  <img
                    src="/authors/jack.jpg"
                    alt="Jack Blair"
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="font-semibold text-[#17201f]">Jack Blair</span>
                <span className="text-[#b74627]">·</span>
                <span>{featuredItem.date}</span>
              </div>
            )}
            <Link
              href={featuredItem.href}
              className="inline-flex items-center gap-2 font-semibold text-[#b74627] transition hover:text-[#9a3a20]"
            >
              Read full article
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        {/* Section filter */}
        <div className="mb-8 flex flex-wrap gap-3">
          {sections.map((s) => (
            <Link
              key={s}
              href={s === SECTION_ALL ? '/news' : `/news?section=${encodeURIComponent(s)}`}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition hover:border-[#17201f] ${
                s === selected ? 'border-[#17201f] text-[#17201f]' : 'border-[#aaa194] text-[#5b6560]'
              }`}
            >
              {s === SECTION_ALL ? 'All articles' : s}
            </Link>
          ))}
        </div>

        {/* Article list */}
        <div className="space-y-0">
          {otherItems.length > 0 && (
            <div className="mb-8 pb-8 border-b-2 border-[#aaa194]">
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.22em] text-[#5b6560]">More articles</p>
            </div>
          )}
          {otherItems.map((item, index) => (
            <article
              key={item.href + index}
              className="grid gap-4 border-b border-[#e3dccd] pb-8 last:border-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {item.isLocal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f0e5d8] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#b74627]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#b74627]" />
                        Lab Notes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e5f0f0] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#2d6953]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2d6953]" />
                        External
                      </span>
                    )}
                    <span className="text-xs text-[#8f9a95]">{item.date}</span>
                  </div>
                  <h3 className="display-serif text-xl leading-[1.1] tracking-[-0.02em]">
                    <Link
                      href={item.href}
                      className="hover:text-[#b74627] transition-colors"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4c5652]">
                    {item.excerpt}
                  </p>
                </div>
              </div>

              {item.isLocal && (
                <div className="flex items-center gap-2 text-xs text-[#8f9a95]">
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <img
                      src="/authors/jack.jpg"
                      alt="Jack Blair"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="font-semibold text-[#17201f]">Jack Blair</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#b74627] transition hover:text-[#9a3a20]"
                >
                  Read
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {items.length === 0 && (
          <p className="mt-10 text-sm text-[#6e7773]">No articles yet — check back after the next publish.</p>
        )}

        <p className="mt-10 text-xs text-[#9a9384]">
          Lab Notes are original Loki&apos;s Lab articles. Trusted-wire items are selected from project
          sources and linked for reference — we read them before we share them, and we say where they
          came from.
        </p>
      </section>
    </main>
  );
}
