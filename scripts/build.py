import argparse
import json
import pathlib
import re
import shutil

from showcase_catalog import published_themes

root = pathlib.Path(__file__).resolve().parent.parent

# The same pages must work at a domain root and under a GitHub Pages project path.
root_url = re.compile(r"""(\s(?:href|xlink:href|src)=["'])/(?!/)""")


def relativize_html(directory):
    for page in directory.glob('*.html'):
        page.write_text(root_url.sub(r'\1./', page.read_text(encoding='utf-8')), encoding='utf-8')


def write_catalog(path, themes):
    path.write_text(json.dumps(themes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def build_showcase(output, themes, appearance_themes):
    public = root / 'public'
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir()
    page = (public / 'appearance.html').read_text(encoding='utf-8')
    page = page.replace('href="/local.html"', 'aria-disabled="true"')
    page = page.replace('href="/appearance.html"', 'href="./"')
    (output / 'index.html').write_text(page, encoding='utf-8')

    for name in ('appearance.css', 'appearance.js', 'theme-preview-dtf.svg', 'dtf-logo.svg',
                 'gaming.svg', 'cats.svg', 'premium.svg', 'pattern-gta.svg', 'games-pattern.svg',
                 'dtf-pattern.svg', 'movies.svg', 'kojima.svg', 'music.svg', 'legends.svg', 'theme-preview.svg'):
        shutil.copyfile(public / name, output / name)
    for name in ('original', 'placeholders'):
        shutil.copytree(public / name, output / name, ignore=shutil.ignore_patterns('*.html', '.DS_Store'))

    theme_ids = set(re.findall(r'data-appearance-theme="([^"]+)"', page))
    write_catalog(output / 'themes.json', [theme for theme in themes if theme['id'] in theme_ids])
    write_catalog(output / 'appearance-themes.json', appearance_themes)
    relativize_html(output)
    print(f'Built the theme showcase in {output.name}/')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pages', action='store_true', help='Write the showcase to dist-pages for GitHub Pages')
    args = parser.parse_args()
    themes = published_themes(root)
    appearance_themes = published_themes(root, 'appearance-themes.json')
    output = root / ('dist-pages' if args.pages else 'dist')
    build_showcase(output, themes, appearance_themes)
