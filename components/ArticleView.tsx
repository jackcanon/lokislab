// The article page body, shared by the live route (app/articles/[slug]) and
// the /publish preview so that what you preview is exactly what will ship.
// Pure presentation: no fs, no server imports — safe in a client component.
import Link from 'next/link';
import { renderMarkdown } from '@/lib/markdown';

export type ArticleViewProps = {
  title: string;
  date: string;
  dek?: string;
  image?: string;
  imageAlt?: string;
  body: string;
  authorName?: string;
  authorLabel?: string;
  sectionLabel?: string;
};

export function formatArticleDate(date: string): string {
  if (!date) return '';
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function ArticleView({
  title,
  date,
  dek,
  image,
  imageAlt,
  body,
  authorName = 'Jack Blair',
  authorLabel = 'Writer & tester',
  sectionLabel = 'Lab Notes',
}: ArticleViewProps) {
  const content = renderMarkdown(body);
  const formattedDate = formatArticleDate(date);

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 text-[#17201f] md:px-10 lg:px-14">
      <header className="mb-12 border-b border-[#aaa194] pb-6">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#b74627]">
          <span>{sectionLabel}</span>
          <span>·</span>
          <span>{formattedDate}</span>
        </div>
        <h1
          className="display-serif mt-4 text-[clamp(2.5rem,5vw,4rem)] leading-[0.9] tracking-[-0.04em] font-bold"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          {title}
        </h1>
        {dek && <p className="mt-4 text-lg leading-8 text-[#4c5652]">{dek}</p>}
      </header>
      {image && (
        <figure className="mb-10 overflow-hidden rounded-lg">
          <img src={image} alt={imageAlt || title} className="h-auto w-full object-cover" />
        </figure>
      )}
      <div className="prose prose-lg prose-invert max-w-none">{content}</div>

      {/* Author bio section at end of article */}
      <div className="mt-16 border-t border-[#aaa194] pt-8">
        <div className="flex items-start gap-4">
          <Link href="/authors/jack" className="group">
            <span className="relative h-48 w-48 min-h-48 min-w-48 max-h-48 max-w-48 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-[#ece5d8] group-hover:ring-[#b74627] transition block">
              <img
                src="/authors/jack.jpg"
                alt={`${authorName} — author photo`}
                className="h-full w-full object-cover block"
              />
            </span>
          </Link>
          <div className="flex-1">
            <div className="mb-2">
              <h3 className="text-xs font-bold text-[#17201f]">{authorName}</h3>
              <p className="text-xs text-[#b74627] font-semibold">{authorLabel}</p>
            </div>
            <p className="text-xs leading-6 text-[#4c5652] mb-3">
              Jack Blair is an independent documentary filmmaker, storyteller, and lifelong technology obsessive. Through Happy Jack Media, he explores overlooked human stories and experiments with new ways to create and connect. He founded Loki&apos;s Lab as a community where curious people can test local AI models, share what they learn, and discover what today&apos;s technology can do on the computers they already own.
            </p>
            <Link href="/authors/jack" className="inline-flex text-xs font-semibold text-[#b74627] hover:text-[#9a3a20] transition">
              View author profile →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
