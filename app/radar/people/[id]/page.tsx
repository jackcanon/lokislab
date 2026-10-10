import Link from 'next/link';
import {notFound} from 'next/navigation';
import '@/components/radar/radar.css';
import StructuredData from '@/components/seo/StructuredData';
import {catalog, projects, personPath, projectPath, publicURL, displayDate} from '@/lib/radarContent';
import {pageMetadata, siteURL} from '@/lib/seo';
export function generateStaticParams() {return catalog.people.map(p=>({id:p.id}));}
function getPerson(id: string) {const p=catalog.people.find(p=>p.id===id);if (!p) notFound();return p;}
export async function generateMetadata({params}:{params:Promise<{id:string}>}) {const p=getPerson((await params).id);return pageMetadata(personPath(p.id),`${p.name} — Loki's Lab Radar`,p.why);}
export default async function PersonPage({params}:{params:Promise<{id:string}>}) {
 const p=getPerson((await params).id);const work=projects.filter(x=>x.person_id===p.id);
 return <main className="radar">
  <p><Link href="/radar">← People in Radar</Link></p>
  <StructuredData data={{'@context':'https://schema.org','@type':'Person',name:p.name,description:p.why,url:`${siteURL}${personPath(p.id)}`,sameAs:p.links.map(l=>publicURL(l.url)).filter(Boolean)}} />
  <p className="radar-eyebrow mt-8">{p.category} · {p.topic}</p><h1 className="font-serif text-5xl my-6">{p.name}</h1><p className="max-w-3xl text-lg leading-8">{p.why}</p>
  <h2 className="font-serif text-3xl mt-10 mb-4">Public profiles</h2><div className="radar-project-links">{p.links.map(l=>publicURL(l.url)?<a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>:null)}</div>
  <h2 className="font-serif text-3xl mt-10 mb-4">Projects and published work</h2>{work.length ? <ul className="space-y-3">{work.map(w=><li key={w.id}><Link className="text-[#b74627] underline" href={projectPath(w.id)}>{w.name}</Link> · {w.kind}</li>)}</ul> : <ul>{p.projects.map(w=><li key={w.url}>{publicURL(w.url)&&<a href={w.url} target="_blank" rel="noreferrer">{w.name} ↗</a>}</li>)}</ul>}
  <h2 className="font-serif text-3xl mt-10 mb-4">Sources and context</h2><ul className="radar-project-activity max-w-3xl">{p.evidence.map(e=><li key={e.url}>{publicURL(e.url)&&<a href={e.url} target="_blank" rel="noreferrer">{e.summary} ↗</a>}<p>Source checked <time dateTime={e.checked_at}>{displayDate(e.checked_at)}</time>.</p></li>)}</ul><p className="max-w-3xl my-6">{p.caveat}</p>
 </main>;
}
