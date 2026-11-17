"""Build the standalone appearance screen from its desktop and mobile captures."""
import argparse
from copy import deepcopy
from pathlib import Path

from import_preview_screens import archive_resources, prepare_page, read_archive, write_screen

THEMES = (
    ('classic', 'Классика'),
    ('contrast', 'Контраст'),
    ('lime', 'Транспорт'),
    ('sapphire', 'Легенды'),
    ('mint', 'Деньги'),
    ('filippovost', 'Филипповость'),
    ('gaming', 'Игровой'),
    ('cats', 'Коты'),
    ('gta', 'GTA'),
    ('future', 'Будущее'),
    ('custom', 'Своя тема'),
)
VISIBLE_THEMES = {'classic', 'contrast', 'gta'}


def pattern_slider(page, slider_id, label, minimum, maximum, prop=None):
    control = page.new_tag('div', attrs={'class': 'appearance-pattern-slider'})
    title = page.new_tag('label', attrs={'for': slider_id})
    title.string = label
    output = page.new_tag('output', attrs={'for': slider_id, 'aria-hidden': 'true'})
    slider = page.new_tag('input', id=slider_id, type='range', min=minimum, max=maximum)
    if prop is not None:
        slider['data-pattern-property'] = prop
    control.extend([title, output, slider])
    return control


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
        page.new_tag('link', rel='stylesheet', href='/appearance.css?v=47')
    )
    page.head.select_one('script[src="/platform.js"]')['src'] = '/appearance.js?v=46'
    page.head.append(page.new_tag('link', rel='preload', href='/theme-preview.svg?v=2',
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
    background_modes = page.new_tag('div', id='appearance-background-modes', role='group',
                                    attrs={'aria-label': 'Тип фона'})
    for mode, label in (('pattern', 'Узор'), ('image', 'Картинка')):
        button = page.new_tag('button', type='button', attrs={
            'data-background-mode': mode, 'aria-pressed': str(mode == 'pattern').lower(),
            'aria-controls': 'appearance-custom-image' if mode == 'image' else 'appearance-pattern-controls',
        })
        button.string = label
        background_modes.append(button)
    custom.append(background_modes)
    pattern_controls = page.new_tag('div', id='appearance-pattern-controls',
                                    attrs={'class': 'appearance-custom-pattern'})
    patterns = page.new_tag('select', id='appearance-custom-pattern', attrs={'aria-label': 'Узор фона'})
    for value, label in (('', 'Без узора'), ('gaming', 'Игровой'), ('gta', 'GTA'),
                         ('cats', 'Коты'), ('filippovost', 'Клоуны')):
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
    sliders.append(pattern_slider(page, 'appearance-pattern-opacity', 'Интенсивность цвета', '0', '100', 'opacity'))
    custom.append(sliders)
    image_controls = page.new_tag('div', id='appearance-custom-image', hidden='')
    upload = page.new_tag('button', id='appearance-image-upload', type='button')
    upload.string = 'Загрузить картинку'
    remove = page.new_tag('button', id='appearance-image-remove', type='button', hidden='')
    remove.string = 'Удалить'
    image_file = page.new_tag('input', id='appearance-image-file', type='file', accept='image/*', hidden='')
    status = page.new_tag('span', id='appearance-image-status', role='status')
    image_controls.extend([upload, remove, image_file, status])
    custom.append(image_controls)
    grid.insert_after(custom)
    pattern_toggles = page.new_tag('div', id='appearance-pattern-toggles', hidden='',
                                   attrs={'class': 'sV0BWu8Y'})
    label = page.new_tag('label', attrs={'class': 'checkbox checkbox--checked'})
    checkbox = page.new_tag('input', id='appearance-pattern-enabled', type='checkbox',
                            attrs={'class': 'checkbox__input', 'checked': ''})
    control = page.new_tag('div', attrs={'class': 'checkbox__control'})
    icon = page.new_tag('svg', width='16', height='16', attrs={
        'class': 'icon icon--tick checkbox__icon', 'aria-hidden': 'true',
    })
    icon.append(page.new_tag('use', attrs={
        'xlink:href': '/original/5ab740755eaffd60a05a.svg#sprite-tick',
    }))
    control.append(icon)
    caption = page.new_tag('div', attrs={'class': 'checkbox__caption'})
    caption.string = 'Узор на фоне'
    label.extend([checkbox, control, caption])
    pattern_toggles.append(label)
    custom.insert_after(pattern_toggles)

    template = deepcopy(grid.select_one('.b3kUJqmM'))
    grid.clear()
    for theme, label in THEMES:
        card = deepcopy(template)
        card.attrs.pop('data-gtm-click', None)
        card['data-appearance-theme'] = theme
        if theme not in VISIBLE_THEMES:
            card['hidden'] = ''
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
