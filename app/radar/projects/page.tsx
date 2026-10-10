import Link from 'next/link';
import Projects from '@/components/radar/Projects';
import '@/components/radar/radar.css';
import StructuredData from '@/components/seo/StructuredData';
import {catalog, projects, feed, projectPath} from '@/lib/radarContent';
import {pageMetadata, siteURL} from '@/lib/seo';
export const metadata = pageMetadata('/radar/projects', "Projects to follow — Loki's Lab Radar", 'Explore tools, publications and experiments with source-linked GitHub activity and public website updates, including Stadium Sound, CoreVideo and CLOUDflex Broadcast.');
export default function ProjectDirectory() {
  return <main className="radar">
    <p><Link href="/radar">← Radar</Link></p>
    <h1 className="font-serif text-5xl my-6">Projects to follow.</h1>
    <StructuredData data={{'@context':'https://schema.org','@type':'CollectionPage',name:'Projects to follow',url:`${siteURL}/radar/projects`,mainEntity:{'@type':'ItemList',itemListElement:projects.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:`${siteURL}${projectPath(p.id)}`}))}}} />
    <Projects projects={projects} people={catalog.people} updates={feed.updates} />
  </main>;
}
