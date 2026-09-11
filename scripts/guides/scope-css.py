#!/usr/bin/env python3
"""Regenerate app/guides/hermes-day-one/guide.css from the guide package's
guide-theme.css, scoping every rule under .hermes-guide so it cannot leak into
the rest of the site. Site-chrome rules (html/body/header/footer/.brand/.site-nav)
are dropped because the site layout provides those. Run after editing
content/guides/hermes-day-one/source/guide-theme.css."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'content/guides/hermes-day-one/source/guide-theme.css'
OUT = ROOT / 'app/guides/hermes-day-one/guide.css'
SCOPE = '.hermes-guide'
DROP = ('@font-face', 'html', 'body', 'header', '.brand', '.site-nav', 'footer', '.skip', '*{', ':root')

def scope_selector(sel):
    sel = sel.strip()
    if not sel or sel.startswith(DROP):
        return None
    return f'{SCOPE} {sel}'

def scope_block(block):
    out = []
    for rule in re.finditer(r'([^{}]+)\{([^{}]*)\}', block):
        sels = [s for s in (scope_selector(x) for x in rule.group(1).split(',')) if s]
        if sels:
            out.append(','.join(sels) + '{' + rule.group(2) + '}')
    return '\n'.join(out)

css = SRC.read_text(encoding='utf-8')
parts, pos = [], 0
for m in re.finditer(r'@media[^{]+\{((?:[^{}]*\{[^{}]*\})*)\s*\}', css):
    parts.append(scope_block(css[pos:m.start()]))
    parts.append(m.group(0)[:m.group(0).index('{') + 1] + '\n' + scope_block(m.group(1)) + '\n}')
    pos = m.end()
parts.append(scope_block(css[pos:]))
body = '\n'.join(p for p in parts if p.strip())
# Site header is sticky at 64px; keep the OS bar and the TOC below it.
body = body.replace(f'{SCOPE} a{{color:var(--ink);', f'{SCOPE} main a{{color:var(--ink);text-decoration:underline;')
body = body.replace('position:sticky;top:0;z-index:2;flex-wrap:wrap', 'position:sticky;top:64px;z-index:20;flex-wrap:wrap')
body = body.replace(f'{SCOPE} aside{{position:sticky;top:105px;', f'{SCOPE} aside{{position:sticky;top:130px;')
OUT.write_text(
    'html{scroll-padding-top:130px}\n'
    '/* GENERATED from content/guides/hermes-day-one/source/guide-theme.css — edit that file and re-run scripts/guides/scope-css.py */\n'
    f'{SCOPE}{{--paper:#ece5d8;--ink:#17201f;--accent:#b74627;--line:#c8c0b3;--muted:#5b6560;--card:#f8f5ef;color:var(--ink);font-size:16px;line-height:1.7}}\n'
    f"{SCOPE} code,{SCOPE} pre{{font-family:var(--font-geist-mono),'Geist Mono',ui-monospace,monospace}}\n"
    + body + '\n', encoding='utf-8')
print('wrote', OUT)
