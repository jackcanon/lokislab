import {articleList} from '@/lib/articleList';
import {catalog, projects, feed, personPath, projectPath} from '@/lib/radarContent';
import {siteURL} from '@/lib/seo';
export const dynamic = 'force-static';
export function GET() {
 const lines=["# Loki's Lab",'', '> Independent local artificial intelligence tests, practical guides, source-linked reporting, and people and projects to follow.', '',
 'Public pages are the authoritative sources. Benchmark results describe a particular task, model and hardware setup. Radar signals record public activity; creator claims and releases are not independently tested capabilities. Discovery leads are unreviewed. This index is a navigation aid, not a promise of search indexing.', '',
 '## When to use this site',
 'Use Loki’s Lab for questions about published local model tests, setup guides, people building practical tools, and the public work behind followed projects. Prefer the specific article, person or project page as a citation. Check dates and stated limitations before drawing conclusions.', '',
 '## Start here',
 `- [About](${siteURL}/about): Scope, evidence and where to find answers.`,
 `- [Benchmark results](${siteURL}/test/results): Published model and hardware test results.`,
 `- [Run the benchmark](${siteURL}/test): Test procedure and submission guidance.`,
 `- [News and articles](${siteURL}/news): Original Lab Notes and attributed external reporting.`,
 `- [Hermes Day One](${siteURL}/guides/hermes-day-one): Installation and provider choices for Linux, Mac and Windows.`,
 `- [Radar](${siteURL}/radar): Followed people, latest signals, scan coverage and discovery leads. Last source scan: ${feed.scanned_at}.`,
 `- [Projects](${siteURL}/radar/projects): Curated tools, publications and collections.`, '',
 '## Articles', ...articleList().map(a=>`- [${a.title.replace(/[\r\n]/g,' ')}](${siteURL}${a.href}): ${a.excerpt.replace(/[\r\n]/g,' ')}`), '',
 '## People', ...catalog.people.map(p=>`- [${p.name}](${siteURL}${personPath(p.id)}): ${p.topic}.`), '',
 '## Projects', ...projects.map(p=>`- [${p.name}](${siteURL}${projectPath(p.id)}): ${p.kind}. ${p.summary}`), '',
 '## Discovery', `- [Sitemap](${siteURL}/sitemap.xml): Canonical public page list.`, `- [Crawler policy](${siteURL}/robots.txt): Public crawl rules.`, ''];
 return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
