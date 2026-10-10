"""Regression checks for meaningful monitoring failures, without network access."""
import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import scan


class ScannerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.patch = patch.object(scan, 'DATA', Path(self.temp.name))
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.person = {'id': 'person', 'name': 'Person', 'links': [], 'projects': [], 'evidence': []}
        scan.write('catalog.json', {'people': [self.person]})
        scan.write('sources.json', {'creator_feeds': [], 'reddit_communities': []})
        self.repo = {'pushed_at': scan.STAMP, 'full_name': 'person/tool', 'html_url': 'https://github.com/person/tool'}
        self.commit = {'sha': 'new', 'html_url': 'https://github.com/person/tool/commit/new', 'commit': {'committer': {'date': scan.STAMP}}}
        self.releases = []

    def fetch(self, url, xml=False):
        if '/commits?' in url:
            return [self.commit]
        if '/releases?' in url:
            return self.releases
        if '/search/repositories?' in url:
            return {'items': []}
        if 'hn.algolia.com' in url:
            return {'hits': []}
        raise AssertionError(url)

    def run_scan(self, fetch=None):
        with patch.object(scan, 'person_repos', return_value=(self.person, {'person/tool': self.repo}, 0)), patch.object(scan, 'fetch', side_effect=fetch or self.fetch), contextlib.redirect_stdout(io.StringIO()) as output:
            scan.scan()
        return scan.load('feed.json', {}), output.getvalue()

    def test_project_spaces_are_checked_without_owner_profile(self):
        scan.write('projects.json', {'projects': [{'person_id': 'person', 'spaces': [{'url': 'https://github.com/person/tool'}]}]})
        with patch.object(scan, 'fetch', return_value=self.repo) as fetch:
            _, repos, failures = scan.person_repos(self.person)
        fetch.assert_called_once_with('https://api.github.com/repos/person/tool')
        self.assertIn('person/tool', repos)
        self.assertEqual(failures, 0)

    def test_baseline_is_labeled_and_repeat_deduplicates(self):
        feed, _ = self.run_scan()
        self.assertEqual(feed['updates'][0]['source'], 'GitHub · baseline')
        second, result = self.run_scan()
        self.assertEqual(len(second['updates']), 1)
        self.assertIn('"new_updates": 0', result)

    def test_changed_head_links_exact_comparison(self):
        scan.write('scan-state.json', {'repositories': {'person/tool': {'pushed_at': '2020-01-01', 'sha': 'old'}}, 'feeds': {}})
        feed, _ = self.run_scan()
        self.assertEqual(feed['updates'][0]['url'], 'https://github.com/person/tool/compare/old...new')

    def test_release_detected_even_when_push_timestamp_unchanged(self):
        self.run_scan()
        self.releases = [{'id': 123, 'name': 'Version one', 'tag_name': 'v1', 'published_at': scan.STAMP, 'html_url': 'https://github.com/person/tool/releases/tag/v1'}]
        feed, _ = self.run_scan()
        self.assertTrue(any(x['source'] == 'GitHub · release' for x in feed['updates']))

    def test_failed_commit_preserves_previous_state_for_retry(self):
        prior = {'repositories': {'person/tool': {'pushed_at': '2020-01-01', 'sha': 'old'}}, 'feeds': {}}
        scan.write('scan-state.json', prior)
        def fail(url, xml=False):
            if '/commits?' in url:
                raise OSError('unavailable')
            return self.fetch(url, xml)
        feed, _ = self.run_scan(fail)
        self.assertEqual(scan.load('scan-state.json', {})['repositories'], prior['repositories'])
        self.assertEqual(feed['sources'][0]['status'], 'partial')

    def test_page_hash_ignores_scripts_and_whitespace(self):
        text = 'Public product information ' * 10
        first = scan.page_digest(f'<h1>{text}</h1><script>random123</script>')
        second = scan.page_digest(f'<h1>  {text} </h1><script>changed456</script>')
        self.assertEqual(first, second)
        self.assertNotEqual(first, scan.page_digest(f'<h1>{text} New release</h1>'))


if __name__ == '__main__':
    unittest.main()
