"""Import the collection, personal feed and modal previews from original MHTML captures."""
import argparse
import email
import hashlib
import mimetypes
import re
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

from localize_links import localize

PUBLIC = Path(__file__).resolve().parent.parent / 'public'
ASSETS = PUBLIC / 'original'
URL = re.compile(r"""url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)""", re.I)


def read_archive(path):
    return [part for part in email.message_from_bytes(path.read_bytes()).walk() if not part.is_multipart()]


def archive_resources(archives):
    mapping, assets = {}, {}
    for archive in archives:
        for part in archive[1:]:
            kind = part.get_content_type()
            if not (kind == 'text/css' or kind.startswith(('image/', 'font/'))):
                continue
            data = part.get_payload(decode=True)
            location = part.get('Content-Location')
            if not data or not location:
                continue
            extension = mimetypes.guess_extension(kind) or '.bin'
            filename = hashlib.sha256(data).hexdigest()[:20] + extension
            asset = '/original/' + filename
            keys = [location, urlsplit(location).path]
            if part.get('Content-ID'):
                keys.append('cid:' + part['Content-ID'].strip('<>'))
            if 'leonardo.osnova.io/' in location:
                keys.append(location.split('/-/')[0])
            for key in filter(None, keys):
                mapping.setdefault(key, asset)
            assets[filename] = (kind, location, data)

    def resolve(url, base):
        if url.startswith(('#', 'data:')):
            return url
        path, separator, fragment = url.partition('#')
        absolute = urljoin(base, path)
        if path.startswith(('/original/', '/placeholders/')):
            return url
        local = next((mapping[key] for key in (path, absolute, absolute.split('/-/')[0],
                      urlsplit(absolute).path) if key in mapping), None)
        return local + separator + fragment if local else None

    def localize_css(css, base, relative=False):
        def replace(match):
            url = next(group for group in match.groups() if group is not None).strip()
            local = resolve(url, base) or 'data:,'
            if relative and local.startswith('/original/'):
                local = local.removeprefix('/original/')
            return f'url("{local}")'
        return URL.sub(replace, css)

    for filename, (kind, location, data) in assets.items():
        path = ASSETS / filename
        if kind == 'text/css':
            data = localize_css(data.decode('utf-8'), location, relative=True).encode('utf-8')
        if not path.exists():
            path.write_bytes(data)
    return resolve, localize_css


def prepare_page(part, resolve, localize_css):
    base = part['Content-Location']
    page = BeautifulSoup(part.get_payload(decode=True), 'html.parser')
    page.html['data-preview-archive'] = ''
    page.html['data-color-mode'] = 'light'
    photos = sorted((PUBLIC / 'placeholders').glob('photo*'))
    avatars = sorted((PUBLIC / 'placeholders').glob('avatar*'))
    photo_index = 0

    def next_photo():
        nonlocal photo_index
        src = '/placeholders/' + photos[photo_index % len(photos)].name
        photo_index += 1
        return src

    for element in page.select('script, iframe, base, object, embed, source, .supbar--top, .feed-page__seen-posts-count'):
        element.decompose()
    for element in page.select('meta[http-equiv]'):
        element.decompose()
    for index, element in enumerate(page.find_all(True)):
        for attr in tuple(element.attrs):
            if attr.startswith('on') or attr in ('srcset', 'ping', 'action', 'formaction'):
                del element[attr]
        for attr in ('src', 'href', 'poster', 'xlink:href'):
            if attr not in element.attrs or (element.name == 'a' and attr == 'href'):
                continue
            original = element[attr]
            local = resolve(original, base)
            if not local and element.name == 'img' and attr == 'src':
                is_avatar = 'avatar' in ' '.join(element.parent.get('class', [])) or '/72x72/' in original
                local = '/placeholders/' + avatars[index % len(avatars)].name if is_avatar else next_photo()
            if local:
                element[attr] = local
            else:
                del element[attr]
        if element.has_attr('style'):
            element['style'] = localize_css(element['style'], base)
        if element.name == 'style' and element.string:
            element.string.replace_with(localize_css(element.string, base))

    for link in page.select('link'):
        if 'stylesheet' not in link.get('rel', []) or not link.get('href', '').startswith('/original/'):
            link.decompose()
    for post in page.select('.feed-page .content-list__item.content')[10:]:
        post.decompose()
    for video in page.select('video'):
        video.replace_with(page.new_tag('img', src=next_photo(), alt='', attrs={'class': 'preview-video-image'}))
    for media in page.select('.andropov-video'):
        if not media.find('img'):
            media.append(page.new_tag('img', src=next_photo(), alt='', attrs={'class': 'preview-video-image'}))

    localize(page)
    page.head.append(page.new_tag('link', rel='stylesheet', href='/platform.css'))
    page.head.append(page.new_tag('script', src='/platform.js', defer=''))
    return page


def write_screen(page, filename, title, modal_return=None):
    overlay = page.select_one('.modal-overlay')
    if modal_return:
        if not overlay:
            raise ValueError(f'Missing modal in {filename}')
        overlay['data-preview-return'] = modal_return
        close = overlay.select_one('.modal-window__close')
        if close:
            close['aria-label'] = 'Закрыть'
        window = overlay.select_one('.modal-window')
        window['role'] = 'dialog'
        window['aria-modal'] = 'true'
        window['aria-label'] = title
        for sibling in (*overlay.find_previous_siblings(), *overlay.find_next_siblings()):
            sibling['inert'] = ''
    else:
        if overlay:
            overlay.decompose()
        page.html['style'] = re.sub(r'overflow:\s*hidden\s*;?', '', page.html.get('style', ''))

    page.title.string = f'[PD] {title} — vc.ru'
    markup = str(page).replace('viewbox=', 'viewBox=').replace('preserveaspectratio=', 'preserveAspectRatio=')
    (PUBLIC / filename).write_text(markup, encoding='utf-8')


def achievement_card(page):
    return next(card for card in page.select('.collectibles .list-item')
                if card.select_one('.list-item__title').get_text(strip=True) == 'Топ-25 авторов')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('collection', 'achievement', 'pro', 'gift'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    archives = [read_archive(path) for path in (args.collection, args.achievement, args.pro, args.gift)]
    resolve, localize_css = archive_resources(archives)
    collection, achievement, pro, gift = [prepare_page(parts[0], resolve, localize_css) for parts in archives]
    card = achievement_card(collection)
    badge = card.select_one('img')
    if not badge or not badge.get('src', '').startswith('/original/'):
        raise ValueError('The saved achievement thumbnail is missing')
    for canvas in achievement.select('.achievement__scene canvas'):
        image = achievement.new_tag('img', src=badge['src'], alt='', attrs={'class': 'preview-achievement-image'})
        canvas.replace_with(image)
    card.name = 'a'
    card['href'] = '/modal-achievement.html'
    write_screen(collection, 'collection.html', 'Коллекция')
    write_screen(achievement, 'modal-achievement.html', 'Топ-25 авторов', 'collection.html')
    write_screen(pro, 'modal-pro.html', 'Подписка Pro', 'my-feed.html')
    write_screen(gift, 'modal-gift-plus.html', 'Подарить Plus', 'my-feed.html')
    write_screen(gift, 'my-feed.html', 'Моя лента')


if __name__ == '__main__':
    main()
