from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parent.parent
photos=sorted((ROOT/'public/placeholders').glob('photo*'));avatars=sorted((ROOT/'public/placeholders').glob('avatar*'))
for path in (ROOT/'public').glob('*.html'):
 if path.name in ['index.html','local.html']:continue
 s=BeautifulSoup(path.read_text(),'html.parser')
 for i,img in enumerate(s.select('img')):
  if (img.get('src') or '').startswith(('http:','https:','cid:')):
   files=avatars if 'avatar' in str(img.parent.get('class','')) or '/72x72/' in img.get('src','') else photos
   img['src']='/placeholders/'+files[i%len(files)].name
 for i,v in enumerate(s.select('video')):
  img=s.new_tag('img',src='/placeholders/'+photos[i%len(photos)].name);img['style']='width:100%;height:100%;object-fit:cover';v.replace_with(img)
 path.write_text(str(s))
