from pathlib import Path
root=Path(__file__).resolve().parent.parent
import runpy
runpy.run_path(str(root/'scripts/merge_responsive_headers.py'))
s=(root/'public/feed.html').read_text()
for name in ['desktop.html','mobile.html']:(root/'public'/name).write_text(s)
(root/'index.html').write_text(s)
