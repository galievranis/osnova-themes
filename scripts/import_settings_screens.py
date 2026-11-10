"""Import the original notifications and blog settings captures for theme previews."""
import argparse
from copy import deepcopy
from pathlib import Path

from import_preview_screens import archive_resources, prepare_page, read_archive, write_screen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkboxes', type=Path)
    parser.add_argument('inputs', type=Path)
    args = parser.parse_args()
    archives = [read_archive(path) for path in (args.checkboxes, args.inputs)]
    archive_resolve, localize_css = archive_resources(archives)

    def resolve(url, base):
        local = archive_resolve(url, base)
        if not local and url.startswith('/assets/spritemap.4bd01179.svg#'):
            return '/original/5ab740755eaffd60a05a.svg#' + url.split('#', 1)[1]
        return local

    for archive, name, title in (
        (archives[0], 'checkboxes', 'Чекбоксы'),
        (archives[1], 'inputs', 'Инпуты'),
    ):
        page = prepare_page(archive[0], resolve, localize_css)
        page.html['data-preview-settings'] = name
        if name == 'checkboxes':
            tick = page.select_one('.notifications-settings-checkboxes .checkbox__icon')
            if not tick or not tick.use or not tick.use.get('xlink:href'):
                raise ValueError('The checkbox capture is missing its original tick icon')
            for control in page.select('.notifications-settings-checkboxes .checkbox__control'):
                if not control.select_one('.checkbox__icon'):
                    control.append(deepcopy(tick))
        write_screen(page, name + '.html', title)


if __name__ == '__main__':
    main()
