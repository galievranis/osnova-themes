import re
from urllib.parse import parse_qs, urlparse

ROUTES = {
    '/': '/feed.html',
    '/popular': '/feed.html',
    '/my': '/my-feed.html',
    ('/my', 'pro'): '/modal-pro.html',
    '/collectibles': '/collection.html',
    '/discovery': '/rating.html',
    '/discovery/blogs': '/rating.html',
    '/store': '/marketplace.html',
    '/menu': '/popover-profile.html',
}


def localize(soup):
    for link in soup.select('a[href]'):
        href = link['href']
        if href.startswith('#'):
            continue
        url = urlparse(href)
        path = url.path
        modal = parse_qs(url.query).get('modal', [''])[0]
        destination = ROUTES.get((path, modal)) or ROUTES.get(path)
        if not destination:
            if re.fullmatch(r'/id\d+/collectibles', path):
                destination = '/collection.html'
            elif re.search(r'/\d{5,}[^/]*', path):
                destination = '/post.html'
            elif 'author' in ' '.join(link.get('class', [])):
                destination = '/blog.html'
            else:
                destination = '/local.html'
        link['href'] = destination
        link.attrs.pop('target', None)
