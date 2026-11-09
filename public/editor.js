(async()=>{
const $=s=>document.querySelector(s), frame=$('#preview');
const primitives=await fetch('primitives.json').then(r=>r.json());
const defaults=await fetch('tokens.json').then(r=>r.json());
const read=key=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
const state=ThemeSchemes.createState(defaults,read('osnova-schemes-v3'),read('osnova-themes-v2'));
let mode=state.mode;
const catalog=()=>state.schemes[mode];
const current=()=>catalog().find(t=>t.id===state.selected[mode]);
const status=t=>{const el=$('#status');el.textContent=t;el.hidden=/Сохранено|сохраняются/.test(t)};
function save(){state.mode=mode;try{localStorage.setItem('osnova-schemes-v3',JSON.stringify(state));status('Сохранено в браузере')}catch{status('Хранилище недоступно — скачайте JSON')}apply()}
function apply(){try{const d=frame.contentDocument;if(!d?.documentElement)return;d.documentElement.dataset.colorMode=mode;let style=d.getElementById('custom-theme');if(!style){style=d.createElement('style');style.id='custom-theme';d.head.append(style)}style.textContent=':root:root{'+Object.entries(current().tokens).map(([k,v])=>`${k}:${v};`).join('')+'}';scheduleCoverage();dispatchEvent(new CustomEvent('theme-updated',{detail:{name:current().name}}))}catch{}}
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
function themeSelect(){$('#themes').replaceChildren(...catalog().map(t=>new Option(t.name,t.id)));$('#themes').value=state.selected[mode];$('#name').value=current().name;$('#modes').value=mode}
addEventListener('inspect-tokens',e=>{const keys=e.detail.tokens.filter(k=>Object.hasOwn(current().tokens,k));$('#search').value='';render();for(const row of $('#tokens').querySelectorAll('.token')){const key=row.querySelector('input[type=text]').id;row.classList.toggle('inspected-token',keys.includes(key))}if(keys.length){for(const row of $('#tokens').querySelectorAll('.token'))row.hidden=!row.classList.contains('inspected-token');for(const group of $('#tokens').querySelectorAll('details'))group.hidden=!group.querySelector('.inspected-token');$('#tokens').scrollTop=0;const picked=$('#tokens .inspected-token input[type=text]');if(picked)picked.focus({preventScroll:true});$('#count').textContent=keys.length+' токенов элемента'}status(keys.length?'Цвет элемента: '+keys[0].replace('--theme-','')+' · '+keys.length+' связанных токенов':'Для этого элемента токены темы не найдены')});
function group(k){if(k.includes('brand'))return'Бренд';if(/accent|positive|negative|rating|on-fill/.test(k))return'Акцент и статусы';if(/text|inverse/.test(k))return'Текст и иконки';if(/button/.test(k))return'Кнопки';if(/field|check/.test(k))return'Поля';if(/background|border/.test(k))return'Поверхности и границы';return'Эффекты и остальное'}
function render(){const query=$('#search').value.toLowerCase(),groups={};let count=0;$('#tokens').replaceChildren();for(const [k,v]of Object.entries(current().tokens)){if(!`${k} ${v} ${group(k)}`.toLowerCase().includes(query))continue;count++;(groups[group(k)]??=[]).push([k,v])}for(const [name,items]of Object.entries(groups)){const details=document.createElement('details');details.open=true;const summary=document.createElement('summary');summary.textContent=`${name} · ${items.length}`;details.append(summary);for(const[k,v]of items){const box=document.createElement('div');box.className='token';const label=document.createElement('label');label.textContent=k.replace('--theme-','');label.title=k;const row=document.createElement('div');row.className='row';const input=document.createElement('input');input.type='text';input.value=v;input.id=k;label.htmlFor=k;input.setAttribute('aria-label',k);const color=document.createElement('input');color.type='color';color.title=k;color.setAttribute('aria-label','Выбрать цвет '+k);const resolved=v.replace(/var\((--classic-gray-[\w-]+)\)/g,(_,key)=>primitives[key]||'#808080');color.value=/^#[\da-f]{6}$/i.test(resolved)?resolved:'#808080';const update=value=>{const valid=CSS.supports('color',value)||CSS.supports('box-shadow',value)||CSS.supports('background',value)||CSS.supports('filter',value)||/^(0?\.\d+|none)$/.test(value);input.classList.toggle('invalid',!valid);input.setAttribute('aria-invalid',String(!valid));if(!valid){status('Проверьте значение токена');return}current().tokens[k]=value;
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
$('#scheme-form').onsubmit=e=>{e.preventDefault();const name=$('#name').value.trim();if(!name){$('#name').setCustomValidity('Введите название схемы');$('#name').reportValidity();return}if(editingScheme){const target=$('#scheme-mode').value,item=current();item.name=name;if(target!==mode){const source=mode;state.schemes[source]=catalog().filter(t=>t.id!==item.id);if(!state.schemes[source].length)state.schemes[source].push({id:crypto.randomUUID(),name:'Классика',tokens:{...defaults[source]}});state.selected[source]=state.schemes[source][0].id;if(state.schemes[target].some(t=>t.id===item.id))item.id=crypto.randomUUID();state.schemes[target].push(item);state.selected[target]=item.id;mode=target}}else{const target=$('#scheme-mode').value,base=state.schemes[target].find(t=>t.id===$('#scheme-base').value),item={id:crypto.randomUUID(),name,tokens:structuredClone(base.tokens)};state.schemes[target].push(item);state.selected[target]=item.id;mode=target}dialog.close();themeSelect();render();save()};
$('#name').oninput=()=>$('#name').setCustomValidity('');
$('#delete').onclick=()=>{if(catalog().length===1){$('#scheme-help').textContent='Нельзя удалить единственную схему режима. Сначала создайте другую.';return}if(!confirm('Удалить цветовую схему «'+current().name+'»?'))return;state.schemes[mode]=catalog().filter(t=>t.id!==state.selected[mode]);state.selected[mode]=catalog()[0].id;dialog.close();themeSelect();render();save()};
$('#reset').onclick=()=>{if(confirm('Сбросить цвета схемы «'+current().name+'» до классики '+(mode==='light'?'светлого':'тёмного')+' режима?')){current().tokens={...defaults[mode]};render();save()}};
$('#search').oninput=render;
$('#modes').onchange=e=>{mode=e.target.value;themeSelect();render();save()};
$('#page-select').onchange=e=>{frame.src=e.target.value+'.html'};
$('#sizes').onclick=e=>{const button=e.target.closest('[data-size]');if(!button)return;for(const b of $('#sizes').children){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))}frame.style.width=button.dataset.size};
frame.onload=()=>{apply();frame.contentWindow.addEventListener('resize',scheduleCoverage);frame.contentDocument.addEventListener('click',scheduleCoverage);};
function download(ext,text){const url=URL.createObjectURL(new Blob([text],{type:ext==='css'?'text/css':'application/json'}));const a=document.createElement('a');a.href=url;a.download=(current().name.replace(/[^\p{L}\p{N}_-]/gu,'-')||'theme')+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
for(const [button,kind]of [['#open-used-count','used'],['#open-unused-count','unused']])$(button).onclick=()=>{measureCoverage();const screen=frame.contentDocument?.title.replace('[PD] ','')||'Страница';const query=new URLSearchParams({mode,id:current().id,view:kind,keys:JSON.stringify(coverage[kind]),screen,width:String(frame.clientWidth)});window.open('changes.html?'+query,'_blank','noopener')};
$('#count').onclick=()=>{save();window.open('changes.html?'+new URLSearchParams({mode,id:current().id,view:'all'}),'_blank','noopener')};
$('#changes').onclick=()=>{save();window.open('changes.html?'+new URLSearchParams({mode,id:current().id}),'_blank','noopener')};
$('#export').onclick=()=>download('css',':root {\n'+Object.entries(primitives).map(([k,v])=>`  ${k}: ${v};`).join('\n')+'\n}\n\n'+`:root[data-color-mode="${mode}"] {\n  color-scheme: ${mode};\n`+Object.entries(current().tokens).map(([k,v])=>`  ${k}: ${v};`).join('\n')+'\n}');
$('#json').onclick=()=>download('json',JSON.stringify({version:3,mode,name:current().name,tokens:current().tokens},null,2));
$('#import').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{try{
 const t=JSON.parse(await e.target.files[0].text());if(typeof t.name!=='string')throw Error();
 const incoming=t.tokens&&['light','dark'].includes(t.mode)?[{mode:t.mode,tokens:t.tokens}]:t.light&&t.dark?[{mode:'light',tokens:t.light},{mode:'dark',tokens:t.dark}]:null;
 if(!incoming)throw Error();
 for(const entry of incoming){if(!entry.tokens||Array.isArray(entry.tokens)||typeof entry.tokens!=='object'||!Object.keys(entry.tokens).length)throw Error();for(const[k,v]of Object.entries(entry.tokens))if(!/^--theme-[\w-]+$/.test(k)||typeof v!=='string'||/[;{}<>]/.test(v))throw Error()}
 for(const entry of incoming){const item={id:crypto.randomUUID(),name:t.name,tokens:{...defaults[entry.mode],...entry.tokens}};state.schemes[entry.mode].push(item);state.selected[entry.mode]=item.id}
 if(incoming.length===1)mode=incoming[0].mode;
 themeSelect();render();save();status(incoming.length===1?'Цветовая схема импортирована':'Палитры импортированы в оба режима');
 }catch{status('Некорректный JSON: нужны name, mode и tokens')}e.target.value=''};
themeSelect();render();save();
})();
