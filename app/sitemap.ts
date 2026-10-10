import type { MetadataRoute } from 'next';
import { articleList } from '@/lib/articleList';
import { HERMES_OS } from '@/lib/guides';
import { siteURL, isoDate } from '@/lib/seo';
import catalog from '@/data/radar/catalog.json';
import projects from '@/data/radar/projects.json';
import feed from '@/data/radar/feed.json';
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = ['/', '/about', '/news', '/radar', '/radar/projects', '/test', '/test/results', '/authors/jack', '/guides/hermes-day-one', ...HERMES_OS.map(o => `/guides/hermes-day-one/${o.slug}`)].map(path => ({url: `${siteURL}${path}`}));
  return [
    ...pages,
    ...articleList().map(a => ({url: `${siteURL}${a.href}`, lastModified: isoDate(a.publishedAt || a.date)})),
    ...catalog.people.map(p => ({url: `${siteURL}/radar/people/${p.id}`, lastModified: isoDate(catalog.researched_at)})),
    ...projects.projects.map(p => ({url: `${siteURL}/radar/projects/${p.id}`, lastModified: isoDate(feed.scanned_at)})),
  ];
}
