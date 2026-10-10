#!/usr/bin/env python3
"""Public-source Radar scan. Standard library only; no generated benchmark edits.

First scan establishes repository baselines. Subsequent pushes use compare links.
Discovery entries are unreviewed leads; source failure is recorded, never silence.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data' / 'radar'
NOW = dt.datetime.now(dt.timezone.utc)
STAMP = NOW.isoformat()
CUTOFF = (NOW - dt.timedelta(days=14)).isoformat()
TOKEN = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
if not TOKEN:
    try:
        TOKEN = subprocess.check_output(['gh', 'auth', 'token'], text=True, stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        TOKEN = None


def fetch(url, xml=False, raw_text=False):
    headers = {'User-Agent': 'LokisLab-Radar/1.0 (+https://lokislab.org/radar)', 'Accept': 'application/json'}
    if urllib.parse.urlparse(url).hostname == 'api.github.com':
        headers['X-GitHub-Api-Version'] = '2022-11-28'
        if TOKEN:
            headers['Authorization'] = f'Bearer {TOKEN}'
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=25) as response:
        raw = response.read(5_000_001)
    if len(raw) > 5_000_000:
        raise ValueError('Response exceeds size limit')
    if raw_text:
        return raw.decode('utf-8', errors='replace')
    return ET.fromstring(raw) if xml else json.loads(raw)


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'):
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript') and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def page_digest(html):
    parser = PageText()
    parser.feed(html)
    text = ' '.join(' '.join(parser.parts).split())
    if len(text) < 80:
        raise ValueError('Public page contained too little readable text')
    return hashlib.sha256(text.encode()).hexdigest()


def load(name, default):
    file = DATA / name
    return json.loads(file.read_text()) if file.exists() else default


def write(name, value):
    file = DATA / name
    temp = file.with_suffix('.tmp')
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    temp.replace(file)


def ident(*parts):
    return hashlib.sha256('|'.join(str(p) for p in parts).encode()).hexdigest()[:24]


def safe_url(value):
    return isinstance(value, str) and urllib.parse.urlparse(value).scheme in ('https', 'http')


def error_text(error):
    # Never include request headers or token values in public scan reports.
    if isinstance(error, urllib.error.HTTPError):
        return f'Public source returned HTTP status {error.code}.'
    return 'Source unavailable or returned an unreadable response.'


def person_repos(person):
    owners = set()
    projects = set()
    spaces = [space for project in load('projects.json', {'projects': []})['projects']
              if project['person_id'] == person['id'] for space in project['spaces']]
    for link in person['links'] + person['projects'] + person['evidence'] + spaces:
        parsed = urllib.parse.urlparse(link['url'])
        if parsed.hostname != 'github.com':
            continue
        parts = parsed.path.strip('/').split('/')
        if len(parts) == 1:
            owners.add(parts[0])
        elif len(parts) >= 2:
            projects.add('/'.join(parts[:2]))
    repos = {}
    failures = 0
    for owner in sorted(owners):
        try:
            # Most recently pushed repositories; explicit project links always checked.
            for repo in fetch(f'https://api.github.com/users/{owner}/repos?sort=pushed&per_page=30'):
                if not repo.get('fork'):
                    repos[repo['full_name']] = repo
        except (OSError, ValueError):
            failures += 1
    for project in sorted(projects):
        if project not in repos:
            try:
                repo = fetch(f'https://api.github.com/repos/{project}')
                repos[repo['full_name']] = repo
            except (OSError, ValueError):
                failures += 1
    return person, repos, failures


def scan():
    catalog = load('catalog.json', {})
    old_feed = load('feed.json', {'updates': [], 'candidates': []})
    state = load('scan-state.json', {'repositories': {}, 'feeds': {}})
    updates = {item['id']: item for item in old_feed['updates']}
    candidates = {item['id']: item for item in old_feed['candidates']}
    sources = []
    repo_count = failures = 0
    known = set()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for person, repos, errors in pool.map(person_repos, catalog['people']):
            failures += errors
            for full_name, repo in repos.items():
                known.add(repo['html_url'].lower().rstrip('/'))
                repo_count += 1
                previous = state['repositories'].get(full_name)
                current = {'pushed_at': repo['pushed_at'], 'person_id': person['id'], 'url': repo['html_url']}
                # Releases are separate public events; check the named projects and
                # recent active repositories, not hundreds of dormant repositories.
                active = repo.get('pushed_at') and repo['pushed_at'] >= CUTOFF
                if active and (not previous or previous['pushed_at'] != current['pushed_at']):
                    try:
                        commit = fetch(f'https://api.github.com/repos/{full_name}/commits?per_page=1')[0]
                        current['sha'] = commit['sha']
                        if previous and previous.get('sha') and previous['sha'] != current['sha']:
                            url = f"{repo['html_url']}/compare/{previous['sha']}...{current['sha']}"
                            item = {'id': ident(full_name, current['sha']), 'person_id': person['id'], 'name': person['name'], 'title': f'{full_name}: repository changed', 'url': url, 'source': 'GitHub', 'event_date': commit['commit']['committer']['date'], 'observed_at': STAMP, 'summary': 'New repository activity since the previous scan. Review the comparison to assess what changed.'}
                            updates.setdefault(item['id'], item)
                        elif not previous or not previous.get('sha'):
                            item = {'id': ident(full_name, current['sha'], 'baseline'), 'person_id': person['id'], 'name': person['name'], 'title': f'{full_name}: recent activity at first scan', 'url': commit['html_url'], 'source': 'GitHub · baseline', 'event_date': commit['commit']['committer']['date'], 'observed_at': STAMP, 'summary': 'Recent public commit observed while establishing the monitoring baseline. This is not a newly detected change.'}
                            updates.setdefault(item['id'], item)
                    except (OSError, ValueError, KeyError, IndexError):
                        failures += 1
                        # Preserve prior SHA so a failed request does not swallow a change.
                        continue
                elif previous and previous.get('sha'):
                    current['sha'] = previous['sha']
                if active:
                    try:
                        releases = fetch(f'https://api.github.com/repos/{full_name}/releases?per_page=3')
                        for release in releases:
                            if release.get('draft') or not release.get('published_at') or release['published_at'] < CUTOFF:
                                continue
                            item = {'id': ident(full_name, release['id']), 'person_id': person['id'], 'name': person['name'], 'title': f"{full_name}: {release['name'] or release['tag_name']}", 'url': release['html_url'], 'source': 'GitHub · release', 'event_date': release['published_at'], 'observed_at': STAMP, 'summary': 'Published release from the project owner. Release notes describe the changes; capabilities have not been independently tested.'}
                            updates.setdefault(item['id'], item)
                    except (OSError, ValueError, KeyError):
                        failures += 1
                state['repositories'][full_name] = current
    sources.append({'name': 'GitHub · catalog', 'status': 'partial' if failures else 'ok', 'detail': f'{repo_count} repository checks across {len(catalog["people"])} profiles; {failures} requests unavailable. Public repositories only; recent owner repositories plus explicitly linked projects.'})

    config = load('sources.json', {})
    for source in config.get('watched_pages', []):
        try:
            digest = page_digest(fetch(source['url'], raw_text=True))
            prior = state.setdefault('pages', {}).get(source['url'])
            if prior and prior['digest'] != digest:
                item = {'id': ident(source['url'], digest), 'person_id': source['person_id'], 'name': source['name'], 'title': f'{source["name"]}: public page text changed', 'url': source['url'], 'source': 'Product website', 'event_date': None, 'observed_at': STAMP, 'summary': 'Readable page text changed since the previous scan. Inspect the live page; navigation or other routine edits may explain the change.'}
                updates.setdefault(item['id'], item)
            state['pages'][source['url']] = {'digest': digest, 'checked_at': STAMP}
            sources.append({'name': source['name'], 'status': 'ok', 'detail': 'Public page text checked for changes; first check establishes a baseline. Client-rendered or signed-in content is outside this check.'})
        except (OSError, ValueError) as error:
            sources.append({'name': source['name'], 'status': 'unavailable', 'detail': error_text(error)})
    for source in config['creator_feeds']:
        count = 0
        try:
            root = fetch(source['url'], xml=True)
            entries = root.findall('.//item') or root.findall('{http://www.w3.org/2005/Atom}entry')
            for entry in entries[:10]:
                title = entry.findtext('title') or entry.findtext('{http://www.w3.org/2005/Atom}title') or 'Creator update'
                link = entry.findtext('link')
                if not link:
                    node = entry.find('{http://www.w3.org/2005/Atom}link')
                    link = node.get('href') if node is not None else None
                if not safe_url(link):
                    continue
                raw_date = entry.findtext('pubDate') or entry.findtext('{http://www.w3.org/2005/Atom}published') or entry.findtext('{http://www.w3.org/2005/Atom}updated')
                event_date = None
                if raw_date:
                    try:
                        event_date = (parsedate_to_datetime(raw_date) if ',' in raw_date else dt.datetime.fromisoformat(raw_date.replace('Z', '+00:00'))).isoformat()
                    except ValueError:
                        pass
                if event_date and event_date < CUTOFF:
                    continue
                item = {'id': ident(source['name'], link), 'person_id': source['person_id'], 'name': source['name'], 'title': title, 'url': link, 'source': 'Creator feed', 'event_date': event_date, 'observed_at': STAMP, 'summary': 'New entry from the creator’s public feed. Commentary and product claims remain attributed to the author.'}
                updates.setdefault(item['id'], item)
                count += 1
            sources.append({'name': source['name'], 'status': 'ok', 'detail': f'{count} recent feed entries checked.'})
        except (OSError, ValueError, ET.ParseError) as error:
            sources.append({'name': source['name'], 'status': 'unavailable', 'detail': error_text(error)})

    since = (NOW - dt.timedelta(days=7)).date().isoformat()
    try:
        query = urllib.parse.quote(f'created:>{since} stars:>=3 archived:false fork:false topic:artificial-intelligence')
        repos = fetch(f'https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=15')['items']
        for repo in repos:
            if repo['html_url'].lower().rstrip('/') in known:
                continue
            item = {'id': ident(repo['html_url']), 'name': repo['owner']['login'], 'title': repo['full_name'], 'url': repo['html_url'], 'source': 'GitHub · discovery', 'event_date': repo['created_at'], 'observed_at': STAMP, 'summary': f"Unreviewed new repository tagged artificial intelligence; {repo['stargazers_count']} stars at scan. {repo.get('description') or 'No description supplied.'}"}
            candidates.setdefault(item['id'], item)
        sources.append({'name': 'GitHub · discovery', 'status': 'ok', 'detail': f'{len(repos)} recent project leads checked; identity and significance require review.'})
    except (OSError, ValueError) as error:
        sources.append({'name': 'GitHub · discovery', 'status': 'unavailable', 'detail': error_text(error)})
    try:
        timestamp = int((NOW - dt.timedelta(days=7)).timestamp())
        hits = fetch(f'https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=created_at_i>{timestamp},points>2&hitsPerPage=100')['hits']
        count = 0
        for hit in hits:
            title = hit.get('title') or ''
            if not re.search(r'\b(ai|llm|agent|model|diffusion|inference|artificial intelligence)\b', title, re.I):
                continue
            item = {'id': ident('hn', hit['objectID']), 'name': hit['author'], 'title': title, 'url': f'https://news.ycombinator.com/item?id={hit["objectID"]}', 'source': 'Hacker News · discovery', 'event_date': hit['created_at'], 'observed_at': STAMP, 'summary': 'Unreviewed creator discussion matching an artificial intelligence keyword. Verify the author, project and claims before adding a person.'}
            candidates.setdefault(item['id'], item)
            count += 1
        sources.append({'name': 'Hacker News', 'status': 'ok', 'detail': f'{count} matching creator discussions in the last seven days; up to 100 recent submissions checked.'})
    except (OSError, ValueError) as error:
        sources.append({'name': 'Hacker News', 'status': 'unavailable', 'detail': error_text(error)})
    for subreddit in config['reddit_communities']:
        try:
            root = fetch(f'https://www.reddit.com/r/{subreddit}/new/.rss?limit=30', xml=True)
            count = 0
            ns = {'a': 'http://www.w3.org/2005/Atom'}
            for entry in root.findall('a:entry', ns):
                title = entry.findtext('a:title', '', ns)
                if not re.search(r'\b(built|made|released|open.source|my project|launch|introducing)\b', title, re.I):
                    continue
                link = entry.find('a:link', ns)
                if link is None or not safe_url(link.get('href')):
                    continue
                url = link.get('href')
                item = {'id': ident(url), 'name': entry.findtext('a:author/a:name', 'Reddit author', ns), 'title': title, 'url': url, 'source': f'Reddit · {subreddit}', 'event_date': entry.findtext('a:published', None, ns), 'observed_at': STAMP, 'summary': 'Unreviewed community lead. A public forum handle does not establish a real-world identity or validated capability.'}
                candidates.setdefault(item['id'], item)
                count += 1
            sources.append({'name': f'Reddit · {subreddit}', 'status': 'ok', 'detail': f'{count} project leads from the latest 30 posts.'})
        except (OSError, ValueError, ET.ParseError) as error:
            sources.append({'name': f'Reddit · {subreddit}', 'status': 'unavailable', 'detail': error_text(error)})

    new_updates = len(set(updates) - {x['id'] for x in old_feed['updates']})
    new_candidates = len(set(candidates) - {x['id'] for x in old_feed['candidates']})
    # Do not resurrect pruned entries, or repeatedly notify about the same discovery.
    seen = set(state.get('seen_ids', []))
    new_updates = len(set(updates) - seen) if seen else new_updates
    new_candidates = len(set(candidates) - seen) if seen else new_candidates
    state['seen_ids'] = sorted(seen | set(updates) | set(candidates))[-10000:]
    feed = {'schema_version': 1, 'scanned_at': STAMP, 'sources': sources, 'updates': sorted(updates.values(), key=lambda x:x['event_date'] or x['observed_at'], reverse=True)[:100], 'candidates': sorted(candidates.values(), key=lambda x:x['event_date'] or x['observed_at'], reverse=True)[:40]}
    write('feed.json', feed)
    write('scan-state.json', state)
    result = {'scanned_at': STAMP, 'new_updates': new_updates, 'new_candidates': new_candidates, 'sources_unavailable': [s['name'] for s in sources if s['status'] != 'ok']}
    print(json.dumps(result))
    if not any(s['status'] == 'ok' for s in sources):
        raise SystemExit('All sources unavailable; scan failed.')


if __name__ == '__main__':
    argparse.ArgumentParser(description=__doc__).parse_args()
    scan()
