import Link from 'next/link';
import {notFound} from 'next/navigation';
import '@/components/radar/radar.css';
import StructuredData from '@/components/seo/StructuredData';
import VisualMark from '@/components/radar/VisualMark';
import {catalog, projects, feed, projectPath, personPath, projectUpdates, publicURL, displayDate} from '@/lib/radarContent';
import {pageMetadata, siteURL} from '@/lib/seo';
export function generateStaticParams() { return projects.map(p=>({id:p.id})); }
function getProject(id: string) { const p=projects.find(p=>p.id===id); if (!p) notFound(); return p; }
export async function generateMetadata({params}:{params:Promise<{id:string}>}) {
  const p=getProject((await params).id); return pageMetadata(projectPath(p.id), `${p.name} — Loki's Lab Radar`, p.summary);
}
export default async function ProjectPage({params}:{params:Promise<{id:string}>}) {
  const p=getProject((await params).id); const person=catalog.people.find(x=>x.id===p.person_id)!; const updates=projectUpdates(p);
  return <main className="radar">
    <p><Link href="/radar">Radar</Link> / <Link href="/radar/projects">Projects</Link> / {p.name}</p>
    <StructuredData data={{'@context':'https://schema.org','@type':'CreativeWork',name:p.name,url:`${siteURL}${projectPath(p.id)}`,description:p.summary,genre:p.kind,about:{'@type':('entity_type' in person ? person.entity_type : 'Person'),name:person.name,url:`${siteURL}${personPath(person.id)}`},sameAs:p.spaces.map(s=>publicURL(s.url)).filter(Boolean)}} />
    <p className="radar-eyebrow mt-8">{p.kind} · <Link href={personPath(person.id)}>{person.name}</Link></p>
    <div className="radar-profile-identity"><VisualMark id={p.id} name={p.name} type="project" large /><h1 className="font-serif text-5xl my-6">{p.name}</h1></div><p className="max-w-3xl text-lg leading-8">{p.summary}</p>
    <h2 className="font-serif text-3xl mt-10 mb-4">Where to follow the work</h2>
    <div className="radar-project-links">{p.spaces.map(s=>publicURL(s.url)?<a key={s.url} href={s.url} rel="noreferrer" target="_blank">{s.name} ↗</a>:null)}</div>
    {p.description && <section className="radar-story" aria-label="How this project can be used">{p.description.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</section>}
    <p className="max-w-3xl my-6">{p.context}</p>
    <h2 className="font-serif text-3xl mt-10 mb-4">Recent project activity</h2>
    <p>Last source scan: <time dateTime={feed.scanned_at}>{displayDate(feed.scanned_at)}</time>. <Link href="/radar">Explore the latest signals in Radar.</Link></p>
    {updates.length ? <ul className="radar-project-activity max-w-3xl">{updates.map(u=><li key={u.id}><span>{u.source} · <time dateTime={u.event_date || u.observed_at}>{u.event_date?'':'First observed '}{displayDate(u.event_date || u.observed_at)}</time></span>{publicURL(u.url)&&<a href={u.url} target="_blank" rel="noreferrer">{u.title} ↗</a>}<p>{u.summary}</p></li>)}</ul> : <p className="my-6">No recent activity captured for this project. Check the public project links for its full history.</p>}
  </main>;
}
