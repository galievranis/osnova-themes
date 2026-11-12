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
    ('custom', 'Своя тема'),
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
        page.new_tag('link', rel='stylesheet', href='/appearance.css?v=33')
    )
    page.head.select_one('script[src="/platform.js"]')['src'] = '/appearance.js?v=34'
    page.head.append(page.new_tag('link', rel='preload', href='/theme-preview.svg',
                                  attrs={'as': 'fetch', 'crossorigin': 'anonymous'}))

    desktop_header = page.select_one('.bar--top > .header')
    desktop_header['data-appearance-header'] = 'desktop'
    mobile_header = deepcopy(mobile.select_one('.bar--top > .header'))
    mobile_header['data-appearance-header'] = 'mobile'
    desktop_header.insert_after(mobile_header)

    first_item = page.select_one('.aside--left .z4vyLIzO')
    first_item['class'].append('RCt5iwch')

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
    custom = page.new_tag('section', id='appearance-custom', hidden='',
                          attrs={'aria-labelledby': 'appearance-custom-title'})
    heading = page.new_tag('h2', id='appearance-custom-title', attrs={'class': 'form-section__label'})
    heading.string = 'Настройки своей темы'
    custom.append(heading)
    colors = page.new_tag('div', attrs={'class': 'appearance-custom-colors'})
    for token, label in (('background', 'Фон страницы'), ('accent', 'Акцент')):
        field = page.new_tag('label')
        field.append(label)
        field.append(page.new_tag('input', type='color', attrs={'data-theme-color': '--theme-color-' + token}))
        colors.append(field)
    custom.append(colors)
    pattern_controls = page.new_tag('div', attrs={'class': 'appearance-custom-pattern'})
    patterns = page.new_tag('select', id='appearance-custom-pattern', attrs={'aria-label': 'Узор фона'})
    for value, label in (('', 'Без узора'), ('gaming', 'Игровой'), ('cats', 'Коты'), ('filippovost', 'Клоуны')):
        option = page.new_tag('option', value=value)
        option.string = label
        patterns.append(option)
    pattern_select = page.new_tag('div', attrs={'class': 'appearance-pattern-select'})
    pattern_select.append(patterns)
    pattern_color = page.new_tag('label', id='appearance-pattern-color', hidden='')
    pattern_color.append('Цвет узора')
    pattern_color.append(page.new_tag('input', type='color',
                                     attrs={'data-theme-color': '--theme-color-backdrop-pattern'}))
    pattern_controls.extend([pattern_select, pattern_color])
    custom.append(pattern_controls)

    sliders = page.new_tag('div', id='appearance-pattern-sliders', hidden='')
    for prop, label, minimum, maximum in (
        ('opacity', 'Интенсивность цвета', '0', '100'), ('size', 'Размер узора', '32', '400'),
    ):
        control = page.new_tag('div', attrs={'class': 'appearance-pattern-slider'})
        slider_id = 'appearance-pattern-' + prop
        title = page.new_tag('label', attrs={'for': slider_id})
        title.string = label
        output = page.new_tag('output', attrs={'for': slider_id, 'aria-hidden': 'true'})
        slider = page.new_tag('input', id=slider_id, type='range', min=minimum, max=maximum,
                              attrs={'data-pattern-property': prop})
        control.extend([title, output, slider])
        sliders.append(control)
    custom.append(sliders)
    grid.insert_after(custom)

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
        if theme == 'custom':
            card['aria-controls'] = custom['id']
            preview.clear()
        card.select_one('.K0bZe5rs').string = label
        grid.append(card)

    write_screen(page, 'appearance.html', 'Оформление')


if __name__ == '__main__':
    main()
