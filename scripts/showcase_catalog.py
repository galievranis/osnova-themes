"""Collect the ready-to-share theme catalog for the site build."""
import json
import re


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def theme_tints(mode):
    dark = mode == 'dark'

    def mix(color, percent, surface='background-content'):
        return f'color-mix(in srgb, var(--theme-color-{color}) {percent}%, var(--theme-color-{surface}))'

    button_weights = {
        'secondary': 6,
        'minimal': 8,
        'minimal-hover': 12,
        'minimal-pressed': 16,
        'subtle': 5,
        'subtle-hover': 12,
        'subtle-pressed': 16,
    }
    towards = 'white' if dark else 'black'
    hover, pressed = (90, 83) if dark else (92, 86)
    tokens = {
        '--theme-color-text-secondary': mix('text-primary', 80),
        '--theme-color-text-tertiary': mix('text-primary', 70 if dark else 72),
        '--theme-color-accent-strong': f'color-mix(in srgb, var(--theme-color-accent) {hover}%, {towards})',
        '--theme-color-accent-strongest': f'color-mix(in srgb, var(--theme-color-accent) {pressed}%, {towards})',
        '--theme-color-accent-subtle': mix('accent', 28),
        '--theme-color-accent-subtlest': mix('accent', 12),
        '--theme-color-accent-tint': 'color-mix(in srgb, var(--theme-color-accent) 12%, transparent)',
        '--theme-color-field-icon': 'var(--theme-color-on-fill)',
        '--theme-color-button-transparent-hover': 'color-mix(in srgb, var(--theme-color-accent) 7%, transparent)',
        '--theme-color-button-transparent-pressed': 'color-mix(in srgb, var(--theme-color-accent) 11%, transparent)',
        '--theme-color-round-button-background': 'var(--theme-color-button-minimal)',
        **{f'--theme-color-button-{name}': mix('accent', weight) for name, weight in button_weights.items()},
    }
    if dark:
        tokens.update({
            '--theme-color-background-content': 'color-mix(in srgb, var(--theme-color-background) 92%, white)',
            '--theme-color-on-fill': 'var(--classic-gray-0)',
            '--theme-color-radio-outline': 'var(--theme-color-text-tertiary)',
        })
    return tokens


def published_themes(root, catalog='themes.json'):
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
    for entry in read_json(source / catalog):
        key, name = entry['id'], entry['name']
        if not re.fullmatch(r'[a-z0-9-]+', key) or key in ids or not name.strip():
            raise ValueError(f'Invalid or duplicate published theme: {key!r}')
        ids.add(key)
        source_name = entry.get('source')
        base = defaults[source_name] if source_name else {}
        overrides = {mode: entry[mode] for mode in ('light', 'dark') if mode in entry}
        if any(not isinstance(tokens, dict) for tokens in overrides.values()):
            raise ValueError(f'Invalid token overrides for {key}')
        modes = {mode: {**base.get(mode, {}),
                        **(theme_tints(mode) if source_name == 'appearance-classic' else {}),
                        **overrides.get(mode, {})}
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
        if catalog == 'appearance-themes.json' and key == 'classic':
            defaults['appearance-classic'] = modes
        themes.append({'id': key, 'name': name, 'group': entry.get('group', 'Другие темы'), 'modes': modes,
                       'grays': {gray: value for gray, value in grays.items() if gray in refs}})
    if not themes:
        raise ValueError('Select at least one theme to publish')
    return themes
