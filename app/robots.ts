import type { MetadataRoute } from 'next';
import { siteURL } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  // The same public paths apply to general search and AI search crawlers.
  const disallow = ['/api/', '/publish'];
  return {
    rules: [
      {userAgent: '*', allow: '/', disallow},
      {userAgent: ['OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot'], allow: '/', disallow},
    ],
    sitemap: `${siteURL}/sitemap.xml`,
  };
}
