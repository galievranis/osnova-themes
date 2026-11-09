import re
from urllib.parse import urlparse

def localize(soup):
 for a in soup.select('a[href]'):
  href=a['href']; path=urlparse(href).path
  if href.startswith('#'):continue
  if path in ['/','/popular']:dest='/feed.html'
  elif re.search(r'/\d{5,}[^/]*',path):dest='/post.html'
  elif 'author' in ' '.join(a.get('class',[])):dest='/blog.html'
  elif path=='/menu':dest='/popover-profile.html'
  else:dest='/local.html'
  a['href']=dest;a.attrs.pop('target',None)
