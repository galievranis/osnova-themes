import pathlib
import re
import shutil

root = pathlib.Path(__file__).resolve().parent.parent
dist = root / 'dist'
shutil.rmtree(dist, ignore_errors=True)
shutil.copytree(root / 'public', dist)

# The same pages must work at a domain root and under a GitHub Pages project path.
root_url = re.compile(r"""(\s(?:href|xlink:href|src)=["'])/(?!/)""")
for page in dist.glob('*.html'):
    page.write_text(root_url.sub(r'\1./', page.read_text(encoding='utf-8')), encoding='utf-8')

print('Built static platform in dist/')
