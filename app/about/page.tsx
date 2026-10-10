import Link from 'next/link';
import StructuredData from '@/components/seo/StructuredData';
import {pageMetadata, siteURL} from '@/lib/seo';
export const metadata = pageMetadata('/about', "About Loki's Lab — independent testing and practical guides", 'Learn what Loki’s Lab publishes, where to find model benchmark results and how Radar follows people and projects using public sources.');
export default function AboutPage() {
  return <main className="mx-auto max-w-3xl px-5 py-14 text-[#17201f] md:px-10">
    <StructuredData data={{'@context':'https://schema.org','@type':'AboutPage',name:"About Loki's Lab",url:`${siteURL}/about`,isPartOf:{'@id':`${siteURL}/#website`}}} />
    <p className="text-sm font-bold uppercase tracking-widest text-[#b74627]">About the lab</p>
    <h1 className="my-6 font-serif text-5xl">Practical questions. Evidence we can inspect.</h1>
    <div className="space-y-8 leading-7">
      <section><h2 className="font-serif text-2xl">What is Loki’s Lab?</h2><p>We publish independent tests of local artificial intelligence models, practical guides and source-linked reporting. We focus on what models and tools can do on real computers, and the limitations of the available evidence.</p></section>
      <section><h2 className="font-serif text-2xl">Where can I compare local models?</h2><p>The <Link className="text-[#b74627] underline" href="/test/results">benchmark results</Link> show published test outcomes by model and hardware. Results describe a particular task and setup. Accuracy, speed and hardware requirements should be considered together; a benchmark is not a guarantee of performance on every task.</p><p>Our <Link className="text-[#b74627] underline" href="/test">benchmark guide</Link> explains how to run the test and submit evidence. The <Link className="text-[#b74627] underline" href="/articles/ll-010-039-midgaard">methodology article</Link> provides more context.</p></section>
      <section><h2 className="font-serif text-2xl">Who and what does Radar follow?</h2><p><Link className="text-[#b74627] underline" href="/radar">Radar</Link> follows builders, researchers and educators working with artificial intelligence and practical production tools. Its <Link className="text-[#b74627] underline" href="/radar/projects">project directory</Link> connects tools, publications and experiment collections to their public sources.</p><p>Recent signals come from public repository activity, selected creator feeds and watched websites. The scan date and coverage gaps are visible. Discovery leads remain separate from the curated catalog. A commit, release or creator claim does not establish an independently tested capability.</p></section>
      <section><h2 className="font-serif text-2xl">Where should I start?</h2><p>Read the <Link className="text-[#b74627] underline" href="/guides/hermes-day-one">Hermes Day One guide</Link> for installation and provider choices, browse <Link className="text-[#b74627] underline" href="/news">articles and news</Link>, or learn about <Link className="text-[#b74627] underline" href="/authors/jack">Jack Blair’s testing work</Link>.</p></section>
    </div>
  </main>;
}
