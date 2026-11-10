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


if __name__ == '__main__':
    themes = published_themes(root)
    dist = root / 'dist'
    shutil.rmtree(dist, ignore_errors=True)
    shutil.copytree(root / 'public', dist)

    editor = dist / 'editor'
    editor.mkdir()
    for name in (
        'index.html', 'editor.css', 'editor.js', 'schemes.js', 'artwork.js',
        'theme-preview.svg', 'floating.js', 'inspector.js', 'changes.html',
        'changes.css', 'changes.js', 'palette.html', 'palette.css', 'palette.js',
        'tokens.json', 'primitives.json', 'contrast.json',
    ):
        (dist / name).rename(editor / name)

    for name in ('index.html', 'showcase.css', 'showcase.js'):
        shutil.copyfile(root / 'showcase' / name, dist / name)
    (dist / 'themes.json').write_text(json.dumps(themes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    relativize_html(dist)
    relativize_html(editor)
    print('Built the theme showcase and /editor/ in dist/')
