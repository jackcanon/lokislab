import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Jack Blair — Loki's Lab",
  description: 'Jack Blair is the writer and tester behind Loki\'s Lab, conducting independent benchmarks of local AI models on real hardware.',
};

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Currently only support jack
  if (slug !== 'jack') {
    return (
      <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
        <section className="mx-auto max-w-3xl px-5 py-16 md:px-10 lg:px-14">
          <h1 className="text-4xl font-bold">Author not found</h1>
          <p className="mt-4 text-base text-[#4c5652]">
            This author page does not exist.{' '}
            <Link href="/news" className="text-[#b74627] hover:underline">
              Return to news
            </Link>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#ece5d8] text-[#17201f]">
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-10 lg:px-14">
        <article>
          {/* Author header */}
          <div className="mb-12 flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="shrink-0">
              <img
                src="/authors/jack.jpg"
                alt="Jack Blair"
                className="h-24 w-24 overflow-hidden rounded-full object-cover ring-2 ring-[#17201f] ring-offset-2"
              />
            </div>
            <div>
              <h1 className="display-serif text-4xl font-bold">Jack Blair</h1>
              <p className="mt-2 text-lg text-[#5b6560]">Writer and tester at Loki&apos;s Lab</p>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#4c5652]">
                Jack conducts independent benchmarks of local AI models on real hardware, testing what actually works
                outside of marketing claims.
              </p>
            </div>
          </div>

          {/* About section */}
          <div className="prose prose-lg prose-invert max-w-none space-y-6 text-[#4c5652]">
            <div>
              <h2 className="display-serif text-2xl font-bold text-[#17201f]">About Jack</h2>
              <p>
                At Loki&apos;s Lab, Jack&apos;s focus is on measuring what local AI models can actually do on real computers—not
                in vendor benchmarks, but in the conditions people use them in. Which models load? How fast do they
                respond? Does speed matter if accuracy suffers? What happens when context grows?
              </p>
              <p>
                He&apos;s particularly interested in the practical intersection of model capability, hardware constraints,
                and real-world use cases. His testing methodology emphasizes reproducibility, transparency, and
                honesty about what the data actually shows rather than what the headlines claim.
              </p>
            </div>

            <div>
              <h2 className="display-serif text-2xl font-bold text-[#17201f]">Articles by Jack</h2>
              <p>
                All Lab Notes at Loki&apos;s Lab are written by Jack Blair. You can find them on the{' '}
                <Link href="/news" className="text-[#b74627] hover:underline font-semibold">
                  news page
                </Link>
                , with his byline on each article.
              </p>
            </div>

            <div>
              <h2 className="display-serif text-2xl font-bold text-[#17201f]">Learn More</h2>
              <p>
                Explore the{' '}
                <Link href="/" className="text-[#b74627] hover:underline font-semibold">
                  Loki&apos;s Lab homepage
                </Link>{' '}
                for the leaderboard, test results, and more articles.
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
