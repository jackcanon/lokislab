"use client";
import Link from "next/link";
import { useState } from "react";
import { matchesProject } from "@/lib/radarProjectActivity";
import VisualMark from "./VisualMark";
export type Project = { id: string; name: string; person_id: string; summary: string; kind: string; spaces: {name: string; url: string}[]; context: string };
type Update = {id: string; title: string; url: string; source: string; event_date: string | null; observed_at: string; summary: string};
export default function Projects({projects, people, updates}: {projects: Project[]; people: {id: string; name: string}[]; updates: Update[]}) {
  const [query, setQuery] = useState("");
  const [space, setSpace] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = projects.filter(p => (!space || p.spaces.some(s => s.name === space)) && [p.name, p.summary, people.find(x => x.id === p.person_id)?.name].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <section className="radar-projects">
    <h2>Projects to follow.</h2>
    <p>Explore the tools, publications and experiments taking shape across GitHub and other public spaces.</p>
    <div className="radar-toolbar">
      <label className="radar-search"><span>Search projects</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="A project or creator…" /></label>
      <label><span>Project space</span><select value={space} onChange={e=>setSpace(e.target.value)}><option value="">All spaces</option><option>GitHub</option><option>Website</option></select></label>
    </div>
    <p>{filtered.length} of {projects.length} projects</p>
    <div className="radar-grid">{filtered.map(p => {
      const activity = updates.filter(u => matchesProject(u.url, p.spaces)).sort((a,b)=>(b.event_date || b.observed_at).localeCompare(a.event_date || a.observed_at));
      return <article key={p.id} className="radar-card radar-project-card">
        <div className="radar-project-identity"><VisualMark id={p.id} name={p.name} type="project" /><span className="radar-identity-caption">{p.kind}</span></div>
        <span className="radar-eyebrow">{p.kind} · {people.find(x=>x.id===p.person_id)?.name}</span>
        <h3><Link href={`/radar/projects/${p.id}`}>{p.name}</Link></h3><p>{p.summary}</p>
        <div className="radar-project-links">{p.spaces.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>)}</div>
        <p className="radar-project-context">{p.context}</p>
        <h4>Recent project activity</h4>
        {activity.length === 0 ? <p>{p.spaces.length ? 'No recent activity captured for this project. Source coverage is shown under “What gets scanned?” above.' : 'Public source not yet connected.'}</p> : <ul className="radar-project-activity">{activity.slice(0, expanded===p.id ? activity.length : 2).map(u=><li key={u.id}><span>{u.source} · {new Date(u.event_date || u.observed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Phoenix'})}</span><a href={u.url} target="_blank" rel="noreferrer">{u.title} ↗</a><p>{u.summary}</p></li>)}</ul>}
        {activity.length > 2 && <button aria-expanded={expanded===p.id} onClick={()=>setExpanded(expanded===p.id?null:p.id)}>{expanded===p.id ? 'Show fewer updates' : `View all ${activity.length} updates`}</button>}
      </article>;
    })}</div>
    {filtered.length===0 && <p className="radar-empty">No projects match these filters.</p>}
  </section>;
}
