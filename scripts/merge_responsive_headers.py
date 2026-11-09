"""Merge archived mobile header content into shared pages without resize JS."""
from pathlib import Path
import email,hashlib,mimetypes,re,copy
from bs4 import BeautifulSoup
from localize_links import localize
root=Path(__file__).resolve().parent.parent; out=root/'public'; mapping={}
for f in root.glob('*-mobile.mhtml'):
 parts=[p for p in email.message_from_bytes(f.read_bytes()).walk() if not p.is_multipart()]
 for p in parts[1:]:
  data=p.get_payload(decode=True) or b''; name=hashlib.sha256(data).hexdigest()[:20]+(mimetypes.guess_extension(p.get_content_type()) or '.bin');(out/'original'/name).write_bytes(data)
  for k in [p.get('Content-Location'), 'cid:'+p.get('Content-ID','').strip('<>')]:
   if k:mapping[k]='/original/'+name;mapping.setdefault(k.split('/-/')[0],'/original/'+name)
for name in ['feed','blog','post','popover-profile']:
 path=out/(name+'.html');s=BeautifulSoup(path.read_text(),'html.parser'); mobile=root/(name+'-mobile.mhtml')
 header=s.select_one('.header');slot=header.select_one('.header__distribution');slot.clear()
 if mobile.exists():
  m=email.message_from_bytes(mobile.read_bytes());p=next(p for p in m.walk() if p.get_content_type()=='text/html');ms=BeautifulSoup(p.get_payload(decode=True).decode(),'html.parser');dist=ms.select_one('.header__distribution .distribution')
 else:dist=header.select_one('.header__main-distribution')
 if dist:slot.append(copy.deepcopy(dist))
 for img in slot.select('img[src]'):
  img['src']=mapping.get(img['src']) or mapping.get(img['src'].split('/-/')[0]) or img['src']
 localize(slot)
 # keep desktop label text accessible while CSS changes tablet button to icon-only
 for button in header.select('.header__right a button'):
  if not button.select_one('.header__write-label'):
   for t in list(button.children):
    if isinstance(t,str) and t.strip():
     span=s.new_tag('span',attrs={'class':'header__write-label'});span.string=str(t);t.replace_with(span)
 path.write_text(str(s).replace('viewbox=','viewBox='))
