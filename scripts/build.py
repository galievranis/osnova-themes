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


def build_pages(themes, appearance_themes):
    public = root / 'public'
    output = root / 'dist-pages'
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir()
    page = (public / 'appearance.html').read_text(encoding='utf-8')
    page = page.replace('href="/local.html"', 'aria-disabled="true"')
    page = page.replace('href="/appearance.html"', 'href="./"')
    (output / 'index.html').write_text(page, encoding='utf-8')

    for name in ('appearance.css', 'appearance.js', 'theme-preview.svg', 'gaming.svg', 'cats.svg', 'premium.svg'):
        shutil.copyfile(public / name, output / name)
    for name in ('original', 'placeholders'):
        shutil.copytree(public / name, output / name, ignore=shutil.ignore_patterns('*.html', '.DS_Store'))

    theme_ids = set(re.findall(r'data-appearance-theme="([^"]+)"', page))
    write_catalog(output / 'themes.json', [theme for theme in themes if theme['id'] in theme_ids])
    write_catalog(output / 'appearance-themes.json', appearance_themes)
    relativize_html(output)
    print('Built the standalone appearance page in dist-pages/')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pages', action='store_true', help='Build only the appearance page for GitHub Pages')
    args = parser.parse_args()
    themes = published_themes(root)
    appearance_themes = published_themes(root, 'appearance-themes.json')
    if args.pages:
        build_pages(themes, appearance_themes)
        raise SystemExit(0)

    dist = root / 'dist'
    shutil.rmtree(dist, ignore_errors=True)
    shutil.copytree(root / 'public', dist)

    editor = dist / 'editor'
    editor.mkdir()
    for name in (
        'index.html', 'editor.css', 'editor.js', 'schemes.js', 'artwork.js',
        'floating.js', 'inspector.js', 'changes.html',
        'changes.css', 'changes.js', 'palette.html', 'palette.css', 'palette.js',
        'tokens.json', 'primitives.json', 'contrast.json',
    ):
        (dist / name).rename(editor / name)

    shutil.copyfile(dist / 'theme-preview.svg', editor / 'theme-preview.svg')

    for name in ('index.html', 'showcase.css', 'showcase.js'):
        shutil.copyfile(root / 'showcase' / name, dist / name)
    write_catalog(dist / 'themes.json', themes)
    write_catalog(dist / 'appearance-themes.json', appearance_themes)
    relativize_html(dist)
    relativize_html(editor)
    print('Built the theme showcase and /editor/ in dist/')
