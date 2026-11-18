(async()=>{
const $=s=>document.querySelector(s), frame=$('#preview');
const [classicGrays,defaults,contrast,appearance]=await Promise.all(
 ['primitives.json','tokens.json','contrast.json','../appearance-themes.json'].map(file=>fetch(file).then(r=>r.json()))
);
const headerToken='--theme-color-brand-header';
const oldHeaderGradient='--theme-gradient-brand-header';
const headerMeshColors=[
 '--theme-color-header-mesh-left',
 '--theme-color-header-mesh-middle',
 '--theme-color-header-mesh-right',
];
const gta=appearance.find(theme=>theme.id==='gta');
if(gta){
 for(const tokens of Object.values(gta.modes))moveHeaderMeshToToken(tokens);
}
const legacyGrays=ThemeSchemes.legacyPrimitives;
const primitives={...classicGrays,...contrast.primitives,...legacyGrays};
const bases={classic:defaults,contrast,gta:gta?.modes};
const baseline=(scheme,mode)=>(bases[scheme.base]??defaults)[mode];
const read=key=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
const stored=read('osnova-schemes-v3');
for(const colorMode of ['light','dark']){
 const schemes=stored?.schemes?.[colorMode];
 if(Array.isArray(schemes)){
  for(const scheme of schemes){
   if(scheme?.base==='gta' && scheme.tokens)moveHeaderMeshToToken(scheme.tokens);
  }
 }
}
const state=ThemeSchemes.createState(defaults,stored,read('osnova-themes-v2'),contrast,gta);
let mode=state.mode;
const catalog=()=>state.schemes[mode];
const current=()=>catalog().find(t=>t.id===state.selected[mode]);
if(new URLSearchParams(location.search).get('theme')==='gta' && catalog().some(scheme=>scheme.id==='gta')){
 state.selected[mode]='gta';
}
const patternToken='--theme-background-pattern';
const maskToken='--theme-image-backdrop-pattern';
const gtaMask=gta?.modes.light[maskToken];
const status=t=>{const el=$('#status');el.textContent=t;el.hidden=/Сохранено|сохраняются/.test(t)};
function save(){state.mode=mode;try{localStorage.setItem('osnova-schemes-v3',JSON.stringify(state));status('Сохранено в браузере')}catch{status('Хранилище недоступно — скачайте JSON')}apply()}
function usedPrimitives(scheme){
 const values=Object.values(scheme.tokens).join(' ');
 const refs=new Set(Array.from(values.matchAll(/var\(\s*(--[\w-]+)/g),match=>match[1]));
 const grays=scheme.base==='contrast'?contrast.primitives:classicGrays;
 return {...grays,...Object.fromEntries(Object.entries(primitives)
  .filter(([key])=>refs.has(key)))};
}

function isHeaderGradient(value){
 return /(?:linear|radial|conic)-gradient\(/i.test(value) && CSS.supports('background-image',value);
}

function moveHeaderMeshToToken(tokens){
 const mesh=tokens[oldHeaderGradient];
 const solid=tokens[headerToken];
 if(!mesh || !CSS.supports('color',solid))return;
 const gradient=mesh.replace(/var\((--theme-color-header-mesh-[\w-]+)\)/g,
  (reference,key)=>tokens[key]??reference);
 if(!isHeaderGradient(gradient) || gradient.includes('var(') || solid.includes('var('))return;
 if(tokens['--theme-color-brand-content-background']===`var(${headerToken})`){
  tokens['--theme-color-brand-content-background']=solid;
 }
 tokens[headerToken]=`${gradient}, linear-gradient(${solid}, ${solid})`;
 delete tokens[oldHeaderGradient];
 for(const key of headerMeshColors)delete tokens[key];
}

function materialRules(selector,tokens){
 const rules=[];
 if(isHeaderGradient(tokens[headerToken])){
  rules.push(`${selector} .header {
  background: var(${headerToken});
}`);
 }
 if(tokens['--theme-color-header-icon']){
  rules.push(`${selector} .header :is(.header__logo, .header__back-button, .quick-search-button,
  .bell__button, .account-button__inner > .icon) {
  color: var(--theme-color-header-icon, var(--theme-color-text-primary));
}`);
 }
 if(tokens[maskToken] && tokens[maskToken]!=='none'){
  rules.push(`${selector} > body { isolation: isolate; }
${selector} > body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: var(--theme-color-backdrop-pattern);
  background-image: var(--theme-gradient-backdrop-pattern, none);
  mask-image: var(${maskToken});
  mask-mode: alpha;
  mask-repeat: repeat;
  mask-size: var(--theme-size-backdrop-pattern);
  opacity: var(--theme-opacity-backdrop-pattern);
}`);
 }
 if(tokens['--theme-color-trend-hover']){
  rules.push(`${selector} .widget-trends__item.button--type-outline {
  --button-bg-color-hover: var(--theme-color-trend-hover);
  --button-bg-color-active: var(--theme-color-trend-pressed);
}
@media (hover: hover) {
  ${selector} .widget-trends__item.button--type-outline:hover {
    border-color: var(--theme-color-trend-hover-border);
  }
}`);
 }
 if(tokens['--theme-color-radio-outline']){
  rules.push(`${selector} .radio:not(.radio--checked) .radio__control {
  outline: 1px solid var(--theme-color-radio-outline);
  outline-offset: -1px;
}
${selector} .radio--checked .radio__control::after {
  background-color: var(--theme-color-radio-dot);
}`);
 }
 return rules.join('\n\n');
}

function declarations(values){
 return Object.entries(values).map(([key,value])=>`  ${key}: ${value};`).join('\n');
}

function apply(){
 try{
  const document=frame.contentDocument;
  if(!document?.documentElement)return;
  const root=document.documentElement;
  root.dataset.colorMode=mode;
  if(root.hasAttribute('data-preview-archive'))root.dataset.theme=mode;
  let style=document.getElementById('custom-theme');
  if(!style){
   style=document.createElement('style');
   style.id='custom-theme';
   document.head.append(style);
  }
  const scheme=current();
  style.textContent=`:root:root {\n  color-scheme: ${mode};\n${declarations({...usedPrimitives(scheme),...scheme.tokens})}\n}\n${materialRules(':root',scheme.tokens)}`;
  scheduleCoverage();
  dispatchEvent(new CustomEvent('theme-updated',{detail:{name:scheme.name}}));
 }catch{}
}
let coverageTimer,coverage={used:[],unused:[]};
function scheduleCoverage(){clearTimeout(coverageTimer);coverageTimer=setTimeout(measureCoverage,180)}
function measureCoverage(){
 const doc=frame.contentDocument,win=frame.contentWindow;if(!doc?.body)return;
 const defined=new Map(),roots=new Set(),known=new Set(Object.keys(current().tokens)),visibility=new WeakMap();
 const refs=value=>[...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(m=>m[1]);
 function visible(el){if(visibility.has(el))return visibility.get(el);const cs=win.getComputedStyle(el);const value=el.getClientRects().length>0&&cs.visibility!=='hidden'&&cs.visibility!=='collapse'&&cs.opacity!=='0';visibility.set(el,value);return value}
 function collect(style){for(const prop of Array.from(style)){const value=style.getPropertyValue(prop);if(prop.startsWith('--')){if(!defined.has(prop))defined.set(prop,new Set());for(const ref of refs(value))defined.get(prop).add(ref)}else for(const ref of refs(value))roots.add(ref)}}
 function visit(rules){for(const rule of rules){
  if(rule.type===4&&!win.matchMedia(rule.conditionText).matches)continue;
  if(rule.type===12&&!win.CSS.supports(rule.conditionText))continue;
  if(rule.selectorText&&rule.style){let matches=[];try{matches=doc.querySelectorAll(rule.selectorText.replace(/::[\w-]+(?:\([^)]*\))?/g,''))}catch{continue}if([...matches].some(visible))collect(rule.style)}
  else if(rule.cssRules)visit(rule.cssRules);
 }}
 try{for(const sheet of doc.styleSheets){try{visit(sheet.cssRules)}catch{}}for(const el of doc.querySelectorAll('[style]'))if(visible(el))collect(el.style);
 // Theme references follow the selected palette, rather than inactive defaults.
 for(const [key,value]of Object.entries(current().tokens))defined.set(key,new Set(refs(value)));
 const visited=new Set();function follow(key){if(visited.has(key))return;visited.add(key);for(const ref of defined.get(key)||[])follow(ref)}for(const key of roots)follow(key);
 const used=[...known].filter(key=>visited.has(key)),unused=[...known].filter(key=>!visited.has(key));
 coverage={used,unused};$('#open-used-count').disabled=false;$('#open-unused-count').disabled=false;
 $('#used-count').textContent=used.length;$('#unused-count').textContent=unused.length;
 $('#unused-count').parentElement.title=unused.join('\n')||'Все токены встречаются на странице';
 $('#used-count').parentElement.title=used.join('\n');
 }catch{$('#used-count').textContent='—';$('#unused-count').textContent='—'}
}
const patterns = createThemeBackgroundPatterns();
const patternSelect = $('#background-pattern');

function syncPattern() {
 const image = current().tokens[patternToken];
 const mask = current().tokens[maskToken];
 const hasMask = Boolean(mask && mask !== 'none');
 patternSelect.querySelector('[value="gta"]')?.remove();
 if (gtaMask && (current().base === 'gta' || mask === gtaMask)) {
  patternSelect.add(new Option('GTA', 'gta'));
 }
 const preset = Object.keys(patterns).find(key => patterns[key] === image);
 const custom = Boolean((image && image !== 'none' && !preset) || (hasMask && mask !== gtaMask));
 patternSelect.querySelector('[value="custom"]')?.remove();
 if (custom) patternSelect.add(new Option('Свой паттерн', 'custom'));
 patternSelect.value = hasMask && mask === gtaMask ? 'gta' : preset ?? (custom || hasMask ? 'custom' : 'none');
}

patternSelect.onchange = () => {
 const choice = patternSelect.value;
 const tokens=current().tokens;
 if (choice === 'custom') return;
 if (choice === 'gta' || choice === 'none') delete tokens[patternToken];
 else tokens[patternToken] = patterns[choice];
 if (choice === 'gta') tokens[maskToken] = gtaMask;
 else if (Object.hasOwn(tokens,maskToken)) tokens[maskToken] = 'none';
 syncPattern();
 render();
 save();
};
function themeSelect(){$('#themes').replaceChildren(...catalog().map(t=>new Option(t.name,t.id)));$('#themes').value=state.selected[mode];$('#name').value=current().name;$('#modes').value=mode;syncPattern();for(const [id,format] of [['#export','CSS'],['#json','JSON']])$(id).textContent=exportModes().length===2?`Скачать ${format} · обе схемы`:`Скачать ${format}`}
addEventListener('inspect-tokens',e=>{const keys=e.detail.tokens.filter(k=>Object.hasOwn(current().tokens,k));$('#search').value='';render();for(const row of $('#tokens').querySelectorAll('.token')){const key=row.querySelector('[data-token-value]').id;row.classList.toggle('inspected-token',keys.includes(key))}if(keys.length){for(const row of $('#tokens').querySelectorAll('.token'))row.hidden=!row.classList.contains('inspected-token');for(const group of $('#tokens').querySelectorAll('details'))group.hidden=!group.querySelector('.inspected-token');$('#tokens').scrollTop=0;const picked=$('#tokens .inspected-token [data-token-value]');if(picked)picked.focus({preventScroll:true});$('#count').textContent=keys.length+' токенов элемента'}status(keys.length?'Цвет элемента: '+keys[0].replace('--theme-','')+' · '+keys.length+' связанных токенов':'Для этого элемента токены темы не найдены')});
function group(k){if(k.includes('brand'))return'Бренд';if(/accent|positive|negative|rating|on-fill/.test(k))return'Акцент и статусы';if(/text|inverse/.test(k))return'Текст и иконки';if(/button/.test(k))return'Кнопки';if(/field|check/.test(k))return'Поля';if(/background|border/.test(k))return'Поверхности и границы';return'Эффекты и остальное'}
function validToken(key,value){
 if(/[;{}<>]/.test(value))return false;
 if(key===headerToken)return CSS.supports('color',value) || isHeaderGradient(value);
 if(key===maskToken)return CSS.supports('mask-image',value);
 if(key===patternToken || key.startsWith('--theme-gradient-'))return CSS.supports('background-image',value);
 if(key.startsWith('--theme-size-'))return CSS.supports('mask-size',value);
 if(key.startsWith('--theme-opacity-'))return CSS.supports('opacity',value);
 return CSS.supports('color',value)||CSS.supports('box-shadow',value)||CSS.supports('background',value)||CSS.supports('filter',value)||/^(0?\.\d+|none)$/.test(value);
}
function render(){const query=$('#search').value.toLowerCase(),groups={};let count=0;$('#tokens').replaceChildren();for(const [k,v]of Object.entries(current().tokens)){if(!`${k} ${v} ${group(k)}`.toLowerCase().includes(query))continue;count++;(groups[group(k)]??=[]).push([k,v])}for(const [name,items]of Object.entries(groups)){const details=document.createElement('details');details.open=true;const summary=document.createElement('summary');summary.textContent=`${name} · ${items.length}`;details.append(summary);for(const[k,v]of items){const box=document.createElement('div');box.className='token';const label=document.createElement('label');label.textContent=k.replace('--theme-','');label.title=k;const row=document.createElement('div');row.className='row';const input=document.createElement(k===headerToken?'textarea':'input');if(k!==headerToken)input.type='text';else input.className='header-token-value';input.dataset.tokenValue='';input.value=v;input.id=k;label.htmlFor=k;input.setAttribute('aria-label',k);const color=document.createElement('input');color.type='color';color.title=k;color.setAttribute('aria-label','Выбрать цвет '+k);const resolved=v.replace(/var\((--classic-gray-[\w-]+)\)/g,(_,key)=>primitives[key]||'#808080');color.value=/^#[\da-f]{6}$/i.test(resolved)?resolved:'#808080';const update=value=>{const valid=validToken(k,value);input.classList.toggle('invalid',!valid);input.setAttribute('aria-invalid',String(!valid));if(!valid){status('Проверьте значение токена');return}current().tokens[k]=value;if(k===patternToken || k===maskToken)syncPattern();
// Resolve references and normalize CSS color syntax for the native swatch.
if(k.startsWith('--theme-color-')){let resolved=value;const seen=new Set();while(/var\(/.test(resolved)){let changed=false;resolved=resolved.replace(/var\(\s*(--[\w-]+)\s*\)/g,(_,key)=>{if(seen.has(key))return '';seen.add(key);changed=true;return current().tokens[key]??primitives[key]??''});if(!changed)break}
if(CSS.supports('color',resolved)){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle=resolved;const normalized=ctx.fillStyle;if(/^#[\da-f]{6}$/i.test(normalized))color.value=normalized;else{ctx.fillRect(0,0,1,1);const rgba=ctx.getImageData(0,0,1,1).data;color.value='#'+[...rgba].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('')}}}
save()};input.oninput=()=>update(input.value);color.oninput=()=>{input.value=color.value;update(color.value)};if(k.startsWith('--theme-color-')&&CSS.supports('color',v))row.append(color);row.append(input);box.append(label,row);details.append(box)}$('#tokens').append(details)}$('#count').textContent=`${count} токенов`}
$('#themes').onchange=e=>{state.selected[mode]=e.target.value;themeSelect();render();save()};
let editingScheme=false;
const dialog=$('#scheme-dialog');
function baseOptions(){const target=$('#scheme-mode').value;$('#scheme-base').replaceChildren(...state.schemes[target].map(t=>new Option(t.name,t.id)));$('#scheme-base').value=state.selected[target]}
function openSchemeForm(edit){editingScheme=edit;$('#scheme-dialog-title').textContent=edit?'Настройки схемы':'Создать цветовую схему';$('#name').value=edit?current().name:'';$('#name').placeholder=mode==='light'?'Например, Песочная':'Например, Дракула';$('#scheme-mode').value=mode;$('#scheme-mode').disabled=false;$('#scheme-base-label').hidden=edit;$('#delete').hidden=!edit;$('#scheme-submit').textContent=edit?'Сохранить':'Создать схему';$('#scheme-help').textContent=edit?'Можно переименовать схему или перенести в другой режим. Цвета сохранятся.':'Новая схема появится только в выбранном режиме. Затем настройте её токены.';$('#name').setCustomValidity('');baseOptions();dialog.showModal();$('#name').focus()}
$('#create').onclick=()=>openSchemeForm(false);
$('#manage-scheme').onclick=()=>openSchemeForm(true);
$('#scheme-cancel').onclick=()=>dialog.close();
$('#scheme-mode').onchange=()=>{baseOptions();$('#name').placeholder=$('#scheme-mode').value==='light'?'Например, Песочная':'Например, Дракула'};
$('#scheme-form').onsubmit=e=>{e.preventDefault();const name=$('#name').value.trim();if(!name){$('#name').setCustomValidity('Введите название схемы');$('#name').reportValidity();return}if(editingScheme){const target=$('#scheme-mode').value,item=current();item.name=name;if(target!==mode){const source=mode;state.schemes[source]=catalog().filter(t=>t.id!==item.id);if(!state.schemes[source].length)state.schemes[source].push({id:crypto.randomUUID(),name:'Классика',tokens:{...defaults[source]}});state.selected[source]=state.schemes[source][0].id;if(state.schemes[target].some(t=>t.id===item.id))item.id=crypto.randomUUID();state.schemes[target].push(item);state.selected[target]=item.id;mode=target}}else{const target=$('#scheme-mode').value,base=state.schemes[target].find(t=>t.id===$('#scheme-base').value),item={id:crypto.randomUUID(),name,base:base.base,tokens:structuredClone(base.tokens)};state.schemes[target].push(item);state.selected[target]=item.id;mode=target}dialog.close();themeSelect();render();save()};
$('#name').oninput=()=>$('#name').setCustomValidity('');
$('#delete').onclick=()=>{if(catalog().length===1){$('#scheme-help').textContent='Нельзя удалить единственную схему режима. Сначала создайте другую.';return}if(!confirm('Удалить цветовую схему «'+current().name+'»?'))return;state.schemes[mode]=catalog().filter(t=>t.id!==state.selected[mode]);state.selected[mode]=catalog()[0].id;dialog.close();themeSelect();render();save()};
$('#reset').onclick=()=>{if(confirm('Сбросить цвета схемы «'+current().name+'» до базовой схемы для '+(mode==='light'?'светлого':'тёмного')+' режима?')){current().tokens={...baseline(current(),mode)};syncPattern();render();save()}};
$('#search').oninput=render;
$('#modes').onchange=e=>{
 const keepGta=current().id==='gta';
 mode=e.target.value;
 if(keepGta && catalog().some(scheme=>scheme.id==='gta'))state.selected[mode]='gta';
 themeSelect();render();save();
};
$('#page-select').onchange=e=>{frame.src='../'+e.target.value+'.html'};
$('#sizes').onclick=e=>{const button=e.target.closest('[data-size]');if(!button)return;for(const b of $('#sizes').children){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))}frame.style.width=button.dataset.size};
frame.onload=()=>{
 const page=$('#page-select');
 const loaded=frame.contentDocument?.location.pathname.split('/').pop();
 const screen=[...page.options].find(option=>option.value+'.html'===loaded);
 if(screen)page.value=screen.value;
 apply();
 frame.contentWindow.addEventListener('resize',scheduleCoverage);
 frame.contentDocument.addEventListener('click',scheduleCoverage);
};
function download(ext,text,name=current().name){const types={css:'text/css',json:'application/json',txt:'text/plain;charset=utf-8'};const url=URL.createObjectURL(new Blob([text],{type:types[ext]}));const a=document.createElement('a');a.href=url;a.download=(name.replace(/[^\p{L}\p{N}_-]/gu,'-')||'theme')+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
for(const [button,kind]of [['#open-used-count','used'],['#open-unused-count','unused']])$(button).onclick=()=>{measureCoverage();const screen=frame.contentDocument?.title.replace('[PD] ','')||'Страница';const query=new URLSearchParams({mode,id:current().id,view:kind,keys:JSON.stringify(coverage[kind]),screen,width:String(frame.clientWidth)});window.open('changes.html?'+query,'_blank','noopener')};
$('#count').onclick=()=>{save();window.open('changes.html?'+new URLSearchParams({mode,id:current().id,view:'all'}),'_blank','noopener')};
$('#changes').onclick=()=>{save();window.open('changes.html?'+new URLSearchParams({mode,id:current().id}),'_blank','noopener')};
function exportModes(){
 const light=state.schemes.light.find(scheme=>scheme.id==='gta');
 const dark=state.schemes.dark.find(scheme=>scheme.id==='gta');
 return current().id==='gta' && light && dark ? [['light',light],['dark',dark]] : [[mode,current()]];
}

function resolvedColors(values,keys){
 const sample=document.createElement('span');
 sample.hidden=true;
 for(const [key,value] of Object.entries(values))sample.style.setProperty(key,value);
 document.body.append(sample);
 try{
  const style=getComputedStyle(sample);
  const context=document.createElement('canvas').getContext('2d');
  const colors=new Map();
  for(const key of keys){
   const value=style.getPropertyValue(key).trim();
   if(key===headerToken && isHeaderGradient(value)){
    colors.set(key,value);
    continue;
   }
   if(!CSS.supports('color',value))continue;
   context.fillStyle=value;
   const normalized=context.fillStyle;
   const srgb=/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(normalized);
   if(!srgb){
    colors.set(key,normalized);
    continue;
   }
   const rgb=srgb.slice(1,4).map(channel=>Math.round(Number(channel)*255));
   const alpha=Number(srgb[4]??1);
   const hex='#'+rgb.map(channel=>channel.toString(16).padStart(2,'0')).join('');
   colors.set(key,alpha===1?hex:`rgba(${rgb.join(', ')}, ${alpha})`);
  }
  return colors;
 }finally{
  sample.remove();
 }
}

$('#export-colors').onclick=()=>{
 const blocks=[];
 for(const [colorMode,scheme] of exportModes()){
  const classic=defaults[colorMode];
  // Classic's color keys match the developer token list supplied for this project.
  const keys=Object.keys(classic).filter(key=>key.startsWith('--theme-color-') &&
   Object.hasOwn(scheme.tokens,key) && scheme.tokens[key].trim()!==classic[key].trim());
  const original=resolvedColors({...primitives,...classic},keys);
  const edited=resolvedColors({...primitives,...scheme.tokens},keys);
  const changes=[...edited].filter(([key,value])=>value!==original.get(key));
  if(changes.length){
   const label=colorMode==='light'?'Светлая схема':'Тёмная схема';
   blocks.push(`/* ${label} */\n${changes.map(([key,value])=>`${key}: ${value};`).join('\n')}`);
  }
 }
 if(!blocks.length){
  status('Цвета исходных токенов пока не изменены');
  return;
 }
 download('txt',blocks.join('\n\n')+'\n',current().name+'-colors');
};

async function embeddedGtaMask(){
 const response=await fetch('../pattern-gta.svg');
 if(!response.ok)throw Error('GTA pattern unavailable');
 const blob=await response.blob();
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(`url("${reader.result}")`);
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(blob);
 });
}

$('#export').onclick=async()=>{
 const schemes=structuredClone(exportModes());
 const button=$('#export');
 button.disabled=true;
 try{
  const grays=Object.assign({},...schemes.map(([,scheme])=>usedPrimitives(scheme)));
  const mask=gtaMask && schemes.some(([,scheme])=>scheme.tokens[maskToken]===gtaMask)
   ? await embeddedGtaMask() : null;
  const rules=schemes.map(([colorMode,scheme])=>{
   const tokens={...scheme.tokens};
   if(mask && tokens[maskToken]===gtaMask)tokens[maskToken]=mask;
   const selector=`:root[data-color-mode="${colorMode}"]`;
   const pattern=tokens[patternToken] ? `\n\n${selector} > body {
  background-image: var(${patternToken}, none);
  background-size: 24px 24px;
}` : '';
   const materials=materialRules(selector,tokens);
   return `${selector} {\n  color-scheme: ${colorMode};\n${declarations(tokens)}\n}${pattern}${materials?'\n\n'+materials:''}`;
  });
  download('css',`:root {\n${declarations(grays)}\n}\n\n${rules.join('\n\n')}\n`,schemes.find(([colorMode])=>colorMode===mode)?.[1].name??schemes[0][1].name);
 }catch{
  status('Не удалось выгрузить CSS с узором GTA');
 }finally{
  button.disabled=false;
 }
};
$('#json').onclick=()=>{
 const {name,base,tokens}=current();
 const schemes=exportModes();
 const data=schemes.length===2
  ? {version:3,name,base,...Object.fromEntries(schemes.map(([colorMode,scheme])=>[colorMode,scheme.tokens]))}
  : {version:3,mode,name,base,tokens};
 download('json',JSON.stringify(data,null,2));
};
$('#import').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{try{
 const t=JSON.parse(await e.target.files[0].text());if(typeof t.name!=='string')throw Error();
 const incoming=t.tokens&&['light','dark'].includes(t.mode)?[{mode:t.mode,tokens:t.tokens}]:t.light&&t.dark?[{mode:'light',tokens:t.light},{mode:'dark',tokens:t.dark}]:null;
 if(!incoming)throw Error();
 for(const entry of incoming){if(!entry.tokens||Array.isArray(entry.tokens)||typeof entry.tokens!=='object'||!Object.keys(entry.tokens).length)throw Error();for(const[k,v]of Object.entries(entry.tokens))if(!/^--theme-[\w-]+$/.test(k)||typeof v!=='string'||/[;{}<>]/.test(v))throw Error()}
 for(const entry of incoming){const item={id:crypto.randomUUID(),name:t.name,base:typeof t.base==='string' && Object.hasOwn(bases,t.base) && bases[t.base]?t.base:undefined};item.tokens={...baseline(item,entry.mode),...entry.tokens};state.schemes[entry.mode].push(item);state.selected[entry.mode]=item.id}
 if(incoming.length===1)mode=incoming[0].mode;
 themeSelect();render();save();status(incoming.length===1?'Цветовая схема импортирована':'Палитры импортированы в оба режима');
 }catch{status('Некорректный JSON: нужны name, mode и tokens')}e.target.value=''};
themeSelect();render();save();
})();
