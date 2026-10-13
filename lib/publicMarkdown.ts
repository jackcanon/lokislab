import {catalog, projects, feed, personPath, projectPath, projectUpdates, publicURL} from '@/lib/radarContent';
import {articleList} from '@/lib/articleList';
import {readArticle} from '@/lib/articleContent';
import {summary, top5, feedMeta} from '@/lib/skillMatrix';
import {siteURL} from '@/lib/seo';
const link = (label: string, path: string) => `[${label}](${path.startsWith('/') ? siteURL+path : path})`;
const sources = (spaces: {url: string; name: string}[]) => spaces.filter(s=>publicURL(s.url)).map(s=>`- ${link(s.name,s.url)}`).join('\n');
const results = (rows: typeof summary) => ['| Model | Machine | Tests | Capable rate | Average quality | Average accuracy | Median time (seconds) | Last tested |','| --- | --- | --- | --- | --- | --- | --- | --- |',...rows.map(s=>`| ${s.model.replace(/\|/g,'\\|')} | ${s.machine} | ${s.tests} | ${s.capableRate} | ${s.avgQuality ?? 'Not supplied'} | ${s.avgAccuracy ?? 'Not supplied'} | ${s.medianSpeedS ?? 'Not supplied'} | ${s.lastTested} |`)].join('\n');
export function publicMarkdown(path: string): string | undefined {
 const tail=`\n\n---\n${link('About Loki’s Lab','/about')} · ${link('Sitemap','/sitemap.xml')} · ${link('Public source index','/llms.txt')}\n`;
 let body: string | undefined;
 if(path==='/') body=`# Loki’s Lab\n\nIndependent local artificial intelligence benchmarks, practical guides, source-linked reporting, and people and projects to follow.\n\n## Agent leaderboard\n\nPublished benchmark feed: ${feedMeta.generatedAt}. Results apply to the reported test and hardware; they do not establish universal capability.\n\n${results(top5)}\n\n${link('All benchmark results','/test/results')} · ${link('Run the benchmark','/test')}\n\n## Explore\n\n- ${link('News and articles','/news')}\n- ${link('Hermes Day One guide','/guides/hermes-day-one')}\n- ${link('People in Radar','/radar')}\n- ${link('Projects to follow','/radar/projects')}`;
 else if(path==='/test/results') body=`# Local model benchmark results\n\nPublished feed: ${feedMeta.generatedAt}. Total recorded runs: ${feedMeta.totalRuns}. Compare reported accuracy, quality and time within the test conditions. Missing values are not zero.\n\n${results(summary)}\n\n${link('Test procedure','/test')} · ${link('Methodology','/articles/ll-010-039-midgaard')}`;
 else if(path==='/about') body=`# About Loki’s Lab\n\nWe publish independent tests of local artificial intelligence models, practical guides and source-linked reporting. We focus on what models and tools can do on real computers, and the limitations of the available evidence.\n\n## Where can I compare local models?\n\n${link('Benchmark results','/test/results')} show published outcomes by model and hardware. Results describe a particular task and setup. Accuracy, speed and hardware requirements should be considered together; a benchmark is not a guarantee of performance on every task. ${link('Run the benchmark','/test')} explains the test and submissions.\n\n## Who and what does Radar follow?\n\n${link('Radar','/radar')} follows builders, researchers and educators working with artificial intelligence and practical production tools. The ${link('project directory','/radar/projects')} connects tools, publications and collections to public sources. Signals come from repository activity, selected feeds and watched websites. Discovery leads remain separate from the curated catalog. A commit, release or creator claim does not establish an independently tested capability.\n\n## Where should I start?\n\n${link('Hermes Day One','/guides/hermes-day-one')} · ${link('News and articles','/news')} · ${link('Jack Blair','/authors/jack')}`;
 else if(path==='/news') body=`# News and articles\n\nOriginal Loki’s Lab articles. External news remains attributed to its original source on the full news page.\n\n${articleList().map(a=>`## ${link(a.title,a.href)}\n\n${a.date} · ${a.author}\n\n${a.excerpt}`).join('\n\n')}`;
 else if(path==='/radar') body=`# Radar: people to follow\n\nFollow builders and explore their published work. Discovery leads remain candidates for review.\n\n${catalog.people.map(p=>`## ${link(p.name,personPath(p.id))}\n\n${p.topic}\n\n${p.why}\n\n${p.caveat}`).join('\n\n')}\n\n${link('Project directory','/radar/projects')}`;
 else if(path==='/radar/projects') body=`# Projects to follow\n\nTools, publications and experiment collections. Activity is scoped to the project’s public repository or website. Last source scan: ${feed.scanned_at}.\n\n${projects.map(p=>`## ${link(p.name,projectPath(p.id))}\n\n${p.kind} · ${catalog.people.find(x=>x.id===p.person_id)?.name}\n\n${p.summary}\n\n${sources(p.spaces)}\n\n${p.context}`).join('\n\n')}`;
 else if(path.startsWith('/radar/projects/')) {
   const p=projects.find(p=>projectPath(p.id)===path);if(!p)return;
   const updates=projectUpdates(p);
   body=`# ${p.name}\n\n${p.kind} · ${link(catalog.people.find(x=>x.id===p.person_id)!.name,personPath(p.person_id))}\n\n${p.summary}\n\n## Public project spaces\n\n${sources(p.spaces)}\n\n${p.context}\n\n## Recent project activity\n\nLast source scan: ${feed.scanned_at}.\n\n${updates.length?updates.map(u=>`### ${link(u.title,u.url)}\n\n${u.source} · ${u.event_date || `First observed ${u.observed_at}`}\n\n${u.summary}`).join('\n\n'):'No recent activity captured for this project. Check the public project links for its full history.'}`;
 }
 else if(path.startsWith('/radar/people/')) {
   const p=catalog.people.find(p=>personPath(p.id)===path);if(!p)return;
   body=`# ${p.name}\n\n${p.category} · ${p.topic}\n\n${p.why}\n\n## Public profiles\n\n${sources(p.links.map(l=>({name:l.label,url:l.url})))}\n\n## Projects and published work\n\n${projects.filter(x=>x.person_id===p.id).map(x=>`- ${link(x.name,projectPath(x.id))}`).join('\n')}\n\n## Sources and context\n\n${p.evidence.map(e=>`- ${link(e.summary,e.url)} — checked ${e.checked_at}`).join('\n')}\n\n${p.caveat}`;
 }
 else if(path.startsWith('/articles/')) {
   const slug=path.slice('/articles/'.length);const a=articleList().find(a=>a.slug===slug.toLowerCase());const short=/^ll-\d+$/i.test(slug);
   if(!a && !short) return;
   if(!a && articleList().filter(a=>a.slug.startsWith(slug.toLowerCase()+'-')).length!==1) return;
   const {fm,body:article,canonicalSlug}=readArticle(slug);
   body=`# ${fm.title}\n\n${fm.date} · ${fm.authorName}\n\n${fm.dek}\n\nCanonical page: ${siteURL}/articles/${canonicalSlug}\n\n${article.trim()}`;
 }
 else if(path==='/authors/jack') body=`# Jack Blair\n\nWriter and tester at Loki’s Lab. His work focuses on measuring local artificial intelligence models on real computers, considering capability, hardware constraints, speed, accuracy and growing context. The testing approach emphasizes reproducibility, transparency and the limits of the evidence.\n\n${link('Articles and news','/news')} · ${link('Benchmark results','/test/results')}`;
 return body ? body + tail : undefined;
}
