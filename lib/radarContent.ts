import catalog from '@/data/radar/catalog.json';
import projectData from '@/data/radar/projects.json';
import feed from '@/data/radar/feed.json';
import { matchesProject } from '@/lib/radarProjectActivity';
export {catalog, feed};
export const projects = projectData.projects;
export const personPath = (id: string) => `/radar/people/${id}`;
export const projectPath = (id: string) => `/radar/projects/${id}`;
export function projectUpdates(project: (typeof projects)[number]) {
  return feed.updates.filter(u => matchesProject(u.url, project.spaces)).sort((a,b)=>(b.event_date || b.observed_at).localeCompare(a.event_date || a.observed_at));
}
export function publicURL(value: string): string | undefined {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; }
}
export function displayDate(value: string) {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-07:00` : value).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric',timeZone:'America/Phoenix'});
}
