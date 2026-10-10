#!/usr/bin/env python3
"""Verify public crawl controls and initial-response content; no browser rendering."""
import argparse
import concurrent.futures
import json
import urllib.request
import urllib.error
import urllib.robotparser
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonical = []; self.robots = []; self.structured = []; self.json = None; self.headings = []; self.heading = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonical.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name') == 'robots': self.robots.append(attrs.get('content',''))
        if tag == 'script' and attrs.get('type') == 'application/ld+json': self.json = ''
        if tag in ('h1','h2','h3'): self.heading = True
    def handle_data(self, data):
        if self.json is not None: self.json += data
        if self.heading: self.headings.append(data)
    def handle_endtag(self, tag):
        if tag == 'script' and self.json is not None: self.structured.append(json.loads(self.json)); self.json = None
        if tag in ('h1','h2','h3'): self.heading = False

def fetch(base, path, accept='text/html', agent='LokisLab-CrawlCheck/1.0'):
    try:
        r=urllib.request.urlopen(urllib.request.Request(base+path,headers={'Accept':accept,'User-Agent':agent}),timeout=30)
    except urllib.error.HTTPError as e: r=e
    return r.code,{k.lower():v for k,v in r.headers.items()},r.read().decode('utf-8',errors='replace')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:8765');args=parser.parse_args();base=args.base.rstrip('/')
    status,_,text=fetch(base,'/robots.txt');assert status==200
    robots=urllib.robotparser.RobotFileParser();robots.parse(text.splitlines())
    for agent in ['Googlebot','bingbot','OAI-SearchBot','PerplexityBot','Claude-SearchBot']:
        assert robots.can_fetch(agent,'https://lokislab.org/radar/projects/stadium-sound'),agent
        assert not robots.can_fetch(agent,'https://lokislab.org/api/publish'),agent
        assert not robots.can_fetch(agent,'https://lokislab.org/publish'),agent
    status,_,xml=fetch(base,'/sitemap.xml');assert status==200
    urls=[e.text for e in ET.fromstring(xml).findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    assert len(urls)==len(set(urls))
    assert all(u.startswith('https://lokislab.org/') and '/api/' not in u and '/publish' not in u for u in urls)
    assert 'https://lokislab.org/radar/projects/stadium-sound' in urls
    def check_page(url):
        path=url.removeprefix('https://lokislab.org');status,headers,html=fetch(base,path)
        assert status==200,(path,status)
        p=Page();p.feed(html)
        assert [u.rstrip('/') for u in p.canonical]==[url.rstrip('/')],(path,p.canonical)
        assert p.structured,(path,'No structured data')
        assert not any('noindex' in r for r in p.robots),path
        assert p.headings,(path,'No initial HTML headings')
        return path
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: pages=list(pool.map(check_page,urls))
    status,_,html=fetch(base,'/publish');p=Page();p.feed(html);assert status==200 and any('noindex' in r for r in p.robots)
    for path in ['/authors/not-a-real-author','/radar/people/not-a-real-person','/radar/projects/not-a-real-project','/articles/not-a-real-article']:
        assert fetch(base,path)[0]==404,path
    status,headers,body=fetch(base,'/','text/markdown');assert status==200 and headers.get('content-type','').startswith('text/markdown') and 'accept' in headers.get('vary','').lower() and '# Loki' in body
    status,headers,body=fetch(base,'/__crawl-check-missing','text/markdown');assert status==404 and headers.get('content-type','').startswith('text/markdown') and '/sitemap.xml' in body
    status,headers,body=fetch(base,'/radar/projects/stadium-sound','text/markdown');assert status==200 and '# Stadium Sound' in body and 'chrissabato/stadium-sound' in body and 'Recent project activity' in body
    status,_,body=fetch(base,'/llms.txt');assert status==200 and 'When to use this site' in body and '/radar/projects/stadium-sound' in body
    status,headers,body=fetch(base,'/opengraph-image');assert status==200 and headers.get('content-type','').startswith('image/')
    for agent in ['OAI-SearchBot','PerplexityBot','Googlebot']:
        status,_,html=fetch(base,'/radar/projects/stadium-sound',agent=agent);assert status==200 and 'Stadium Sound' in html,agent
    status,_,html=fetch(base,'/articles/ll-011');p=Page();p.feed(html);assert status==200 and p.canonical==['https://lokislab.org/articles/ll-011-launch-note']
    print(json.dumps({'base':base,'sitemap_pages_checked':len(pages),'checks':'passed: canonical pages, structured data, initial HTML headings, crawler policy and access, Markdown negotiation and 404, editor noindex, article aliases, source index and social image'}))
if __name__=='__main__':main()
