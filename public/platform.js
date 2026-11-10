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
