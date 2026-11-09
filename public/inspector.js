(()=>{
const frame=document.getElementById('preview'),button=document.getElementById('inspect');let active=false,doc,win,overlay;
const references=v=>[...v.matchAll(/var\(\s*(--[\w-]+)/g)].map(m=>m[1]);
function findTokens(target){const definitions=new Map(),found=new Set(),roots=new Set();
 const collect=(style,ancestor=false)=>{for(const prop of Array.from(style)){const refs=references(style.getPropertyValue(prop));if(prop.startsWith('--')){if(!definitions.has(prop))definitions.set(prop,new Set());refs.forEach(x=>definitions.get(prop).add(x))}else if(!ancestor||['color','fill','stroke','font','font-family','font-size','visibility'].includes(prop))refs.forEach(x=>roots.add(x))}};
 const chain=[];for(let e=target;e;e=e.parentElement)chain.push(e);
 function visit(rules){for(const r of rules){if(r.type===4&&!win.matchMedia(r.conditionText).matches)continue;if(r.type===12&&!win.CSS.supports(r.conditionText))continue;if(r.selectorText&&r.style){let selector=r.selectorText.replace(/::[\w-]+(?:\([^)]*\))?/g,'');for(let i=0;i<chain.length;i++){try{if(chain[i].matches(selector))collect(r.style,i>0)}catch{}}// Root custom properties may supply dependencies for component aliases.
 try{if(doc.documentElement.matches(selector))for(const p of Array.from(r.style))if(p.startsWith('--')){if(!definitions.has(p))definitions.set(p,new Set());references(r.style.getPropertyValue(p)).forEach(x=>definitions.get(p).add(x))}}catch{}
 }else if(r.cssRules)visit(r.cssRules)}}
 for(const sheet of doc.styleSheets)try{visit(sheet.cssRules)}catch{}
 chain.forEach((el,i)=>collect(el.style,i>0));
 const visited=new Set();function follow(k){if(visited.has(k))return;visited.add(k);if(k.startsWith('--theme-'))found.add(k);for(const ref of definitions.get(k)||[])follow(ref)}roots.forEach(follow);
 // Search in the editor must not limit what can be inspected.
 const cs=win.getComputedStyle(target),rootStyle=win.getComputedStyle(doc.documentElement);
 const canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d');
 const normalized=v=>{if(!win.CSS.supports('color',v))return null;ctx.clearRect(0,0,1,1);ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].join(',')};
 const wanted=[cs.color,cs.fill,cs.backgroundColor].map(normalized).filter(v=>v&&!v.endsWith(',0'));
 const keys=[...found];
 return keys.sort((a,b)=>{const score=k=>{const v=normalized(rootStyle.getPropertyValue(k).trim());return v&&wanted.includes(v)?wanted.indexOf(v):99};return score(a)-score(b)});

}
function move(e){if(!active)return;const target=e.target;if(!(target instanceof win.Element))return;const r=target.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})}
function click(e){if(!active)return;e.preventDefault();e.stopImmediatePropagation();let target=e.target;if(target.tagName?.toLowerCase()==='use')target=target.closest('svg')||target;const tokens=findTokens(target),element=target.tagName.toLowerCase()+(target.classList.length?'.'+[...target.classList].slice(0,2).join('.'):'');setActive(false);dispatchEvent(new CustomEvent('inspect-tokens',{detail:{tokens,element}}))}
function key(e){if(e.key==='Escape'){setActive(false);e.preventDefault()}}
function cleanup(){if(doc){doc.removeEventListener('pointermove',move,true);doc.removeEventListener('click',click,true);doc.removeEventListener('keydown',key,true);doc.documentElement.classList.remove('token-inspecting')}overlay?.remove()}
function attach(){cleanup();doc=frame.contentDocument;win=frame.contentWindow;if(!doc?.body)return;const style=doc.createElement('style');style.textContent='.token-inspecting,.token-inspecting *{cursor:crosshair!important}';doc.head.append(style);overlay=doc.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:fixed;display:none;pointer-events:none;z-index:2147483647;border:2px solid #5274ff;background:rgba(82,116,255,.12);border-radius:3px;box-sizing:border-box';doc.body.append(overlay);doc.addEventListener('pointermove',move,true);doc.addEventListener('click',click,true);doc.addEventListener('keydown',key,true);if(active)doc.documentElement.classList.add('token-inspecting')}
function setActive(value){active=value;button.setAttribute('aria-pressed',String(value));button.title=value?'Нажмите элемент сайта · Esc — отменить':'Выбрать элемент и найти его токены';doc?.documentElement.classList.toggle('token-inspecting',value);if(!value&&overlay)overlay.style.display='none'}
button.onclick=()=>{if(!doc||doc!==frame.contentDocument)attach();setActive(!active)};frame.addEventListener('load',()=>{setActive(false);attach()});addEventListener('keydown',key);attach();
})();
