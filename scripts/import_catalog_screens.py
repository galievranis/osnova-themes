"""Import the vc.ru rating and the contents of the DTF store into vc.ru previews."""
import argparse
from copy import deepcopy
from pathlib import Path
from urllib.parse import urlsplit

from bs4 import BeautifulSoup

from import_preview_screens import archive_resources, prepare_page, read_archive, write_screen

STORE_STYLES = ('ProductFields-', 'ProductSearchInput-', 'Marketplace-')


def store_assets(archive):
    page = BeautifulSoup(archive[0].get_payload(decode=True), 'html.parser')
    content = str(page.select_one('.view'))
    parts = [archive[0]]
    styles = []
    for part in archive[1:]:
        location = part.get('Content-Location', '')
        name = Path(urlsplit(location).path).name
        if part.get_content_type() == 'text/css' and name.startswith(STORE_STYLES):
            styles.append(location)
            parts.append(part)
        elif part.get_content_type().startswith('image/') and location and location.split('/-/')[0] in content:
            parts.append(part)
    if len(styles) != len(STORE_STYLES):
        raise ValueError('The captured store is missing one or more component stylesheets')
    return parts, styles


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('rating', type=Path)
    parser.add_argument('store', type=Path)
    args = parser.parse_args()

    rating_archive = read_archive(args.rating)
    store_archive, store_styles = store_assets(read_archive(args.store))
    resolve, localize_css = archive_resources([rating_archive, store_archive])
    rating = prepare_page(rating_archive[0], resolve, localize_css)
    store = prepare_page(store_archive[0], resolve, localize_css)
    storefront = deepcopy(rating)
    storefront.select_one('.view').replace_with(store.select_one('.view').extract())
    storefront.html['data-preview-store'] = ''
    storefront.select_one('a.RCt5iwch[href="/rating.html"]')['class'].remove('RCt5iwch')
    storefront.select_one('a[data-gtm-click*=Store][href="/marketplace.html"]')['class'].append('RCt5iwch')
    for link in storefront.select('.tabbar__item--active[href="/rating.html"]'):
        link['class'].remove('tabbar__item--active')
    platform = storefront.select_one('link[href="/platform.css"]')
    for stylesheet in store_styles:
        platform.insert_before(storefront.new_tag('link', rel='stylesheet', href=resolve(stylesheet, stylesheet)))

    write_screen(rating, 'rating.html', 'Рейтинг')
    write_screen(storefront, 'marketplace.html', 'Магазин цифровых товаров')


if __name__ == '__main__':
    main()
