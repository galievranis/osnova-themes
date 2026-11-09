(async()=>{
 const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),mode=params.get('mode')==='dark'?'dark':'light';
 const [defaults,primitives]=await Promise.all([fetch('tokens.json').then(r=>r.json()),fetch('primitives.json').then(r=>r.json())]);
 function resolve(value,tokens,seen=new Set()){return String(value??'').replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,(_,key,fallback)=>{if(seen.has(key))return fallback||'transparent';return resolve(tokens[key]??primitives[key]??fallback??'transparent',tokens,new Set([...seen,key]))})}
 function paint(key,value,tokens){
  const el=document.createElement('div');el.className='sample';
  const resolved=resolve(value,{ '--rgxy':'ellipse at center',...tokens });
  const layer=document.createElement('div');layer.className='paint';
  const label=document.createElement('span');label.className='sample-kind';
  if(value==null){layer.className='non-color';layer.textContent='Не задан';label.textContent='Нет значения'}
  else if(CSS.supports('color',resolved)){
   label.textContent='Цвет · на светлом и тёмном фоне';el.classList.add('color-sample');
   for(const dark of [false,true]){const half=document.createElement('div');half.className='color-half'+(dark?' dark':'');const fill=document.createElement('div');fill.className='color-fill';fill.style.background=resolved;const text=document.createElement('span');text.textContent='Aa';text.style.color=resolved;half.append(fill,text);layer.append(half)}
  }else if(key.includes('-gradient-')&&CSS.supports('background-image',resolved)){layer.style.backgroundImage=resolved;label.textContent='Градиент'}
  else if(key.includes('-shadow-')){el.classList.add('effect-sample');layer.className='effect-object';layer.textContent='Aa';layer.style.boxShadow=resolved;label.textContent=resolved==='none'?'Без тени':'Тень · в исходном масштабе'}
  else if(key.includes('-filter-')){layer.className='filter-scene';layer.innerHTML='<i></i><i></i><strong>Aa</strong>';layer.style.filter=resolved;label.textContent='Фильтр · '+resolved}
  else if(key.includes('-opacity-')){layer.className='opacity-object';layer.style.opacity=resolved;label.textContent='Непрозрачность · '+Math.round(Number(resolved)*100)+'%'}
  else{layer.className='non-color';layer.textContent=resolved;label.textContent='Значение'}
  el.append(layer,label);return el;
 }
 function render(){let state;try{state=JSON.parse(localStorage.getItem('osnova-schemes-v3'))}catch{}
 const view=params.get('view'),isCoverage=['used','unused'].includes(view),isAll=view==='all',single=isCoverage||isAll;
 const scheme=state?.schemes?.[mode]?.find(t=>t.id===params.get('id'));
 $('#grid').replaceChildren();if(!scheme){$('#name').textContent='Схема не найдена';$('#description').textContent='Откройте сетку токенов из редактора тем.';$('#count').textContent='—';$('#empty').hidden=true;return}
 $('#name').textContent=scheme.name;document.title='[PD] Изменения: '+scheme.name+' — vc.ru';$('#description').textContent=(mode==='light'?'Светлый режим':'Тёмный режим')+' · относительно исходной классической схемы';
 const baseline=defaults[mode];let changed;
 if(isCoverage){let keys=[];try{keys=JSON.parse(params.get('keys')||'[]')}catch{}changed=Array.isArray(keys)?[...new Set(keys)].filter(k=>Object.hasOwn(scheme.tokens,k)):[];
 const heading=view==='used'?'Найдены на экране':'Не встречаются на экране';$('#eyebrow').textContent=heading;document.title='[PD] '+heading+' — '+scheme.name;$('#count-label').textContent='токенов';$('#description').textContent=(mode==='light'?'Светлый':'Тёмный')+' режим · '+(params.get('screen')||'Страница')+' · '+(params.get('width')||'—')+' px';$('.note').textContent='Состав токенов зафиксирован при открытии сетки для этой страницы и ширины экрана. Значения берутся из выбранной цветовой схемы. Токены найдены по подходящим CSS-правилам отображаемых элементов.';
 }else if(isAll){changed=Object.keys(scheme.tokens);$('#eyebrow').textContent='ВСЕ ТОКЕНЫ ЦВЕТОВОЙ СХЕМЫ';document.title='[PD] Все токены — '+scheme.name;$('#count-label').textContent='токенов';$('#description').textContent=(mode==='light'?'Светлый':'Тёмный')+' режим · все значения выбранной схемы';$('.note').textContent='Цвета показаны на светлом и тёмном фоне: заливка сверху, пример текста снизу. Градиенты, тени, фильтры и прозрачность показаны отдельными примерами.';}else changed=Object.keys(scheme.tokens).filter(k=>scheme.tokens[k].trim()!==(baseline[k]??'').trim());$('#count').textContent=changed.length;
 const query=$('#search').value.toLowerCase(),filtered=changed.filter(k=>`${k} ${scheme.tokens[k]} ${baseline[k]??''}`.toLowerCase().includes(query));
 for(const key of filtered){const card=document.createElement('article');card.className='card';const colors=document.createElement('div');colors.className=single?'swatches single':'swatches';for(const [text,value,tokens]of (single?[['Текущее значение',scheme.tokens[key],scheme.tokens]]:[['Было',baseline[key],baseline],['Стало',scheme.tokens[key],scheme.tokens]])){const sample=paint(key,value,tokens),caption=document.createElement('span');caption.className='caption';caption.textContent=text;sample.append(caption);colors.append(sample)}const info=document.createElement('div');info.className='info';const title=document.createElement('h2');title.textContent=key;info.append(title);for(const [label,value]of (single?[['Значение',scheme.tokens[key]]]:[['Было',baseline[key]],['Стало',scheme.tokens[key]]])){const row=document.createElement('div');row.className='value';const caption=document.createElement('b');caption.textContent=label;row.append(caption,document.createTextNode(value??'Не задан'));info.append(row)}card.append(colors,info);$('#grid').append(card)}
 $('#empty').hidden=filtered.length>0;$('#empty h2').textContent=changed.length?'Ничего не найдено':isCoverage?'В этой группе нет токенов':'Изменений пока нет';$('#empty p').textContent=changed.length?'Попробуйте другой поисковый запрос.':isCoverage?'Выберите другую группу или экран в редакторе.':'Измените токены в редакторе — они появятся здесь.';
 }
 $('#search').oninput=render;addEventListener('storage',render);addEventListener('focus',render);render();
})();
