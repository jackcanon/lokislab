# Search and answer discovery

Main information pages also support `Accept: text/markdown`, with `Vary: Accept` and uncached negotiated responses to avoid serving Markdown to browsers. The homepage, articles, Radar directories, person and project pages, news archive, author page, About page and benchmark summaries have readable Markdown representations. Interactive test instructions and operating-system guides continue to serve their normal rendered pages. Unknown negotiated pages return a Markdown 404 with discovery links.

Public content is crawlable and available in the initial server-rendered response. Search engine optimization uses descriptive titles, canonical page addresses, social previews, ordinary internal links, Extensible Markup Language (XML) sitemap discovery and JavaScript Object Notation for Linked Data (JSON-LD) structured data matching visible content. Radar now exposes permanent person and project pages; crawler access does not depend on client-side tabs or profile dialogs. These pages rebuild from the same catalog and feed as the interactive views.

- `/robots.txt`: permits public paths, including search-specific OpenAI, Perplexity and Anthropic crawlers; excludes application endpoints and the publishing editor. The wildcard policy remains permissive for other crawlers, including training crawlers. No training opt-out was added or removed. Search access and training preferences are separate controls.
- `/sitemap.xml`: canonical public pages, original articles, guide lanes, curated people and projects. Excludes private leads, discovery candidates, application endpoints, publishing pages and external articles. Article dates come from published metadata; unknown modification dates are omitted.
- `/llms.txt`: optional generated navigation aid linking public sources. It is not a standardized guarantee of inclusion in an answer engine. Google does not require this file for its artificial intelligence search features.
- Structured descriptions: Organization and WebSite globally; Article with visible byline and publication date; Person and CreativeWork for public Radar entries; CollectionPage and ItemList for the project directory. No invented reviews, ratings, affiliations or tested capabilities.
- `/publish`: noindex and excluded from crawler policy. This is indexing hygiene, not access control. Existing publish authentication is unchanged.
- Canonical URLs collapse article aliases to one full filename slug. Unknown articles, people, projects and authors return not-found status. Permanent Radar pages show attribution, source dates and limitations.

Generated benchmark data and the article publishing pipeline remain unchanged. Daily Radar data-only pushes rebuild the pages, sitemap and text index automatically. Structured data is serialized with escaped less-than characters so source text cannot terminate its script element.

Verify with `node tests/seo/seo.mjs`, `npm run lint` and `npm run build`, then `python3 scripts/check-crawl.py --base https://lokislab.org`. The checker tests response status, initial HTML content, page-specific canonical links, JSON-LD validity, sitemap destinations, noindex for the editor and crawler-agent access. A request using a crawler name does not verify its actual IP access or prove a real crawler has visited.

Search Console/Bing Webmaster Tools property ownership and indexing reports are separate operational checks. No ownership token is invented and no sitemap submission or successful indexing is claimed without a verified property. Ranking, indexing and answer citations are decided by the search providers, not by these files. Review actual crawl logs and search performance to measure outcomes.

Primary guidance checked October 10, 2026:
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.openai.com/api/docs/bots
- https://docs.perplexity.ai/docs/resources/perplexity-crawlers
