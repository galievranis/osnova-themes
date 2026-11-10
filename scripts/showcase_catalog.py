"""Collect the ready-to-share theme catalog for the site build."""
import json
import re


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def published_themes(root):
    source = root / 'showcase'
    public = root / 'public'
    contrast = read_json(public / 'contrast.json')
    defaults = {'classic': read_json(public / 'tokens.json'), 'contrast': contrast}
    grays = {
        **read_json(public / 'primitives.json'), **contrast['primitives'],
        '--classic-gray-90': '#DDDDDD', '--classic-gray-98': '#F7F7F7',
    }
    themes = []
    ids = set()
    for entry in read_json(source / 'themes.json'):
        key, name = entry['id'], entry['name']
        if not re.fullmatch(r'[a-z0-9-]+', key) or key in ids or not name.strip():
            raise ValueError(f'Invalid or duplicate published theme: {key!r}')
        ids.add(key)
        base = defaults[entry['source']] if 'source' in entry else {}
        overrides = {mode: entry[mode] for mode in ('light', 'dark') if mode in entry}
        if any(not isinstance(tokens, dict) for tokens in overrides.values()):
            raise ValueError(f'Invalid token overrides for {key}')
        modes = {mode: {**base.get(mode, {}), **overrides.get(mode, {})}
                 for mode in ('light', 'dark') if mode in base or mode in overrides}
        if not modes or any(not tokens for tokens in modes.values()):
            raise ValueError(f'Provide tokens for at least one mode of {key}')
        values = []
        for tokens in modes.values():
            for token, value in tokens.items():
                if (not re.fullmatch(r'--theme-[\w-]+', token)
                        or not isinstance(value, str) or re.search(r'[;{}<>]', value)):
                    raise ValueError(f'Invalid value for {token} in {key}')
                values.append(value)
        refs = set(re.findall(r'var\(\s*(--(?:classic|contrast)-gray-[\w-]+)', ' '.join(values)))
        missing = refs - grays.keys()
        if missing:
            raise ValueError(f'Missing gray definitions in {key}: {sorted(missing)}')
        themes.append({'id': key, 'name': name, 'group': entry.get('group', 'Другие темы'), 'modes': modes,
                       'grays': {gray: value for gray, value in grays.items() if gray in refs}})
    if not themes:
        raise ValueError('Select at least one theme to publish')
    return themes
