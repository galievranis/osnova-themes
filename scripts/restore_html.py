"""Extract original MHTML resources; originals are never modified."""
import email, pathlib, hashlib, mimetypes, re, json
from bs4 import BeautifulSoup
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'public'; ASSETS=OUT/'original'; ASSETS.mkdir(parents=True,exist_ok=True)
archives={}; mapping={}
for f in ROOT.glob('*.mhtml'):
 parts=[p for p in email.message_from_bytes(f.read_bytes()).walk() if not p.is_multipart()]
 archives[f.stem]=parts
 for p in parts[1:]:
  data=p.get_payload(decode=True) or b''; ext=mimetypes.guess_extension(p.get_content_type()) or '.bin'
  name=hashlib.sha256(data).hexdigest()[:20]+ext
  for key in [p.get('Content-Location'), 'cid:'+p.get('Content-ID','').strip('<>')]:
   if key: mapping[key]='/original/'+name
  (ASSETS/name).write_bytes(data)
# Match resized variants of archived images and root-relative sprite URLs.
for key,value in list(mapping.items()):
 if 'leonardo.osnova.io/' in key:
  mapping.setdefault(key.split('/-/')[0],value)
 if '://' in key:
  from urllib.parse import urlparse
  mapping.setdefault(urlparse(key).path,value)
def resource(url):
 return mapping.get(url) or mapping.get(url.split('/-/')[0])
for path in ASSETS.glob('*.css'):
 s=path.read_text();s=re.sub(r'url\(["\']?([^\)"\']+)["\']?\)',lambda m:'url("'+mapping.get(m[1],'data:,')+'")',s);path.write_text(s)
# Theme defaults come from original compiled CSS, including the actual dark palette.
css='\n'.join(p.read_text() for p in ASSETS.glob('*.css'))
def tokens(body): return dict(re.findall(r'(--theme-[\w-]+)\s*:\s*([^;{}]+)',body))
light={};dark={}
for selector,body in re.findall(r'([^{}]+)\{([^{}]*)\}',css):
 if '--theme-color-background:' not in body: continue
 if 'dark' in selector or ':not(' in selector: dark.update(tokens(body))
 elif ':root' in selector: light.update(tokens(body))
primitives=dict(re.findall(r'(--classic-gray-[\w-]+)\s*:\s*([^;{}]+)',css))
(OUT/'primitives.json').write_text(json.dumps(primitives))
(OUT/'tokens.json').write_text(json.dumps({'light':light,'dark':{**light,**dark}},ensure_ascii=False,indent=2))
from localize_links import localize
for name,parts in archives.items():
 if name not in ['feed','blog','post','popover-profile']: continue
 soup=BeautifulSoup(parts[0].get_payload(decode=True).decode(),'html.parser')
 for t in soup.select('script, iframe, base, link[rel=preconnect], meta[http-equiv="Content-Security-Policy"]'): t.decompose()
 for t in soup.find_all(True):
  for attr in list(t.attrs):
   if attr.startswith('on'):del t[attr]
  for attr in ['src','href','poster','xlink:href']:
   if t.has_attr(attr):
    url=t[attr];base,sep,fragment=url.partition('#');local=resource(base)
    if local:t[attr]=local+(sep+fragment if sep else '')
  if t.has_attr('srcset'): del t['srcset']
 for t in soup.select('link[href]'):
  if not t['href'].startswith('/original/'):t.decompose()
 localize(soup)
 for t in soup.select('.supbar--top'): t.decompose()
 if name=='feed':
  for t in soup.select('.feed-page .content-list__item.content')[10:]:t.decompose()
 if name not in ['feed','popover-profile']:
  for t in soup.select('.feed-page__seen-posts-count'):t.decompose()
 soup.title.string='[PD] '+{'feed':'Популярное','blog':'Блог','post':'Пост','popover-profile':'Меню профиля'}[name]+' — vc.ru'
 for tag,attrs in [('link',{'rel':'stylesheet','href':'/platform.css'}),('script',{'src':'/platform.js','defer':''})]:soup.head.append(soup.new_tag(tag,attrs=attrs))
 (OUT/(name+'.html')).write_text(str(soup).replace('viewbox=', 'viewBox=').replace('preserveaspectratio=', 'preserveAspectRatio='))
