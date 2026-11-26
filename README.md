# Osnova Themes

Витрина «Оформление» для vc.ru и DTF и Chrome-расширение Osnova Tokens для работы с темами на DTF-стейдже.

## Витрина

Запустите `npm run dev` и откройте [локальную витрину](http://localhost:5173/). Для сборки нужны npm и Python 3. `npm run build` собирает витрину в `dist/`. GitHub Actions собирает ту же страницу в `dist-pages/` и публикует на [GitHub Pages](https://galievranis.github.io/osnova-themes/).

- Страница, стили, скрипт и SVG-паттерны находятся в `public/`.
- Палитры «Оформления» находятся в `showcase/appearance-themes.json`. `showcase/themes.json` содержит дополнительные палитры, используемые этой же страницей.

## От витрины до CSS для разработки

1. Подготовьте палитру и паттерн в витрине. Проверьте обе схемы.
2. Перенесите тему и SVG-паттерн в [Chrome-расширение](extension/osnova-tokens/README.md). Для существующих пресетов «Игры» и DTF используйте `python3 scripts/package_extension_presets.py`. Для новых встроенных пресетов добавьте тему и паттерн согласно устройству расширения.
3. Загрузите расширение из `extension/osnova-tokens/` через Load unpacked в `chrome://extensions/`. Доработайте палитру на стейдже и передайте разработчику CSS через «Экспорт CSS». Пример готового файла находится в `exports/`.
