(() => {
  const modal = document.querySelector('.modal-overlay[data-preview-return]');
  if (!modal && window.self === window.top) {
    const link = document.createElement('a');
    link.href = './';
    link.textContent = '◐ Темы';
    link.className = 'theme-editor-link';
    document.body.append(link);
  }

  function closeModal() {
    location.assign(modal.dataset.previewReturn);
  }

  if (modal) {
    modal.querySelector('.modal-window__close')?.focus({ preventScroll: true });
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('.modal-window__close')) closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeModal();
    });
  }

  const settings = document.documentElement.dataset.previewSettings;
  const chatSearch = document.querySelector('[data-preview-chat-search]');
  if (chatSearch) {
    chatSearch.addEventListener('input', () => {
      const query = chatSearch.value.trim().toLocaleLowerCase('ru');
      for (const row of document.querySelectorAll('.channels .Y34HLSgK')) {
        row.hidden = !row.textContent.toLocaleLowerCase('ru').includes(query);
      }
    });
  }

  const chatComposer = document.querySelector('[data-preview-messenger="new-chat"] .BnnSXmZM');
  if (chatComposer) {
    const input = chatComposer.querySelector('textarea[name="message"]');
    const send = chatComposer.querySelector('.sMjwVEgj');
    const stream = document.querySelector('.ZpJXSokP');
    const outgoing = stream.querySelector('[data-preview-outgoing]');
    const updateSend = () => { send.disabled = !input.value.trim(); };

    input.addEventListener('input', updateSend);
    window.addEventListener('pageshow', updateSend);
    updateSend();

    send.addEventListener('click', () => {
      const message = input.value.trim();
      if (!message) return;

      const row = outgoing.cloneNode(true);
      const body = row.querySelector('.Uq1mKlbk');
      body.replaceChildren(message, body.querySelector('.wgjd82GI'));
      row.querySelector('time').textContent = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
      });
      stream.append(row);
      stream.scrollTop = stream.scrollHeight;
      input.value = '';
      updateSend();
      input.focus({ preventScroll: true });
    });
  }

  if (settings === 'checkboxes') {
    document.addEventListener('change', event => {
      if (!event.target.matches('.notifications-settings-checkboxes .checkbox__input')) return;
      event.target.closest('.checkbox').classList.toggle('checkbox--checked', event.target.checked);
    });
  }
  if (settings === 'inputs') {
    document.addEventListener('input', event => {
      if (!event.target.matches('.settings-wrapper :is(input, textarea)[maxlength]')) return;
      const counter = event.target.parentElement.querySelector('.text-input-counter, .textarea__counter');
      if (counter) counter.textContent = event.target.maxLength - event.target.value.length;
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.className.includes('subscribe')) {
      button.textContent = button.textContent.includes('Вы подписаны') ? 'Подписаться' : 'Вы подписаны';
    }
  });
})();
