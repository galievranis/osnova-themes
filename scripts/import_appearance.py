"""Build the standalone appearance screen from its desktop and mobile captures."""
import argparse
from copy import deepcopy
from pathlib import Path

from import_preview_screens import archive_resources, prepare_page, read_archive, write_screen

THEMES = (
    ('classic', 'Классика'),
    ('contrast', 'Контрастная'),
    ('lime', 'Лайм'),
    ('garnet', 'Гранат'),
    ('iris', 'Ирис'),
    ('sapphire', 'Сапфир'),
    ('mint', 'Мята'),
    ('peach', 'Персик'),
    ('filippovost', 'Филипповость'),
    ('gaming', 'Игровой'),
    ('cats', 'Коты'),
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('desktop', type=Path)
    parser.add_argument('mobile', type=Path)
    args = parser.parse_args()
    archives = [read_archive(path) for path in (args.desktop, args.mobile)]
    resolve_archive, localize_css = archive_resources(archives)

    def resolve(url, base):
        if url.startswith('/assets/spritemap.e8cffeea.svg#'):
            icon = url.split('#', 1)[1]
            return '/original/5ab740755eaffd60a05a.svg#' + (
                'sprite-settings' if icon == 'sprite-palette' else icon
            )
        return resolve_archive(url, base)

    page, mobile = [prepare_page(archive[0], resolve, localize_css) for archive in archives]
    page.html['data-appearance'] = ''
    page.head.insert(0, page.new_tag('meta', charset='utf-8'))
    page.head.append(page.new_tag('link', rel='icon', href='data:,'))
    page.head.select_one('link[href="/platform.css"]').replace_with(
        page.new_tag('link', rel='stylesheet', href='/appearance.css?v=13')
    )
    page.head.select_one('script[src="/platform.js"]')['src'] = '/appearance.js?v=16'
    page.head.append(page.new_tag('link', rel='preload', href='/theme-preview.svg',
                                  attrs={'as': 'fetch', 'crossorigin': 'anonymous'}))

    desktop_header = page.select_one('.bar--top > .header')
    desktop_header['data-appearance-header'] = 'desktop'
    mobile_header = deepcopy(mobile.select_one('.bar--top > .header'))
    mobile_header['data-appearance-header'] = 'mobile'
    desktop_header.insert_after(mobile_header)

    for link in page.select('a[href]'):
        if link.get_text(strip=True) == 'Оформление':
            link['href'] = '/appearance.html'
            link['aria-current'] = 'page'
        elif not link['href'].startswith('#'):
            link['href'] = '/local.html'

    for radio in page.select('.settings-wrapper .radio__input'):
        radio['name'] = 'color-mode'

    grid = page.select_one('.settings-wrapper .-wCE9pcP')
    grid['id'] = 'appearance-theme-grid'
    view_switcher = page.new_tag('div', id='appearance-view-switcher', role='group', hidden='',
                                 attrs={'aria-label': 'Вид списка тем'})
    for view, label in (('preview', 'Превью'), ('compact', 'Компактно')):
        tab = page.new_tag('button', type='button', attrs={
            'data-appearance-view': view,
            'aria-controls': grid['id'],
            'aria-pressed': str(view == 'preview').lower(),
        })
        tab.string = label
        view_switcher.append(tab)
    page.body.append(view_switcher)
    template = deepcopy(grid.select_one('.b3kUJqmM'))
    grid.clear()
    for theme, label in THEMES:
        card = deepcopy(template)
        card.attrs.pop('data-gtm-click', None)
        card['data-appearance-theme'] = theme
        selected = theme == 'classic'
        if not selected:
            card['class'].remove('zvEjzVpg')
        card['aria-pressed'] = str(selected).lower()
        preview = card.select_one('.mADoi96g')
        preview.attrs.pop('data-theme-preview', None)
        preview['aria-hidden'] = 'true'
        card.select_one('.K0bZe5rs').string = label
        grid.append(card)

    write_screen(page, 'appearance.html', 'Оформление')


if __name__ == '__main__':
    main()
