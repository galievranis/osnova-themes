"""Import classic and contrast tokens from a compiled CSS or browser MHTML snapshot."""
import argparse
import email
import json
import re
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / 'public'


def declarations(css, prefix):
    pattern = rf'(--{prefix}[\w-]+)\s*:\s*([^;{{}}]+)'
    return {key: value.strip() for key, value in re.findall(pattern, css)}


def extract(css, theme):
    selectors = (
        ':root' if theme == 'classic' else ':root[data-theme="contrast"]',
        ':root[data-color-mode="dark"]' if theme == 'classic'
        else ':root[data-theme="contrast"][data-color-mode="dark"]',
    )
    rules = re.findall(r'([^{}]+)\{([^{}]*--theme-color-background\s*:[^{}]*)\}', css)

    def tokens(selector):
        matches = [body for header, body in rules
                   if selector in [item.strip() for item in header.split(',')]
                   and f'[data-theme-preview="{theme}"]' in header]
        if len(matches) != 1:
            raise ValueError(f'Expected one {theme} palette for {selector}')
        return declarations(matches[0], 'theme-')

    light = tokens(selectors[0])
    dark = {**light, **tokens(selectors[1])}
    grays = declarations(css, f'{theme}-gray-')
    references = set(re.findall(rf'var\(\s*(--{theme}-gray-[\w-]+)', ' '.join([*light.values(), *dark.values()])))
    if not grays or references - grays.keys():
        raise ValueError(f'Missing {theme} gray definitions: {sorted(references - grays.keys())}')
    return {'light': light, 'dark': dark}, grays


def read_css(path):
    if path.suffix.lower() != '.mhtml':
        return path.read_text(encoding='utf-8')
    return '\n'.join(
        (part.get_payload(decode=True) or b'').decode('utf-8')
        for part in email.message_from_bytes(path.read_bytes()).walk()
        if part.get_content_type() == 'text/css'
    )


def write_json(name, data):
    (PUBLIC / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    css = read_css(parser.parse_args().snapshot)
    classic, grays = extract(css, 'classic')
    contrast, contrast_grays = extract(css, 'contrast')
    write_json('tokens.json', classic)
    write_json('primitives.json', grays)
    write_json('contrast.json', {**contrast, 'primitives': contrast_grays})


if __name__ == '__main__':
    main()
