(()=>{
 const panel=document.getElementById('theme-panel'),handle=panel.querySelector('header'),launcher=document.getElementById('launcher');
 function show(open){panel.hidden=!open;launcher.hidden=open;if(open)document.getElementById('collapse').focus();else launcher.focus()}
 document.getElementById('collapse').onclick=()=>show(false);launcher.onclick=()=>show(true);
 const screenMenu=document.getElementById('preview-settings');
 const screenToggle=document.getElementById('screen-toggle'),screenOptions=document.getElementById('screen-menu');
 function setScreenMenu(open){screenOptions.hidden=!open;screenToggle.setAttribute('aria-expanded',String(open))}
 screenToggle.addEventListener('click',()=>setScreenMenu(screenOptions.hidden));
 document.addEventListener('click',e=>{if(!screenMenu.contains(e.target))setScreenMenu(false)});
 screenMenu.addEventListener('keydown',e=>{if(e.key==='Escape'){setScreenMenu(false);screenToggle.focus();e.stopPropagation()}});
 let drag;
 handle.addEventListener('pointerdown',e=>{if(e.target.closest('button, summary, select, input, a, label, nav')||e.button!==0)return;const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);document.body.classList.add('dragging');e.preventDefault()});
 handle.addEventListener('pointermove',e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,drag.left+e.clientX-drag.x))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-50,drag.top+e.clientY-drag.y))+'px';panel.style.right='auto'});
 const end=()=>{drag=null;document.body.classList.remove('dragging')};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
 addEventListener('resize',()=>{const r=panel.getBoundingClientRect();panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,r.left))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-panel.offsetHeight,r.top))+'px';panel.style.right='auto'});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){show(false);e.preventDefault()}});
})();
