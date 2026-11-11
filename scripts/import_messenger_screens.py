"""Create messenger previews from the archived list and conversation markup."""
import argparse
from copy import deepcopy
from pathlib import Path

from bs4 import BeautifulSoup

from import_preview_screens import PUBLIC, read_archive, write_screen

SPRITE = '/original/5ab740755eaffd60a05a.svg'
KEVIN = '/placeholders/avatar10.webp'
MICHAEL = '/placeholders/avatar37.webp'


def read_view(path):
    archive = read_archive(path)
    return BeautifulSoup(archive[0].get_payload(decode=True), 'html.parser').select_one('.view')


def icon(page, name, size=16):
    svg = page.new_tag('svg', attrs={'class': f'icon icon--{name}', 'width': size, 'height': size, 'aria-hidden': 'true'})
    svg.append(page.new_tag('use', attrs={'xlink:href': f'{SPRITE}#sprite-{name}'}))
    return svg


def text(node, value):
    node.clear()
    node.append(value)


def avatar(node, src):
    for child in node.select('source,.andropov-media__thumbnail'):
        child.decompose()
    node.img['src'] = src
    node.img['alt'] = ''
    node.img.attrs.pop('srcset', None)
    node.img.attrs.pop('loading', None)
    node.select_one('.andropov-media').attrs.pop('style', None)


def shell(view, kind):
    page = BeautifulSoup((PUBLIC / 'rating.html').read_text(encoding='utf-8'), 'html.parser')
    page.select_one('.view').replace_with(view)
    page.html['data-preview-messenger'] = kind
    for link in page.select('.RCt5iwch, .tabbar__item--active'):
        link['class'] = [value for value in link['class'] if value not in ('RCt5iwch', 'tabbar__item--active')]
    for link in page.select('a[data-gtm-click*=Messenger]'):
        link['href'] = '/messenger.html'
        link['class'].append('tabbar__item--active' if 'tabbar__item' in link['class'] else 'RCt5iwch')
    return page


def list_page(source):
    view = deepcopy(source)
    page = shell(view, 'new-list')
    channels = view.select_one('.channels')
    template = deepcopy(channels.select_one('.Y34HLSgK'))
    channels.clear()
    for index, (message, date, unread) in enumerate((
        ('Привет! Я приготовил чили. Пойдём обедать?', 'сегодня', '1'),
        ('Что такое губагул?', 'сегодня', '3'),
        ('Фотография', 'вчера', ''),
        ('Видео', '13 мар', '99'),
        ('Название.pdf', '13 мар', ''),
        ('Черновик: Что такое губагул?', '13 мар', ''),
        ('Что такое губагул?', '13 мар', ''),
        ('Что такое губагул?', '13 мар', ''),
        ('Что такое губагул?', '13 мар', ''),
    )):
        row = deepcopy(template)
        row.attrs = {'class': row['class']}
        if index == 0:
            row['href'] = '/messenger-chat.html'
            row['data-preview-demo-chat'] = ''
        else:
            row.name = 'div'
        avatar(row, KEVIN if index == 0 else MICHAEL)
        date_node = row.select_one('time')
        date_node.attrs = {'class': date_node['class']}
        text(date_node, date)
        title = row.select_one('.YPoAuj94')
        text(title, 'Кевин Малоун' if index == 0 else 'Майкл Скотт')
        title.append(date_node)
        text(row.select_one('.jQu1YNMy'), message)
        badge = row.select_one('.xGFvaP7d')
        badge.attrs.pop('style', None)
        if unread:
            text(badge, unread)
        else:
            badge.clear()
            badge['class'] = ['preview-message-read']
            badge.append(icon(page, 'tick', 14))
        channels.append(row)
    title = view.select_one('.EUPap4bX')
    text(title, 'Сообщения')
    original_header = view.select_one('._0X7BKABE')
    field = deepcopy(BeautifulSoup((PUBLIC / 'rating.html').read_text(encoding='utf-8'),
                                  'html.parser').select_one('.discovery__header .field'))
    field.input['aria-label'] = 'Поиск по сообщениям'
    field.input['data-preview-chat-search'] = ''
    original_header.clear()
    original_header.append(field)
    localize_icons(view)
    return page


def chat_page(source):
    view = deepcopy(source)
    page = shell(view, 'new-chat')
    identity = view.select_one('.O9-VuYU-')
    identity.attrs = {'class': identity['class'], 'href': '/messenger.html',
                      'aria-label': 'Вернуться к сообщениям'}
    avatar(identity, KEVIN)
    text(identity.select_one('.EUPap4bX'), 'Кевин Малоун')
    text(identity.select_one('.JSKtmVOg'), 'Онлайн')
    stream = view.select_one('.ZpJXSokP')
    template = deepcopy(stream.select_one('.wwY5FBjG'))
    date = page.new_tag('time', attrs={'class': 'bimf8TI4'})
    date.string = '20 ноября'
    stream.clear()
    stream.append(date)
    for index, message in enumerate((
        'Привет! Я приготовил чили. Пойдём обедать?', 'Супер, жду на кухне!', 'Да, давай',
        'Привет! Я приготовил чили. Пойдём обедать?', 'Супер, жду на кухне!', 'Да, давай',
    )):
        if index == 3:
            divider = page.new_tag('div', attrs={'class': 'oBRIRIbg'})
            divider.string = 'Новые'
            stream.append(divider)
        row = deepcopy(template)
        row.attrs = {'class': row['class']}
        outgoing = index in (2, 5)
        if outgoing:
            row['data-preview-outgoing'] = ''
        row.select_one('.left').clear()
        body = row.select_one('.Uq1mKlbk')
        text(body, message)
        timestamp = row.select_one('time')
        timestamp.attrs = {'class': timestamp['class']}
        text(timestamp, '23:59')
        body.append(row.select_one('.wgjd82GI').extract())
        if outgoing:
            timestamp.parent.append(icon(page, 'tick', 14))
        stream.append(row)
    menu = page.new_tag('details', attrs={'class': 'preview-chat-menu'})
    summary = page.new_tag('summary', attrs={'aria-label': 'Действия диалога'})
    summary.append(icon(page, 'dots', 20))
    back = page.new_tag('a', href=identity['href'])
    back.string = 'К списку чатов'
    menu.append(summary)
    menu.append(back)
    view.select_one('._0X7BKABE').append(menu)
    localize_icons(view)
    return page


def localize_icons(view):
    for use in view.select('use[xlink\\:href]'):
        href = use['xlink:href']
        if '#' in href:
            use['xlink:href'] = SPRITE + '#' + href.split('#', 1)[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('list', type=Path)
    parser.add_argument('chat', type=Path)
    args = parser.parse_args()
    chats, conversation = read_view(args.list), read_view(args.chat)
    write_screen(list_page(chats), 'messenger.html', 'Сообщения')
    write_screen(chat_page(conversation), 'messenger-chat.html', 'Диалог')


if __name__ == '__main__':
    main()
