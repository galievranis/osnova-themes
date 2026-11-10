async function loadPalette() {
  const [classic, classicGrays, contrast] = await Promise.all(
    ['tokens.json', 'primitives.json', 'contrast.json'].map(async (file) => {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`Не удалось загрузить ${file}`);
      return response.json();
    })
  );

  const picker = document.getElementById('palette-theme');
  function render() {
    const isContrast = picker.value === 'contrast';
    renderPalette(isContrast ? contrast : classic, isContrast ? contrast.primitives : classicGrays);
  }
  picker.addEventListener('change', render);
  render();
}

function renderPalette(themes, grays) {
  const palette = document.getElementById('palette');
  const template = document.getElementById('swatch');
  const sampleTemplate = document.getElementById('swatch-sample');
  const lightNames = Object.keys(themes.light);
  palette.hidden = false;

  function tokenStyles(tokens) {
    const scope = document.createElement('div');
    scope.hidden = true;
    // The banner component supplies its own gradient geometry.
    scope.style.setProperty('--rgxy', 'ellipse at center');
    for (const [name, value] of Object.entries({ ...grays, ...tokens })) {
      scope.style.setProperty(name, value);
    }
    palette.append(scope);
    const styles = getComputedStyle(scope);
    const values = Object.fromEntries(Object.keys({ ...grays, ...tokens })
      .map(name => [name, styles.getPropertyValue(name).trim()]));
    scope.remove();
    return values;
  }

  function appendSample(samples, value, mode) {
    const sample = sampleTemplate.content.cloneNode(true);
    sample.querySelector('.swatch-preview').style.setProperty('--swatch', value);
    sample.querySelector('.swatch-mode').textContent = mode;
    sample.querySelector('.swatch-value').textContent = value === 'none' ? 'Без заливки' : value;
    samples.append(sample);
  }

  const light = tokenStyles(themes.light);
  const dark = tokenStyles(themes.dark);
  const groups = [
    ['gray-swatches', Object.keys(grays), 'color'],
    ['color-swatches', lightNames.filter(name => name.startsWith('--theme-color-')), 'color'],
    ['gradient-swatches', lightNames.filter(name => name.startsWith('--theme-gradient-')), 'background-image'],
  ];

  for (const [id, names, property] of groups) {
    const cards = document.createDocumentFragment();
    for (const name of names) {
      const lightValue = light[name];
      const darkValue = dark[name];
      const isOverride = themes.dark[name] !== themes.light[name] && CSS.supports(property, darkValue);
      if (!isOverride && !CSS.supports(property, lightValue)) continue;

      const card = template.content.cloneNode(true);
      card.querySelector('.swatch-name').textContent = name;
      const samples = card.querySelector('.swatch-samples');
      appendSample(samples, lightValue, name.startsWith('--theme-') ? 'Светлая' : '');
      if (isOverride) appendSample(samples, darkValue, 'Тёмная');
      cards.append(card);
    }
    document.getElementById(id).replaceChildren(cards);
  }
}

const status = document.getElementById('palette-status');
const grayStrip = document.getElementById('gray-strip');
const grayGrid = document.getElementById('gray-swatches');

function updateGrayLayout() {
  grayGrid.classList.toggle('is-strip', grayStrip.checked);
  if (grayStrip.checked) grayGrid.tabIndex = 0;
  else grayGrid.removeAttribute('tabindex');
}

grayStrip.addEventListener('change', updateGrayLayout);
window.addEventListener('pageshow', updateGrayLayout);

loadPalette()
  .then(() => { status.hidden = true; })
  .catch(() => { status.textContent = 'Не удалось загрузить палитру.'; });
